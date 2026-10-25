import React from "react";
import { DollarSign, AlertCircle, PieChart, ShieldCheck } from "lucide-react";

export const BudgetPanel = ({ budget, currency = "INR", warnings = [] }) => {
  if (!budget) return null;

  const { stay = 0, food = 0, transport = 0, activities = 0, buffer = 0 } = budget;
  const total = stay + food + transport + activities + buffer;

  const categories = [
    { label: "Accommodation & Stay", amount: stay, pct: 40, color: "bg-[#6C2F00]" },
    { label: "Food & Culinary", amount: food, pct: 25, color: "bg-[#D97706]" },
    { label: "Local Transport", amount: transport, pct: 15, color: "bg-[#2563EB]" },
    { label: "Sightseeing & Activities", amount: activities, pct: 15, color: "bg-[#16A34A]" },
    { label: "Emergency Buffer", amount: buffer, pct: 5, color: "bg-[#71717A]" },
  ];

  return (
    <div className="bg-white border border-[#E5E2E1] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2EFEF]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00]">
            ESTIMATED BUDGET SPLIT
          </span>
          <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
            Recommended Allocation
          </h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#877369]">Total Projected Budget</div>
          <div className="text-2xl font-bold text-[#6C2F00]">
            {currency === "INR" ? "₹" : "$"}
            {total.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="p-4 bg-[#FFF4ED] border border-[#FFD9C2] rounded-lg text-xs text-[#6C2F00] space-y-1">
          {warnings.map((w, idx) => (
            <div key={idx} className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#6C2F00]" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Allocation Breakdown Bar */}
      <div className="space-y-2">
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
          {categories.map((c, i) => (
            <div
              key={i}
              className={`${c.color} h-full`}
              style={{ width: `${c.pct}%` }}
              title={`${c.label}: ${c.pct}%`}
            />
          ))}
        </div>
      </div>

      {/* Grid of Split Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-[#F2EFEF] bg-[#FAF8F7] flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#54433A]">{c.label}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white text-[#6C2F00] border border-[#DAC2B6]">
                {c.pct}%
              </span>
            </div>
            <div className="text-lg font-bold text-[#1C1B1B]">
              {currency === "INR" ? "₹" : "$"}
              {c.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetPanel;
