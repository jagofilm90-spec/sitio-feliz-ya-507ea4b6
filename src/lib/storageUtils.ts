import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Opens a file from Supabase Storage by generating a signed URL on-demand.
 * Handles both legacy signed URLs and storage paths.
 */
export async function openStorageFile(
  bucket: string,
  pathOrUrl: string,
  expiresInSeconds = 3600
) {
  // If it's already a full URL (legacy signed URL), open directly
  if (pathOrUrl.startsWith("http")) {
    window.open(pathOrUrl, "_blank");
    return;
  }

  // Generate a fresh signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(pathOrUrl, expiresInSeconds);

  if (error || !data?.signedUrl) {
    console.error("Error generando URL firmada:", error);
    toast.error("No se pudo abrir el archivo");
    return;
  }

  window.open(data.signedUrl, "_blank");
}
