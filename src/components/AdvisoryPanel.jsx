import React from "react";

export default function AdvisoryPanel({ advisory }) {
  if (!advisory) return null;

  return (
    <div>
      <div className="advisory-stats">
        <div className="stat">
          <div className="stat-label">Last 12mo avg rainfall</div>
          <div className="stat-value">{advisory.recentAvgRainfall} mm</div>
        </div>
        <div className="stat">
          <div className="stat-label">Change vs historical</div>
          <div className="stat-value">
            {advisory.rainfallDeltaPct > 0 ? "+" : ""}
            {advisory.rainfallDeltaPct}%
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg dry-spell length</div>
          <div className="stat-value">{advisory.recentAvgDrySpell} days</div>
        </div>
      </div>

      <ul className="flag-list">
        {advisory.flags.map((flag, i) => (
          <li key={i} className={`flag ${flag.level}`}>
            {flag.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
