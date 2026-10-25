import React, { useState, useEffect } from "react";
import { packingApi } from "../../../services/api/packingApi";
import { getErrorMessage } from "../../../services/api/client";
import Button from "../../../components/Button";
import FormField from "../../../components/FormField";
import Badge from "../../../components/Badge";
import LoadingState from "../../../components/LoadingState";
import EmptyState from "../../../components/EmptyState";
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
} from "lucide-react";

const getDestinationRecommendations = (destination = "") => {
  const destLower = destination.toLowerCase();

  if (
    destLower.includes("kerala") ||
    destLower.includes("kochi") ||
    destLower.includes("alleppey") ||
    destLower.includes("munnar") ||
    destLower.includes("goa") ||
    destLower.includes("mumbai")
  ) {
    return {
      title: "Coastal & Tropical Essentials",
      description: "Lightweight, breathable fabrics, rain protection, and coastal gear recommended for tropical moisture and backwaters.",
      clothing: [
        { name: "Breathable Linen & Cotton Shirts", category: "Clothing" },
        { name: "Lightweight Cotton Shorts / Flowy Dresses", category: "Clothing" },
        { name: "Quick-dry Swimwear / Boardshorts", category: "Clothing" },
        { name: "Waterproof Sandals or Flip Flops", category: "Clothing" },
        { name: "Lightweight Rain Poncho or Windcheater", category: "Clothing" },
        { name: "UV Protective Wide-Brim Sun Hat", category: "Clothing" },
      ],
      gear: [
        { name: "DEET Mosquito & Bug Repellent Cream", category: "Toiletries" },
        { name: "Broad Spectrum Sunscreen (SPF 50+)", category: "Toiletries" },
        { name: "Waterproof Mobile Pouch", category: "Electronics" },
        { name: "Polarized UV Sunglasses", category: "Other" },
        { name: "Compact Windproof Umbrella", category: "Other" },
        { name: "Fast-Drying Microfiber Towel", category: "Other" },
      ],
    };
  }

  if (
    destLower.includes("manali") ||
    destLower.includes("shimla") ||
    destLower.includes("ladakh") ||
    destLower.includes("kashmir") ||
    destLower.includes("leh") ||
    destLower.includes("rishikesh") ||
    destLower.includes("dharamshala")
  ) {
    return {
      title: "Mountain & Hill Station Gear",
      description: "Layering garments, cold-climate thermal barriers, and active trail essentials.",
      clothing: [
        { name: "Thermal Innerwear (Top & Bottom)", category: "Clothing" },
        { name: "Fleece Mid-Layer Jacket", category: "Clothing" },
        { name: "Windproof & Waterproof Heavy Jacket", category: "Clothing" },
        { name: "Woolen Socks & Thermal Beanie Cap", category: "Clothing" },
        { name: "Water-Resistant Trekking Shoes with Grip", category: "Clothing" },
        { name: "Touchscreen-compatible Warm Gloves", category: "Clothing" },
      ],
      gear: [
        { name: "Cold Cream & Nourishing Moisturizer", category: "Toiletries" },
        { name: "High Altitude Sunscreen & SPF Lip Balm", category: "Toiletries" },
        { name: "Insulated Stainless Steel Thermos Flask", category: "Other" },
        { name: "High-Capacity 20,000mAh Power Bank", category: "Electronics" },
        { name: "Motion Sickness & Altitude Relief Tablets", category: "Medicine" },
        { name: "Adjustable Trekking Poles", category: "Other" },
      ],
    };
  }

  if (
    destLower.includes("jaipur") ||
    destLower.includes("udaipur") ||
    destLower.includes("rajasthan") ||
    destLower.includes("jodhpur") ||
    destLower.includes("jaisalmer") ||
    destLower.includes("varanasi") ||
    destLower.includes("agra") ||
    destLower.includes("delhi")
  ) {
    return {
      title: "Heritage & Sun-Safe Essentials",
      description: "Modest cultural attire for temple visits, sun protection, and comfortable walking gear.",
      clothing: [
        { name: "Modest Breathable Cotton Kurtas / Shirts", category: "Clothing" },
        { name: "Comfortable Walking Sneakers / Slip-ons", category: "Clothing" },
        { name: "Lightweight Cotton Scarf or Dupatta", category: "Clothing" },
        { name: "Relaxed Linen Pants / Chinos", category: "Clothing" },
        { name: "Sunglasses & Foldable Sun Hat", category: "Clothing" },
        { name: "Light Evening Shawl or Shrug", category: "Clothing" },
      ],
      gear: [
        { name: "High SPF Sweat-Resistant Sunscreen", category: "Toiletries" },
        { name: "Hydration Electrolyte Sachets (ORS)", category: "Medicine" },
        { name: "Antibacterial Wet Wipes & Sanitizer", category: "Toiletries" },
        { name: "Reusable Insulated Water Bottle", category: "Other" },
        { name: "Fast Charging Portable Battery Pack", category: "Electronics" },
        { name: "Tote Bag for Temple Footwear & Bazaars", category: "Other" },
      ],
    };
  }

  return {
    title: "Curated Travel Essentials",
    description: "Versatile clothing and daily exploration accessories popular with seasoned travelers.",
    clothing: [
      { name: "Comfortable All-Day Walking Shoes", category: "Clothing" },
      { name: "Breathable Cotton T-Shirts & Tops", category: "Clothing" },
      { name: "Light Weather Jacket / Cardigan", category: "Clothing" },
      { name: "Stretchable Travel Pants / Denims", category: "Clothing" },
      { name: "Comfortable Sleepwear", category: "Clothing" },
    ],
    gear: [
      { name: "Universal Travel Power Adapter", category: "Electronics" },
      { name: "10,000mAh Portable Power Bank", category: "Electronics" },
      { name: "Mini First-Aid & Pain Relief Kit", category: "Medicine" },
      { name: "Refillable Travel Toiletries Bottles", category: "Toiletries" },
      { name: "Compact Daypack / Crossbody Bag", category: "Other" },
    ],
  };
};

