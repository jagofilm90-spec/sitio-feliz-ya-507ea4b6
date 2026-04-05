import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const ROLE_LABELS: Record<string, string> = {
  admin: "Director General",
  secretaria: "Secretaria",
  vendedor: "Vendedor",
  contadora: "Contadora",
  almacen: "Almacén",
  gerente_almacen: "Gerente de Almacén",
  chofer: "Chofer",
  cliente: "Cliente",
};

const getFallbackName = (email: string) => email.split("@")[0] || "Usuario";

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
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

    const response: { nombre: string; puesto: string | null; foto_url: string | null } = {
      nombre: getFallbackName(normalizedEmail),
      puesto: null,
      foto_url: null,
    };

    const resolveEmployeePhoto = async (empleadoId: string, existingPhotoUrl: string | null) => {
      // Priority 1: Use foto_url from DB if it exists (public URL from empleados-fotos bucket)
      if (existingPhotoUrl) return existingPhotoUrl;
      // Priority 2: Try empleados-fotos bucket (where admin uploads go)
      const { data: publicData } = supabase.storage.from("empleados-fotos").getPublicUrl(`${empleadoId}.jpg`);
      if (publicData?.publicUrl) {
        // Verify the file actually exists by checking with a HEAD-like request
        const { data: signedCheck } = await supabase.storage.from("empleados-fotos").createSignedUrl(`${empleadoId}.jpg`, 60);
        if (signedCheck?.signedUrl) return publicData.publicUrl;
      }
      // Priority 3: Try empleados-documentos bucket
      const { data } = await supabase.storage
        .from("empleados-documentos")
        .createSignedUrl(`${empleadoId}/foto.jpg`, 600);
      return data?.signedUrl ?? null;
    };

    const resolveProfilePhoto = async (profileId: string) => {
      const { data } = await supabase.storage
        .from("empleados-documentos")
        .createSignedUrl(`profiles/${profileId}/foto.jpg`, 600);
      return data?.signedUrl ?? null;
    };

    const resolveRoleLabel = async (userId: string): Promise<string | null> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (!roles || roles.length === 0) return null;
      // Prefer admin label, then first role
      const adminRole = roles.find((r: any) => r.role === "admin");
      const role = adminRole ? adminRole.role : roles[0].role;
      return ROLE_LABELS[role] || role;
    };

    // 1. Try employee by email
    const { data: empRows } = await supabase
      .from("empleados")
      .select("id, nombre_completo, puesto, foto_url, user_id")
      .eq("email", normalizedEmail)
      .eq("activo", true)
      .order("fecha_ingreso", { ascending: false })
      .limit(1);
    const empByEmail = empRows?.[0] ?? null;

    if (empByEmail) {
      response.nombre = empByEmail.nombre_completo || response.nombre;
      response.puesto = empByEmail.puesto || null;
      response.foto_url = await resolveEmployeePhoto(empByEmail.id, empByEmail.foto_url);

      // If puesto is missing, try role label
      if (!response.puesto && empByEmail.user_id) {
        response.puesto = await resolveRoleLabel(empByEmail.user_id);
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Try profile by email
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profile) {
      response.nombre = profile.full_name || response.nombre;

      const { data: empByUser } = await supabase
        .from("empleados")
        .select("id, nombre_completo, puesto, foto_url")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (empByUser) {
        response.nombre = empByUser.nombre_completo || response.nombre;
        response.puesto = empByUser.puesto || null;
        response.foto_url = await resolveEmployeePhoto(empByUser.id, empByUser.foto_url);
      } else {
        response.foto_url = await resolveProfilePhoto(profile.id);
      }

      // If puesto still missing, get role label
      if (!response.puesto) {
        response.puesto = await resolveRoleLabel(profile.id);
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
