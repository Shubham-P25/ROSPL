import React from "react";
import { Sparkles } from "lucide-react";
import { playDrawerWhoosh } from "../lib/sound";

export const AssistantFab = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  const handleClick = () => {
    playDrawerWhoosh();
    if (onClick) onClick();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 group">
      {/* Soft pulsing aura ring */}
      <div className="absolute -inset-1 rounded-full bg-[#6C2F00]/30 animate-ping opacity-75 pointer-events-none" />

      <button
        type="button"
        onClick={handleClick}
        aria-label="Ask PackGo Assistant"
        className="relative w-14 h-14 rounded-full bg-[#6C2F00] hover:bg-[#8C4A1F] text-white shadow-xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#6C2F00] focus:ring-offset-2"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
      </button>

      {/* Tooltip on hover */}
      <div className="absolute right-16 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded bg-[#1C1B1B] text-[#FAF8F7] text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
        Ask PackGo
      </div>
    </div>
  );
};

export default AssistantFab;

