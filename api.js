import axios from "axios";

const BASE_URL = "http://localhost:4000";

export async function fetchDistricts() {
  const { data } = await axios.get(`${BASE_URL}/api/districts`);
  return data;
}

export async function fetchClimate(districtId, from, to) {
  const { data } = await axios.get(`${BASE_URL}/api/climate`, {
    params: { district: districtId, from, to },
  });
  return data;
}

export async function fetchAdvisory(districtId) {
  const { data } = await axios.get(`${BASE_URL}/api/advisory`, {
    params: { district: districtId },
  });
  return data;
}

export async function fetchInsights(districtId) {
  const { data } = await axios.get(`${BASE_URL}/api/insights`, {
    params: { district: districtId },
  });
  return data;
}

export async function fetchAllDistrictsClimate(districtIds, from, to) {
  const results = await Promise.all(
    districtIds.map((id) => fetchClimate(id, from, to))
  );
  return Object.fromEntries(districtIds.map((id, i) => [id, results[i]]));
}
