import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { ZONE_COLORS } from "./Sidebar.jsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const DISTRICT_LABELS = {
  bo: "Bo",
  koinadugu: "Koinadugu",
  bonthe: "Bonthe",
};

export default function ComparisonChart({ dataByDistrict }) {
  const districtIds = Object.keys(dataByDistrict);
  if (districtIds.length === 0) return null;

  const labels = dataByDistrict[districtIds[0]].map((r) => r.date);

  const datasets = districtIds.map((id) => ({
    label: DISTRICT_LABELS[id] || id,
    data: dataByDistrict[id].map((r) => r.rainfall_mm),
    borderColor: ZONE_COLORS[id] || "#2c5f8a",
    backgroundColor: "transparent",
    tension: 0.25,
    pointRadius: 0,
    borderWidth: 2,
  }));

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 12, font: { size: 12 } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 11 } } },
      y: { grid: { color: "#ded4b8" }, ticks: { font: { size: 11 } } },
    },
  };

  return <Line data={{ labels, datasets }} options={options} />;
}
