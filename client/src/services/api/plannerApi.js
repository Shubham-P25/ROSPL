import apiClient from "./client";

export const plannerApi = {
  // Create background generation job
  createJob: (payload) => apiClient.post("/planner/jobs", payload),

  // Poll job status
  getJobStatus: (jobId) => apiClient.get(`/planner/jobs/${jobId}`),

  // Retrieve saved immutable snapshot
  getPlan: (planId) => apiClient.get(`/plans/${planId}`),

  // Update plan revision (reorder, edit)
  updatePlan: (planId, payload) => apiClient.patch(`/plans/${planId}`, payload),

  // Regenerate single day using stored place snapshot
  regenerateDay: (planId, dayNumber) =>
    apiClient.post(`/plans/${planId}/days/${dayNumber}/regenerate`),
};

export default plannerApi;
