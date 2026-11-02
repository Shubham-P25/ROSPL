/**
 * WMO Weather interpretation codes (WW)
 * https://open-meteo.com/en/docs
 */

const WMO_CODE_MAP = {
  0: { label: "Sunny", icon: "Sun" },
  1: { label: "Mainly Sunny", icon: "SunMedium" },
  2: { label: "Partly Cloudy", icon: "CloudSun" },
  3: { label: "Overcast", icon: "Cloud" },
  45: { label: "Foggy", icon: "CloudFog" },
  48: { label: "Depositing Rime Fog", icon: "CloudFog" },
  51: { label: "Light Drizzle", icon: "CloudDrizzle" },
  53: { label: "Moderate Drizzle", icon: "CloudDrizzle" },
  55: { label: "Dense Drizzle", icon: "CloudDrizzle" },
  56: { label: "Light Freezing Drizzle", icon: "CloudDrizzle" },
  57: { label: "Dense Freezing Drizzle", icon: "CloudDrizzle" },
  61: { label: "Slight Rain", icon: "CloudRain" },
  63: { label: "Moderate Rain", icon: "CloudRain" },
  65: { label: "Heavy Rain", icon: "CloudRain" },
  66: { label: "Light Freezing Rain", icon: "CloudRain" },
  67: { label: "Heavy Freezing Rain", icon: "CloudRain" },
  71: { label: "Slight Snow Fall", icon: "CloudSnow" },
  73: { label: "Moderate Snow Fall", icon: "CloudSnow" },
  75: { label: "Heavy Snow Fall", icon: "CloudSnow" },
  77: { label: "Snow Grains", icon: "CloudSnow" },
  80: { label: "Slight Showers", icon: "CloudRain" },
  81: { label: "Moderate Showers", icon: "CloudRain" },
  82: { label: "Violent Showers", icon: "CloudRain" },
  85: { label: "Slight Snow Showers", icon: "CloudSnow" },
  86: { label: "Heavy Snow Showers", icon: "CloudSnow" },
  95: { label: "Thunderstorm", icon: "CloudLightning" },
  96: { label: "Thunderstorm with Hail", icon: "CloudLightning" },
  99: { label: "Heavy Thunderstorm with Hail", icon: "CloudLightning" },
};

function getWeatherCondition(code) {
  if (code !== null && code !== undefined && WMO_CODE_MAP[code]) {
    return WMO_CODE_MAP[code];
  }
  return { label: "Partly Cloudy", icon: "CloudSun" };
}

module.exports = {
  WMO_CODE_MAP,
  getWeatherCondition,
};
