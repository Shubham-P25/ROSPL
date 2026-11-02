import apiClient from "./client";

export const packingApi = {
  getByTrip: (tripId) => apiClient.get(`/packing/${tripId}`),
  addItem: (tripId, data) => apiClient.post(`/packing/${tripId}/items`, data),
  toggleItem: (tripId, itemId) =>
    apiClient.patch(`/packing/${tripId}/items/${itemId}`),
  deleteItem: (tripId, itemId) =>
    apiClient.delete(`/packing/${tripId}/items/${itemId}`),
  applyTemplate: (tripId, template) =>
    apiClient.post(`/packing/${tripId}/template`, { template }),
  clearAll: (tripId) => apiClient.delete(`/packing/${tripId}/items`),
  recommend: (tripId) => apiClient.post(`/packing/${tripId}/recommend`),
  batchDelete: (tripId, itemIds) =>
    apiClient.post(`/packing/${tripId}/items/batch-delete`, { itemIds }),
  removeRecommended: (tripId) =>
    apiClient.post(`/packing/${tripId}/remove-recommended`),
  resetRecommended: (tripId) =>
    apiClient.post(`/packing/${tripId}/reset-recommended`),
};
