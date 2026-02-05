import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, checkNotificationPermissions, registerPushNotificationsSilently } from '@/services/pushNotifications';
import PushNotificationSetup from './PushNotificationSetup';
import type { Session } from '@supabase/supabase-js';

/**
 * Gate component that controls when push notification prompts should be shown.
 * MUST be rendered inside BrowserRouter to use useLocation().
 * 
 * Rules:
 * - Only renders on native platforms (iOS/Android)
 * - Never shows on auth routes (/, /auth, /login)
 * - Waits for INITIAL_SESSION event before checking auth state
 * - Only shows when user is authenticated with valid, confirmed session
 * - If permissions already granted, registers push silently (NO permission request)
 * - If permissions not granted, shows the setup dialog
 */
export const PushNotificationsGate = () => {
  const location = useLocation();
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const initRef = useRef(false);
  const routeRef = useRef(location.pathname);
  // Defensive: only allow showing the setup AFTER user has reached a non-auth route at least once.
  // This prevents the dialog from ever appearing on the login screen due to startup redirects/cached sessions.
  const hasEnteredNonAuthRef = useRef(false);

  // Keep routeRef in sync with current path
  useEffect(() => {
    routeRef.current = location.pathname;
  }, [location.pathname]);

  // Helper to check if a path is an auth route - checks both react-router and window.location
  const isAuthPath = useCallback((path?: string) => {
    // Check react-router path
    const routerPath = path || '';
    const routerIsAuth = routerPath === '/' || 
                         routerPath === '' ||
                         routerPath.startsWith('/auth') || 
                         routerPath.startsWith('/login');
    
    // Also check window.location as fallback for Capacitor quirks
    const windowPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const windowIsAuth = windowPath === '/' || 
                         windowPath === '' ||
                         windowPath.startsWith('/auth') || 
                         windowPath.startsWith('/login');
    
    // If EITHER indicates auth route, treat as auth route (defensive)
    return routerIsAuth || windowIsAuth;
  }, []);

  // Track when the app has entered a non-auth route at least once.
  useEffect(() => {
    if (!isAuthPath(location.pathname)) {
      if (!hasEnteredNonAuthRef.current) {
        console.log('[PushGate] Entered non-auth route; push gate can activate now:', location.pathname);
      }
      hasEnteredNonAuthRef.current = true;
    }
  }, [location.pathname, isAuthPath]);

  // Check current route - use both sources
  const isAuthRoute = isAuthPath(location.pathname);

  // CRITICAL: Log for debugging on native
  useEffect(() => {
    if (isNativePlatform()) {
      console.log('[PushGate] Route check:', {
        routerPath: location.pathname,
        windowPath: window.location.pathname,
        isAuthRoute,
        shouldShowSetup
      });
    }
  }, [location.pathname, isAuthRoute, shouldShowSetup]);

  // Listen for auth state changes - wait for INITIAL_SESSION
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[PushGate] Auth event:', event);
      
      if (event === 'INITIAL_SESSION') {
        console.log('[PushGate] INITIAL_SESSION received, session:', !!session?.user?.id);
        setCurrentSession(session);
        setAuthReady(true);
      } else if (event === 'SIGNED_IN') {
        console.log('[PushGate] User signed in');
        setCurrentSession(session);
      } else if (event === 'SIGNED_OUT') {
        console.log('[PushGate] User signed out, resetting state');
        setCurrentSession(null);
        setShouldShowSetup(false);
        initRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check permissions when auth is ready and not on auth route
  useEffect(() => {
    // Skip if not native platform
    if (!isNativePlatform()) {
      console.log('[PushGate] Not native platform, skipping');
      return;
    }

    // Never do anything until we've entered a non-auth route at least once
    if (!hasEnteredNonAuthRef.current) {
      console.log('[PushGate] Waiting to enter a non-auth route before activating');
      setShouldShowSetup(false);
      return;
    }

    // Wait for auth to be ready
    if (!authReady) {
      console.log('[PushGate] Waiting for auth to be ready');
      return;
    }

    // If on auth route, reset and don't show
    if (isAuthRoute) {
      console.log('[PushGate] On auth route, hiding dialog');
      setShouldShowSetup(false);
      return;
    }

    // Verify we have a valid session
    if (!currentSession?.user?.id) {
      console.log('[PushGate] No valid session after auth ready, skipping');
      setShouldShowSetup(false);
      return;
    }

    console.log('[PushGate] Valid session confirmed, checking permissions');

    // Cancellation flag to prevent stale async updates
    let cancelled = false;

    const checkAndSetup = async () => {
      try {
        const hasPermission = await checkNotificationPermissions();

        // Guard: if user navigated to auth route during async check, abort
        if (cancelled || isAuthPath(routeRef.current)) {
          console.log('[PushGate] Cancelled or on auth route after async check, aborting');
          return;
        }

        if (hasPermission) {
          console.log('[PushGate] Permissions already granted, registering silently (no prompt)');
          if (!initRef.current) {
            initRef.current = true;
            await registerPushNotificationsSilently();
          }
          setShouldShowSetup(false);
        } else {
          const hasSeenPrompt = localStorage.getItem('push_notification_prompt_seen');
          if (hasSeenPrompt) {
            console.log('[PushGate] User already dismissed prompt');
            setShouldShowSetup(false);
          } else {
            // Final guard before showing dialog
            if (cancelled || isAuthPath(routeRef.current)) {
              console.log('[PushGate] Cancelled before showing dialog, aborting');
              return;
            }
            console.log('[PushGate] Showing setup dialog');
            setShouldShowSetup(true);
          }
        }
      } catch (error) {
        console.error('[PushGate] Error checking permissions:', error);
        setShouldShowSetup(false);
      }
    };

    // Small delay for UI stability
    const timeout = setTimeout(checkAndSetup, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [authReady, currentSession, isAuthRoute, isAuthPath]);

  // CRITICAL: Don't render anything on auth routes - double check with window.location
  if (isAuthRoute) {
    console.log('[PushGate] Blocking render - on auth route');
    return null;
  }

  // Extra safety: also check window.location directly
  if (typeof window !== 'undefined') {
    const windowPath = window.location.pathname;
    if (windowPath === '/' || windowPath === '' || windowPath.startsWith('/auth') || windowPath.startsWith('/login')) {
      console.log('[PushGate] Blocking render - window.location on auth route:', windowPath);
      return null;
    }
  }

  // Don't render anything on non-native platforms
  if (!isNativePlatform()) {
    return null;
  }

  // Render setup dialog only when appropriate
  if (shouldShowSetup && hasEnteredNonAuthRef.current) {
    return (
      <PushNotificationSetup 
        onComplete={({ enabled }) => {
          setShouldShowSetup(false);
          // Only mark as initialized if user actually enabled notifications
          if (enabled) {
            initRef.current = true;
          }
        }} 
      />
    );
  }

  return null;
};

export default PushNotificationsGate;
