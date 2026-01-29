import { supabase } from "@/integrations/supabase/client";

type InvokeResult<T> = { data: T | null; error: unknown | null };

const getErrorStatus = (error: any): number | undefined => {
  return (
    error?.context?.status ??
    error?.status ??
    error?.cause?.status ??
    undefined
  );
};

const isInvalidJwtError = (error: any): boolean => {
  const msg = String(error?.message ?? "");
  return (
    getErrorStatus(error) === 401 ||
    msg.includes("Invalid JWT") ||
    msg.includes("Auth session missing") ||
    msg.includes("session_not_found")
  );
};

/**
 * Wrapper for calling the gmail-api backend function.
 *
 * Why: the backend validates JWTs strictly. If the browser has a stale session
 * cached, calls can return 401 Invalid JWT. Here we refresh the session once
 * and retry with the new access token.
 */
export async function invokeGmailApi<T = any>(body: Record<string, unknown>): Promise<InvokeResult<T>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  const doInvoke = async (token: string): Promise<InvokeResult<T>> => {
    const res = await supabase.functions.invoke("gmail-api", {
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { data: (res.data as T) ?? null, error: (res.error as unknown) ?? null };
  };

  if (!accessToken) {
    return { data: null, error: new Error("No hay sesión activa") };
  }

  let result = await doInvoke(accessToken);

  // If the token is stale, refresh once and retry.
  if (result.error && isInvalidJwtError(result.error)) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    const refreshedToken = refreshed.session?.access_token;

    if (!refreshError && refreshedToken) {
      result = await doInvoke(refreshedToken);
    }
  }

  // Still invalid: caller can decide how to react (usually redirect to /auth)
  return result;
}
