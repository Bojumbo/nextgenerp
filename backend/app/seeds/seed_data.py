import asyncio
import uuid
from sqlalchemy.future import select
from app.core.database import async_session_maker
from app.models.erp import DocInstance, DocRelation

async def seed_all():
    logger("Seeding realistic ERP dummy data...")
    async with async_session_maker() as session:
        # Check if dummy data is already present to prevent duplicate seeds
        existing_res = await session.execute(
            select(DocInstance).where(DocInstance.name == "COMP-001")
        )
        if existing_res.scalar_one_or_none():
            logger("Dummy seed data already loaded, skipping.")
            return

        # 1. Company
        company = DocInstance(
            doctype_name="Company",
            name="COMP-001",
            data={
                "name": "Global Tech Innovations Ltd",
                "address": "123 Tech Avenue, Suite 400",
                "tax_id": "GB123456789",
                "currency": "USD"
            },
            owner="seeder"
        )
        session.add(company)

        # 2. Counterparties
        cp_legal = DocInstance(
            doctype_name="Counterparty",
            name="CP-001",
            data={
                "name": "Acme Corp",
                "type": "Customer",
                "tax_id": "TAX-ACME",
                "email": "billing@acme.com"
            },
            owner="seeder"
        )
        cp_indiv = DocInstance(
            doctype_name="Counterparty",
            name="CP-002",
            data={
                "name": "John Individual",
                "type": "Supplier",
                "tax_id": "TAX-JOHN",
                "email": "john@gmail.com"
            },
            owner="seeder"
        )
        session.add_all([cp_legal, cp_indiv])

        # 3. Contacts
        contact_1 = DocInstance(
            doctype_name="Contact",
            name="CNT-001",
            data={
                "email": "john.doe@acme.com",
                "phone": "+1234567890",
                "first_name": "John",
                "last_name": "Doe"
            },
            owner="seeder"
        )
        contact_2 = DocInstance(
            doctype_name="Contact",
            name="CNT-002",
            data={
                "email": "alice@acme.com",
                "phone": "+1122334455",
                "first_name": "Alice",
                "last_name": "Smith"
            },
            owner="seeder"
        )
        contact_3 = DocInstance(
            doctype_name="Contact",
            name="CNT-003",
            data={
                "email": "bob@gmail.com",
                "phone": "+1998877665",
                "first_name": "Bob",
                "last_name": "Jones"
            },
            owner="seeder"
        )
        session.add_all([contact_1, contact_2, contact_3])

        # 4. Items (5 items)
        item_1 = DocInstance(
            doctype_name="Item",
            name="ITEM-001",
            data={
                "item_code": "ERP-LIC",
                "item_name": "ERP Software License",
                "description": "Annual ERP user license fee",
                "standard_rate": 1500.00
            },
            owner="seeder"
        )
        item_2 = DocInstance(
            doctype_name="Item",
            name="ITEM-002",
            data={
                "item_code": "CONS-HR",
                "item_name": "Consulting Hour",
                "description": "Implementation consultancy per hour",
                "standard_rate": 150.00
            },
            owner="seeder"
        )
        item_3 = DocInstance(
            doctype_name="Item",
            name="ITEM-003",
            data={
                "item_code": "SUP-ANN",
                "item_name": "Annual Support Package",
                "description": "Premium 24/7 technical support agreement",
                "standard_rate": 500.00
            },
            owner="seeder"
        )
        item_4 = DocInstance(
            doctype_name="Item",
            name="ITEM-004",
            data={
                "item_code": "TRAIN-SESS",
                "item_name": "Onboarding Training Session",
                "description": "User onboarding training course",
                "standard_rate": 300.00
            },
            owner="seeder"
        )
        item_5 = DocInstance(
            doctype_name="Item",
            name="ITEM-005",
            data={
                "item_code": "DEV-HR",
                "item_name": "Custom Coding Hour",
                "description": "ERP custom feature development coding hour",
                "standard_rate": 200.00
            },
            owner="seeder"
        )
        session.add_all([item_1, item_2, item_3, item_4, item_5])

        # 5. PriceList
        price_list = DocInstance(
            doctype_name="PriceList",
            name="PL-001",
            data={
                "name": "Standard Selling List",
                "currency": "USD",
                "is_active": "Yes"
            },
            owner="seeder"
        )
        session.add(price_list)

        # 6. Leads (2 leads)
        lead_1 = DocInstance(
            doctype_name="Lead",
            name="LEAD-001",
            data={
                "lead_name": "MegaCorp CRM Prospect",
                "email": "megacorp@lead.com",
                "source": "Website Form",
                "status": "New"
            },
            owner="seeder"
        )
        lead_2 = DocInstance(
            doctype_name="Lead",
            name="LEAD-002",
            data={
                "lead_name": "MiniCorp Dev Prospect",
                "email": "minicorp@lead.com",
                "source": "Referral Link",
                "status": "Contacted"
            },
            owner="seeder"
        )
        session.add_all([lead_1, lead_2])

        # 7. Deals (2 deals)
        deal_1 = DocInstance(
            doctype_name="Deal",
            name="DEAL-001",
            data={
                "title": "MegaCorp ERP Expansion Deal",
                "value": 15000.00,
                "stage": "Opportunity"
            },
            owner="seeder"
        )
        deal_2 = DocInstance(
            doctype_name="Deal",
            name="DEAL-002",
            data={
                "title": "MiniCorp Custom Addon Deal",
                "value": 5000.00,
                "stage": "Quotation"
            },
            owner="seeder"
        )
        session.add_all([deal_1, deal_2])

        # 8. Project (1 Project linked to both Deals)
        project = DocInstance(
            doctype_name="Project",
            name="PROJ-001",
            data={
                "title": "Enterprise Cloud Implementation 2026",
                "status": "Active"
            },
            owner="seeder"
        )
        session.add(project)

        # 9. Invoices (2 Invoices)
        inv_1 = DocInstance(
            doctype_name="Invoice",
            name="INV-001",
            data={
                "name": "Invoice #1010",
                "customer": "CP-001",
                "total": 10000.00,
                "status": "Unpaid"
            },
            owner="seeder"
        )
        inv_2 = DocInstance(
            doctype_name="Invoice",
            name="INV-002",
            data={
                "name": "Invoice #1020",
                "customer": "CP-001",
                "total": 5000.00,
                "status": "Paid"
            },
            owner="seeder"
        )
        session.add_all([inv_1, inv_2])

        # 10. PaymentEntry (1 PaymentEntry covering 15000.00 value)
        payment = DocInstance(
            doctype_name="PaymentEntry",
            name="PAY-001",
            data={
                "amount": 15000.00,
                "payment_method": "Bank Transfer",
                "reference_doctype": "Sales",
                "reference_name": "SALES-001"
            },
            owner="seeder"
        )
        session.add(payment)

        # 11. Sales (1 Sales linked to PaymentEntry and marked Completed)
        sales = DocInstance(
            doctype_name="Sales",
            name="SALES-001",
            data={
                "amount": 15000.00,
                "status": "Completed",
                "contact": "CNT-001"
            },
            owner="seeder"
        )
        session.add(sales)
        await session.flush()

        # 12. Relations Mapping in doc_relations
        relations = [
            # Contacts linked to Counterparties
            DocRelation(source_type="Contact", source_id="CNT-001", target_type="Counterparty", target_id="CP-001", relation_type="BelongsTo"),
            DocRelation(source_type="Contact", source_id="CNT-002", target_type="Counterparty", target_id="CP-001", relation_type="BelongsTo"),
            DocRelation(source_type="Contact", source_id="CNT-003", target_type="Counterparty", target_id="CP-002", relation_type="BelongsTo"),
            # Deals linked to Counterparty
            DocRelation(source_type="Deal", source_id="DEAL-001", target_type="Counterparty", target_id="CP-001", relation_type="Customer"),
            DocRelation(source_type="Deal", source_id="DEAL-002", target_type="Counterparty", target_id="CP-001", relation_type="Customer"),
            # Project linked to 2 Deals
            DocRelation(source_type="Project", source_id="PROJ-001", target_type="Deal", target_id="DEAL-001", relation_type="AttachedTo"),
            DocRelation(source_type="Project", source_id="PROJ-001", target_type="Deal", target_id="DEAL-002", relation_type="AttachedTo"),
            # Sales linked to PaymentEntry
            DocRelation(source_type="Sales", source_id="SALES-001", target_type="PaymentEntry", target_id="PAY-001", relation_type="PaidBy")
        ]
        session.add_all(relations)

        await session.commit()
        logger("✅ Dummy ERP Seed Data generated successfully!")

def logger(msg: str):
    print(f"[{datetime.utcnow().isoformat()}] {msg}")

if __name__ == "__main__":
    asyncio.run(seed_all())