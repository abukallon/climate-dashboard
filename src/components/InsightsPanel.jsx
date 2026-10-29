import React from "react";

export default function InsightsPanel({ insights }) {
  if (!insights) return null;
  const { trend, planting } = insights;

  return (
    <div className="insights-grid">
      <div>
        <h4 className="insights-subhead">Long-term trend</h4>
        {trend?.available ? (
          <>
            <ul className="flag-list">
              {trend.flags.map((flag, i) => (
                <li key={i} className={`flag ${flag.level}`}>
                  {flag.message}
                </li>
              ))}
            </ul>
            <p className="insights-note">
              Based on {trend.yearsAnalyzed} years of data - rainfall trend{" "}
              {trend.rainfallSlopeMmPerYear >= 0 ? "+" : ""}
              {trend.rainfallSlopeMmPerYear} mm/year, temperature trend{" "}
              {trend.tempSlopeCPerYear >= 0 ? "+" : ""}
              {trend.tempSlopeCPerYear}°C/year.
            </p>
          </>
        ) : (
          <p className="empty-state">{trend?.message || "Not available."}</p>
        )}
      </div>

      <div>
        <h4 className="insights-subhead">Planting-window advisory</h4>
        {planting?.available ? (
          <>
            <p className="planting-recommendation">{planting.recommendation}</p>
            <p className="insights-note">
              Historical average onset: {planting.historicalAvgOnsetLabel}. Most recent (
              {planting.mostRecentYear}) onset: {planting.mostRecentOnsetLabel || "not yet detected"}.
            </p>
          </>
        ) : (
          <p className="empty-state">{planting?.message || "Not available."}</p>
        )}
      </div>
    </div>
  );
}
