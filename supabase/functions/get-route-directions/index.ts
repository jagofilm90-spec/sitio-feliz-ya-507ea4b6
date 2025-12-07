import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Waypoint {
  lat: number;
  lng: number;
  id?: string;
}

interface DirectionsRequest {
  origin: Waypoint;
  destination: Waypoint;
  waypoints?: Waypoint[];
  optimizeWaypoints?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    const { origin, destination, waypoints, optimizeWaypoints = false } = (await req.json()) as DirectionsRequest;

    if (!origin || !destination) {
      throw new Error("Origin and destination are required");
    }

    console.log(`[get-route-directions] Calculating route from ${origin.lat},${origin.lng} to ${destination.lat},${destination.lng} with ${waypoints?.length || 0} waypoints`);

    // Build the Directions API URL
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`;

    // Add waypoints if provided
    if (waypoints && waypoints.length > 0) {
      const waypointStr = waypoints.map(wp => `${wp.lat},${wp.lng}`).join('|');
      url += `&waypoints=${optimizeWaypoints ? 'optimize:true|' : ''}${waypointStr}`;
    }

    // Add traffic model for better time estimates
    url += `&departure_time=now&traffic_model=best_guess`;

    const response = await fetch(url);
    const data = await response.json();

    console.log(`[get-route-directions] Google response status: ${data.status}`);

    if (data.status !== "OK") {
      console.error(`[get-route-directions] Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      return new Response(
        JSON.stringify({ 
          error: data.error_message || `Directions API error: ${data.status}`,
          status: data.status 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const route = data.routes[0];
    
    // Extract relevant information
    const legs = route.legs.map((leg: any, index: number) => ({
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      distance: leg.distance,
      duration: leg.duration,
      durationInTraffic: leg.duration_in_traffic,
      startLocation: leg.start_location,
      endLocation: leg.end_location,
      steps: leg.steps?.map((step: any) => ({
        distance: step.distance,
        duration: step.duration,
        instructions: step.html_instructions?.replace(/<[^>]*>/g, ''),
        maneuver: step.maneuver,
        polyline: step.polyline?.points,
      })),
    }));

    // Calculate totals
    const totalDistance = legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0);
    const totalDuration = legs.reduce((sum: number, leg: any) => {
      return sum + (leg.durationInTraffic?.value || leg.duration.value);
    }, 0);

    const result = {
      polyline: route.overview_polyline?.points,
      bounds: route.bounds,
      legs,
      waypointOrder: route.waypoint_order,
      totalDistance: {
        value: totalDistance,
        text: `${(totalDistance / 1000).toFixed(1)} km`,
      },
      totalDuration: {
        value: totalDuration,
        text: formatDuration(totalDuration),
      },
      copyrights: route.copyrights,
    };

    console.log(`[get-route-directions] Success: ${result.totalDistance.text}, ${result.totalDuration.text}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[get-route-directions] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}
