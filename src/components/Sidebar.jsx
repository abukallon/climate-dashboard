import React from "react";

const ZONE_COLORS = {
  bo: "#2c5f8a",
  koinadugu: "#c68b22",
  bonthe: "#3f6b4a",
};

export default function Sidebar({ districts, selectedId, onSelect }) {
  return (
    <aside className="sidebar">
      <h2>Pilot districts</h2>
      <ul className="district-list">
        {districts.map((d) => (
          <li key={d.id}>
            <button
              className={`district-button ${d.id === selectedId ? "active" : ""}`}
              onClick={() => onSelect(d.id)}
            >
              {d.name}
              <span className="zone">{d.zone}</span>
            </button>
          </li>
        ))}
      </ul>

      <h2>Legend</h2>
      <div className="legend">
        <div className="legend-row">
          <span className="legend-dot" style={{ background: ZONE_COLORS.bo }} />
          Bo — humid interior
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: ZONE_COLORS.koinadugu }} />
          Koinadugu — savanna, drier
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: ZONE_COLORS.bonthe }} />
          Bonthe — coastal
        </div>
      </div>
    </aside>
  );
}

export { ZONE_COLORS };
