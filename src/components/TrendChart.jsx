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
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

const baseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxTicksLimit: 8, font: { size: 11 } },
    },
    y: {
      grid: { color: "#ded4b8" },
      ticks: { font: { size: 11 } },
    },
  },
};

export function RainfallChart({ records }) {
  const data = {
    labels: records.map((r) => r.date),
    datasets: [
      {
        label: "Rainfall (mm)",
        data: records.map((r) => r.rainfall_mm),
        borderColor: "#2c5f8a",
        backgroundColor: "rgba(44, 95, 138, 0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
  return <Line data={data} options={baseOptions} />;
}

export function TemperatureChart({ records }) {
  const data = {
    labels: records.map((r) => r.date),
    datasets: [
      {
        label: "Temperature anomaly (°C)",
        data: records.map((r) => r.temp_anomaly_c),
        borderColor: "#c68b22",
        backgroundColor: "rgba(198, 139, 34, 0.12)",
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        borderWidth: 2,
      },
    ],
  };
  return <Line data={data} options={baseOptions} />;
}
