from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from arq import create_pool
from arq.connections import RedisSettings

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.api.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Logging
    setup_logging()
    logger.info("Initializing ERP NextGen API")

    # Connect to Redis for ARQ Worker Queue
    try:
        app.state.arq_pool = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
        logger.info("Connected to ARQ Redis queue")
    except Exception as e:
        logger.error("Failed to connect to ARQ Redis queue", error=str(e))
        app.state.arq_pool = None

    # Database Seed logic
    try:
        from app.core.database import async_session_maker
        from app.models.erp import Doctype, Docfield, Role, DocPermission, FieldPermission
        from sqlalchemy.future import select
        async with async_session_maker() as session:
            # Check if any doctype exists
            res = await session.execute(select(Doctype))
            if not res.scalars().first():
                logger.info("No DocTypes found, seeding default schemas...")
                
                # 1. Seed Company
                company_dt = Doctype(name="Company", label="Company", description="Company credentials and legal entities", module="Core")
                session.add(company_dt)
                company_fields = [
                    Docfield(doctype_name="Company", fieldname="name", label="Company Name", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Company", fieldname="address", label="Address", fieldtype="Data"),
                    Docfield(doctype_name="Company", fieldname="tax_id", label="Tax ID", fieldtype="Data"),
                    Docfield(doctype_name="Company", fieldname="currency", label="Currency", fieldtype="Select", options="USD,EUR,GBP"),
                ]
                for f in company_fields:
                    session.add(f)

                # 2. Seed Counterparty
                counterparty_dt = Doctype(name="Counterparty", label="Counterparty", description="Customers and supplier profile details", module="Core")
                session.add(counterparty_dt)
                counterparty_fields = [
                    Docfield(doctype_name="Counterparty", fieldname="name", label="Counterparty Name", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Counterparty", fieldname="type", label="Type", fieldtype="Select", options="Customer,Supplier", reqd=True),
                    Docfield(doctype_name="Counterparty", fieldname="tax_id", label="Tax ID", fieldtype="Data"),
                    Docfield(doctype_name="Counterparty", fieldname="email", label="Email", fieldtype="Data"),
                ]
                for f in counterparty_fields:
                    session.add(f)

                # 3. Seed Contact
                contact_dt = Doctype(name="Contact", label="Contact", description="Contact person detail", module="CRM")
                session.add(contact_dt)
                contact_fields = [
                    Docfield(doctype_name="Contact", fieldname="email", label="Email Address", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Contact", fieldname="phone", label="Phone Number", fieldtype="Data"),
                    Docfield(doctype_name="Contact", fieldname="first_name", label="First Name", fieldtype="Data"),
                    Docfield(doctype_name="Contact", fieldname="last_name", label="Last Name", fieldtype="Data"),
                ]
                for f in contact_fields:
                    session.add(f)

                # 4. Seed Item
                item_dt = Doctype(name="Item", label="Item", description="Stockable materials and service listings", module="Stock")
                session.add(item_dt)
                item_fields = [
                    Docfield(doctype_name="Item", fieldname="item_code", label="Item Code", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Item", fieldname="item_name", label="Item Name", fieldtype="Data"),
                    Docfield(doctype_name="Item", fieldname="description", label="Description", fieldtype="Data"),
                    Docfield(doctype_name="Item", fieldname="standard_rate", label="Standard Rate", fieldtype="Float"),
                ]
                for f in item_fields:
                    session.add(f)

                # 5. Seed PriceList
                price_dt = Doctype(name="PriceList", label="Price List", description="Custom currency price listing tags", module="Stock")
                session.add(price_dt)
                price_fields = [
                    Docfield(doctype_name="PriceList", fieldname="name", label="Price List Name", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="PriceList", fieldname="currency", label="Currency", fieldtype="Select", options="USD,EUR,GBP"),
                    Docfield(doctype_name="PriceList", fieldname="is_active", label="Active", fieldtype="Select", options="Yes,No"),
                ]
                for f in price_fields:
                    session.add(f)

                # 6. Seed Quote
                quote_dt = Doctype(name="Quote", label="Quote", description="Client quotes proposals sheet", module="Sales")
                session.add(quote_dt)
                quote_fields = [
                    Docfield(doctype_name="Quote", fieldname="name", label="Quote ID", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Quote", fieldname="customer", label="Counterparty Client", fieldtype="Link", options="Counterparty"),
                    Docfield(doctype_name="Quote", fieldname="total", label="Total", fieldtype="Float"),
                    Docfield(doctype_name="Quote", fieldname="valid_until", label="Valid Until", fieldtype="Date"),
                ]
                for f in quote_fields:
                    session.add(f)

                # 7. Seed Invoice
                invoice_dt = Doctype(name="Invoice", label="Invoice", description="Sales billing invoices", module="Accounts")
                session.add(invoice_dt)
                invoice_fields = [
                    Docfield(doctype_name="Invoice", fieldname="name", label="Invoice ID", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Invoice", fieldname="customer", label="Client Counterparty", fieldtype="Link", options="Counterparty"),
                    Docfield(doctype_name="Invoice", fieldname="total", label="Total Amount", fieldtype="Float"),
                    Docfield(doctype_name="Invoice", fieldname="status", label="Status", fieldtype="Select", options="Unpaid,Paid"),
                ]
                for f in invoice_fields:
                    session.add(f)

                # 8. Seed Contract
                contract_dt = Doctype(name="Contract", label="Contract", description="Agreements and contract bounds", module="Core")
                session.add(contract_dt)
                contract_fields = [
                    Docfield(doctype_name="Contract", fieldname="name", label="Contract Name", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Contract", fieldname="customer", label="Partner Client", fieldtype="Link", options="Counterparty"),
                    Docfield(doctype_name="Contract", fieldname="start_date", label="Start Date", fieldtype="Date"),
                    Docfield(doctype_name="Contract", fieldname="end_date", label="End Date", fieldtype="Date"),
                    Docfield(doctype_name="Contract", fieldname="value", label="Contract Value", fieldtype="Float"),
                ]
                for f in contract_fields:
                    session.add(f)

                # 9. Seed PaymentEntry
                payment_dt = Doctype(name="PaymentEntry", label="Payment Entry", description="Payment transactions record", module="Accounts")
                session.add(payment_dt)
                payment_fields = [
                    Docfield(doctype_name="PaymentEntry", fieldname="amount", label="Payment Amount", fieldtype="Float", reqd=True),
                    Docfield(doctype_name="PaymentEntry", fieldname="payment_method", label="Payment Method", fieldtype="Select", options="Cash,Card,Bank Transfer"),
                    Docfield(doctype_name="PaymentEntry", fieldname="reference_doctype", label="Reference DocType", fieldtype="Data"),
                    Docfield(doctype_name="PaymentEntry", fieldname="reference_name", label="Reference Name", fieldtype="Data"),
                ]
                for f in payment_fields:
                    session.add(f)

                # 10. Seed Lead
                lead_dt = Doctype(name="Lead", label="Lead", description="Sales marketing prospects", module="CRM")
                session.add(lead_dt)
                lead_fields = [
                    Docfield(doctype_name="Lead", fieldname="lead_name", label="Lead Name", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Lead", fieldname="email", label="Email Address", fieldtype="Data"),
                    Docfield(doctype_name="Lead", fieldname="source", label="Source", fieldtype="Data"),
                    Docfield(doctype_name="Lead", fieldname="status", label="Status", fieldtype="Select", options="New,Contacted,Qualified,Lost"),
                ]
                for f in lead_fields:
                    session.add(f)

                # 11. Seed Deal (formerly CRM Deal)
                deal_dt = Doctype(name="Deal", label="CRM Deal", description="Sales funnel deal", module="CRM")
                session.add(deal_dt)
                deal_fields = [
                    Docfield(doctype_name="Deal", fieldname="title", label="Deal Title", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Deal", fieldname="value", label="Deal Value", fieldtype="Float"),
                    Docfield(doctype_name="Deal", fieldname="stage", label="Stage", fieldtype="Select", options="Lead,Opportunity,Quotation,Won,Lost"),
                ]
                for f in deal_fields:
                    session.add(f)

                # 12. Seed Project
                project_dt = Doctype(name="Project", label="Project", description="Client project details", module="Projects")
                session.add(project_dt)
                project_fields = [
                    Docfield(doctype_name="Project", fieldname="title", label="Project Title", fieldtype="Data", reqd=True),
                    Docfield(doctype_name="Project", fieldname="status", label="Status", fieldtype="Select", options="Planning,Active,Completed"),
                ]
                for f in project_fields:
                    session.add(f)

                # 13. Seed Sales (with commission_rate as a hidden test field)
                sales_dt = Doctype(name="Sales", label="Sales Order", description="Customer sales order details", module="Sales")
                session.add(sales_dt)
                sales_fields = [
                    Docfield(doctype_name="Sales", fieldname="amount", label="Invoice Total", fieldtype="Float", reqd=True),
                    Docfield(doctype_name="Sales", fieldname="status", label="Status", fieldtype="Select", options="Draft,Completed", reqd=True),
                    Docfield(doctype_name="Sales", fieldname="contact", label="Linked Contact", fieldtype="Link", options="Contact"),
                    Docfield(doctype_name="Sales", fieldname="commission_rate", label="Commission Rate", fieldtype="Float", hidden=True),
                ]
                for f in sales_fields:
                    session.add(f)

                # Seed Default Roles
                admin_role = Role(name="Admin", description="Full administrator access")
                manager_role = Role(name="Manager", description="Operator manager permissions")
                guest_role = Role(name="Guest", description="Read-only guest permissions")
                session.add(admin_role)
                session.add(manager_role)
                session.add(guest_role)
                await session.flush()

                # Seed DocPermissions for Manager and Guest
                doctypes_list = [
                    "Company", "Counterparty", "Contact", "Item", "PriceList",
                    "Quote", "Invoice", "Contract", "PaymentEntry", "Lead",
                    "Deal", "Project", "Sales"
                ]
                for dt in doctypes_list:
                    # Manager DocPermission: create, read, write
                    session.add(DocPermission(
                        role_id=manager_role.id,
                        doctype_name=dt,
                        create=True,
                        read=True,
                        write=True,
                        delete=False
                    ))
                    # Guest DocPermission: read only
                    session.add(DocPermission(
                        role_id=guest_role.id,
                        doctype_name=dt,
                        create=False,
                        read=True,
                        write=False,
                        delete=False
                    ))

                # Seed FieldPermissions (hide commission_rate from Guest and Manager)
                session.add(FieldPermission(
                    role_id=manager_role.id,
                    doctype_name="Sales",
                    fieldname="commission_rate",
                    read=False,
                    write=False,
                    hidden=True
                ))
                session.add(FieldPermission(
                    role_id=guest_role.id,
                    doctype_name="Sales",
                    fieldname="commission_rate",
                    read=False,
                    write=False,
                    hidden=True
                ))

                await session.commit()
                logger.info("Successfully seeded 13 core DocTypes and default RBAC settings.")
    except Exception as ex:
        logger.error("Failed to seed database core DocTypes", error=str(ex))

    # Start scheduler
    try:
        from app.core.scheduler import start_scheduler
        await start_scheduler(app)
    except Exception as e:
        logger.error("Failed to start scheduler", error=str(e))

    yield

    # Shutdown scheduler
    try:
        from app.core.scheduler import shutdown_scheduler
        await shutdown_scheduler()
    except Exception as e:
        logger.error("Failed to stop scheduler", error=str(e))

    # Shutdown
    if app.state.arq_pool:
        await app.state.arq_pool.close()
        logger.info("Closed ARQ Redis queue connection")

app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root Endpoint
@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

# Healthcheck
@app.get("/health")
async def health():
    return {"status": "healthy"}

# Include API Router
app.include_router(api_router)
