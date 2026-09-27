"""
Assembles the LangGraph StateGraph used by both the chat (log/edit) flow and
the document-extraction flow. Both flows share one graph -- the only
difference between "log", "edit", and "extract from document" is what's
already in `form_data` and whether the input came from `user_message` or
`document_text` (mode="chat" vs mode="document").
"""
from langgraph.graph import StateGraph, END

from app.graph.state import DeviationState
from app.graph.nodes import extract_and_assess, merge_state

_graph = None


def build_graph():
    workflow = StateGraph(DeviationState)
    workflow.add_node("extract_and_assess", extract_and_assess)
    workflow.add_node("merge_state", merge_state)

    workflow.set_entry_point("extract_and_assess")
    workflow.add_edge("extract_and_assess", "merge_state")
    workflow.add_edge("merge_state", END)

    return workflow.compile()


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def run_turn(mode: str, form_data: dict, risk_assessment: dict, conversation: list,
             user_message: str = "", document_text: str = "") -> DeviationState:
    graph = get_graph()
    initial_state: DeviationState = {
        "mode": mode,
        "user_message": user_message,
        "document_text": document_text,
        "conversation": conversation,
        "form_data": form_data,
        "risk_assessment": risk_assessment,
    }
    return graph.invoke(initial_state)
