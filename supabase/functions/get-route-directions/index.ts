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

    const { origin, destination, waypoints, optimizeWaypoints = false }: DirectionsRequest = await req.json();

    if (!origin || !destination) {
      throw new Error("Origin and destination are required");
    }

    console.log("Getting directions:", { origin, destination, waypointsCount: waypoints?.length });

    // Build Google Directions API URL
    let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}&language=es&units=metric`;

    // Add waypoints if provided
    if (waypoints && waypoints.length > 0) {
      const waypointsStr = waypoints.map((wp) => `${wp.lat},${wp.lng}`).join("|");
      url += `&waypoints=${optimizeWaypoints ? "optimize:true|" : ""}${waypointsStr}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.error("Directions API error:", data.status, data.error_message);
      throw new Error(`Directions API error: ${data.status} - ${data.error_message || "Unknown error"}`);
    }

    const route = data.routes[0];
    if (!route) {
      throw new Error("No route found");
    }

    // Extract useful information
    const legs = route.legs;
    let totalDistance = 0;
    let totalDuration = 0;
    const steps: Array<{
      legIndex: number;
      startAddress: string;
      endAddress: string;
      distance: number;
      duration: number;
      instructions: string[];
    }> = [];

    legs.forEach((leg: any, index: number) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;

      steps.push({
        legIndex: index,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance.value,
        duration: leg.duration.value,
        instructions: leg.steps.map((step: any) => step.html_instructions.replace(/<[^>]*>/g, "")),
      });
    });

    const result = {
      success: true,
      route: {
        overview_polyline: route.overview_polyline.points,
        bounds: route.bounds,
        totalDistance: totalDistance, // in meters
        totalDistanceKm: Math.round(totalDistance / 100) / 10, // in km, 1 decimal
        totalDuration: totalDuration, // in seconds
        totalDurationMin: Math.round(totalDuration / 60), // in minutes
        totalDurationFormatted: formatDuration(totalDuration),
        waypointOrder: route.waypoint_order || [],
        legs: steps,
      },
    };

    console.log("Route calculated:", {
      distance: result.route.totalDistanceKm + " km",
      duration: result.route.totalDurationFormatted,
      legs: result.route.legs.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-route-directions:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
