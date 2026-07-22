import base64
import uuid
import imaplib
import smtplib
from email.mime.text import MIMEText
from email.parser import BytesParser
from typing import Any, Dict, List
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.models.erp import DocInstance, DocRelation, Doctype, EmailAccount, EmailMessage

async def startup(ctx):
    setup_logging()
    logger.info("ARQ Worker starting up")
    
    ctx["engine"] = create_async_engine(settings.DATABASE_URL, future=True)
    ctx["sessionmaker"] = async_sessionmaker(
        bind=ctx["engine"],
        class_=AsyncSession,
        expire_on_commit=False,
    )

async def shutdown(ctx):
    logger.info("ARQ Worker shutting down")
    if "engine" in ctx:
        await ctx["engine"].dispose()

def generate_oauth2_string(username: str, access_token: str) -> str:
    """
    Generates the XOAUTH2 authentication string.
    """
    auth_str = f"user={username}\x01auth=Bearer {access_token}\x01\x01"
    return base64.b64encode(auth_str.encode("utf-8")).decode("utf-8")

async def sync_emails(ctx) -> Dict[str, Any]:
    """
    Periodic job that checks IMAP server for new messages on all registered email accounts.
    Uses standard IMAP library with OAuth2 fallback.
    """
    sessionmaker = ctx["sessionmaker"]
    arq_pool = ctx.get("redis")  # ARQ passes redis connection pool
    
    async with sessionmaker() as db:
        result = await db.execute(select(EmailAccount))
        accounts = result.scalars().all()
        
        logger.info("Syncing emails for accounts", count=len(accounts))
        
        for account in accounts:
            try:
                logger.info("Connecting to IMAP", account=account.email_address, server=account.imap_server)
                
                # Setup IMAP connection
                if account.use_ssl:
                    imap = imaplib.IMAP4_SSL(account.imap_server, account.imap_port)
                else:
                    imap = imaplib.IMAP4(account.imap_server, account.imap_port)
                
                # Check if password_hash holds a mock OAuth2 token or normal password
                # OAuth2 authentication (XOAUTH2)
                if "oauth2:" in account.password_hash:
                    token = account.password_hash.replace("oauth2:", "", 1)
                    auth_string = generate_oauth2_string(account.email_address, token)
                    imap.authenticate("XOAUTH2", lambda x: auth_string)
                else:
                    # Standard password authentication
                    imap.login(account.email_address, account.password_hash)
                
                imap.select("INBOX")
                # Search for unread emails
                status, messages = imap.search(None, "UNSEEN")
                
                if status == "OK" and messages[0]:
                    email_ids = messages[0].split()
                    logger.info("Found unread emails", count=len(email_ids), account=account.email_address)
                    
                    for mail_id in email_ids:
                        status, data = imap.fetch(mail_id, "(RFC822)")
                        if status == "OK":
                            raw_email = data[0][1]
                            msg = BytesParser().parsebytes(raw_email)
                            
                            sender = msg.get("From")
                            recipient = msg.get("To")
                            subject = msg.get("Subject", "(No Subject)")
                            
                            # Parse body
                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    if part.get_content_type() == "text/plain":
                                        body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                                        break
                            else:
                                body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")
                                
                            # Extract clean email address from sender header
                            clean_sender = sender
                            if "<" in sender and ">" in sender:
                                clean_sender = sender.split("<")[1].split(">")[0].strip()
                                
                            # Enqueue logic pipeline task
                            if arq_pool:
                                await arq_pool.enqueue_job(
                                    "process_email_pipeline",
                                    sender_email=clean_sender,
                                    subject=subject,
                                    body=body,
                                    email_account_id=str(account.id)
                                )
                                
                            # Mark email as read/seen
                            imap.store(mail_id, "+FLAGS", "\\Seen")
                
                imap.close()
                imap.logout()
            except Exception as e:
                logger.error("Failed to sync emails for account", account=account.email_address, error=str(e))
                
    return {"status": "completed"}

async def send_smtp_email(
    ctx, 
    email_account_id: str, 
    recipient: str, 
    subject: str, 
    body: str
) -> Dict[str, Any]:
    """
    Job that sends an email via SMTP. Supports standard login and OAuth2 (XOAUTH2).
    """
    sessionmaker = ctx["sessionmaker"]
    
    async with sessionmaker() as db:
        account_res = await db.execute(
            select(EmailAccount).where(EmailAccount.id == uuid.UUID(email_account_id))
        )
        account = account_res.scalar_one_or_none()
        if not account:
            raise ValueError(f"Email account '{email_account_id}' not found")
            
        logger.info("Preparing SMTP sending", sender=account.email_address, recipient=recipient)
        
        # Setup SMTP message
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = account.email_address
        msg["To"] = recipient
        
        try:
            if account.use_ssl:
                server = smtplib.SMTP_SSL(account.smtp_server, account.smtp_port)
            else:
                server = smtplib.SMTP(account.smtp_server, account.smtp_port)
                server.starttls()
                
            server.ehlo()
            
            # OAuth2 authentication (XOAUTH2)
            if "oauth2:" in account.password_hash:
                token = account.password_hash.replace("oauth2:", "", 1)
                auth_string = generate_oauth2_string(account.email_address, token)
                server.docmd("AUTH", "XOAUTH2 " + auth_string)
            else:
                # Standard password authentication
                server.login(account.email_address, account.password_hash)
                
            server.sendmail(account.email_address, [recipient], msg.as_string())
            server.quit()
            logger.info("SMTP Email sent successfully", sender=account.email_address, recipient=recipient)
            return {"status": "sent"}
        except Exception as e:
            logger.error("Failed to send SMTP email", error=str(e))
            raise e

