import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, checkNotificationPermissions, initPushNotifications } from '@/services/pushNotifications';
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
 * - If permissions already granted, initializes push silently
 * - If permissions not granted, shows the setup dialog
 */
export const PushNotificationsGate = () => {
  const location = useLocation();
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const initRef = useRef(false);

  // Determine if current route is an auth route
  const isAuthRoute = 
    location.pathname === '/' || 
    location.pathname.startsWith('/auth') || 
    location.pathname.startsWith('/login');

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

    const checkAndSetup = async () => {
      try {
        const hasPermission = await checkNotificationPermissions();

        if (hasPermission) {
          console.log('[PushGate] Permissions already granted, initializing silently');
          if (!initRef.current) {
            initRef.current = true;
            await initPushNotifications();
          }
          setShouldShowSetup(false);
        } else {
          const hasSeenPrompt = localStorage.getItem('push_notification_prompt_seen');
          if (hasSeenPrompt) {
            console.log('[PushGate] User already dismissed prompt');
            setShouldShowSetup(false);
          } else {
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
    return () => clearTimeout(timeout);
  }, [authReady, currentSession, isAuthRoute]);

  // Don't render anything on auth routes
  if (isAuthRoute) {
    return null;
  }

  // Don't render anything on non-native platforms
  if (!isNativePlatform()) {
    return null;
  }

  // Render setup dialog only when appropriate
  if (shouldShowSetup) {
    return (
      <PushNotificationSetup 
        onComplete={() => {
          setShouldShowSetup(false);
          initRef.current = true;
        }} 
      />
    );
  }

  return null;
};

export default PushNotificationsGate;
