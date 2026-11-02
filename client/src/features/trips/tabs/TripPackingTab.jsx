import React, { useState, useEffect } from "react";
import { packingApi } from "../../../services/api/packingApi";
import { getErrorMessage } from "../../../services/api/client";
import Button from "../../../components/Button";
import FormField from "../../../components/FormField";
import Badge from "../../../components/Badge";
import LoadingState from "../../../components/LoadingState";
import EmptyState from "../../../components/EmptyState";
import { playTick, playPop } from "../../../lib/sound";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
  Check,
  Compass,
  RotateCcw,
  Undo2,
  Info,
  HelpCircle,
  X,
} from "lucide-react";

export const TripPackingTab = ({ trip }) => {
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Clothing");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Recommendation & Undo state
  const [recommending, setRecommending] = useState(false);
  const [undoToast, setUndoToast] = useState(null); // { message: string, addedIds: string[] }
  const [activeTooltipId, setActiveTooltipId] = useState(null);

  const categories = [
    "Clothing",
    "Toiletries",
    "Electronics",
    "Documents",
    "Medicine",
    "Other",
  ];

  const fetchPackingList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await packingApi.getByTrip(trip._id);
      setPackingList(res.data);
    } catch (err) {
      console.error("Failed to load packing list:", err);
      setError("Unable to retrieve your packing checklist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trip._id) fetchPackingList();
  }, [trip._id]);

  // Smart 1-click Recommendation (ZERO confirm dialog)
  const handleSmartRecommend = async () => {
    setRecommending(true);
    try {
      const res = await packingApi.recommend(trip._id);
      if (res.data?.list) {
        setPackingList(res.data.list);
        const count = res.data.addedCount || 0;
        const addedIds = res.data.addedIds || [];

        if (count > 0) {
          playPop();
          setUndoToast({
            message: `Added ${count} smart recommended ${count === 1 ? "item" : "items"} for ${trip.destination}`,
            addedIds,
          });
        } else {
          setUndoToast({
            message: "Your packing list already includes all recommended essentials for this trip!",
            addedIds: [],
          });
        }
      }
    } catch (err) {
      console.error("Failed to recommend packing list:", err);
    } finally {
      setRecommending(false);
    }
  };

  // Undo newly added recommended items
  const handleUndoRecommendation = async () => {
    if (!undoToast?.addedIds || undoToast.addedIds.length === 0) {
      setUndoToast(null);
      return;
    }

    try {
      const res = await packingApi.batchDelete(trip._id, undoToast.addedIds);
      setPackingList(res.data);
      setUndoToast(null);
    } catch (err) {
      console.error("Failed to undo recommendation:", err);
    }
  };

  // Reset to freshly generated recommendations
  const handleResetToRecommended = async () => {
    setRecommending(true);
    try {
      const res = await packingApi.resetRecommended(trip._id);
      if (res.data?.list) {
        setPackingList(res.data.list);
        setUndoToast({
          message: `Checklist reset to fresh recommendations for ${trip.destination}`,
          addedIds: [],
        });
      }
    } catch (err) {
      console.error("Failed to reset recommendations:", err);
    } finally {
      setRecommending(false);
    }
  };

  // Remove all recommended items
  const handleRemoveAllRecommended = async () => {
    try {
      const res = await packingApi.removeRecommended(trip._id);
      setPackingList(res.data);
      setUndoToast(null);
    } catch (err) {
      console.error("Failed to remove recommended items:", err);
    }
  };

  const handleAddItem = async (e) => {
    if (e) e.preventDefault();
    if (!newItemName.trim()) return;
    setAddError("");
    setAddLoading(true);
    try {
      const res = await packingApi.addItem(trip._id, {
        name: newItemName.trim(),
        category: newItemCategory,
      });
      playPop();
      setPackingList(res.data);
      setNewItemName("");
    } catch (err) {
      setAddError(getErrorMessage(err, "Failed to add item to checklist."));
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggle = async (itemId) => {
    playTick();
    try {
      const res = await packingApi.toggleItem(trip._id, itemId);
      setPackingList(res.data);
    } catch (err) {
      console.error("Failed to toggle packing item:", err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await packingApi.deleteItem(trip._id, itemId);
      setPackingList(res.data);
    } catch (err) {
      console.error("Failed to delete packing item:", err);
    }
  };

  const handleApplyTemplate = async (templateName) => {
    setLoading(true);
    try {
      const res = await packingApi.applyTemplate(trip._id, templateName);
      setPackingList(res.data);
    } catch (err) {
      console.error("Failed to apply packing template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to clear all items in this packing list?",
      )
    ) {
      return;
    }
    try {
      const res = await packingApi.clearAll(trip._id);
      setPackingList(res.data);
    } catch (err) {
      console.error("Failed to clear packing list:", err);
    }
  };

  const items = packingList?.items || [];
  const packedCount = items.filter((i) => i.packed).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "all") return true;
    return item.category === selectedCategory;
  });

  const recommendedItemsCount = items.filter((i) => i.source === "recommended").length;

  return (
    <div className="space-y-8">
      {/* Undo Toast Notification */}
      {undoToast && (
        <div className="bg-[#1C1B1B] text-[#FAF8F7] p-3.5 sm:p-4 rounded-lg shadow-lg flex items-center justify-between gap-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-[#FFDBC9] shrink-0" />
            <span>{undoToast.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {undoToast.addedIds && undoToast.addedIds.length > 0 && (
              <button
                type="button"
                onClick={handleUndoRecommendation}
                className="px-3 py-1 bg-[#6C2F00] hover:bg-[#8C4A1F] text-white text-xs font-semibold rounded flex items-center gap-1 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setUndoToast(null)}
              className="text-[#877369] hover:text-[#FAF8F7] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header with Progress Bar and Smart Recommendation Trigger */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#E5E2E1] rounded shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
              Checklist Readiness
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
              Packing Checklist
            </h3>
            <p className="text-xs text-[#54433A] mt-0.5">
              Personalized for weather, duration, and activities in {trip.destination}.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="terracotta"
              size="sm"
              onClick={handleSmartRecommend}
              disabled={recommending}
              className="shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              {recommending ? "Generating..." : "Recommend my packing list"}
            </Button>
            <div className="flex items-center space-x-2 pl-2 border-l border-[#E5E2E1]">
              <span className="font-serif text-2xl font-bold text-[#6C2F00]">
                {packedCount}/{totalCount}
              </span>
              <span className="text-xs text-[#877369]">
                packed ({progressPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[#F0EDED] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6C2F00] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Action Controls & Preset Loaders */}
        <div className="pt-4 border-t border-[#F0EDED] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#877369] flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1 text-[#6C2F00]" />
              Templates:
            </span>
            <button
              type="button"
              onClick={() => handleApplyTemplate("beach")}
              className="px-2.5 py-1 bg-[#F6F3F2] hover:bg-[#FFDBC9] text-[#6C2F00] font-semibold rounded transition-colors"
            >
              Beach
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("business")}
              className="px-2.5 py-1 bg-[#F6F3F2] hover:bg-[#FFDBC9] text-[#6C2F00] font-semibold rounded transition-colors"
            >
              Business
            </button>
            <button
              type="button"
              onClick={() => handleApplyTemplate("camping")}
              className="px-2.5 py-1 bg-[#F6F3F2] hover:bg-[#FFDBC9] text-[#6C2F00] font-semibold rounded transition-colors"
            >
              Camping
            </button>

            {recommendedItemsCount > 0 && (
              <>
                <span className="text-[#DAC2B6] mx-1">|</span>
                <button
                  type="button"
                  onClick={handleResetToRecommended}
                  disabled={recommending}
                  className="px-2.5 py-1 bg-[#FAF8F7] hover:bg-[#E5E2E1] text-[#54433A] font-semibold rounded transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to recommended
                </button>
                <button
                  type="button"
                  onClick={handleRemoveAllRecommended}
                  className="px-2.5 py-1 bg-[#FAF8F7] hover:bg-[#FFDAD6] text-[#BA1A1A] font-semibold rounded transition-colors"
                >
                  Remove all recommended
                </button>
              </>
            )}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[#BA1A1A] hover:underline font-semibold text-[11px]"
            >
              Clear All Items
            </button>
          )}
        </div>
      </div>

      {/* Add Item Form */}
      <form
        onSubmit={handleAddItem}
        className="p-4 sm:p-6 bg-[#FFFFFF] border border-[#DAC2B6] rounded-md shadow-xs flex flex-col sm:flex-row items-center gap-4"
      >
        <div className="flex-1 w-full">
          <input
            type="text"
            placeholder="Add a custom item (e.g. Extra camera lens, Hiking pole)..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#FAF8F7] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FAF8F7] border border-[#E5E2E1] rounded text-xs focus:outline-none focus:border-[#6C2F00]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="terracotta"
          size="sm"
          type="submit"
          disabled={addLoading || !newItemName.trim()}
          className="w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {addLoading ? "Adding..." : "Add Item"}
        </Button>
      </form>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            selectedCategory === "all"
              ? "bg-[#6C2F00] text-white"
              : "bg-[#FFFFFF] border border-[#E5E2E1] text-[#54433A] hover:bg-[#F6F3F2]"
          }`}
        >
          All Items ({items.length})
        </button>
        {categories.map((c) => {
          const count = items.filter((i) => i.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCategory === c
                  ? "bg-[#6C2F00] text-white"
                  : "bg-[#FFFFFF] border border-[#E5E2E1] text-[#54433A] hover:bg-[#F6F3F2]"
              }`}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      {/* Checklist Items Display */}
      {loading ? (
        <LoadingState message="Loading packing items..." />
      ) : filteredItems.length > 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E2E1] rounded overflow-hidden shadow-xs divide-y divide-[#F0EDED]">
          {filteredItems.map((item, idx) => (
            <div
              key={item._id || idx}
              style={{ animationDelay: `${idx * 20}ms` }}
              className={`p-4 flex items-center justify-between gap-4 transition-colors hover:bg-[#FAF8F7] ${
                item.packed ? "bg-[#FAF8F7]/60" : ""
              }`}
            >
              <div
                className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none"
                onClick={() => handleToggle(item._id)}
              >
                <button
                  type="button"
                  className="shrink-0 text-[#6C2F00] hover:text-[#8C4A1F] transition-colors"
                >
                  {item.packed ? (
                    <CheckSquare className="w-5 h-5 text-[#6C2F00]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#DAC2B6]" />
                  )}
                </button>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium truncate ${
                        item.packed
                          ? "line-through text-[#877369]"
                          : "text-[#1C1B1B]"
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.source === "recommended" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#6C2F00]/10 text-[#6C2F00]">
                        <Sparkles className="w-2.5 h-2.5" />
                        PackGo Pick
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-[#877369] italic truncate">
                        Why: {item.reason}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="neutral" size="xs">
                  {item.category}
                </Badge>
                {item.reason && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTooltipId(
                          activeTooltipId === item._id ? null : item._id,
                        )
                      }
                      title={item.reason}
                      className="p-1 text-[#877369] hover:text-[#6C2F00] transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {activeTooltipId === item._id && (
                      <div className="absolute right-0 top-7 z-10 w-64 p-2.5 bg-[#1C1B1B] text-[#FAF8F7] text-[11px] rounded shadow-lg">
                        <span className="font-semibold block mb-0.5 text-[#FFDBC9]">
                          Recommendation reason:
                        </span>
                        {item.reason}
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item._id)}
                  className="p-1 text-[#877369] hover:text-[#BA1A1A] transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No Items in this Category"
          description="Click 'Recommend my packing list' to automatically generate a complete travel checklist."
          actionLabel="Recommend Checklist"
          onAction={handleSmartRecommend}
        />
      )}
    </div>
  );
};

export default TripPackingTab;
