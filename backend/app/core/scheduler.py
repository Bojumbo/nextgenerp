import uuid
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.future import select
from fastapi import FastAPI

from app.models.erp import AutomationRule
from app.core.logging import logger
from app.core.automation import execute_action

scheduler = AsyncIOScheduler()

async def run_scheduled_job(rule_id_str: str):
    """
    Scheduled cron job execution runner.
    Resolves session and triggers sandbox script execution.
    """
    from app.core.database import async_session_maker
    
    logger.info("Triggering scheduled automation rule", rule_id=rule_id_str)
    
    async with async_session_maker() as db:
        rule_res = await db.execute(
            select(AutomationRule).where(AutomationRule.id == uuid.UUID(rule_id_str))
        )
        rule = rule_res.scalar_one_or_none()
        if not rule or not rule.is_active:
            logger.warn("Scheduled rule not found or inactive", rule_id=rule_id_str)
            return

        context = {
            "doc": {},
            "event_type": "OnSchedule"
        }
        
        action_type = "Script"
        if rule.action_code.strip().startswith("http://") or rule.action_code.strip().startswith("https://"):
            action_type = "Webhook"

        try:
            await execute_action(rule.action_code, action_type, context, db)
            logger.info("Successfully executed scheduled automation", rule_name=rule.name)
        except Exception as e:
            logger.error("Scheduled job execution failed", rule_name=rule.name, error=str(e))

async def start_scheduler(app: FastAPI):
    """
    Initializes and starts the periodic scheduler on server startup.
    Loads active cron automation rules from database.
    """
    from app.core.database import async_session_maker
    logger.info("Starting APScheduler engine...")

    async with async_session_maker() as db:
        # Check database rules for type OnSchedule (or cron-based rules)
        # Note: to allow cron expression scheduling, rules must have event = "OnSchedule"
        # and condition_code used to store cron strings (or metadata).
        # To be extremely clean, we will evaluate if event = "OnSchedule" and condition_code matches crontab formats (e.g. "*/5 * * * *").
        res = await db.execute(
            select(AutomationRule).where(
                (AutomationRule.event == "OnSchedule") &
                (AutomationRule.is_active == True)
            )
        )
        rules = res.scalars().all()
        
        logger.info("Found scheduled automation rules", count=len(rules))
        
        for rule in rules:
            cron_expr = rule.condition_code or "*/5 * * * *"  # default to every 5 minutes if missing
            try:
                trigger = CronTrigger.from_crontab(cron_expr)
                scheduler.add_job(
                    run_scheduled_job,
                    trigger,
                    args=[str(rule.id)],
                    id=str(rule.id),
                    replace_existing=True
                )
                logger.info("Registered scheduled automation job", rule=rule.name, cron=cron_expr)
            except Exception as e:
                logger.error("Failed to parse cron trigger for rule", rule=rule.name, cron=cron_expr, error=str(e))

    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("APScheduler started successfully")

async def shutdown_scheduler():
    """
    Stops scheduler threads gracefully.
    """
    logger.info("Stopping APScheduler...")
    scheduler.shutdown()
