"""
Thin wrapper around the Groq SDK.

Kept separate from graph/nodes.py so the LangGraph flow doesn't care which
LLM provider is behind it, and so this is the one place that needs updating
if you swap models (e.g. llama-3.3-70b-versatile <-> gemma2-9b-it) or add
retry/backoff logic.
"""
import json
import logging

from groq import Groq

from app.config import settings

logger = logging.getLogger(__name__)

_client: Groq | None = None


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.groq_api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env (see .env.example)."
            )
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def call_structured(system_prompt: str, user_prompt: str, temperature: float = 0.0) -> dict:
    """
    Calls Groq chat completions with JSON-mode enforced, and returns the
    parsed dict. Raises ValueError if the model does not return valid JSON
    (rare with JSON mode, but we don't want a bad turn to corrupt state).
    """
    client = get_client()
    completion = client.chat.completions.create(
        model=settings.groq_model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    raw = completion.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Groq returned non-JSON content: %s", raw)
        raise ValueError(f"Model did not return valid JSON: {exc}") from exc
