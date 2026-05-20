import { useEffect, useState } from "react";

const DEFAULT_LOCATION = [41.0082, 28.9784];

export default function useLocation() {
  const geolocationSupported = "geolocation" in navigator;
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [status, setStatus] = useState(
    geolocationSupported ? "Konum hazirlaniyor" : "Varsayilan konum kullaniliyor"
  );

  useEffect(() => {
    if (!geolocationSupported) return undefined;

    const watch = navigator.geolocation.watchPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
        setStatus("Canli konum hazir");
      },
      () => setStatus("Varsayilan konum kullaniliyor"),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watch);
  }, [geolocationSupported]);

  return { location, status };
}
