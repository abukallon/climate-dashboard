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
        if (data && data.length > 0) {
          setSelectedId(data[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load districts:", err);
        setError("Failed to load dashboard data. Please check data source.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchClimate(selectedId)
      .then((data) => setRecords(Array.isArray(data) ? data : data.climate || []))
      .catch((err) => console.error("Climate fetch error:", err));

    fetchAdvisory(selectedId)
      .then((data) => setAdvisory(data))
      .catch((err) => console.error("Advisory fetch error:", err));
  }, [selectedId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">
            Climate Trend Visualization Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Interactive rainfall, temperature, and dry-spell trends for agricultural planners in Sierra Leone.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="self-start md:self-auto bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded shadow transition"
        >
          Print / Save report as PDF
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Sidebar
            districts={districts}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-3 text-slate-800">District Overview & Map</h2>
            <div className="h-72 w-full bg-slate-100 rounded flex items-center justify-center">
              <MapView selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-3 text-slate-800">Advisory</h2>
            <AdvisoryPanel advisory={advisory} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold mb-2 text-slate-700">Rainfall Trend (mm)</h2>
              <RainfallChart data={records} />
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold mb-2 text-slate-700">Temperature Anomaly (°C)</h2>
              <TemperatureChart data={records} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
