import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PresenceUser {
  user_id: string;
  full_name: string;
  email: string;
  module: string;
  online_at: string;
}

interface UseSystemPresenceReturn {
  onlineUsers: Map<string, PresenceUser>;
  isConnected: boolean;
}

const PRESENCE_CHANNEL = "system-presence";
const UPDATE_INTERVAL_MS = 30000; // 30 seconds

export function useSystemPresence(moduleName: string): UseSystemPresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const userIdRef = useRef<string | null>(null);

  const updateLastSeen = useCallback(async (userId: string, module: string) => {
    try {
      await supabase
        .from("profiles")
        .update({ 
          last_seen: new Date().toISOString(),
          last_module: module 
        })
        .eq("id", userId);
    } catch (error) {
      console.error("Error updating last_seen:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const setupPresence = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !mounted) return;

        userIdRef.current = user.id;

        // Get user profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        if (!mounted) return;

        // Update last_seen immediately
        await updateLastSeen(user.id, moduleName);

        // Set up periodic updates
        intervalRef.current = setInterval(() => {
          if (userIdRef.current) {
            updateLastSeen(userIdRef.current, moduleName);
          }
        }, UPDATE_INTERVAL_MS);

        // Create presence channel
        const channel = supabase.channel(PRESENCE_CHANNEL, {
          config: {
            presence: {
              key: user.id,
            },
          },
        });

        channel
          .on("presence", { event: "sync" }, () => {
            if (!mounted) return;
            const state = channel.presenceState();
            const users = new Map<string, PresenceUser>();
            
            Object.entries(state).forEach(([key, presences]) => {
              if (presences && presences.length > 0) {
                const p = presences[0] as unknown as PresenceUser;
                users.set(key, p);
              }
            });
            
            setOnlineUsers(users);
          })
          .on("presence", { event: "join" }, ({ key, newPresences }) => {
            if (!mounted) return;
            setOnlineUsers(prev => {
              const updated = new Map(prev);
              if (newPresences && newPresences.length > 0) {
                const p = newPresences[0] as unknown as PresenceUser;
                updated.set(key, p);
              }
              return updated;
            });
          })
          .on("presence", { event: "leave" }, ({ key }) => {
            if (!mounted) return;
            setOnlineUsers(prev => {
              const updated = new Map(prev);
              updated.delete(key);
              return updated;
            });
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && mounted) {
              setIsConnected(true);
              await channel.track({
                user_id: user.id,
                full_name: profile?.full_name || "Usuario",
                email: profile?.email || "",
                module: moduleName,
                online_at: new Date().toISOString(),
              });
            }
          });

        channelRef.current = channel;
      } catch (error) {
        console.error("Error setting up presence:", error);
      }
    };

    setupPresence();

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [moduleName, updateLastSeen]);

  return { onlineUsers, isConnected };
}

// Hook for admin to view all users (online + offline with last_seen)
export function useAllUsersPresence() {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [allUsers, setAllUsers] = useState<Array<{
    id: string;
    full_name: string;
    email: string;
    last_seen: string | null;
    last_module: string | null;
    roles: string[];
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, last_seen, last_module")
        .order("last_seen", { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Fetch roles for each user
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map<string, string[]>();
      userRoles?.forEach(ur => {
        const existing = rolesMap.get(ur.user_id) || [];
        existing.push(ur.role);
        rolesMap.set(ur.user_id, existing);
      });

      const usersWithRoles = (profiles || []).map(p => ({
        ...p,
        roles: rolesMap.get(p.id) || []
      }));

      setAllUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const setupPresenceListener = async () => {
      await fetchAllUsers();

      const channel = supabase.channel(PRESENCE_CHANNEL + "-listener", {
        config: {
          presence: {
            key: "admin-listener-" + Math.random().toString(36).substr(2, 9),
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (!mounted) return;
          const state = channel.presenceState();
          const users = new Map<string, PresenceUser>();
          
          Object.entries(state).forEach(([key, presences]) => {
            if (presences && presences.length > 0 && !key.startsWith("admin-listener")) {
              const p = presences[0] as unknown as PresenceUser;
              users.set(key, p);
            }
          });
          
          setOnlineUsers(users);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          if (!mounted || key.startsWith("admin-listener")) return;
          setOnlineUsers(prev => {
            const updated = new Map(prev);
            if (newPresences && newPresences.length > 0) {
              const p = newPresences[0] as unknown as PresenceUser;
              updated.set(key, p);
            }
            return updated;
          });
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          if (!mounted || key.startsWith("admin-listener")) return;
          setOnlineUsers(prev => {
            const updated = new Map(prev);
            updated.delete(key);
            return updated;
          });
          // Refresh to get updated last_seen
          fetchAllUsers();
        })
        .subscribe();

      channelRef.current = channel;
    };

    setupPresenceListener();

    // Refresh users list every 60 seconds
    const refreshInterval = setInterval(fetchAllUsers, 60000);

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchAllUsers]);

  return { onlineUsers, allUsers, isLoading, refetch: fetchAllUsers };
}
