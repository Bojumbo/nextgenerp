import datetime
from typing import Dict, Any, List
from RestrictedPython import compile_restricted, safe_globals
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.models.erp import DocInstance, AutomationRule
from app.core.logging import logger

def check_condition(condition_code: str, context: Dict[str, Any]) -> bool:
    """
    Safely executes a conditional Python block using RestrictedPython.
    Expects the code to set `result` (e.g. `result = doc["data"].get("status") == "Completed"`).
    """
    if not condition_code or not condition_code.strip():
        return True

    # Setup sandbox global space
    glb = safe_globals.copy()
    glb.update(context)
    glb["result"] = False

    try:
        byte_code = compile_restricted(condition_code, filename='<condition>', mode='exec')
        # Execute in sandbox context
        exec(byte_code, glb)
        return bool(glb.get("result", False))
    except Exception as e:
        logger.error("Automation rule condition evaluation failed", error=str(e), code=condition_code)
        return False

async def execute_action(
    action_code: str, 
    action_type: str, 
    context: Dict[str, Any], 
    db: AsyncSession
):
    """
    Executes the action (either python script via RestrictedPython or Webhook).
    """
    if action_type == "Script":
        glb = safe_globals.copy()
        glb.update(context)
        glb["db"] = db
        glb["datetime"] = datetime
        glb["print"] = print

        try:
            logger.info("Running automation action script in RestrictedPython sandbox...")
            byte_code = compile_restricted(action_code, filename='<action>', mode='exec')
            exec(byte_code, glb)
        except Exception as e:
            logger.error("Automation rule action script failed", error=str(e), code=action_code)
            
    elif action_type == "Webhook":
        webhook_url = action_code.strip()
        doc = context.get("doc", {})
        event_type = context.get("event_type", "event")

        payload = {
            "event": event_type,
            "document": {
                "doctype_name": doc.get("doctype_name"),
                "name": doc.get("name"),
                "data": doc.get("data")
            },
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

        logger.info("Triggering outgoing webhook", url=webhook_url, doc=doc.get("name"))
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(webhook_url, json=payload)
                logger.info("Webhook response received", url=webhook_url, status=resp.status_code)
        except Exception as e:
            logger.error("Webhook trigger failed", url=webhook_url, error=str(e))

async def trigger_automations(
    doctype_name: str,
    event_type: str,
    doc_instance: DocInstance,
    db: AsyncSession
):
    """
    Event listener query and rule triggers wrapper.
    """
    # Query active rules for this doctype and event
    q = select(AutomationRule).where(
        (AutomationRule.doctype_name == doctype_name) &
        (AutomationRule.event == event_type) &
        (AutomationRule.is_active == True)
    )
    res = await db.execute(q)
    rules = res.scalars().all()
    
    if not rules:
        return
        
    logger.info("Triggering automation rules", doctype=doctype_name, event=event_type, count=len(rules))
    
    # Render document values context
    doc_context = {
        "id": str(doc_instance.id),
        "doctype_name": doc_instance.doctype_name,
        "name": doc_instance.name,
        "data": doc_instance.data,
        "owner": doc_instance.owner
    }
    
    context = {
        "doc": doc_context,
        "event_type": event_type
    }
    
    for rule in rules:
        try:
            # Check condition
            met = check_condition(rule.condition_code, context)
            if met:
                logger.info("Automation condition met, executing action", rule_name=rule.name)
                # Resolve action type
                action_type = "Script"
                if rule.action_code.startswith("http://") or rule.action_code.startswith("https://"):
                    action_type = "Webhook"
                await execute_action(rule.action_code, action_type, context, db)
        except Exception as ex:
            logger.error("Failed to execute rule trigger", rule_name=rule.name, error=str(ex))
