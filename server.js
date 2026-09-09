/**
 * server.js
 *
 * REST API for the Climate Trend Visualization Dashboard.
 * Deliberately built with zero external dependencies (only Node's
 * built-in http/fs/url modules) so it runs with nothing but
 * `node server.js` - no npm install required for the backend.
 *
 * Endpoints:
 *   GET /api/districts
 *   GET /api/climate?district=<id>&from=YYYY-MM&to=YYYY-MM
 *   GET /api/advisory?district=<id>         (12-month advisory flags)
 *   GET /api/insights?district=<id>         (long-term trend + planting-window advisory)
 *
 * Data source: data/climate-data.json (see generateData.js).
 * This file simulates the output of the data pipeline described in
 * the dissertation (CHIRPS + AgERA5 ingestion -> PostgreSQL/PostGIS).
 * Swapping this JSON file-read for a real database query is the only
 * change needed to move from MVP to the full architecture - the
 * endpoint contracts below stay the same.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 4000;
const DATA_PATH = path.join(__dirname, "data", "climate-data.json");

let DATA = null;
function loadData() {
  DATA = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}
loadData();

function sendJSON(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Rule-based advisory logic (Objective 3 / decision-support layer).
 * Compares the most recent 12 months against the full historical
 * average for the same district to flag conditions planners should
 * know about. Threshold-based on purpose - a transparent, explainable
 * baseline that a future iteration could replace with a statistical
 * or ML model.
 */
function buildAdvisory(districtId) {
  const records = DATA.records
    .filter((r) => r.district === districtId)
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  if (records.length < 24) return { flags: [], summary: "Insufficient data" };

  const recent12 = records.slice(-12);
  const historical = records.slice(0, -12);

  const recentAvgRainfall = average(recent12.map((r) => r.rainfall_mm));
  const historicalAvgRainfall = average(historical.map((r) => r.rainfall_mm));
  const recentAvgDrySpell = average(recent12.map((r) => r.dry_spell_days));
  const historicalAvgDrySpell = average(historical.map((r) => r.dry_spell_days));
  const recentAvgTemp = average(recent12.map((r) => r.temp_anomaly_c));

  const rainfallDeltaPct =
    historicalAvgRainfall > 0
      ? ((recentAvgRainfall - historicalAvgRainfall) / historicalAvgRainfall) * 100
      : 0;
  const drySpellDeltaDays = recentAvgDrySpell - historicalAvgDrySpell;

  const flags = [];

  if (rainfallDeltaPct <= -20) {
    flags.push({
      level: "high",
      message: `Rainfall over the last 12 months is ${Math.abs(
        rainfallDeltaPct
      ).toFixed(1)}% below the historical average - drought risk.`,
    });
  } else if (rainfallDeltaPct <= -10) {
    flags.push({
      level: "moderate",
      message: `Rainfall over the last 12 months is ${Math.abs(
        rainfallDeltaPct
      ).toFixed(1)}% below the historical average - monitor closely.`,
    });
  }

  if (drySpellDeltaDays >= 5) {
    flags.push({
      level: "high",
      message: `Average dry-spell length has increased by ${drySpellDeltaDays.toFixed(
        1
      )} days versus the historical average - consider adjusting planting windows.`,
    });
  }

  const recentAnomalous = recent12.filter((r) => r.anomalous_dry_spell).length;
  if (recentAnomalous > 0) {
    flags.push({
      level: "moderate",
      message: `${recentAnomalous} anomalous wet-season dry spell(s) detected in the last 12 months.`,
    });
  }

  if (flags.length === 0) {
    flags.push({
      level: "normal",
      message: "Recent climate conditions are within the historical normal range.",
    });
  }

  return {
    district: districtId,
    recentAvgRainfall: Math.round(recentAvgRainfall),
    historicalAvgRainfall: Math.round(historicalAvgRainfall),
    rainfallDeltaPct: Math.round(rainfallDeltaPct * 10) / 10,
    recentAvgDrySpell: Math.round(recentAvgDrySpell * 10) / 10,
    recentAvgTempAnomaly: Math.round(recentAvgTemp * 100) / 100,
    flags,
  };
}

/**
 * Groups a district's monthly records into per-year totals/averages.
 */
