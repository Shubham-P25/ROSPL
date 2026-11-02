import React, { useState } from "react";
import {
  Landmark,
  Trees,
  Utensils,
  ShoppingBag,
  Compass,
  Moon,
  Sparkles,
  MapPin,
} from "lucide-react";

const CATEGORY_STYLES = {
  culture: {
    gradient: "from-amber-800 to-orange-950",
    icon: Landmark,
    label: "Cultural Heritage",
  },
  nature: {
    gradient: "from-emerald-800 to-teal-950",
    icon: Trees,
    label: "Nature & Views",
  },
  food: {
    gradient: "from-orange-700 to-amber-950",
    icon: Utensils,
    label: "Dining & Food",
  },
  shopping: {
    gradient: "from-rose-800 to-pink-950",
    icon: ShoppingBag,
    label: "Bazaar & Crafts",
  },
  adventure: {
    gradient: "from-cyan-800 to-blue-950",
    icon: Compass,
    label: "Trails & Adventure",
  },
  nightlife: {
    gradient: "from-purple-900 to-indigo-950",
    icon: Moon,
    label: "Evening & Leisure",
  },
  religious: {
    gradient: "from-amber-700 to-yellow-950",
    icon: Sparkles,
    label: "Spiritual Sanctuary",
  },
  other: {
    gradient: "from-[#6C2F00] to-[#3B1900]",
    icon: MapPin,
    label: "Destination Attraction",
  },
};

export const PlacePhoto = ({
  src,
  alt = "Place",
  category = "culture",
  className = "w-full h-full object-cover",
  containerClassName = "relative w-full h-full overflow-hidden",
  showCredit = true,
  credit,
}) => {
  const [hasError, setHasError] = useState(false);
  const catKey = (category || "").toLowerCase();
  const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.other;
  const IconComponent = style.icon;

  if (!src || hasError) {
    return (
      <div
        className={`${containerClassName} bg-gradient-to-br ${style.gradient} flex flex-col items-center justify-center p-4 text-center text-white`}
      >
        <IconComponent className="w-8 h-8 mb-2 opacity-80 text-amber-200" />
        <span className="font-serif text-sm font-bold line-clamp-1 drop-shadow-sm">
          {alt}
        </span>
        <span className="text-[10px] text-white/70 uppercase tracking-widest mt-0.5">
          {style.label}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setHasError(true)}
        className={className}
      />
      {showCredit && credit && (
        <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-[10px] text-white/90 px-2 py-0.5 truncate">
          {credit}
        </div>
      )}
    </div>
  );
};

export default PlacePhoto;
