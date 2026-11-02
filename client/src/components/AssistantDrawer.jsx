import React, { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { assistantApi } from "../services/api/assistantApi";
import { playAssistantChime, isSoundEnabled, setSoundEnabled } from "../lib/sound";
import {
  Sparkles,
  X,
  Send,
  Volume2,
  VolumeX,
  Undo2,
  Check,
  AlertCircle,
  HelpCircle,
  Compass,
  ArrowRight,
  Loader2,
} from "lucide-react";

/**
 * Safe markdown parser without dangerouslySetInnerHTML
 */
function renderSafeMarkdown(content) {
  if (!content) return null;
  const lines = String(content).split("\n");

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, lIdx) => {
        if (!line.trim()) return <div key={lIdx} className="h-1" />;

        const isBullet = line.trim().startsWith("•") || line.trim().startsWith("- ");
        const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, "") : line;

        // Parse bold **text**
        const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
        const renderedParts = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-bold text-[#1C1B1B]">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-1.5 pl-1">
              <span className="text-[#6C2F00] font-bold">•</span>
              <span className="flex-1">{renderedParts}</span>
            </div>
          );
        }

        return <p key={lIdx}>{renderedParts}</p>;
      })}
    </div>
  );
}

const SUGGESTIONS = [
  "Recommend my packing list",
  "Split my budget",
  "Check weather forecast",
  "How do I get there?",
];

