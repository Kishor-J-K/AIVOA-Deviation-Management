"""
LangGraph state schema.

This TypedDict is threaded through every node in the graph. It always holds
the FULL current form + risk assessment (not a diff), which is what lets the
"edit" flow strictly preserve untouched fields: nodes merge the LLM's partial
update on top of `form_data` rather than replacing it outright.
"""
from typing import TypedDict, List, Dict, Any, Optional


class DeviationState(TypedDict, total=False):
    # Inputs
    mode: str                       # "chat" | "document"
    user_message: str               # latest user chat message (mode == "chat")
    document_text: str              # extracted raw text (mode == "document")
    conversation: List[Dict[str, str]]  # prior turns: [{"role": "user"/"assistant", "content": str}]

    # Running state (source of truth, merged across turns)
    form_data: Dict[str, Any]
    risk_assessment: Dict[str, Any]

    # Outputs of this turn
    reply: str
    changed_fields: List[str]
    error: Optional[str]

    # Internal scratch space: raw parsed JSON from the LLM call, consumed by
    # merge_state(). Must be declared here -- LangGraph only propagates keys
    # that are part of the state schema; anything else is silently dropped.
    llm_result: Dict[str, Any]
