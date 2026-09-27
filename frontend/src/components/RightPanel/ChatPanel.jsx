import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sendChatMessage, uploadDeviationDocument } from "../../store/deviationSlice";

function ZapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5 12.5 20a4.5 4.5 0 0 1-6.4-6.4L14.6 5a3 3 0 0 1 4.2 4.3l-8.6 8.5a1.5 1.5 0 0 1-2.1-2.1l7.9-7.8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AiAvatar({ variant }) {
  return <div className={`avatar avatar--ai avatar--${variant}`}>{variant === "check" ? <CheckIcon /> : <ZapIcon />}</div>;
}

function UserAvatar() {
  return (
    <div className="avatar avatar--user">
      <PersonIcon />
    </div>
  );
}

function TextMessage({ role, content, avatarVariant }) {
  if (role === "assistant") {
    return (
      <div className="message-row message-row--assistant">
        <AiAvatar variant={avatarVariant} />
        <div className="bubble bubble--assistant">{content}</div>
      </div>
    );
  }
  return (
    <div className="message-row message-row--user">
      <div className="bubble bubble--user">{content}</div>
      <UserAvatar />
    </div>
  );
}

function FileMessage({ fileName, fileKind }) {
  return (
    <div className="message-row message-row--user">
      <div className="file-card">
        <div className="file-card__icon">📄</div>
        <div>
          <div className="file-card__name">{fileName}</div>
          <div className="file-card__kind">{fileKind}</div>
        </div>
      </div>
      <UserAvatar />
    </div>
  );
}

export default function ChatPanel() {
  const dispatch = useDispatch();
  const { conversation, chatStatus, pendingAction } = useSelector((s) => s.deviation);
  const [draft, setDraft] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, chatStatus]);

  const send = () => {
    const trimmed = draft.trim();
    if (!trimmed || chatStatus === "loading") return;
    dispatch(sendChatMessage(trimmed));
    setDraft("");
  };

  const handleFile = (file) => {
    if (!file || chatStatus === "loading") return;
    dispatch(uploadDeviationDocument(file));
  };

  const loadingLabel = pendingAction === "document" ? "Extracting fields via document parser…" : "Analyzing…";

  return (
    <div
      className={`chat-panel ${dragActive ? "chat-panel--drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="chat-panel__header">
        <div className="chat-panel__brand">
          <span className="chat-panel__brand-icon">🧪</span>
          <div>
            <h2>AI Deviation Assistant</h2>
            <p className="panel-heading__subtitle">Drop a supporting document or paste deviation details below.</p>
          </div>
        </div>
        <span className={`online-dot ${conversation.length > 1 ? "online-dot--ready" : ""}`} title="Online" />
      </div>

      <div className="chat-panel__messages" ref={scrollRef}>
        {conversation.map((m, i) =>
          m.type === "file" ? (
            <FileMessage key={i} fileName={m.fileName} fileKind={m.fileKind} />
          ) : (
            <TextMessage
              key={i}
              role={m.role}
              content={m.content}
              avatarVariant={i === 0 ? "zap" : "check"}
            />
          )
        )}
        {chatStatus === "loading" && (
          <div className="message-row message-row--assistant">
            <AiAvatar variant="zap" />
            <div className="bubble bubble--assistant bubble--loading">
              <span>{loadingLabel}</span>
              <span className="loading-bar">
                <span className="loading-bar__fill" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="chat-panel__composer">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.eml"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          className="composer__icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={chatStatus === "loading"}
          title="Attach a deviation report (PDF, email, text)"
        >
          <PaperclipIcon />
        </button>
        <input
          className="composer__input"
          type="text"
          placeholder="Ask anything about deviations…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          type="button"
          className="composer__send-btn"
          onClick={send}
          disabled={chatStatus === "loading" || !draft.trim()}
        >
          <SendIcon />
        </button>
      </div>

      <div className="chat-panel__footer">
        <span className="powered-by">Powered by LangGraph</span>
      </div>
    </div>
  );
}
