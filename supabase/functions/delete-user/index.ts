import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar autenticación del usuario que llama
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Verificar que el usuario tiene rol de admin
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (rolesError || !roles) {
      throw new Error('User is not an admin')
    }

    // Obtener ID del usuario a eliminar
    const { userId } = await req.json()

    if (!userId) {
      throw new Error('Missing userId')
    }

    // No permitir que el admin se elimine a sí mismo
    if (userId === user.id) {
      throw new Error('Cannot delete your own account')
    }

    // Limpiar registros relacionados antes de eliminar el usuario de auth
    // 1. Desvincular empleado (no eliminar, solo quitar referencia)
    await supabaseAdmin
      .from('empleados')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 2. Eliminar roles del usuario
    await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    // 3. Eliminar participaciones en conversaciones
    await supabaseAdmin
      .from('conversacion_participantes')
      .delete()
      .eq('user_id', userId)

    // 4. Eliminar device tokens
    await supabaseAdmin
      .from('device_tokens')
      .delete()
      .eq('user_id', userId)

    // 5. Eliminar perfil
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    // 6. Eliminar usuario de auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})