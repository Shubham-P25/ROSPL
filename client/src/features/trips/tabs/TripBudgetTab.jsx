import React, { useState, useEffect } from "react";
import { expensesApi } from "../../../services/api/expensesApi";
import { tripsApi } from "../../../services/api/tripsApi";
import { getErrorMessage } from "../../../services/api/client";
import Button from "../../../components/Button";
import FormField from "../../../components/FormField";
import Modal from "../../../components/Modal";
import Badge from "../../../components/Badge";
import LoadingState from "../../../components/LoadingState";
import EmptyState from "../../../components/EmptyState";
import {
  DollarSign,
  Plus,
  Trash2,
  PieChart,
  Calendar,
  AlertCircle,
  TrendingUp,
  Users,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";

const CATEGORY_KEYS = [
  { key: "stay", label: "Accommodation & Stay", expCat: "Accommodation", color: "#6C2F00" },
  { key: "transport", label: "Transit & Travel", expCat: "Transportation", color: "#8C4A1F" },
  { key: "food", label: "Dining & Food", expCat: "Food", color: "#B3622A" },
  { key: "activities", label: "Activities & Sightseeing", expCat: "Activities", color: "#3B6939" },
  { key: "shopping", label: "Shopping & Souvenirs", expCat: "Shopping", color: "#7B553C" },
  { key: "buffer", label: "Emergency Buffer", expCat: "Other", color: "#54433A" },
];

export const TripBudgetTab = ({ trip, onTripUpdate }) => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Budget Recommendation State
  const [budgetPlan, setBudgetPlan] = useState(trip?.budgetPlan || null);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planCategories, setPlanCategories] = useState({
    stay: 0,
    transport: 0,
    food: 0,
    activities: 0,
    shopping: 0,
    buffer: 0,
  });
  const [planNotes, setPlanNotes] = useState([]);
  const [targetTotal, setTargetTotal] = useState(Number(trip?.budget) || 12000);

  const numberOfPeople = Math.max(1, Number(trip?.numberOfPeople) || 1);

  const [formData, setFormData] = useState({
    amount: "",
    currency: "INR",
    category: "Food",
    description: "",
    date: trip.startDate
      ? trip.startDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
  });

  const categories = [
    "Accommodation",
    "Transportation",
    "Food",
    "Activities",
    "Shopping",
    "Other",
  ];

  const fetchExpensesData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expRes, sumRes] = await Promise.all([
        expensesApi.getByTrip(trip._id),
        expensesApi.getSummary(trip._id),
      ]);
      setExpenses(expRes.data?.data || expRes.data || []);
      setSummary(sumRes.data || []);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      setError("Unable to load budget records for this journey.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip._id) {
      fetchExpensesData();
      if (trip.budgetPlan?.categories) {
        setBudgetPlan(trip.budgetPlan);
        setPlanCategories({ ...trip.budgetPlan.categories });
        setPlanNotes(trip.budgetPlan.notes || []);
      }
      if (trip.budget) {
        setTargetTotal(Number(trip.budget));
      }
    }
  }, [trip._id, trip.budgetPlan, trip.budget]);

  const handleFetchRecommendation = async (overrideTotal) => {
    setRecommending(true);
    try {
      const budgetAmount = overrideTotal !== undefined ? overrideTotal : (targetTotal || trip.budget || 12000);
      const res = await tripsApi.recommendBudget(trip._id, {
        total: budgetAmount,
        people: numberOfPeople,
      });

      if (res.data?.data) {
        const prop = res.data.data;
        setPlanCategories(prop.categories);
        setPlanNotes(prop.notes || []);
        setTargetTotal(prop.total);
        setIsRecommendOpen(true);
      }
    } catch (err) {
      console.error("Failed to recommend budget:", err);
    } finally {
      setRecommending(false);
    }
  };

  const handleSliderChange = (changedKey, newVal) => {
    const val = Math.max(0, Math.round(Number(newVal) / 50) * 50);
    const updated = { ...planCategories, [changedKey]: val };

    if (changedKey === "buffer") {
      setPlanCategories(updated);
      return;
    }

    // Keep total fixed by absorbing in buffer
    const nonBufferSum = CATEGORY_KEYS
      .filter((c) => c.key !== "buffer")
      .reduce((sum, c) => sum + (c.key === changedKey ? val : (updated[c.key] || 0)), 0);

    const remainder = targetTotal - nonBufferSum;
    updated.buffer = Math.max(0, remainder);

    setPlanCategories(updated);
  };

  const handleApplyBudgetPlan = async () => {
    setSavingPlan(true);
    try {
      const res = await tripsApi.saveBudgetPlan(trip._id, {
        categories: planCategories,
        source: "customized",
        notes: planNotes,
        updateTripBudget: true,
      });

      if (res.data?.data) {
        setBudgetPlan(res.data.data);
        setIsRecommendOpen(false);
        if (onTripUpdate) {
          onTripUpdate({ ...trip, budgetPlan: res.data.data, budget: res.data.budget });
        }
      }
    } catch (err) {
      console.error("Failed to save budget plan:", err);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setFormError("");

    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be a positive number.");
      return;
    }

    setFormLoading(true);
    try {
      await expensesApi.create({
        trip: trip._id,
        amount: parsedAmount,
        currency: formData.currency,
        category: formData.category,
        description: formData.description.trim(),
        date: formData.date,
      });
      setIsAddModalOpen(false);
      setFormData({
        amount: "",
        currency: "INR",
        category: "Food",
        description: "",
        date: trip.startDate
          ? trip.startDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
      });
      await fetchExpensesData();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to record expense."));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await expensesApi.delete(id);
      await fetchExpensesData();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  // Calculate totals
  const totalSpent = expenses.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const plannedBudget = Number(trip.budget) || targetTotal || 0;
  const budgetRemaining = plannedBudget - totalSpent;
  const percentUsed =
    plannedBudget > 0
      ? Math.min(100, Math.round((totalSpent / plannedBudget) * 100))
      : 0;

  // Calculate per-person split metrics
  const perPersonBudget = Math.round(plannedBudget / numberOfPeople);
  const perPersonSpent = Math.round(totalSpent / numberOfPeople);
  const perPersonRemaining = Math.round(budgetRemaining / numberOfPeople);

  // Spent amounts grouped by standard category key
  const spentByCatKey = {
    stay: 0,
    transport: 0,
    food: 0,
    activities: 0,
    shopping: 0,
    buffer: 0,
  };

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    const cat = (exp.category || "").toLowerCase();
    if (cat.includes("accom") || cat.includes("hotel") || cat.includes("stay")) {
      spentByCatKey.stay += amt;
    } else if (cat.includes("trans") || cat.includes("travel") || cat.includes("flight") || cat.includes("train")) {
      spentByCatKey.transport += amt;
    } else if (cat.includes("food") || cat.includes("dining") || cat.includes("restaurant") || cat.includes("eat")) {
      spentByCatKey.food += amt;
    } else if (cat.includes("activ") || cat.includes("sight") || cat.includes("tour")) {
      spentByCatKey.activities += amt;
    } else if (cat.includes("shop") || cat.includes("souvenir")) {
      spentByCatKey.shopping += amt;
    } else {
      spentByCatKey.buffer += amt;
    }
  }

  return (
    <div className="space-y-10">
      {/* Traveler Party Distribution Banner */}
      <div className="bg-[#FAF8F7] border border-[#E5E2E1] p-4 sm:p-5 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#6C2F00]/10 flex items-center justify-center text-[#6C2F00]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm text-[#1C1B1B]">
              Expense Split Across {numberOfPeople} {numberOfPeople === 1 ? "Traveler" : "Travelers"}
            </h4>
            <p className="text-xs text-[#54433A]">
              All journey expenditures are proportionally calculated per person in your group.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleFetchRecommendation()}
            disabled={recommending}
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-[#6C2F00]" />
            {recommending ? "Calculating..." : "Recommend Budget"}
          </Button>
          <span className="text-xs font-semibold px-3 py-1 bg-[#6C2F00] text-white rounded-full">
            {numberOfPeople} {numberOfPeople === 1 ? "Person" : "People"}
          </span>
        </div>
      </div>

      {/* Interactive Budget Recommendation Panel */}
      {isRecommendOpen && (
        <div className="bg-[#FFFFFF] border-2 border-[#6C2F00]/20 rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2E1]">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#6C2F00]/10 rounded text-[#6C2F00]">
                  <Sliders className="w-4 h-4" />
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1C1B1B]">
                  Tailored Budget Allocation
                </h3>
              </div>
              <p className="text-xs text-[#54433A] mt-1">
                Deterministic rule-based distribution for {trip.destination} with zero remainder guarantee.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#877369]">Total Target:</span>
              <span className="font-serif text-lg font-bold text-[#6C2F00]">
                ₹{targetTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {planNotes.length > 0 && (
            <div className="bg-[#FAF8F7] p-3 rounded border border-[#E5E2E1] flex items-start gap-2 text-xs text-[#54433A]">
              <HelpCircle className="w-4 h-4 text-[#6C2F00] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#1C1B1B]">Planner Notes: </span>
                {planNotes.join(" ")}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {CATEGORY_KEYS.map(({ key, label }) => {
              const amount = planCategories[key] || 0;
              const perPerson = Math.round(amount / numberOfPeople);
              const sharePct = targetTotal > 0 ? Math.round((amount / targetTotal) * 100) : 0;

              return (
                <div key={key} className="space-y-1.5 p-3 rounded bg-[#FAF8F7] border border-[#E5E2E1]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#1C1B1B]">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-[#877369]">
                        ~₹{perPerson.toLocaleString("en-IN")} / person ({sharePct}%)
                      </span>
                      <span className="font-serif font-bold text-sm text-[#1C1B1B]">
                        ₹{amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={targetTotal}
                    step="50"
                    value={amount}
                    onChange={(e) => handleSliderChange(key, e.target.value)}
                    className="w-full h-1.5 bg-[#E5E2E1] rounded-lg appearance-none cursor-pointer accent-[#6C2F00]"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E5E2E1]">
            <div className="text-xs text-[#54433A]">
              Sliders adjust buffer automatically so category sum always matches the target budget exactly.
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecommendOpen(false)}
                className="flex-1 sm:flex-none"
              >
                Dismiss
              </Button>
              <Button
                variant="terracotta"
                size="sm"
                onClick={handleApplyBudgetPlan}
                disabled={savingPlan}
                className="flex-1 sm:flex-none"
              >
                <Check className="w-4 h-4 mr-1.5" />
                {savingPlan ? "Applying..." : "Apply Budget Plan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] p-6 border border-[#E5E2E1] rounded shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#877369]">
              Planned Budget
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F0EDED] text-[#54433A]">
              ₹{perPersonBudget.toLocaleString("en-IN")} / person
            </span>
          </div>
          <p className="font-serif text-2xl font-bold text-[#1C1B1B] mt-1">
            ₹{plannedBudget.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-[#54433A] mt-1">
            Total target allocated for {numberOfPeople} {numberOfPeople === 1 ? "person" : "people"}
          </p>
        </div>

        <div className="bg-[#FFFFFF] p-6 border border-[#E5E2E1] rounded shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6C2F00]">
              Total Expended
            </span>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#6C2F00]/10 text-[#6C2F00]">
              ₹{perPersonSpent.toLocaleString("en-IN")} / person
            </span>
          </div>
          <p className="font-serif text-2xl font-bold text-[#6C2F00] mt-1">
            ₹{totalSpent.toLocaleString("en-IN")}
          </p>
          <div className="w-full bg-[#F0EDED] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full ${
                percentUsed > 100 ? "bg-[#BA1A1A]" : "bg-[#6C2F00]"
              }`}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            />
          </div>
          <p className="text-[11px] text-[#54433A] mt-1.5">
            {percentUsed}% of group budget utilized
          </p>
        </div>

        <div className="bg-[#FFFFFF] p-6 border border-[#E5E2E1] rounded shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#877369]">
              Remaining Sanctuary Balance
            </span>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
              budgetRemaining < 0 ? "bg-[#FFDAD6] text-[#BA1A1A]" : "bg-[#EAF5EC] text-[#2E4632]"
            }`}>
              ₹{perPersonRemaining.toLocaleString("en-IN")} / person
            </span>
          </div>
          <p
            className={`font-serif text-2xl font-bold mt-1 ${
              budgetRemaining < 0 ? "text-[#BA1A1A]" : "text-[#2E4632]"
            }`}
          >
            ₹{budgetRemaining.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-[#54433A] mt-1">
            {budgetRemaining < 0
              ? "Exceeded target budget"
              : "Within safety buffer"}
          </p>
        </div>
      </div>

      {/* Category Spent vs Allocated (with 90% warning) */}
      {budgetPlan?.categories && (
        <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#E5E2E1] rounded shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5E2E1]">
            <div>
              <h4 className="font-serif text-xl font-bold text-[#1C1B1B] flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-[#6C2F00]" />
                Category Budget Tracking (Spent vs Allocated)
              </h4>
              <p className="text-xs text-[#54433A] mt-0.5">
                Target quotas per category based on active budget plan.
              </p>
            </div>
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsRecommendOpen(true)}
            >
              Adjust Plan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_KEYS.map(({ key, label }) => {
              const allocated = Number(budgetPlan.categories?.[key]) || 0;
              const spent = spentByCatKey[key] || 0;
              const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : (spent > 0 ? 100 : 0);
              const isOver90 = allocated > 0 && spent >= 0.9 * allocated;
              const isExceeded = spent > allocated;

              return (
                <div
                  key={key}
                  className={`p-4 rounded border transition-colors ${
                    isExceeded
                      ? "bg-[#FFF5F5] border-[#FFDAD6]"
                      : isOver90
                      ? "bg-[#FFF9F2] border-[#F2C299]"
                      : "bg-[#FAF8F7] border-[#E5E2E1]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#1C1B1B]">{label}</span>
                    {isExceeded ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFDAD6] text-[#BA1A1A] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Exceeded
                      </span>
                    ) : isOver90 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF2DE] text-[#8C4A1F] flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> &gt;90% used
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#877369]">
                        {pct}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-serif font-bold text-sm text-[#1C1B1B]">
                      ₹{spent.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[#877369] text-[11px]">
                      of ₹{allocated.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="w-full bg-[#E5E2E1] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        isExceeded
                          ? "bg-[#BA1A1A]"
                          : isOver90
                          ? "bg-[#D97706]"
                          : "bg-[#6C2F00]"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Breakdown (Logged Expenses) */}
      {summary.length > 0 && (
        <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#E5E2E1] rounded shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="font-serif text-xl font-bold text-[#1C1B1B] flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-[#6C2F00]" />
              Expense Distribution by Category
            </h4>
            <span className="text-xs text-[#877369]">
              Calculated for {numberOfPeople} {numberOfPeople === 1 ? "traveler" : "travelers"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {summary.map((item, idx) => {
              const perPersonCat = Math.round((item.totalAmount || 0) / numberOfPeople);
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-[#F6F3F2] rounded border border-[#E5E2E1] flex flex-col justify-between"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#877369] truncate">
                    {item.category}
                  </span>
                  <span className="font-serif text-lg font-bold text-[#1C1B1B] mt-1">
                    ₹{(item.totalAmount || 0).toLocaleString("en-IN")}
                  </span>
                  <div className="mt-1 pt-1 border-t border-[#E5E2E1]/60 flex items-center justify-between text-[10px] text-[#54433A]">
                    <span>₹{perPersonCat.toLocaleString("en-IN")}/person</span>
                    <span>{item.count} items</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logged Expenses Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E2E1]">
          <div>
            <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
              Expense Log & Traveler Splits
            </h3>
            <p className="text-xs text-[#54433A]">
              Itemized entries recorded for this expedition, distributed across {numberOfPeople} {numberOfPeople === 1 ? "person" : "people"}.
            </p>
          </div>

          <Button
            variant="terracotta"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Record Expense
          </Button>
        </div>

        {loading ? (
          <LoadingState message="Auditing journey expenses..." />
        ) : expenses.length > 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E5E2E1] rounded overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#F6F3F2] border-b border-[#E5E2E1] text-[#877369] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Category</th>
                    <th className="py-3.5 px-6">Description</th>
                    <th className="py-3.5 px-6 text-right">Total Amount</th>
                    <th className="py-3.5 px-6 text-right">Per Person (÷{numberOfPeople})</th>
                    <th className="py-3.5 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDED]">
                  {expenses.map((exp) => {
                    const itemPerPerson = Math.round((Number(exp.amount) || 0) / numberOfPeople);
                    return (
                      <tr
                        key={exp._id}
                        className="hover:bg-[#FCF9F8] transition-colors"
                      >
                        <td className="py-4 px-6 font-medium text-[#1C1B1B] whitespace-nowrap">
                          {exp.date
                            ? new Date(exp.date).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="py-4 px-6">
                          <Badge variant="terracotta" size="xs">
                            {exp.category}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-[#54433A] max-w-xs truncate">
                          {exp.description || "—"}
                        </td>
                        <td className="py-4 px-6 text-right font-serif font-bold text-[#1C1B1B] whitespace-nowrap text-sm">
                          {exp.currency || "INR"}{" "}
                          {Number(exp.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 text-right font-sans font-medium text-[#6C2F00] whitespace-nowrap text-xs">
                          ₹{itemPerPerson.toLocaleString("en-IN")}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp._id)}
                            className="text-[#877369] hover:text-[#BA1A1A] transition-colors p-1"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={DollarSign}
            title="No Expenses Logged"
            description="Keep control of your travel budget by recording hotel stays, meals, souvenirs, and transit tickets."
            actionLabel="Record First Expense"
            onAction={() => setIsAddModalOpen(true)}
          />
        )}
      </div>

      {/* Record Expense Modal */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Record Journey Expense"
          subtitle={`Log an itemized expenditure for ${trip.destination}`}
        >
          {formError && (
            <div className="mb-4 p-3 bg-[#FFDAD6]/50 text-xs text-[#BA1A1A] rounded">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddExpense} className="space-y-4">
            <FormField label="Category" required>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Amount (INR)" required>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 1500"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
                  required
                />
              </FormField>

              <FormField label="Date" required>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
                  required
                />
              </FormField>
            </div>

            <FormField label="Description">
              <input
                type="text"
                placeholder="e.g. Traditional thali lunch for group"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 bg-[#F6F3F2] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
              />
            </FormField>

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#E5E2E1]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="terracotta"
                size="sm"
                type="submit"
                disabled={formLoading}
              >
                {formLoading ? "Recording..." : "Save Expense"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TripBudgetTab;
