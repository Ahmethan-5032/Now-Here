import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

export function RecenterMap({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    map.flyTo(location, Math.max(map.getZoom(), 13), {
      duration: 0.8,
      easeLinearity: 0.2,
    });
  }, [location, map]);

  return null;
}

export function CustomZoom() {
  const map = useMap();

  useEffect(() => {
    const zoom = L.control.zoom({ position: "bottomleft" });
    zoom.addTo(map);
    return () => zoom.remove();
  }, [map]);

  return null;
}
