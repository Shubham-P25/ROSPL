import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Key,
  Lock,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Compass,
  Check,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import Button from "../../components/Button";
import {
  getStoredAiKey,
  saveStoredAiKey,
  removeStoredAiKey,
  generateDaySummary,
  generateInsiderTip,
} from "./aiService";

export default function AssistantPanel({
  destination,
  days = [],
  places = {},
  activeDay = 1,
}) {
  const [apiKey, setApiKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [dayNarrative, setDayNarrative] = useState("");
  const [insiderTip, setInsiderTip] = useState("");
  const [loadingAction, setLoadingAction] = useState(null); // 'narrative' | 'tip' | null
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const saved = getStoredAiKey();
    if (saved) {
      setApiKey(saved);
      setInputKey(saved);
    }
  }, []);

  const handleSaveKey = (e) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    saveStoredAiKey(inputKey);
    setApiKey(inputKey.trim());
    setShowKeyForm(false);
    setErrorMsg("");
  };

  const handleClearKey = () => {
    removeStoredAiKey();
    setApiKey("");
    setInputKey("");
    setDayNarrative("");
    setInsiderTip("");
    setShowKeyForm(false);
  };

  const currentDayData = days.find((d) => d.day === activeDay) || days[0];
  const dayPlaces = currentDayData?.items
    ?.map((it) => places[it.placeId])
    .filter(Boolean) || [];

  const handleGenerateNarrative = async () => {
    if (!apiKey) {
      setShowKeyForm(true);
      return;
    }
    setLoadingAction("narrative");
    setErrorMsg("");
    try {
      const narrative = await generateDaySummary({
        apiKey,
        destination,
        dayNumber: activeDay,
        places: dayPlaces,
      });
      setDayNarrative(narrative);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          "Could not generate day summary. Check your Gemini API key.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGenerateInsiderTip = async () => {
    if (!apiKey) {
      setShowKeyForm(true);
      return;
    }
    const targetPlace = dayPlaces[0] || { name: destination, category: "city" };
    setLoadingAction("tip");
    setErrorMsg("");
    try {
      const tip = await generateInsiderTip({
        apiKey,
        destination,
        placeName: targetPlace.name,
        category: targetPlace.category || "attraction",
      });
      setInsiderTip(tip);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.error?.message ||
          err.message ||
          "Could not fetch insider tip. Check your Gemini API key.",
      );
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-indigo-800/60 overflow-hidden">
      {/* Assistant Bar Header */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
            <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-white">
                Personal AI Expedition Concierge
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Optional BYOK
              </span>
            </div>
            <p className="text-xs text-indigo-200/70">
              {apiKey
                ? "Connected directly via your free Google Gemini key"
                : "Add a free Google Gemini key for instant day narratives & insider tips"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!apiKey && !showKeyForm && (
            <button
              type="button"
              onClick={() => {
                setShowKeyForm(true);
                setIsOpen(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Connect Free Key</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-800/40 transition-colors"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isOpen && (
        <div className="px-5 pb-6 pt-2 border-t border-indigo-800/40 space-y-5 animate-in fade-in">
          {/* Privacy Guarantee Banner */}
          <div className="flex items-center gap-2 text-[11px] text-indigo-200/80 bg-indigo-950/60 border border-indigo-800/50 rounded-lg p-2.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>100% Client-Side Privacy:</strong> Your key is stored strictly inside your browser's localStorage and is NEVER transmitted to or stored on our servers.
            </span>
          </div>

          {/* Key Management Form */}
          {(showKeyForm || !apiKey) && (
            <form onSubmit={handleSaveKey} className="bg-slate-900/80 p-4 rounded-xl border border-indigo-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  Enter Google Gemini Free API Key
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-300 hover:underline inline-flex items-center gap-1"
                >
                  <span>Get free key ($0, no card)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="Enter Gemini API key..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-indigo-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                >
                  Save Key
                </button>
              </div>
            </form>
          )}

          {/* Key Connected Controls */}
          {apiKey && !showKeyForm && (
            <div className="flex items-center justify-between text-xs text-indigo-300/80 bg-slate-900/50 p-2.5 rounded-lg border border-indigo-800/30">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Connected via Gemini 1.5 Flash</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowKeyForm(true)}
                  className="hover:underline text-indigo-300"
                >
                  Change Key
                </button>
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loadingAction === "narrative"}
              onClick={handleGenerateNarrative}
              className="px-3.5 py-2 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>
                {loadingAction === "narrative"
                  ? "Writing Day Narrative..."
                  : `Generate Day ${activeDay} Narrative`}
              </span>
            </button>

            <button
              type="button"
              disabled={loadingAction === "tip"}
              onClick={handleGenerateInsiderTip}
              className="px-3.5 py-2 bg-indigo-800/40 hover:bg-indigo-700/60 border border-indigo-600/40 text-indigo-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {loadingAction === "tip"
                  ? "Consulting Local Tips..."
                  : `Ask Insider Tip for ${destination}`}
              </span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl flex items-start gap-2 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Generated Day Narrative Card */}
          {dayNarrative && (
            <div className="p-4 bg-indigo-950/70 border border-indigo-700/60 rounded-xl space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Day {activeDay} Storyline</span>
              </div>
              <p className="text-sm text-indigo-100 leading-relaxed italic">
                "{dayNarrative}"
              </p>
            </div>
          )}

          {/* Generated Insider Tip Card */}
          {insiderTip && (
            <div className="p-4 bg-amber-950/50 border border-amber-600/50 rounded-xl space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Local Insider Secret</span>
              </div>
              <p className="text-sm text-amber-100 leading-relaxed">
                {insiderTip}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
