-- Eliminar política insegura que expone datos de todos los usuarios
DROP POLICY IF EXISTS "Authenticated users can view all profiles in chat" ON profiles;

-- Crear nueva política restrictiva que solo permite ver perfiles de participantes en conversaciones compartidas
CREATE POLICY "Users can view profiles of conversation participants" 
ON profiles FOR SELECT 
USING (
  -- Siempre puede ver su propio perfil
  id = auth.uid() 
  OR 
  -- Admins pueden ver todos los perfiles
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Solo puede ver perfiles de usuarios con quienes comparte conversación
  EXISTS (
    SELECT 1 FROM conversacion_participantes cp1
    JOIN conversacion_participantes cp2 ON cp1.conversacion_id = cp2.conversacion_id
    WHERE cp1.user_id = auth.uid() 
    AND cp2.user_id = profiles.id
  )
);