const state = {
  sessionId: null,
};

const els = {
  chatLog: document.getElementById("chatLog"),
  fileInput: document.getElementById("fileInput"),
  uploadButton: document.getElementById("uploadButton"),
  uploadStatus: document.getElementById("uploadStatus"),
  sendButton: document.getElementById("sendButton"),
  messageInput: document.getElementById("messageInput"),
  template: document.getElementById("messageTemplate"),
  statusPill: document.getElementById("statusPill"),
  documentCount: document.getElementById("documentCount"),
  chunkCount: document.getElementById("chunkCount"),
  semanticSearch: document.getElementById("semanticSearch"),
  downloadPdf: document.getElementById("downloadPdf"),
  downloadCsv: document.getElementById("downloadCsv"),
};

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }
  return response.json();
}

async function ensureSession() {
  const cached = localStorage.getItem("fusion-rag-session");
  if (cached) {
    state.sessionId = cached;
    return;
  }
  const data = await jsonFetch("/api/session", { method: "POST" });
  state.sessionId = data.session_id;
  localStorage.setItem("fusion-rag-session", state.sessionId);
}

async function loadHealth() {
  const health = await jsonFetch("/api/health");
  els.documentCount.textContent = health.document_count;
  els.chunkCount.textContent = health.chunk_count;
  els.semanticSearch.textContent = health.semantic_search ? "On" : "Fallback";
}

function setStatus(text) {
  els.statusPill.textContent = text;
}

function appendMessage({ role, content, confidence = "", citations = [] }) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.querySelector(".role").textContent = role === "user" ? "You" : "Fusion RAG";
  node.querySelector(".meta").textContent = confidence ? `Grounding: ${confidence}` : "";
  node.querySelector(".message-body").textContent = content;

  const citationBox = node.querySelector(".citations");
  citations.forEach((citation) => {
    const div = document.createElement("div");
    div.className = "citation";
    div.textContent = `${citation.file_name} · chunk ${citation.chunk_index}`;
    div.title = citation.excerpt || "";
    citationBox.appendChild(div);
  });

  els.chatLog.appendChild(node);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
}

async function restoreSession() {
  if (!state.sessionId) return;
  try {
    const data = await jsonFetch(`/api/session/${state.sessionId}`);
    data.messages.forEach((message) => appendMessage(message));
  } catch {
    localStorage.removeItem("fusion-rag-session");
    await ensureSession();
  }
}

async function uploadFiles() {
  const files = els.fileInput.files;
  if (!files.length) {
    els.uploadStatus.textContent = "Choose one or more files first.";
    return;
  }
  const form = new FormData();
  [...files].forEach((file) => form.append("files", file));
  els.uploadButton.disabled = true;
  els.uploadStatus.textContent = "Indexing files...";
  setStatus("Indexing");

  try {
    const data = await jsonFetch("/api/upload", { method: "POST", body: form });
    const uploadedNames = data.uploaded.map((item) => item.file_name).join(", ");
    const failed = data.failed.map((item) => `${item.file}: ${item.error}`).join(" | ");
    els.uploadStatus.textContent = uploadedNames
      ? `Indexed: ${uploadedNames}${failed ? ` | Failed: ${failed}` : ""}`
      : `No files indexed. ${failed}`;
    await loadHealth();
    setStatus("Ready");
  } catch (error) {
    els.uploadStatus.textContent = error.message;
    setStatus("Upload failed");
  } finally {
    els.uploadButton.disabled = false;
  }
}

async function sendMessage() {
  const message = els.messageInput.value.trim();
  if (!message) return;

  appendMessage({ role: "user", content: message });
  els.messageInput.value = "";
  els.sendButton.disabled = true;
  setStatus("Retrieving");

  try {
    const data = await jsonFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: state.sessionId, message }),
    });
    appendMessage({
      role: "assistant",
      content: data.answer,
      confidence: data.confidence,
      citations: data.citations,
    });
    setStatus(data.grounded ? "Grounded response" : "Weak grounding");
  } catch (error) {
    appendMessage({ role: "assistant", content: `Error: ${error.message}`, confidence: "low" });
    setStatus("Error");
  } finally {
    els.sendButton.disabled = false;
  }
}

function downloadExport(type) {
  if (!state.sessionId) return;
  window.location.href = `/api/export/${state.sessionId}.${type}`;
}

els.uploadButton.addEventListener("click", uploadFiles);
els.sendButton.addEventListener("click", sendMessage);
els.downloadPdf.addEventListener("click", () => downloadExport("pdf"));
els.downloadCsv.addEventListener("click", () => downloadExport("csv"));
els.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

async function boot() {
  await ensureSession();
  await loadHealth();
  await restoreSession();
}

boot();
