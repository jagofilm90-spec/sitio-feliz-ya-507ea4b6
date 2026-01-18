import { supabase } from "@/integrations/supabase/client";

/**
 * Obtiene los emails de usuarios internos con roles admin y Secretaria
 * para enviar copias de correos de logística/devoluciones
 */
export const getEmailsInternos = async (): Promise<string[]> => {
  try {
    // 1. Obtener user_ids con roles admin y Secretaria
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "secretaria"]);

    if (rolesError || !roles?.length) {
      console.log("No se encontraron usuarios internos para notificar");
      return [];
    }

    const userIds = [...new Set(roles.map(r => r.user_id))];

    // 2. Obtener emails de esos usuarios
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", userIds)
      .not("email", "is", null);

    if (profilesError || !profiles?.length) {
      return [];
    }

    return profiles
      .map(p => p.email)
      .filter((email): email is string => !!email);
  } catch (error) {
    console.error("Error obteniendo emails internos:", error);
    return [];
  }
};

/**
 * Envía un correo a múltiples destinatarios internos (copia)
 */
export const enviarCopiaInterna = async (params: {
  asunto: string;
  htmlBody: string;
  emailsDestinatarios: string[];
  attachments?: { filename: string; content: string; mimeType: string }[];
}): Promise<void> => {
  const { asunto, htmlBody, emailsDestinatarios, attachments } = params;

  for (const email of emailsDestinatarios) {
    try {
      await supabase.functions.invoke("gmail-api", {
        body: {
          action: "send",
          email: "compras@almasa.com.mx",
          to: email,
          subject: `[COPIA INTERNA] ${asunto}`,
          body: htmlBody,
          attachments: attachments || undefined
        }
      });
      console.log("Copia interna enviada a:", email);
    } catch (err) {
      console.error("Error enviando copia interna a", email, err);
    }
  }
};
