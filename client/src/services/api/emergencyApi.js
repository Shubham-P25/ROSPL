import apiClient from "./client";

export const emergencyApi = {
  getByDestination: (destination) =>
    apiClient.get(`/emergency/by-destination/${encodeURIComponent(destination)}`),
  getByCountryCode: (countryCode) =>
    apiClient.get(`/emergency/${encodeURIComponent(countryCode)}`),
  listCountries: () => apiClient.get(`/emergency`),
};
