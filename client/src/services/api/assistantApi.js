import apiClient from "./client";

export const assistantApi = {
  chat: (data) => apiClient.post("/assistant/chat", data),
  applyAction: (actionId) => apiClient.post(`/assistant/actions/${actionId}/apply`),
  undoAction: (actionId) => apiClient.post(`/assistant/actions/${actionId}/undo`),
};
