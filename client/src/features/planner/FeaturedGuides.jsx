import React, { useEffect, useState } from "react";
import { plannerApi } from "../../services/api/plannerApi";
import { PlayCircle, ExternalLink, Film, BookOpen } from "lucide-react";

export default function FeaturedGuides({ destination }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destination) return;
    let isMounted = true;
    setLoading(true);

    plannerApi
      .getHighlights(destination)
      .then((res) => {
        if (isMounted && res.data?.highlights) {
          setHighlights(res.data.highlights);
        }
      })
      .catch(() => {
        // Silent failure - do not show error banner
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [destination]);

  if (!loading && highlights.length === 0) {
    return null; // Render nothing if no highlights
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 block mb-1">
            CURATED VIDEO & TRAVEL GUIDES
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
            Featured Highlights for {destination}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Handpicked guides and visual walkthroughs from travelers and open-source contributors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {highlights.map((guide, idx) => (
          <a
            key={idx}
            href={guide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all overflow-hidden"
          >
            <div className="relative aspect-video w-full bg-slate-200 overflow-hidden">
              {guide.thumbnail ? (
                <img
                  src={guide.thumbnail}
                  alt={guide.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Film className="w-8 h-8 opacity-40" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {guide.source === "youtube" ? (
                    <PlayCircle className="w-6 h-6 text-red-600 fill-red-50" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
              </div>

              <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-black/75 text-white backdrop-blur-xs">
                {guide.source === "youtube" ? "YouTube" : "Guide"}
              </div>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
              <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-2">
                {guide.title}
              </h4>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="truncate max-w-[160px]">
                  {guide.channelTitle || "Travel Explorer"}
                </span>
                <span className="inline-flex items-center text-amber-700 font-semibold gap-1 text-[11px]">
                  Watch / Read
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