async def process_email_pipeline(
    ctx, 
    sender_email: str, 
    subject: str, 
    body: str, 
    email_account_id: str = None
) -> Dict[str, Any]:
    """
    Core pipeline processing:
    1. Check if contact exists. If missing -> save message as Unresolved.
    2. If contact exists -> ALWAYS link message to Contact via doc_relations.
    3. Scan subject against Deals/Projects linked to Contact. If match -> ALSO link.
    """
    sessionmaker = ctx["sessionmaker"]
    
    async with sessionmaker() as db:
        logger.info("Processing email pipeline", sender_email=sender_email, subject=subject)
        
        # Resolve target email account
        if not email_account_id:
            # Fallback/find first account
            acc_res = await db.execute(select(EmailAccount).limit(1))
            account = acc_res.scalar_one_or_none()
            if not account:
                # Seed a default mock email account if missing to prevent FK failures
                account = EmailAccount(
                    email_address="system@erpnextgen.com",
                    password_hash="mock",
                    imap_server="imap.mock.com",
                    smtp_server="smtp.mock.com"
                )
                db.add(account)
                await db.flush()
        else:
            acc_res = await db.execute(
                select(EmailAccount).where(EmailAccount.id == uuid.UUID(email_account_id))
            )
            account = acc_res.scalar_one_or_none()
            if not account:
                raise ValueError(f"EmailAccount '{email_account_id}' does not exist")
                
        # 1. Search for a Contact matching sender_email
        contact_q = select(DocInstance).where(
            (DocInstance.doctype_name == "Contact") &
            (DocInstance.data["email"].as_string() == sender_email)
        )
        res = await db.execute(contact_q)
        contact = res.scalar_one_or_none()
        
        email_status = "Processed" if contact else "Unresolved"
        
        # Create EmailMessage database log
        email_message = EmailMessage(
            email_account_id=account.id,
            sender=sender_email,
            recipient=account.email_address,
            subject=subject,
            body=body,
            status=email_status
        )
        db.add(email_message)
        await db.flush() # Resolve email_message.id (UUID)
        
        email_msg_id = str(email_message.id)
        
        if not contact:
            logger.warn(
                "Contact missing. Logged email message as Unresolved",
                sender_email=sender_email,
                message_id=email_msg_id
            )
            await db.commit()
            return {"status": "unresolved_no_contact", "message_id": email_msg_id}
            
        # 2. Contact exists -> ALWAYS attach email to Contact via doc_relations
        logger.info("Contact found. Linking email to Contact", contact=contact.name, message_id=email_msg_id)
        relation_contact = DocRelation(
            source_type="Contact",
            source_id=contact.name,
            target_type="EmailMessage",
            target_id=email_msg_id,
            relation_type="Email Link"
        )
        db.add(relation_contact)
        
        # 3. Scan subject against active CRM Deals or Projects linked to this Contact
        rel_q = select(DocRelation).where(
            (
                (DocRelation.source_type == "Contact") &
                (DocRelation.source_id == contact.name) &
                (DocRelation.target_type.in_(["CRM Deal", "Project"]))
            ) |
            (
                (DocRelation.target_type == "Contact") &
                (DocRelation.target_id == contact.name) &
                (DocRelation.source_type.in_(["CRM Deal", "Project"]))
            )
        )
        res_rel = await db.execute(rel_q)
        related_entities = res_rel.scalars().all()
        
        linked_to_subject = False
        for rel in related_entities:
            entity_type = rel.target_type if rel.source_id == contact.name else rel.source_type
            entity_name = rel.target_id if rel.source_id == contact.name else rel.source_id

            entity_q = select(DocInstance).where(
                (DocInstance.doctype_name == entity_type) &
                (DocInstance.name == entity_name)
            )
            entity_res = await db.execute(entity_q)
            entity = entity_res.scalar_one_or_none()
            
            if entity:
                title = entity.data.get("title", "")
                if entity.name.lower() in subject.lower() or (title and title.lower() in subject.lower()):
                    logger.info(
                        f"Found subject match for {entity.doctype_name}. Linking email message.",
                        entity=entity.name,
                        message_id=email_msg_id
                    )
                    relation_subject = DocRelation(
                        source_type=entity.doctype_name,
                        source_id=entity.name,
                        target_type="EmailMessage",
                        target_id=email_msg_id,
                        relation_type="Contextual Link"
                    )
                    db.add(relation_subject)
                    linked_to_subject = True
                    
        await db.commit()
        return {
            "status": "linked",
            "message_id": email_msg_id,
            "contact_name": contact.name,
            "linked_to_context": linked_to_subject
        }

class WorkerSettings:
    functions = [process_email_pipeline, sync_emails, send_smtp_email]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