export const TripPackingTab = ({ trip }) => {
  const [packingList, setPackingList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Clothing");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addingItemName, setAddingItemName] = useState(null);

  const categories = [
    "Clothing",
    "Toiletries",
    "Electronics",
    "Documents",
    "Medicine",
    "Other",
  ];

  const recommendations = getDestinationRecommendations(trip.destination);

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
      setPackingList(res.data);
      setNewItemName("");
    } catch (err) {
      setAddError(getErrorMessage(err, "Failed to add item to checklist."));
    } finally {
      setAddLoading(false);
    }
  };

  const handleAddQuickItem = async (item) => {
    setAddingItemName(item.name);
    try {
      const res = await packingApi.addItem(trip._id, {
        name: item.name,
        category: item.category,
      });
      setPackingList(res.data);
    } catch (err) {
      console.error("Failed to add quick recommendation:", err);
    } finally {
      setAddingItemName(null);
    }
  };

  const handleToggle = async (itemId) => {
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

  const isItemAlreadyAdded = (name) => {
    return items.some((i) => i.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <div className="space-y-8">
      {/* Header with Progress Bar */}
      <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#E5E2E1] rounded shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6C2F00] block mb-1">
              Checklist Readiness
            </span>
            <h3 className="font-serif text-2xl font-bold text-[#1C1B1B]">
              Packing Checklist
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="font-serif text-2xl font-bold text-[#6C2F00]">
              {packedCount}/{totalCount}
            </span>
            <span className="text-xs text-[#877369]">
              packed ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[#F0EDED] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6C2F00] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Template Loaders */}
        <div className="pt-4 border-t border-[#F0EDED] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#877369] flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#6C2F00]" />
              Load Template:
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
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add custom packing item (e.g. Travel Adapter, Sunscreen, Linen Shirt)..."
            className="w-full py-2 bg-transparent border-b border-[#DAC2B6] text-sm text-[#1C1B1B] placeholder-[#877369]/70 focus:outline-none focus:border-[#6C2F00]"
          />
          {addError && (
            <p className="text-xs text-[#BA1A1A] mt-1">{addError}</p>
          )}
        </div>

        <div className="w-full sm:w-40">
          <select
            value={newItemCategory}
            onChange={(e) => setNewItemCategory(e.target.value)}
            className="w-full py-2 bg-transparent border-b border-[#DAC2B6] text-xs font-semibold text-[#54433A] focus:outline-none focus:border-[#6C2F00]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <Button
          type="submit"
          variant="terracotta"
          size="sm"
          loading={addLoading}
          className="w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </form>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-2">
        {["all", ...categories].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-colors whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-[#1C1B1B] text-white"
                : "bg-[#FFFFFF] text-[#54433A] border border-[#DAC2B6] hover:border-[#1C1B1B]"
            }`}
          >
            {cat === "all" ? "All Items" : cat}
          </button>
        ))}
      </div>

      {/* Destination Pack Guide & Recommendations */}
      <div className="bg-[#FAF8F7] border border-[#DAC2B6] p-6 rounded-md shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E2E1] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6C2F00]" />
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6C2F00]">
                Curated Recommendations for {trip.destination}
              </span>
            </div>
            <h4 className="font-serif text-lg font-bold text-[#1C1B1B] mt-0.5">
              {recommendations.title}
            </h4>
            <p className="text-xs text-[#54433A] mt-0.5">
              {recommendations.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recommended Clothes */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#877369] flex items-center gap-1.5">
              <span>👕 Recommended Clothes & Footwear</span>
            </h5>
            <div className="space-y-2">
              {recommendations.clothing.map((item, idx) => {
                const alreadyAdded = isItemAlreadyAdded(item.name);
                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-[#E5E2E1] rounded flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1C1B1B] truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] text-[#877369]">
                        {item.category}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyAdded || addingItemName === item.name}
                      onClick={() => handleAddQuickItem(item)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 transition-colors flex items-center gap-1 ${
                        alreadyAdded
                          ? "bg-[#EAF5EC] text-[#2E4632] cursor-default"
                          : "bg-[#6C2F00] hover:bg-[#8D3F00] text-white cursor-pointer"
                      }`}
                    >
                      {alreadyAdded ? (
                        <>
                          <Check className="w-3 h-3" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommended Gear & Essentials */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#877369] flex items-center gap-1.5">
              <span>🎒 Latest Items, Gear & Toiletries</span>
            </h5>
            <div className="space-y-2">
              {recommendations.gear.map((item, idx) => {
                const alreadyAdded = isItemAlreadyAdded(item.name);
                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-[#E5E2E1] rounded flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1C1B1B] truncate">
                        {item.name}
                      </p>
                      <span className="text-[10px] text-[#877369]">
                        {item.category}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyAdded || addingItemName === item.name}
                      onClick={() => handleAddQuickItem(item)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded shrink-0 transition-colors flex items-center gap-1 ${
                        alreadyAdded
                          ? "bg-[#EAF5EC] text-[#2E4632] cursor-default"
                          : "bg-[#6C2F00] hover:bg-[#8D3F00] text-white cursor-pointer"
                      }`}
                    >
                      {alreadyAdded ? (
                        <>
                          <Check className="w-3 h-3" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Items Checklist List */}
      {loading ? (
        <LoadingState message="Auditing checklist..." />
      ) : filteredItems.length > 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E2E1] rounded divide-y divide-[#F0EDED] shadow-xs">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              onClick={() => handleToggle(item._id)}
              className={`p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-[#FCF9F8] transition-colors ${
                item.packed ? "bg-[#FCF9F8]/60" : ""
              }`}
            >
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="text-[#6C2F00] focus:outline-none"
                  aria-label={
                    item.packed ? "Mark as unpacked" : "Mark as packed"
                  }
                >
                  {item.packed ? (
                    <CheckSquare className="w-5 h-5 fill-[#CDEACE] text-[#2E4632]" />
                  ) : (
                    <Square className="w-5 h-5 text-[#DAC2B6] hover:text-[#6C2F00]" />
                  )}
                </button>

                <div>
                  <span
                    className={`text-sm font-medium transition-all ${
                      item.packed
                        ? "line-through text-[#877369]"
                        : "text-[#1C1B1B]"
                    }`}
                  >
                    {item.name}
                  </span>
                  <div className="text-[10px] text-[#877369] font-semibold uppercase tracking-wider mt-0.5">
                    {item.category}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteItem(item._id);
                }}
                className="text-[#877369] hover:text-[#BA1A1A] transition-colors p-1"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckSquare}
          title="No Checklist Items"
          description="Load a preset template above or add custom clothing, toiletries, and essentials."
          actionLabel="Load Beach Template"
          onAction={() => handleApplyTemplate("beach")}
        />
      )}
    </div>
  );
};

export default TripPackingTab;
