import React, { useMemo } from "react";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Rain-blue scale, from pale to deep, keyed to rainfall relative to the max in the dataset
function colorForValue(value, max) {
  if (max <= 0) return "#f1ede0";
  const ratio = Math.min(1, value / max);
  // Interpolate between a pale tint and the deep rain-blue accent
  const start = { r: 241, g: 237, b: 224 }; // matches surface tone
  const end = { r: 44, g: 95, b: 138 }; // --color-rain
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function YearHeatmap({ records }) {
  const { years, grid, max } = useMemo(() => {
    const byYear = {};
    let maxVal = 0;
    for (const r of records) {
      if (!byYear[r.year]) byYear[r.year] = {};
      byYear[r.year][r.month] = r.rainfall_mm;
      if (r.rainfall_mm > maxVal) maxVal = r.rainfall_mm;
    }
    const yearsSorted = Object.keys(byYear).map(Number).sort((a, b) => a - b);
    return { years: yearsSorted, grid: byYear, max: maxVal };
  }, [records]);

  if (years.length === 0) return <p className="empty-state">No data available.</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="heatmap-table">
        <thead>
          <tr>
            <th></th>
            {MONTH_LABELS.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year) => (
            <tr key={year}>
              <td className="heatmap-year-label">{year}</td>
              {MONTH_LABELS.map((_, i) => {
                const month = i + 1;
                const value = grid[year][month];
                return (
                  <td key={month}>
                    <div
                      className="heatmap-cell"
                      title={`${MONTH_LABELS[i]} ${year}: ${value ?? "—"} mm`}
                      style={{ background: value != null ? colorForValue(value, max) : "#f1ede0" }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
