import apiClient from "./client";

export const documentsApi = {
  getByTrip: (tripId) => apiClient.get(`/documents?tripId=${tripId}`),
  getAll: () => apiClient.get(`/documents`),
  create: (data) => apiClient.post(`/documents`, data),
  update: (id, data) => apiClient.put(`/documents/${id}`, data),
  remove: (id) => apiClient.delete(`/documents/${id}`),
};
