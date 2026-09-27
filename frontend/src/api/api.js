const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function handleResponse(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore parse failure, keep statusText */
    }
    const err = new Error(detail);
    err.response = { data: { detail } };
    throw err;
  }
  return res.json();
}

export async function processChat(payload) {
  const res = await fetch(`${API_BASE}/api/deviations/process-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function extractDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/deviations/extract-document`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function saveDeviation(payload) {
  const res = await fetch(`${API_BASE}/api/deviations/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function listDeviations() {
  const res = await fetch(`${API_BASE}/api/deviations`);
  return handleResponse(res);
}
