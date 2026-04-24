"use client";
import { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
const iconOptions = {
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
};

export default function MapPicker({
  pin,
  onPin,
}: {
  pin: { lat: number; lng: number } | null;
  onPin: (p: { lat: number; lng: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map once on mount, clean up on unmount
  // This handles React StrictMode double-invoke correctly
  useEffect(() => {
    if (!containerRef.current) return;

    const icon = L.icon({ ...iconOptions, iconSize: [25, 41], iconAnchor: [12, 41] });

    const map = L.map(containerRef.current).setView([13.75, 100.5], 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      onPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();       // removes _leaflet_id from container
      mapRef.current    = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync marker whenever pin changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const icon = L.icon({ ...iconOptions, iconSize: [25, 41], iconAnchor: [12, 41] });

    // Remove old marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if pin exists
    if (pin) {
      markerRef.current = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
      map.setView([pin.lat, pin.lng], map.getZoom());
    }
  }, [pin]);

  return (
    <div
      ref={containerRef}
      style={{ height: 260, width: "100%", borderRadius: 14, overflow: "hidden" }}
    />
  );
}
