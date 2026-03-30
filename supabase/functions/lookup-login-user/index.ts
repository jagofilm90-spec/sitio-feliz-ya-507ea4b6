import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface LookupRequest {
  email?: string;
}

interface LookupResponse {
  nombre: string;
  puesto: string | null;
  foto_url: string | null;
}

const getFallbackName = (email: string) => email.split("@")[0] || "Usuario";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: LookupRequest = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const response: LookupResponse = {
      nombre: getFallbackName(normalizedEmail),
      puesto: null,
      foto_url: null,
    };

    const resolveEmployeePhoto = async (empleadoId: string, existingPhotoUrl: string | null) => {
      if (existingPhotoUrl) return existingPhotoUrl;

      const { data } = await supabase.storage
        .from("empleados-documentos")
        .createSignedUrl(`${empleadoId}/foto.jpg`, 60 * 10);

      return data?.signedUrl ?? null;
    };

    const resolveProfilePhoto = async (profileId: string) => {
      const { data } = await supabase.storage
        .from("empleados-documentos")
        .createSignedUrl(`profiles/${profileId}/foto.jpg`, 60 * 10);

      return data?.signedUrl ?? null;
    };

    const { data: employeeByEmail } = await supabase
      .from("empleados")
      .select("id, nombre_completo, puesto, foto_url")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (employeeByEmail) {
      response.nombre = employeeByEmail.nombre_completo || response.nombre;
      response.puesto = employeeByEmail.puesto || null;
      response.foto_url = await resolveEmployeePhoto(employeeByEmail.id, employeeByEmail.foto_url);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile) {
      response.nombre = profile.full_name || response.nombre;

      const { data: employeeByUser } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto, foto_url")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (employeeByUser) {
        response.nombre = employeeByUser.nombre_completo || response.nombre;
        response.puesto = employeeByUser.puesto || null;
        response.foto_url = await resolveEmployeePhoto(employeeByUser.id, employeeByUser.foto_url);
      } else {
        response.foto_url = await resolveProfilePhoto(profile.id);
      }
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Error inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
