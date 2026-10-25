import {
  Clock,
  Building,
  Plane,
  Users,
  Compass,
  ExternalLink,
} from "lucide-react";

export const TripOverviewTab = ({ trip }) => {
  const {
    destination,
    startDate,
    endDate,
    budget,
    activities = [],
    accommodation,
    transportation,
    planData,
    numberOfPeople = 1,
    transportType = "vehicle",
    famousSpot,
  } = trip;

  const calculateDays = () => {
    if (!startDate || !endDate) return "3 Days";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} Day${diffDays > 1 ? "s" : ""}`;
  };

  const nextActivity =
    activities && activities.length > 0 ? activities[0] : null;

  return (
    <div className="space-y-12">
      {/* ── 1. WELCOME & SNAPSHOT METRICS BAR ── */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1C1B1B]">
              Your {destination} Journey
            </h2>
            {famousSpot && (
              <p className="text-xs text-[#6C2F00] font-semibold mt-1">
                ⭐ Featured Highlight: {famousSpot}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-6 border-y border-[#DAC2B6]/40 bg-[#FFFFFF] px-6 rounded shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#877369] mb-1">
              Duration
            </p>
            <p className="font-serif text-xl sm:text-2xl font-bold text-[#1C1B1B]">
              {calculateDays()}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#877369] mb-1">
              Planned Budget
            </p>
            <p className="font-serif text-xl sm:text-2xl font-bold text-[#1C1B1B]">
              ₹{Number(budget || 0).toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#877369] mb-1">
              Activities
            </p>
            <p className="font-serif text-xl sm:text-2xl font-bold text-[#1C1B1B]">
              {activities.length} Planned
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#877369] mb-1">
              Status
            </p>
            <p className="font-serif text-xl sm:text-2xl font-bold text-[#6C2F00] capitalize">
              {trip.status || "Planned"}
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. WIKIVOYAGE DESTINATION GUIDE (IF AVAILABLE) ── */}
      {planData?.guide && (
        <section className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {planData.guide.thumbnail && (
              <img
                src={planData.guide.thumbnail}
                alt={planData.guide.title}
                className="w-full md:w-64 h-40 object-cover rounded-xl shadow-xs border border-slate-100"
              />
            )}
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                  DESTINATION BACKGROUND & HERITAGE
                </span>
                <h3 className="font-serif text-2xl font-bold text-slate-900">
                  {planData.guide.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {planData.guide.extract}
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100">
                <span>{planData.guide.attribution || "CC BY-SA 4.0"}</span>
                {planData.guide.contentUrl && (
                  <a
                    href={planData.guide.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <span>Read on Wikivoyage</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. NEXT UP HIGHLIGHT CARD ── */}
      <section className="bg-[#F6F3F2] p-6 sm:p-8 rounded border border-[#DAC2B6]/40 shadow-xs">
        <div className="flex items-center space-x-2 mb-4 text-[#6C2F00]">
          <Clock className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Next Up
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#877369]">
              {nextActivity?.date
                ? new Date(nextActivity.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                : "Upcoming Milestone"}
            </p>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1B1B]">
              {nextActivity?.name || `Explore ${destination} City Center`}
            </h3>
            <p className="text-xs sm:text-sm text-[#54433A] max-w-xl leading-relaxed">
              {nextActivity?.notes ||
                `Begin your expedition in ${destination}. Stroll through historic courtyards, local markets, and scenic lakeside promenades.`}
            </p>
          </div>

          <div className="w-full md:w-56 h-36 rounded overflow-hidden shrink-0 shadow-sm bg-[#1C1B1B]">
            <img
              src="https://images.unsplash.com/photo-1599661046227-4d1c87a5b9e1?auto=format&fit=crop&w=500&q=80"
              alt="Destination courtyard"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        </div>
      </section>

      {/* ── 4. LOGISTICS (Accommodation & Transit) ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Accommodation */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#DAC2B6]/40 rounded shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-[#6C2F00]">
            <Building className="w-5 h-5" />
            <h4 className="font-serif text-xl font-bold text-[#1C1B1B]">
              Accommodation
            </h4>
          </div>

          <div className="text-xs space-y-2 text-[#54433A] pt-2 border-t border-[#F0EDED]">
            <p>
              <span className="text-[#877369] uppercase font-semibold block text-[10px]">
                Hotel / Heritage Haveli
              </span>
              <strong className="text-sm text-[#1C1B1B]">
                {accommodation?.name || `Heritage Haveli / City Stay`}
              </strong>
            </p>
            {accommodation?.address && (
              <p>
                <span className="text-[#877369] uppercase font-semibold block text-[10px]">
                  Address
                </span>
                {accommodation.address}
              </p>
            )}
            <p className="text-[#877369] pt-2">
              Bookings and check-in confirmation references can be managed in
              the Documents tab.
            </p>
          </div>
        </div>

        {/* Transportation */}
        <div className="bg-[#FFFFFF] p-6 sm:p-8 border border-[#DAC2B6]/40 rounded shadow-xs space-y-4">
          <div className="flex items-center space-x-2 text-[#6C2F00]">
            <Plane className="w-5 h-5" />
            <h4 className="font-serif text-xl font-bold text-[#1C1B1B]">
              Transit & Logistics
            </h4>
          </div>

          <div className="text-xs space-y-2 text-[#54433A] pt-2 border-t border-[#F0EDED]">
            <p>
              <span className="text-[#877369] uppercase font-semibold block text-[10px]">
                Transit Mode
              </span>
              <strong className="text-sm text-[#1C1B1B]">
                {transportation?.type || "Local Metro, Auto & Cabs"}
              </strong>
            </p>
            <p className="text-[#877369] pt-2">
              Local transport estimates and transit routes are factored
              directly into your daily itinerary.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TripOverviewTab;
