import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { plannerApi } from "../../services/api/plannerApi";
import { getErrorMessage } from "../../services/api/client";
import PlannerForm from "./PlannerForm";
import PlanProgress from "./PlanProgress";
import ItineraryView from "./ItineraryView";
import BudgetPanel from "./BudgetPanel";
import PackingPanel from "./PackingPanel";
import Button from "../../components/Button";
import { Sparkles, Calendar, DollarSign, CheckSquare, Plus, ArrowLeft } from "lucide-react";

export const PlannerPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const planIdParam = searchParams.get("planId");

  const [mode, setMode] = useState(planIdParam ? "view" : "form"); // 'form' | 'progress' | 'view'
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState({ stage: "places", progress: 0 });
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("itinerary"); // 'itinerary' | 'budget' | 'packing'
  const [regeneratingDay, setRegeneratingDay] = useState(false);

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

  const handleReset = () => {
    setMode("form");
    setJobId(null);
    setPlan(null);
    setError(null);
    setSearchParams({});
  };

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

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Plan Another Journey
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-[#DAC2B6]/40 pb-3">
              {[
                { id: "itinerary", label: "Itinerary & Places", icon: Calendar },
                { id: "budget", label: "Budget Split", icon: DollarSign },
                { id: "packing", label: "Packing Checklist", icon: CheckSquare },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
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

            {/* Tab Views */}
            {activeTab === "itinerary" && (
              <ItineraryView
                plan={plan}
                onRegenerateDay={handleRegenerateDay}
                regeneratingDay={regeneratingDay}
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
              <PackingPanel packing={plan.packing} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlannerPage;
