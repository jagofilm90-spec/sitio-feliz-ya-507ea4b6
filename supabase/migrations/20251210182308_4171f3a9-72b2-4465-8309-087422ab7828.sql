-- Vista segura para chat que oculta email/phone a usuarios no-admin
CREATE OR REPLACE VIEW profiles_chat AS
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