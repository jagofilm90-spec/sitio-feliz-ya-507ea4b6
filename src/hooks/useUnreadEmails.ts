import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { playNotificationSound } from "@/utils/notificationSound";
import React from "react";

interface UnreadEmailsData {
  counts: Record<string, number>;
  cuentas: Array<{
    id: string;
    email: string;
    nombre: string;
    proposito: string;
  }>;
  totalUnread: number;
  isLoading: boolean;
}

const DEFAULT_RETURN: UnreadEmailsData = {
  counts: {},
  cuentas: [],
  totalUnread: 0,
  isLoading: false,
};

export const useUnreadEmails = (): UnreadEmailsData => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [cuentas, setCuentas] = useState<Array<{
    id: string;
    email: string;
    nombre: string;
    proposito: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const previousCountsRef = useRef<Record<string, number>>({});
  const isInitialLoadRef = useRef(true);
  const suppressNotificationsRef = useRef(false);
  const isMountedRef = useRef(true);

  // Load connected email accounts
  const loadCuentas = useCallback(async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      // Check if user is admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesError) {
        console.error("Error fetching user roles for emails:", rolesError);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        return;
      }

      const isAdmin = roles?.some(r => r.role === "admin");

      let connectedCuentas: any[] = [];

      if (isAdmin) {
        // Admin sees all connected accounts
        const { data, error } = await supabase
          .from("gmail_cuentas")
          .select("id, email, nombre, proposito")
          .eq("activo", true)
          .not("access_token", "is", null);
        
        if (error) {
          console.error("Error loading gmail accounts:", error);
        } else {
          connectedCuentas = data || [];
        }
      } else {
        // Non-admin sees only permitted accounts
        const { data: permisos, error: permisosError } = await supabase
          .from("gmail_cuenta_permisos")
          .select("gmail_cuenta_id")
          .eq("user_id", user.id);

        if (permisosError) {
          console.error("Error loading gmail permisos:", permisosError);
        } else if (permisos && permisos.length > 0) {
          const cuentaIds = permisos.map(p => p.gmail_cuenta_id);
          const { data, error } = await supabase
            .from("gmail_cuentas")
            .select("id, email, nombre, proposito")
            .in("id", cuentaIds)
            .eq("activo", true)
            .not("access_token", "is", null);
          
          if (error) {
            console.error("Error loading permitted gmail accounts:", error);
          } else {
            connectedCuentas = data || [];
          }
        }
      }

      if (isMountedRef.current) {
        setCuentas(connectedCuentas);
      }
    } catch (error) {
      console.error("Error loading email accounts:", error);
      if (isMountedRef.current) {
        setCuentas([]);
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch unread counts for all accounts
  const loadUnreadCounts = useCallback(async () => {
    if (cuentas.length === 0) {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
      return;
    }

    try {
      const results = await Promise.allSettled(
        cuentas.map(cuenta =>
          supabase.functions.invoke("gmail-api", {
            body: { action: "getUnreadCount", email: cuenta.email },
          }).then(response => ({
            email: cuenta.email,
            count: response.data?.unreadCount ?? 0,
          })).catch(() => ({
            email: cuenta.email,
            count: 0,
          }))
        )
      );

      if (!isMountedRef.current) return;

      const newCounts: Record<string, number> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          newCounts[result.value.email] = result.value.count;
        } else {
          newCounts[cuentas[index].email] = 0;
        }
      });

      // Check for new emails and show notifications
      if (!isInitialLoadRef.current && !suppressNotificationsRef.current) {
        for (const cuenta of cuentas) {
          const currentCount = newCounts[cuenta.email] || 0;
          const previousCount = previousCountsRef.current[cuenta.email] || 0;

          if (currentCount > previousCount) {
            const newEmailsCount = currentCount - previousCount;

            try {
              // Play notification sound
              playNotificationSound();

              // Show toast notification
              toast.info(
                `${newEmailsCount} nuevo${newEmailsCount > 1 ? 's' : ''} correo${newEmailsCount > 1 ? 's' : ''} en ${cuenta.nombre}`,
                {
                  description: cuenta.email,
                  icon: React.createElement(Bell, { className: "h-4 w-4" }),
                  duration: 8000,
                }
              );

              // Request browser notification
              if (typeof Notification !== 'undefined') {
                if (Notification.permission === "granted") {
                  new Notification(`Nuevo correo en ${cuenta.nombre}`, {
                    body: `${newEmailsCount} correo${newEmailsCount > 1 ? 's' : ''} sin leer`,
                    icon: "/favicon.ico",
                  });
                } else if (Notification.permission !== "denied") {
                  Notification.requestPermission();
                }
              }
            } catch (notifError) {
              console.error("Error showing notification:", notifError);
            }
          }
        }
      }

      previousCountsRef.current = { ...newCounts };
      isInitialLoadRef.current = false;
      
      if (isMountedRef.current) {
        setCounts(newCounts);
      }
    } catch (error) {
      console.error("Error loading unread counts:", error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [cuentas]);

  // Load accounts on mount
  useEffect(() => {
    isMountedRef.current = true;
    loadCuentas();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [loadCuentas]);

  // Load unread counts when accounts are loaded
  useEffect(() => {
    if (cuentas.length > 0) {
      loadUnreadCounts();

      // Poll every 30 seconds
      const interval = setInterval(() => {
        if (isMountedRef.current) {
          loadUnreadCounts();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [cuentas, loadUnreadCounts]);

  const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0);

  return { counts, cuentas, totalUnread, isLoading };
};
