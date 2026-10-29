import React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { ZONE_COLORS } from "./Sidebar.jsx";

export default function MapView({ districts, selectedId, onSelect }) {
  // Centered roughly on Sierra Leone
  const center = [8.4, -11.9];

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {districts.map((d) => (
        <CircleMarker
          key={d.id}
          center={[d.lat, d.lon]}
          radius={d.id === selectedId ? 14 : 10}
          pathOptions={{
            color: ZONE_COLORS[d.id] || "#2c5f8a",
            fillColor: ZONE_COLORS[d.id] || "#2c5f8a",
            fillOpacity: d.id === selectedId ? 0.75 : 0.45,
            weight: d.id === selectedId ? 3 : 1.5,
          }}
          eventHandlers={{ click: () => onSelect(d.id) }}
        >
          <Popup>
            <strong>{d.name}</strong>
            <br />
            {d.zone}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
