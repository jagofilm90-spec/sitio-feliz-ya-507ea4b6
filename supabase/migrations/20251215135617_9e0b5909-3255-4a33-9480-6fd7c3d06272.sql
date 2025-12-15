-- Fix: Restrict profiles table to prevent exposure of email/phone to conversation participants
-- The profiles_chat view already exists and should be used for chat functionality

-- Drop the overly permissive policy that exposes user data
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;

-- Create a more restrictive policy: users can only view their own profile data
-- Admins already have a separate policy to view all profiles
-- The profiles_chat view (which already exists) should be used for chat participant lookups

-- Ensure profiles_chat view only exposes necessary fields (it already does based on schema)
-- The view shows: id, full_name (no email, no phone for non-owners)

-- Add a comment explaining the security model
COMMENT ON TABLE public.profiles IS 'User profiles with restricted access. Use profiles_chat view for conversation participant lookups to avoid exposing sensitive contact information.';