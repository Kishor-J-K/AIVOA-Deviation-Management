"""
Extracts raw text from an uploaded deviation report so it can be fed to the
LLM as if it were a chat message. Supports PDF, plain text, and .eml email
files (best-effort; falls back to raw bytes decode for anything else).
"""
import io
from email import message_from_bytes
from email.policy import default as email_default_policy

import pdfplumber


def extract_text_from_upload(filename: str, content: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".pdf"):
        return _extract_pdf(content)
    if lower.endswith(".eml"):
        return _extract_eml(content)
    # .txt and anything else text-like
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="ignore")


def _extract_pdf(content: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def _extract_eml(content: bytes) -> str:
    msg = message_from_bytes(content, policy=email_default_policy)
    parts = [f"Subject: {msg.get('subject', '')}", f"From: {msg.get('from', '')}", ""]

    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                parts.append(part.get_content())
    else:
        parts.append(msg.get_content())

    return "\n".join(parts).strip()
