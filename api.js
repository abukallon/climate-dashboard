import climateData from "./climate-data.json";

export async function fetchDistricts() {
  return climateData.districts || Object.keys(climateData);
}

export async function fetchClimate(districtId, from, to) {
  const districtData = climateData[districtId] || climateData;
  return districtData.climate || districtData;
}

export async function fetchAdvisory(districtId) {
  const districtData = climateData[districtId] || climateData;
  return districtData.advisory || { message: "Advisory data loaded successfully." };
}

export async function fetchInsights(districtId) {
  const districtData = climateData[districtId] || climateData;
  return districtData.insights || { message: "Insights data loaded successfully." };
}

export async function fetchAllDistrictsClimate(districtIds, from, to) {
  const results = {};
  for (const id of districtIds) {
    results[id] = await fetchClimate(id, from, to);
  }
  return results;
}
