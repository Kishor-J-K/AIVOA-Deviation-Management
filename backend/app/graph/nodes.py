"""
LangGraph node functions.

Graph shape (see graph.py):

    entry -> extract_and_assess -> merge_state -> END

`extract_and_assess` calls the LLM once (Tool 1 / Tool 3 both land here for
initial logging + extraction; Tool 2 edits reuse the exact same node because
"edit" is just another turn with existing form_data already populated).
`merge_state` is pure Python and is where "strictly preserve all other
existing form data" is actually enforced -- we merge the model's partial
`formDataUpdates` on top of the previous full `form_data`, field by field.
"""
import logging

from app.graph.prompts import SYSTEM_PROMPT, build_user_turn_prompt, FORM_FIELDS, RISK_FIELDS
from app.graph.state import DeviationState
from app.services.groq_client import call_structured

logger = logging.getLogger(__name__)


def extract_and_assess(state: DeviationState) -> DeviationState:
    mode = state.get("mode", "chat")
    new_input = state.get("document_text") if mode == "document" else state.get("user_message")
    current_form = state.get("form_data") or {}
    current_risk = state.get("risk_assessment") or {}

    user_prompt = build_user_turn_prompt(mode, new_input or "", current_form, current_risk)

    try:
        result = call_structured(SYSTEM_PROMPT, user_prompt)
    except Exception as exc:  # noqa: BLE001 - surface any LLM/provider failure to the API layer
        logger.exception("LLM call failed")
        return {
            **state,
            "error": str(exc),
            "reply": "Sorry, I couldn't process that just now. Please try again.",
            "changed_fields": [],
        }

    return {
        **state,
        "llm_result": result,
    }


def merge_state(state: DeviationState) -> DeviationState:
    if state.get("error"):
        return state

    result = state.get("llm_result", {}) or {}
    current_form = dict(state.get("form_data") or {})
    updates = result.get("formDataUpdates", {}) or {}

    changed_fields = []
    for field in FORM_FIELDS:
        if field == "additionalFields":
            updates_for_field = updates.get(field) or []
            if updates_for_field:
                merged_fields = list(current_form.get(field) or [])
                for updated_field in updates_for_field:
                    label = (updated_field.get("label") or "").strip()
                    if not label:
                        continue
                    matching_index = next(
                        (
                            index
                            for index, existing_field in enumerate(merged_fields)
                            if existing_field.get("label", "").strip().casefold() == label.casefold()
                        ),
                        None,
                    )
                    if matching_index is None:
                        merged_fields.append(updated_field)
                        if field not in changed_fields:
                            changed_fields.append(field)
                    elif merged_fields[matching_index] != updated_field:
                        merged_fields[matching_index] = updated_field
                        if field not in changed_fields:
                            changed_fields.append(field)
                current_form[field] = merged_fields
            else:
                current_form.setdefault(field, [])
            continue
        if field in updates and updates[field] not in (None, ""):
            if current_form.get(field) != updates[field]:
                changed_fields.append(field)
            current_form[field] = updates[field]

    raw_risk = result.get("riskAssessment", {}) or {}
    new_risk = {field: raw_risk.get(field) for field in RISK_FIELDS}

    return {
        **state,
        "form_data": current_form,
        "risk_assessment": new_risk,
        "reply": result.get("reply", "Updated the deviation record."),
        "changed_fields": changed_fields,
    }
