/**
 * generateData.js
 *
 * Generates a SYNTHETIC monthly climate dataset for three pilot districts
 * in Sierra Leone, covering 2000-01 through 2025-12.
 *
 * WHY SYNTHETIC DATA: this lets the dashboard be built and demoed
 * immediately. Before final submission, replace this file's output
 * (data/climate-data.json) with real values derived from CHIRPS
 * (rainfall) and AgERA5 (temperature) for the same districts and
 * date range. The API and frontend do not need to change — they only
 * expect the same JSON shape produced here.
 *
 * Run: node generateData.js
 */

const fs = require("fs");
const path = require("path");

// --- Deterministic PRNG so the dataset is reproducible ---
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DISTRICTS = [
  {
    id: "bo",
    name: "Bo",
    zone: "Southern humid interior",
    lat: 7.9644,
    lon: -11.7383,
    baseAnnualRainfall: 2600, // mm
    baseTempAnomaly: 0.3, // deg C above 1991-2020 baseline, starting point
    dryRisk: 0.25, // relative likelihood of an anomalous dry spell in wet season
    seed: 1001,
  },
  {
    id: "koinadugu",
    name: "Koinadugu",
    zone: "Northern savanna-transition",
    lat: 9.5872,
    lon: -11.5547,
    baseAnnualRainfall: 1900,
    baseTempAnomaly: 0.5,
    dryRisk: 0.55,
    seed: 2002,
  },
  {
    id: "bonthe",
    name: "Bonthe",
    zone: "Coastal",
    lat: 7.5264,
    lon: -12.505,
    baseAnnualRainfall: 2900,
    baseTempAnomaly: 0.2,
    dryRisk: 0.15,
    seed: 3003,
  },
];

// Fraction of the annual rainfall total that typically falls in each month
// (rough approximation of Sierra Leone's single wet season, May-Oct peak).
const MONTH_WEIGHTS = [
  0.01, 0.01, 0.03, 0.06, 0.11, 0.16, 0.18, 0.17, 0.14, 0.09, 0.03, 0.01,
];

const START_YEAR = 2000;
const END_YEAR = 2026;

function generateDistrictSeries(district) {
  const rand = mulberry32(district.seed);
  const records = [];
  let yearIndex = 0;

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    // Slow warming trend and a slight long-term rainfall variability increase
    const warming = yearIndex * 0.025; // ~0.6C added by 2025 vs 2000
    const variabilityGrowth = 1 + yearIndex * 0.01; // spread widens slightly over time

    for (let month = 1; month <= 12; month++) {
      const monthWeight = MONTH_WEIGHTS[month - 1];
      const isWetSeason = month >= 5 && month <= 10;

      // Rainfall: seasonal share of annual total, plus year-to-year noise
      const noise = (rand() - 0.5) * 0.5 * variabilityGrowth;
      let rainfall = district.baseAnnualRainfall * monthWeight * (1 + noise);
      rainfall = Math.max(0, Math.round(rainfall));

      // Anomalous dry spell: during wet season, occasionally rainfall
      // collapses well below normal - this is what the advisory layer flags.
      let anomalousDrySpell = false;
      if (isWetSeason && rand() < district.dryRisk * (0.5 + yearIndex * 0.02)) {
        rainfall = Math.round(rainfall * 0.35);
        anomalousDrySpell = true;
      }

      // Dry-spell length in days (consecutive days with negligible rain)
      let drySpellDays;
      if (isWetSeason) {
        drySpellDays = anomalousDrySpell
          ? Math.round(12 + rand() * 10)
          : Math.round(rand() * 5);
      } else {
        drySpellDays = Math.round(18 + rand() * 12); // dry season is dry by default
      }

      // Temperature anomaly (deg C vs 1991-2020 baseline)
      const tempAnomaly =
        Math.round(
          (district.baseTempAnomaly + warming + (rand() - 0.5) * 0.6) * 100
        ) / 100;

      records.push({
        district: district.id,
        year,
        month,
        date: `${year}-${String(month).padStart(2, "0")}`,
        rainfall_mm: rainfall,
        temp_anomaly_c: tempAnomaly,
        dry_spell_days: drySpellDays,
        anomalous_dry_spell: anomalousDrySpell,
      });
    }
    yearIndex++;
  }

  return records;
}

const allRecords = DISTRICTS.flatMap(generateDistrictSeries);

const output = {
  generated: new Date().toISOString(),
  note:
    "SYNTHETIC placeholder data for development/demo purposes. Replace with real CHIRPS (rainfall) and AgERA5 (temperature) data before final submission.",
  districts: DISTRICTS.map(({ id, name, zone, lat, lon }) => ({
    id,
    name,
    zone,
    lat,
    lon,
  })),
  records: allRecords,
};

const outPath = path.join(__dirname, "data", "climate-data.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Wrote ${allRecords.length} records to ${outPath}`);
