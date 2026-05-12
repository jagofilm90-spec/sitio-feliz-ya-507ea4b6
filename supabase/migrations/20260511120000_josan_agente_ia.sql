-- ============================================
-- JOSAN AGENTE IA — Conversaciones
-- APLICAR MANUALMENTE en Lovable SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS josan_conversaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text,
  resumen text,
  mensajes jsonb DEFAULT '[]'::jsonb,
  total_mensajes int DEFAULT 0,
  total_tools_usados int DEFAULT 0,
  tools_usados text[],
  estado text DEFAULT 'activa',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ultimo_mensaje_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_josan_conv_user ON josan_conversaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_josan_conv_ultimo ON josan_conversaciones(ultimo_mensaje_at DESC);

ALTER TABLE josan_conversaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "josan_propias" ON josan_conversaciones FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "josan_admin_view" ON josan_conversaciones FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
