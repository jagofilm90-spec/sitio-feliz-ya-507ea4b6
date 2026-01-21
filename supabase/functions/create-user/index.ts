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

  // Obtener datos del nuevo usuario
  const { 
    email, password, full_name, phone, role,
    nombre, primer_apellido, segundo_apellido, empleado_id 
  } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields')
    }

    // Crear usuario usando admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name
      }
    })

    if (createError) {
      throw createError
    }

    if (!newUser.user) {
      throw new Error('Failed to create user')
    }

    // Actualizar teléfono si se proporcionó
    if (phone) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', newUser.user.id)

      if (profileError) {
        console.error('Error updating phone:', profileError)
      }
    }

    // Asignar rol
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role
      })

    if (roleError) {
      throw roleError
    }

    // Mapeo de rol a puesto para empleados
    const rolToPuesto: Record<string, string> = {
      'almacen': 'Almacenista',
      'gerente_almacen': 'Gerente Almacén',
      'chofer': 'Chofer',
      'vendedor': 'Vendedor',
      'secretaria': 'Secretaria',
      'contadora': 'Contador',
      'admin': 'Administrador'
    }

    // Si se proporciona empleado_id, vincular el usuario al empleado existente
    if (empleado_id) {
      const { error: linkError } = await supabaseAdmin
        .from('empleados')
        .update({ user_id: newUser.user.id })
        .eq('id', empleado_id)

      if (linkError) {
        console.error('Error linking empleado:', linkError)
      }
    } else {
      // Crear nuevo registro de empleado automáticamente
      const { error: empleadoError } = await supabaseAdmin
        .from('empleados')
        .insert({
          user_id: newUser.user.id,
          nombre_completo: full_name,
          nombre: nombre || null,
          primer_apellido: primer_apellido || null,
          segundo_apellido: segundo_apellido || null,
          email: email,
          telefono: phone || null,
          puesto: rolToPuesto[role] || 'Empleado',
          activo: true,
          fecha_ingreso: new Date().toISOString().split('T')[0]
        })

      if (empleadoError) {
        console.error('Error creating empleado:', empleadoError)
        // No lanzar error, el usuario ya está creado
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: newUser.user
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