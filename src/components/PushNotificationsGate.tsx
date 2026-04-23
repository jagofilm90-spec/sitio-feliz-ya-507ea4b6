import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, checkNotificationPermissions, registerPushNotificationsSilently } from '@/services/pushNotifications';
import PushNotificationSetup from './PushNotificationSetup';
import type { Session } from '@supabase/supabase-js';

/**
 * Gate component that controls when push notification prompts should be shown.
 * Only renders on native platforms. Never shows on auth routes.
 * Waits for INITIAL_SESSION before checking auth state.
 */
export const PushNotificationsGate = () => {
  const location = useLocation();
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const initRef = useRef(false);
  const routeRef = useRef(location.pathname);
  const hasEnteredNonAuthRef = useRef(false);

  useEffect(() => { routeRef.current = location.pathname; }, [location.pathname]);

  const isAuthPath = useCallback((path?: string) => {
    const routerPath = path || '';
    const routerIsAuth = routerPath === '/' || routerPath === '' ||
      routerPath.startsWith('/auth') || routerPath.startsWith('/login');
    const windowPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const windowIsAuth = windowPath === '/' || windowPath === '' ||
      windowPath.startsWith('/auth') || windowPath.startsWith('/login');
    return routerIsAuth || windowIsAuth;
  }, []);

  useEffect(() => {
    if (!isAuthPath(location.pathname)) hasEnteredNonAuthRef.current = true;
  }, [location.pathname, isAuthPath]);

  const isAuthRoute = isAuthPath(location.pathname);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') { setCurrentSession(session); setAuthReady(true); }
      else if (event === 'SIGNED_IN') { setCurrentSession(session); }
      else if (event === 'SIGNED_OUT') { setCurrentSession(null); setShouldShowSetup(false); initRef.current = false; }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isNativePlatform() || !hasEnteredNonAuthRef.current || !authReady || isAuthRoute) {
      setShouldShowSetup(false);
      return;
    }
    if (!currentSession?.user?.id) { setShouldShowSetup(false); return; }

    let cancelled = false;

    const checkAndSetup = async () => {
      try {
        const hasPermission = await checkNotificationPermissions();
        if (cancelled || isAuthPath(routeRef.current)) return;

        if (hasPermission) {
          if (!initRef.current) { initRef.current = true; await registerPushNotificationsSilently(); }
          setShouldShowSetup(false);
        } else {
          const hasSeenPrompt = localStorage.getItem('push_notification_prompt_seen');
          if (hasSeenPrompt || cancelled || isAuthPath(routeRef.current)) {
            setShouldShowSetup(false);
          } else {
            setShouldShowSetup(true);
          }
        }
      } catch (error) {
        console.error('[PushGate] Error checking permissions:', error);
        setShouldShowSetup(false);
      }
    };

    const timeout = setTimeout(checkAndSetup, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [authReady, currentSession, isAuthRoute, isAuthPath]);

  if (isAuthRoute) return null;
  if (typeof window !== 'undefined') {
    const wp = window.location.pathname;
    if (wp === '/' || wp === '' || wp.startsWith('/auth') || wp.startsWith('/login')) return null;
  }
  if (!isNativePlatform()) return null;

  if (shouldShowSetup && hasEnteredNonAuthRef.current) {
    return (
      <PushNotificationSetup
        onComplete={({ enabled }) => {
          setShouldShowSetup(false);
          if (enabled) initRef.current = true;
        }}
      />
    );
  }

  return null;
};

export default PushNotificationsGate;
