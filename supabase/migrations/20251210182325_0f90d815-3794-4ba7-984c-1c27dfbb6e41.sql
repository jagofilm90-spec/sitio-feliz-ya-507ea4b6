-- Recrear vista con SECURITY INVOKER (default) para que RLS se aplique al usuario que consulta
DROP VIEW IF EXISTS profiles_chat;

CREATE VIEW profiles_chat 
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  CASE
    WHEN id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
    THEN email
    ELSE NULL
  END as email,
  CASE
    WHEN id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
    THEN phone
    ELSE NULL
  END as phone,
  created_at,
  updated_at
FROM profiles;