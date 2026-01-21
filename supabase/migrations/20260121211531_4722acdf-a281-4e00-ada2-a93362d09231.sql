-- Add columns to track user presence
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_module TEXT;

COMMENT ON COLUMN profiles.last_seen IS 'Última vez que el usuario estuvo activo en el sistema';
COMMENT ON COLUMN profiles.last_module IS 'Último módulo donde estuvo conectado';

-- Create index for efficient queries on last_seen
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC NULLS LAST);

-- RLS policy to allow users to update their own last_seen
CREATE POLICY "Users can update their own last_seen" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);