export const AssistantDrawer = ({ isOpen, onClose }) => {
  const location = useLocation();
  const params = useParams();

  // Extract tripId if current page is within a trip
  const tripMatch = location.pathname.match(/\/trips\/([a-zA-Z0-9_-]+)/);
  const currentTripId = params.id || tripMatch?.[1] || null;

  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I am **PackGo Assistant**, your travel helper for India. I can recommend packing checklists, optimize your budget, check live weather, or guide your itinerary. How can I help you today?",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    setInputText("");
    setRateLimited(false);

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await assistantApi.chat({
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        tripId: currentTripId,
      });

      const reply = res.data?.message?.content || "I have received your request.";
      const pendingAction = res.data?.pendingAction || null;
      const appliedAction = res.data?.appliedAction || null;
      const citations = res.data?.citations || [];

      playAssistantChime();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          pendingAction,
          appliedAction,
          citations,
        },
      ]);
    } catch (err) {
      if (err.response?.status === 429) {
        setRateLimited(true);
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm temporarily experiencing high demand. Please try asking again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAction = async (msgIndex, actionId) => {
    setActionLoading(actionId);
    try {
      const res = await assistantApi.applyAction(actionId);
      if (res.data?.success) {
        setMessages((prev) =>
          prev.map((m, idx) => {
            if (idx === msgIndex) {
              return {
                ...m,
                pendingAction: null,
                appliedAction: {
                  id: actionId,
                  description: "Changes applied to your trip itinerary.",
                },
              };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error("Failed to apply action:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndoAction = async (msgIndex, actionId) => {
    setActionLoading(actionId);
    try {
      const res = await assistantApi.undoAction(actionId);
      if (res.data?.success) {
        setMessages((prev) =>
          prev.map((m, idx) => {
            if (idx === msgIndex) {
              return {
                ...m,
                appliedAction: null,
                content: m.content + "\n\n*(Changes were reverted)*",
              };
            }
            return m;
          })
        );
      }
    } catch (err) {
      console.error("Failed to undo action:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end sm:justify-end sm:p-6 pointer-events-none">
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 sm:hidden pointer-events-auto"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full sm:w-[410px] h-[85vh] sm:h-[580px] bg-[#FFFFFF] rounded-t-2xl sm:rounded-xl shadow-2xl border border-[#E5E2E1] flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-[#6C2F00] text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#FFDBC9]" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="font-serif font-bold text-sm tracking-wide">
                  PackGo Assistant
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              </div>
              <p className="text-[10px] text-[#FFDBC9]/80 font-sans">
                {currentTripId ? "Active trip context attached" : "Travel planning mode"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={toggleSound}
              className="p-1.5 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors"
              title={soundOn ? "Mute assistant sounds" : "Enable assistant sounds"}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-white/50" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded hover:bg-white/10 transition-colors"
              title="Close assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 bg-[#FAF8F7] border-b border-[#E5E2E1] overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
          {SUGGESTIONS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip)}
              disabled={loading}
              className="px-2.5 py-1 bg-[#FFFFFF] hover:bg-[#FFDBC9] border border-[#E5E2E1] rounded-full text-[11px] font-medium text-[#54433A] hover:text-[#6C2F00] whitespace-nowrap transition-colors flex items-center gap-1 shadow-2xs"
            >
              <span>{chip}</span>
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FCF9F8]">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 text-xs ${
                  msg.role === "user"
                    ? "bg-[#6C2F00] text-white rounded-br-none"
                    : "bg-[#FFFFFF] text-[#1C1B1B] border border-[#E5E2E1] shadow-2xs rounded-bl-none"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  renderSafeMarkdown(msg.content)
                )}

                {/* Citations Chips */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#E5E2E1] flex flex-wrap gap-1">
                    {msg.citations.map((c, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#FAF8F7] border border-[#E5E2E1] text-[#877369]"
                      >
                        <Compass className="w-2.5 h-2.5 text-[#6C2F00]" />
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Action Card */}
              {msg.pendingAction && (
                <div className="w-[85%] mt-2 p-3 bg-[#FFFFFF] border border-[#6C2F00]/30 rounded-md shadow-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6C2F00]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Proposed Change</span>
                  </div>
                  <p className="text-[11px] text-[#54433A]">
                    {msg.pendingAction.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleApplyAction(idx, msg.pendingAction.id)}
                      disabled={actionLoading === msg.pendingAction.id}
                      className="px-3 py-1 bg-[#6C2F00] hover:bg-[#8C4A1F] text-white text-[11px] font-semibold rounded flex items-center gap-1 transition-colors"
                    >
                      {actionLoading === msg.pendingAction.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setMessages((prev) =>
                          prev.map((m, i) => (i === idx ? { ...m, pendingAction: null } : m))
                        )
                      }
                      className="px-2.5 py-1 text-[#877369] hover:text-[#BA1A1A] text-[11px] font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Applied Action Card with Undo */}
              {msg.appliedAction && (
                <div className="w-[85%] mt-2 p-2.5 bg-[#FAF8F7] border border-[#E5E2E1] rounded-md flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#54433A]">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{msg.appliedAction.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUndoAction(idx, msg.appliedAction.id)}
                    disabled={actionLoading === msg.appliedAction.id}
                    className="px-2.5 py-0.5 bg-[#E5E2E1] hover:bg-[#DAC2B6] text-[#6C2F00] text-[10px] font-bold rounded flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <Undo2 className="w-3 h-3" />
                    Undo
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-center space-x-1.5 p-3 bg-white border border-[#E5E2E1] rounded-lg rounded-bl-none w-16 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C2F00] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C2F00] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#6C2F00] animate-bounce" />
            </div>
          )}

          {rateLimited && (
            <div className="p-2.5 bg-[#FFDAD6] text-[#BA1A1A] text-xs rounded border border-[#FFDAD6]">
              Rate limit reached. Please wait a minute before sending another request.
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#FFFFFF] border-t border-[#E5E2E1] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about packing, routes, weather, or budget..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 bg-[#FAF8F7] border border-[#E5E2E1] rounded-full text-xs focus:outline-none focus:border-[#6C2F00] focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="w-9 h-9 rounded-full bg-[#6C2F00] hover:bg-[#8C4A1F] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-[#877369] text-center pt-2">
            PackGo Assistant can make mistakes. Verify critical travel and schedule facts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssistantDrawer;
