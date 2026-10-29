import axios from "axios";

let cachedData = null;

async function loadData() {
  if (!cachedData) {
    const response = await axios.get("./climate-data.json");
    cachedData = response.data;
  }
  return cachedData;
}

export async function fetchDistricts() {
  const data = await loadData();
  return data.districts || Object.keys(data);
}

export async function fetchClimate(districtId, from, to) {
  const data = await loadData();
  const districtData = data[districtId] || data;
  return districtData.climate || districtData;
}

export async function fetchAdvisory(districtId) {
  const data = await loadData();
  const districtData = data[districtId] || data;
  return districtData.advisory || { message: "Advisory data loaded successfully." };
}

export async function fetchInsights(districtId) {
  const data = await loadData();
  const districtData = data[districtId] || data;
  return districtData.insights || { message: "Insights data loaded successfully." };
}

export async function fetchAllDistrictsClimate(districtIds, from, to) {
  const results = {};
  for (const id of districtIds) {
    results[id] = await fetchClimate(id, from, to);
  }
  return results;
}
