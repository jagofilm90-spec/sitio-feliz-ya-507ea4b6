import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/config/googleMaps";

// Centralized Google Maps loader hook to prevent multiple load attempts
export function useGoogleMapsLoader() {
  const apiKey = GOOGLE_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    // Prevent loading if no API key
    preventGoogleFontsLoading: !apiKey,
  });

  return {
    isLoaded: apiKey ? isLoaded : false,
    loadError: apiKey ? loadError : null,
    hasApiKey: !!apiKey,
  };
}