function annualAggregates(districtId) {
  const records = DATA.records.filter((r) => r.district === districtId);
  const byYear = {};
  for (const r of records) {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r);
  }
  return Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b)
    .map((year) => {
      const yearRecords = byYear[year];
      return {
        year,
        totalRainfall: yearRecords.reduce((s, r) => s + r.rainfall_mm, 0),
        avgTempAnomaly: average(yearRecords.map((r) => r.temp_anomaly_c)),
      };
    })
    // Drop the final partial/most-recent year only if it looks incomplete
    .filter((y) => byYear[y.year].length === 12);
}

/** Ordinary least-squares slope of y over x (simple linear regression). */
function slope(xs, ys) {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = average(xs);
  const meanY = average(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * Long-term trend detection (Objective 3 extension). Fits a simple
 * linear trend across all complete years of data to flag districts
 * that are drying out or warming over time - distinct from the
 * 12-month advisory above, which only looks at the very recent past.
 */
function computeTrend(districtId) {
  const annual = annualAggregates(districtId);
  if (annual.length < 5) {
    return { available: false, message: "Not enough years of data yet." };
  }

  const years = annual.map((a) => a.year);
  const rainfallSlope = slope(years, annual.map((a) => a.totalRainfall)); // mm/year
  const tempSlope = slope(years, annual.map((a) => a.avgTempAnomaly)); // deg C/year

  const flags = [];
  if (rainfallSlope <= -10) {
    flags.push({
      level: "high",
      message: `Long-term trend: annual rainfall has declined by roughly ${Math.abs(
        rainfallSlope
      ).toFixed(0)} mm per year over the recorded period - a drying trend worth planning around.`,
    });
  } else if (rainfallSlope <= -3) {
    flags.push({
      level: "moderate",
      message: `Long-term trend: annual rainfall shows a slight decline of about ${Math.abs(
        rainfallSlope
      ).toFixed(0)} mm per year.`,
    });
  }

  if (tempSlope >= 0.03) {
    flags.push({
      level: "moderate",
      message: `Long-term trend: average temperature anomaly is rising by about ${tempSlope.toFixed(
        3
      )}°C per year - a gradual warming trend.`,
    });
  }

  if (flags.length === 0) {
    flags.push({
      level: "normal",
      message: "No strong long-term drying or warming trend detected in the recorded period.",
    });
  }

  return {
    available: true,
    rainfallSlopeMmPerYear: Math.round(rainfallSlope * 10) / 10,
    tempSlopeCPerYear: Math.round(tempSlope * 1000) / 1000,
    yearsAnalyzed: annual.length,
    flags,
  };
}

/**
 * Crop planting-window advisory (Objective 3 extension).
 * Sierra Leone's main growing season follows the onset of consistent
 * rains, typically starting in the Apr-Jul window. "Onset" here is
 * defined as the first month in that window whose rainfall crosses
 * ONSET_THRESHOLD_MM - a simple, explainable proxy for when a farmer
 * could reasonably expect the ground to be wet enough to plant.
 */
const ONSET_THRESHOLD_MM = 150;
const ONSET_SEARCH_MONTHS = [4, 5, 6, 7]; // April - July

function findOnsetMonth(yearRecords) {
  const inWindow = yearRecords
    .filter((r) => ONSET_SEARCH_MONTHS.includes(r.month))
    .sort((a, b) => a.month - b.month);
  const onset = inWindow.find((r) => r.rainfall_mm >= ONSET_THRESHOLD_MM);
  return onset ? onset.month : null;
}

function computePlantingAdvisory(districtId) {
  const records = DATA.records.filter((r) => r.district === districtId);
  const byYear = {};
  for (const r of records) {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r);
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);
  if (years.length < 5) {
    return { available: false, message: "Not enough years of data yet." };
  }

  const mostRecentYear = years[years.length - 1];
  const priorYears = years.slice(0, -1);

  const onsetsByYear = {};
  for (const y of years) {
    onsetsByYear[y] = findOnsetMonth(byYear[y]);
  }

  const historicalOnsets = priorYears
    .map((y) => onsetsByYear[y])
    .filter((m) => m !== null);
  const currentOnset = onsetsByYear[mostRecentYear];

  if (historicalOnsets.length < 3) {
    return { available: false, message: "Not enough historical onset data yet." };
  }

  const avgOnsetMonth = average(historicalOnsets);
  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const historicalLabel = monthNames[Math.round(avgOnsetMonth)];

  let recommendation;
  let delayMonths = 0;

  if (currentOnset === null) {
    recommendation = `No clear rains onset (>=${ONSET_THRESHOLD_MM}mm in a month) detected yet for ${mostRecentYear} in the April-July window. Hold off on main-season planting and monitor closely - if this continues, consider a shorter-cycle crop variety.`;
  } else {
    delayMonths = currentOnset - avgOnsetMonth;
    if (delayMonths >= 1) {
      recommendation = `Rains onset in ${mostRecentYear} (${monthNames[currentOnset]}) was later than the historical average onset (${historicalLabel}). Consider delaying main-season planting accordingly, or using a shorter-cycle variety to still finish before the season ends.`;
    } else if (delayMonths <= -1) {
      recommendation = `Rains onset in ${mostRecentYear} (${monthNames[currentOnset]}) was earlier than the historical average (${historicalLabel}). Early land preparation is advised so planting is not delayed relative to this year's rains.`;
    } else {
      recommendation = `Rains onset in ${mostRecentYear} (${monthNames[currentOnset]}) is in line with the historical average (${historicalLabel}). Standard planting-window timing should apply.`;
    }
  }

  return {
    available: true,
    historicalAvgOnsetMonth: Math.round(avgOnsetMonth * 10) / 10,
    historicalAvgOnsetLabel: historicalLabel,
    mostRecentYear,
    mostRecentOnsetMonth: currentOnset,
    mostRecentOnsetLabel: currentOnset ? monthNames[currentOnset] : null,
    delayMonths: Math.round(delayMonths * 10) / 10,
    recommendation,
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJSON(res, 204, {});
    return;
  }

  if (url.pathname === "/api/districts" && req.method === "GET") {
    sendJSON(res, 200, DATA.districts);
    return;
  }

  if (url.pathname === "/api/climate" && req.method === "GET") {
    const districtId = url.searchParams.get("district");
    const from = url.searchParams.get("from"); // YYYY-MM
    const to = url.searchParams.get("to"); // YYYY-MM

    if (!districtId) {
      sendJSON(res, 400, { error: "district query parameter is required" });
      return;
    }
    if (!DATA.districts.some((d) => d.id === districtId)) {
      sendJSON(res, 404, { error: `Unknown district '${districtId}'` });
      return;
    }

    let records = DATA.records.filter((r) => r.district === districtId);
    if (from) records = records.filter((r) => r.date >= from);
    if (to) records = records.filter((r) => r.date <= to);
    records = records.sort((a, b) => (a.date > b.date ? 1 : -1));

    sendJSON(res, 200, records);
    return;
  }

  if (url.pathname === "/api/advisory" && req.method === "GET") {
    const districtId = url.searchParams.get("district");
    if (!districtId) {
      sendJSON(res, 400, { error: "district query parameter is required" });
      return;
    }
    if (!DATA.districts.some((d) => d.id === districtId)) {
      sendJSON(res, 404, { error: `Unknown district '${districtId}'` });
      return;
    }
    sendJSON(res, 200, buildAdvisory(districtId));
    return;
  }

  if (url.pathname === "/api/insights" && req.method === "GET") {
    const districtId = url.searchParams.get("district");
    if (!districtId) {
      sendJSON(res, 400, { error: "district query parameter is required" });
      return;
    }
    if (!DATA.districts.some((d) => d.id === districtId)) {
      sendJSON(res, 404, { error: `Unknown district '${districtId}'` });
      return;
    }
    sendJSON(res, 200, {
      district: districtId,
      trend: computeTrend(districtId),
      planting: computePlantingAdvisory(districtId),
    });
    return;
  }

  if (url.pathname === "/api/health" && req.method === "GET") {
    sendJSON(res, 200, { status: "ok", recordCount: DATA.records.length });
    return;
  }

  sendJSON(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Climate dashboard API listening on http://localhost:${PORT}`);
});
