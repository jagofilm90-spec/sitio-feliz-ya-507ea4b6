import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, checkNotificationPermissions, initPushNotifications } from '@/services/pushNotifications';
import PushNotificationSetup from './PushNotificationSetup';

/**
 * Gate component that controls when push notification prompts should be shown.
 * MUST be rendered inside BrowserRouter to use useLocation().
 * 
 * Rules:
 * - Only renders on native platforms (iOS/Android)
 * - Never shows on auth routes (/, /auth, /login)
 * - Only shows when user is authenticated with valid session
 * - If permissions already granted, initializes push silently
 * - If permissions not granted, shows the setup dialog
 */
export const PushNotificationsGate = () => {
  const location = useLocation();
  const [shouldShowSetup, setShouldShowSetup] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const initRef = useRef(false);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if current route is an auth route
  const isAuthRoute = 
    location.pathname === '/' || 
    location.pathname.startsWith('/auth') || 
    location.pathname.startsWith('/login');

  useEffect(() => {
    // Clear any pending checks when route changes
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    // If on auth route, reset state and don't check
    if (isAuthRoute) {
      console.log('[PushGate] On auth route, skipping push check');
      setShouldShowSetup(false);
      setHasChecked(false);
      return;
    }

    // Skip if not native platform
    if (!isNativePlatform()) {
      console.log('[PushGate] Not native platform, skipping');
      return;
    }

    const checkAndSetup = async () => {
      try {
        // Verify we have a valid session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          console.log('[PushGate] No valid session, skipping');
          setShouldShowSetup(false);
          return;
        }

        console.log('[PushGate] Valid session found, checking permissions');

        // Check current permission status
        const hasPermission = await checkNotificationPermissions();

        if (hasPermission) {
          console.log('[PushGate] Permissions already granted, initializing silently');
          // Initialize push without showing dialog (already has permission)
          if (!initRef.current) {
            initRef.current = true;
            await initPushNotifications();
          }
          setShouldShowSetup(false);
        } else {
          // Check if user already dismissed the prompt
          const hasSeenPrompt = localStorage.getItem('push_notification_prompt_seen');
          if (hasSeenPrompt) {
            console.log('[PushGate] User already dismissed prompt');
            setShouldShowSetup(false);
          } else {
            console.log('[PushGate] Showing setup dialog');
            setShouldShowSetup(true);
          }
        }

        setHasChecked(true);
      } catch (error) {
        console.error('[PushGate] Error checking permissions:', error);
        setShouldShowSetup(false);
      }
    };

    // Delay check to allow auth state to stabilize after navigation
    checkTimeoutRef.current = setTimeout(() => {
      checkAndSetup();
    }, 1500);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [location.pathname, isAuthRoute]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('[PushGate] User signed out, resetting state');
        setShouldShowSetup(false);
        setHasChecked(false);
        initRef.current = false;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
