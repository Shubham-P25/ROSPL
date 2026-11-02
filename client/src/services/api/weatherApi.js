import apiClient from "./client";

export const weatherApi = {
  getTripWeather: (tripId) => apiClient.get(`/weather/trip/${tripId}`),
  getCurrent: (location) =>
    apiClient.get(`/weather/current/${encodeURIComponent(location)}`),
  getForecast: (location) =>
    apiClient.get(`/weather/forecast/${encodeURIComponent(location)}`),
};

export default weatherApi;
