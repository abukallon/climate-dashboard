import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import { RainfallChart, TemperatureChart } from "./components/TrendChart.jsx";
import ComparisonChart from "./components/ComparisonChart.jsx";
import YearHeatmap from "./components/YearHeatmap.jsx";
import AdvisoryPanel from "./components/AdvisoryPanel.jsx";
import InsightsPanel from "./components/InsightsPanel.jsx";
import {
  fetchDistricts,
  fetchClimate,
  fetchAdvisory,
  fetchInsights,
  fetchAllDistrictsClimate,
} from "./api.js";

export default function App() {
  const [districts, setDistricts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [records, setRecords] = useState([]);
  const [fullRecords, setFullRecords] = useState([]); // full history, for the heatmap
  const [advisory, setAdvisory] = useState(null);
  const [insights, setInsights] = useState(null);
  const [comparisonData, setComparisonData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDistricts()
      .then((data) => {
        setDistricts(data);
        if (data.length) setSelectedId(data[0].id);
        return fetchAllDistrictsClimate(
          data.map((d) => d.id),
          "2015-01",
          "2026-12"
        );
      })
      .then((byDistrict) => setComparisonData(byDistrict))
      .catch(() =>
        setError(
          "Could not reach the API. Make sure the backend is running on http://localhost:4000."
        )
      );
  }, []);

  const loadDistrictData = useCallback(async (districtId) => {
    setLoading(true);
    try {
      const [climate, full, adv, ins] = await Promise.all([
        fetchClimate(districtId, "2015-01", "2026-12"),
        fetchClimate(districtId), // full history for heatmap
        fetchAdvisory(districtId),
        fetchInsights(districtId),
      ]);
      setRecords(climate);
      setFullRecords(full);
      setAdvisory(adv);
      setInsights(ins);
      setError(null);
    } catch (e) {
      setError(
        "Could not reach the API. Make sure the backend is running on http://localhost:4000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) loadDistrictData(selectedId);
  }, [selectedId, loadDistrictData]);

  const selectedDistrict = districts.find((d) => d.id === selectedId);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-row">
          <div>
            <p className="eyebrow">Agricultural planning tool — pilot, 3 districts</p>
            <h1>Climate Trend Visualization Dashboard</h1>
            <p>
              Interactive rainfall, temperature, and dry-spell trends for
              agricultural planners in Sierra Leone, with rule-based advisory
              flags for the selected district.
            </p>
          </div>
          <button className="print-button" onClick={() => window.print()}>
            Print / Save report as PDF
          </button>
        </div>
      </header>

      {error && (
        <div className="panel" style={{ margin: "16px 32px 0" }}>
          <p className="empty-state">{error}</p>
        </div>
      )}

      <div className="app-body">
        <Sidebar districts={districts} selectedId={selectedId} onSelect={setSelectedId} />

        <main className="main-content">
          <section className="panel map-panel accent-rain">
            <h3>District overview</h3>
            <p className="panel-sub">Click a district on the map or in the sidebar.</p>
            {districts.length > 0 && (
              <MapView districts={districts} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </section>

          <section className="panel accent-forest">
            <h3>Advisory — {selectedDistrict ? selectedDistrict.name : ""}</h3>
            <p className="panel-sub">
              Rule-based comparison of the last 12 months against the historical average.
            </p>
            {loading ? (
              <p className="loading-state">Loading advisory…</p>
            ) : (
              <AdvisoryPanel advisory={advisory} />
            )}
          </section>

          <section className="panel accent-ochre">
            <h3>Long-term outlook — {selectedDistrict ? selectedDistrict.name : ""}</h3>
            <p className="panel-sub">
              Multi-year trend detection and a rains-onset planting-window recommendation.
            </p>
            {loading ? (
              <p className="loading-state">Loading insights…</p>
            ) : (
              <InsightsPanel insights={insights} />
            )}
          </section>

          <section className="charts-row">
            <div className="panel accent-rain">
              <h3>Rainfall trend</h3>
              <p className="panel-sub">Monthly rainfall, 2015–2026 (mm)</p>
              <div style={{ height: 260 }}>
                {!loading && records.length > 0 && <RainfallChart records={records} />}
              </div>
            </div>
            <div className="panel accent-ochre">
              <h3>Temperature anomaly</h3>
              <p className="panel-sub">Monthly anomaly vs 1991–2020 baseline (°C)</p>
              <div style={{ height: 260 }}>
                {!loading && records.length > 0 && <TemperatureChart records={records} />}
              </div>
            </div>
          </section>

          <section className="panel">
            <h3>Compare all districts</h3>
            <p className="panel-sub">Monthly rainfall across all three pilot districts, 2015–2026</p>
            <div style={{ height: 280 }}>
              {Object.keys(comparisonData).length > 0 && (
                <ComparisonChart dataByDistrict={comparisonData} />
              )}
            </div>
          </section>

          <section className="panel">
            <h3>Rainfall calendar — {selectedDistrict ? selectedDistrict.name : ""}</h3>
            <p className="panel-sub">Every year and month on record, darker = wetter (mm)</p>
            {loading ? (
              <p className="loading-state">Loading calendar…</p>
            ) : (
              <YearHeatmap records={fullRecords} />
            )}
          </section>
        </main>
      </div>

      <footer className="app-footer">
        Data shown is synthetic placeholder data for development. Replace with
        real CHIRPS and AgERA5 records before final submission — see backend/generateData.js.
      </footer>
    </div>
  );
}
