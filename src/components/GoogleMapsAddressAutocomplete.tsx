/**
 * ==========================================================
 * ⚠️ COMPONENTE SENSIBLE - REGLAS DE GOOGLE MAPS
 * ==========================================================
 * 
 * Este componente usa la API de Google Places via Edge Function,
 * NO usa directamente la API de JavaScript de Google Maps.
 * Por lo tanto, NO aplican las reglas de google.maps.* types.
 * 
 * Sin embargo, si en el futuro se integra Google Maps JS API,
 * aplicar las reglas de seguridad documentadas en:
 * src/docs/ARQUITECTURA.md
 * 
 * Última actualización: 2025-12-08
 * ==========================================================
 */

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleMapsAddressAutocompleteProps {
  value: string;
  onChange: (value: string, placeId?: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  main_text?: string;
  secondary_text?: string;
}

const GoogleMapsAddressAutocomplete = ({
  value,
  onChange,
  placeholder = "Buscar dirección...",
  id,
  required,
  className,
}: GoogleMapsAddressAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value changes only when value is different
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddresses = async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // Use fetch directly since supabase.functions.invoke doesn't support query params well for GET
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-places-autocomplete?input=${encodeURIComponent(input)}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.predictions) {
        setPredictions(result.predictions);
        setShowDropdown(result.predictions.length > 0);
      } else {
        setPredictions([]);
      }
    } catch (err: any) {
      console.error('Error searching addresses:', err);
      setError("No se pudo buscar direcciones");
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setError(null);

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description, prediction.place_id);
    setPredictions([]);
    setShowDropdown(false);
    setError(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {isLoading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : error ? (
          <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
        ) : (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          required={required}
          className={`pl-10 ${error ? "border-destructive" : ""} ${className || ""}`}
          autoComplete="off"
        />
      </div>
      
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
      
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
              onClick={() => handleSelectPrediction(prediction)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{prediction.main_text || prediction.description}</span>
                  {prediction.secondary_text && (
                    <span className="text-xs text-muted-foreground">{prediction.secondary_text}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoogleMapsAddressAutocomplete;
