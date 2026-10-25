import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { plannerApi } from "../../services/api/plannerApi";
import { getErrorMessage } from "../../services/api/client";
import PlannerForm from "./PlannerForm";
import PlanProgress from "./PlanProgress";
import ItineraryView from "./ItineraryView";
import MapView from "./MapView";
import BudgetPanel from "./BudgetPanel";
import PackingPanel from "./PackingPanel";
import FeaturedGuides from "./FeaturedGuides";
import AssistantPanel from "./AssistantPanel";
import Button from "../../components/Button";
import {
  Sparkles,
  Calendar,
  DollarSign,
  CheckSquare,
  Map as MapIcon,
  ArrowLeft,
  Share2,
  BookmarkCheck,
  Check,
  BookOpen,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

export const PlannerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const planIdParam = searchParams.get("planId");

  const [mode, setMode] = useState(planIdParam ? "view" : "form"); // 'form' | 'progress' | 'view'
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState({ stage: "places", progress: 0 });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [selectedMapDay, setSelectedMapDay] = useState(1);
  const [regeneratingDay, setRegeneratingDay] = useState(false);
  const [convertingToTrip, setConvertingToTrip] = useState(false);
  const [convertedTripId, setConvertedTripId] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const pollTimerRef = useRef(null);

  // Load existing plan if planId is in URL
  useEffect(() => {
    if (planIdParam) {
      loadPlan(planIdParam);
    }
  }, [planIdParam]);

  const loadPlan = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await plannerApi.getPlan(id);
      setPlan(res.data);
      if (res.data?.tripId) {
        setConvertedTripId(res.data.tripId);
      }
      setMode("view");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load saved travel plan."));
      setMode("form");
    } finally {
      setLoading(false);
    }
  };

  // Poll background job status every 1.5s
  useEffect(() => {
    if (!jobId || mode !== "progress") return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await plannerApi.getJobStatus(jobId);
        const { status, progress, stage, planId, error: jobError } = res.data;

        setJobState({ stage, progress });

        if (status === "done" && planId) {
          clearInterval(pollTimerRef.current);
          setSearchParams({ planId });
          await loadPlan(planId);
        } else if (status === "failed") {
          clearInterval(pollTimerRef.current);
          setError(jobError || "Generation process failed. Please retry.");
        }
      } catch (err) {
        clearInterval(pollTimerRef.current);
        setError(getErrorMessage(err, "Failed to check job progress."));
      }
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobId, mode]);

  const handleCreatePlan = async (formData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await plannerApi.createJob(formData);
      const newJobId = res.data.jobId;
      setJobId(newJobId);
      setJobState({ stage: "places", progress: 10 });
      setMode("progress");
    } catch (err) {
      setError(getErrorMessage(err, "Could not start itinerary generation."));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateDay = async (dayNumber) => {
    if (!plan || !plan._id) return;
    setRegeneratingDay(true);
    try {
      const res = await plannerApi.regenerateDay(plan._id, dayNumber);
      if (res.data?.day) {
        setPlan((prev) => ({
          ...prev,
          days: prev.days.map((d) => (d.day === dayNumber ? res.data.day : d)),
          revision: res.data.revision,
        }));
      }
    } catch (err) {
      alert(getErrorMessage(err, "Failed to regenerate day."));
    } finally {
      setRegeneratingDay(false);
    }
  };

  const handleUpdatePlan = async (updates) => {
    if (!plan || !plan._id) return;
    try {
      const res = await plannerApi.updatePlan(plan._id, updates);
      if (res.data) {
        setPlan((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (err) {
      console.error("Failed to update plan:", err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handleSaveAsJourney = async () => {
    if (!plan || !plan._id) return;
    setConvertingToTrip(true);
    try {
      const res = await plannerApi.convertToTrip(plan._id);
      if (res.data?.tripId) {
        setConvertedTripId(res.data.tripId);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Please log in or register to save this itinerary directly to your Journeys.");
        navigate("/login");
      } else {
        alert(getErrorMessage(err, "Failed to save journey."));
      }
    } finally {
      setConvertingToTrip(false);
    }
  };

  const handleReset = () => {
    setMode("form");
    setJobId(null);
    setPlan(null);
    setError(null);
    setConvertedTripId(null);
    setSearchParams({});
  };

  const tabs = [
    { id: "itinerary", label: "Itinerary & Places", icon: Calendar },
    { id: "map", label: "Route Map", icon: MapIcon },
    { id: "budget", label: "Budget Split", icon: DollarSign },
    { id: "packing", label: "Packing Checklist", icon: CheckSquare },
  ];

  if (plan?.guide) {
    tabs.push({ id: "guide", label: "Destination Guide", icon: BookOpen });
  }

  return (
    <div className="min-h-screen bg-[#FCF9F8] text-[#1C1B1B] pt-28 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Mode: Form */}
        {mode === "form" && (
          <div className="space-y-8">
            <PlannerForm
              onSubmit={handleCreatePlan}
              loading={loading}
              initialValues={{}}
            />
          </div>
        )}

        {/* Mode: Progress */}
        {mode === "progress" && (
          <div className="py-12">
            <PlanProgress
              stage={jobState.stage}
              progress={jobState.progress}
              error={error}
              onRetry={() => {
                if (plan?.request) handleCreatePlan(plan.request);
                else handleReset();
              }}
              onCancel={handleReset}
            />
          </div>
        )}

        {/* Mode: View (Result) */}
        {mode === "view" && plan && (
          <div className="space-y-8">
            {/* Success notification if converted to Trip */}
            {convertedTripId && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-4 text-emerald-900 shadow-sm animate-in fade-in">
                <div className="flex items-center space-x-3">
                  <BookmarkCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sm block">
                      Saved to your PackGo Journeys!
                    </span>
                    <span className="text-xs text-emerald-700">
                      Activities, budget items, and packing checklist are fully synchronized.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/trips/${convertedTripId}`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span>Open Journey</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#DAC2B6]/40">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C2F00]">
                    COMPLETE EXPEDITION BLUEPRINT
                  </span>
                  {plan.revision > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E5E2E1] text-[#54433A]">
                      Rev {plan.revision}
                    </span>
                  )}
                </div>
                <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#1C1B1B]">
                  {plan.request.days}-Day Expedition to {plan.request.destination}
                </h1>
                <p className="text-xs text-[#54433A]">
                  Pace: <strong className="capitalize">{plan.request.pace}</strong> · Total Budget:{" "}
                  <strong>₹{plan.request.budget.toLocaleString()}</strong> · Travellers:{" "}
                  <strong>{plan.request.travellers}</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="text-xs font-semibold"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      Link Copied!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 mr-1.5" />
                      Share Plan
                    </>
                  )}
                </Button>

                {!convertedTripId ? (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={convertingToTrip}
                    onClick={handleSaveAsJourney}
                    className="text-xs font-semibold"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />
                    Save as Journey
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/trips/${convertedTripId}`)}
                    className="text-xs font-semibold"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5 mr-1.5" />
                    View Journey
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  New Plan
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-[#DAC2B6]/40 pb-3 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-[#6C2F00] text-white shadow-xs"
                        : "bg-white text-[#54433A] border border-[#DAC2B6] hover:border-[#6C2F00]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Optional Client-Side AI Assistant Concierge */}
            <AssistantPanel
              destination={plan.request.destination}
              days={plan.days || []}
              places={plan.places || {}}
              activeDay={1}
            />

            {/* Tab Views */}
            {activeTab === "itinerary" && (
              <ItineraryView
                plan={plan}
                onRegenerateDay={handleRegenerateDay}
                regeneratingDay={regeneratingDay}
                onUpdatePlan={handleUpdatePlan}
              />
            )}

            {activeTab === "map" && (
              <MapView
                days={plan.days || []}
                places={plan.places || {}}
                selectedDay={selectedMapDay}
                onSelectDay={setSelectedMapDay}
              />
            )}

            {activeTab === "budget" && (
              <BudgetPanel
                budget={plan.budget}
                currency={plan.request.currency}
                warnings={plan.warnings}
              />
            )}

            {activeTab === "packing" && (
              <PackingPanel
                packing={plan.packing}
                weather={plan.weather}
              />
            )}

            {activeTab === "guide" && plan.guide && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {plan.guide.thumbnail && (
                    <img
                      src={plan.guide.thumbnail}
                      alt={plan.guide.title}
                      className="w-full md:w-80 h-52 object-cover rounded-xl shadow-sm border border-slate-100"
                    />
                  )}
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                        WIKIVOYAGE DESTINATION GUIDE
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
                        {plan.guide.title}
                      </h2>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {plan.guide.extract}
                    </p>
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100">
                      <span>{plan.guide.attribution || "CC BY-SA 4.0"}</span>
                      {plan.guide.contentUrl && (
                        <a
                          href={plan.guide.contentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold gap-1"
                        >
                          <span>Read full travel guide on Wikivoyage</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Curated destination highlights and videos */}
            <FeaturedGuides destination={plan.request.destination} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerPage;
