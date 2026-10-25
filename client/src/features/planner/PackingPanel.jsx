import React, { useState } from "react";
import { CheckSquare, Square, Plus } from "lucide-react";
import Button from "../../components/Button";

export const PackingPanel = ({ packing = [] }) => {
  const [items, setItems] = useState(() =>
    packing.map((p, idx) => ({
      id: idx,
      item: p.item,
      reason: p.reason,
      checked: false,
    })),
  );
  const [customText, setCustomText] = useState("");

  const toggleCheck = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)),
    );
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customText.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        item: customText.trim(),
        reason: "Custom personal item",
        checked: false,
      },
    ]);
    setCustomText("");
  };

  const packedCount = items.filter((i) => i.checked).length;
  const progressPct = items.length > 0 ? Math.round((packedCount / items.length) * 100) : 0;

  return (
    <div className="bg-white border border-[#E5E2E1] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2EFEF]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00]">
            INTELLIGENT RECOMMENDATIONS
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Packing Essentials
          </h3>
          <p className="text-xs text-[#54433A] mt-1">
            Tailored dynamically to forecasted weather, monuments visited, and trip duration.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#877369]">
            {packedCount} of {items.length} packed
          </div>
          <div className="text-lg font-bold text-[#6C2F00]">{progressPct}% Packed</div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.id}
            onClick={() => toggleCheck(it.id)}
            className={`p-3.5 rounded-lg border flex items-start space-x-3 cursor-pointer transition-all ${
              it.checked
                ? "bg-[#F9F7F6] border-[#E5E2E1] opacity-75"
                : "bg-white border-[#E5E2E1] hover:border-[#DAC2B6]"
            }`}
          >
            <div className="mt-0.5 text-[#6C2F00] shrink-0">
              {it.checked ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4 text-[#877369]" />
              )}
            </div>
            <div className="flex-1 space-y-0.5">
              <span
                className={`text-xs font-bold text-[#1C1B1B] ${
                  it.checked ? "line-through text-[#877369]" : ""
                }`}
              >
                {it.item}
              </span>
              {it.reason && (
                <p className="text-[11px] text-[#877369]">{it.reason}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add custom item */}
      <form onSubmit={handleAddCustom} className="flex gap-2 pt-2">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Add custom packing item..."
          className="flex-1 px-3 py-2 bg-[#FAF8F7] border border-[#DAC2B6] rounded text-xs text-[#1C1B1B] focus:outline-none focus:border-[#6C2F00]"
        />
        <Button variant="outline" size="sm" type="submit">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Item
        </Button>
      </form>
    </div>
  );
};

export default PackingPanel;
