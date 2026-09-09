import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar.jsx";
import MapView from "./components/MapView.jsx";
import { RainfallChart, TemperatureChart } from "./components/TrendChart.jsx";
import AdvisoryPanel from "./components/AdvisoryPanel.jsx";
import { fetchDistricts, fetchClimate, fetchAdvisory } from "./api.js";

export default function App() {
  const [districts, setDistricts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [records, setRecords] = useState([]);
  const [advisory, setAdvisory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDistricts()
      .then((data) => {
        setDistricts(data);
        if (data.length) setSelectedId(data[0].id);
      })
      .catch(() =>
        setError(
          "Could not reach the API. Make sure the backend is running on http://localhost:4000."
        )
      );
  }, []);

  const loadDistrictData = useCallback(async (districtId) => {
    setLoading(true);
    try {
      const [climate, adv] = await Promise.all([
        fetchClimate(districtId, "2015-01", "2025-12"),
        fetchAdvisory(districtId),
      ]);
      setRecords(climate);
      setAdvisory(adv);
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
        <p className="eyebrow">Agricultural planning tool — pilot, 3 districts</p>
        <h1>Climate Trend Visualization Dashboard</h1>
        <p>
          Interactive rainfall, temperature, and dry-spell trends for
          agricultural planners in Sierra Leone, with rule-based advisory
          flags for the selected district.
        </p>
      </header>

      {error && (
        <div className="panel" style={{ margin: "16px 32px 0" }}>
          <p className="empty-state">{error}</p>
        </div>
      )}

      <div className="app-body">
        <Sidebar districts={districts} selectedId={selectedId} onSelect={setSelectedId} />

        <main className="main-content">
          <section className="panel map-panel">
            <h3>District overview</h3>
            <p className="panel-sub">Click a district on the map or in the sidebar.</p>
            {districts.length > 0 && (
              <MapView districts={districts} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </section>

          <section className="panel">
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

          <section className="charts-row">
            <div className="panel">
              <h3>Rainfall trend</h3>
              <p className="panel-sub">Monthly rainfall, 2015–2025 (mm)</p>
              <div style={{ height: 260 }}>
                {!loading && records.length > 0 && <RainfallChart records={records} />}
              </div>
            </div>
            <div className="panel">
              <h3>Temperature anomaly</h3>
              <p className="panel-sub">Monthly anomaly vs 1991–2020 baseline (°C)</p>
              <div style={{ height: 260 }}>
                {!loading && records.length > 0 && <TemperatureChart records={records} />}
              </div>
            </div>
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
