import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Headers CORS padrão para Edge Functions
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratar requisição OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, erro: 'Token de autenticação não fornecido.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    // 1. Client anon para validar o token de quem fez a requisição
    const anonClient = createClient(supabaseUrl, anonKey);
    
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ ok: false, erro: 'Token inválido ou expirado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const callerId = authData.user.id;

    // 2. Client service_role para operações administrativas (ignora RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Verificar se quem chamou tem papel de "supervisor"
    const { data: callerProfile, error: callerError } = await adminClient
      .from('usuarios')
      .select('role')
      .eq('id', callerId)
      .single();

    if (callerError || !callerProfile) {
      return new Response(JSON.stringify({ ok: false, erro: 'Perfil do usuário não encontrado.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (callerProfile.role !== 'supervisor') {
      return new Response(JSON.stringify({ ok: false, erro: 'Apenas supervisores podem gerenciar usuários.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Analisar a ação solicitada
    const body = await req.json();
    const { action } = body;

    // --- AÇÃO: CRIAR USUÁRIO ---
    if (action === 'criar') {
      const { email, senha, nome, iniciais, role } = body;

      // Validações básicas
      if (!email || !senha || !nome || !iniciais || !role) {
        return new Response(JSON.stringify({ ok: false, erro: 'Todos os campos são obrigatórios.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (senha.length < 6) {
        return new Response(JSON.stringify({ ok: false, erro: 'A senha deve ter no mínimo 6 caracteres.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (role !== 'despachante' && role !== 'supervisor') {
        return new Response(JSON.stringify({ ok: false, erro: 'Role inválida. Use despachante ou supervisor.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Cria login no Auth
      const { data: newUserAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      });

      if (createAuthError) {
        return new Response(JSON.stringify({ ok: false, erro: `Erro ao criar login: ${createAuthError.message}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const newUserId = newUserAuth.user.id;

      // Cria perfil na tabela public.usuarios
      const { error: insertProfileError } = await adminClient
        .from('usuarios')
        .insert({
          id: newUserId,
          nome,
          iniciais,
          email,
          role,
          ativo: true,
        });

      if (insertProfileError) {
        // Desfaz a criação no Auth se falhar no banco (evita inconsistência)
        await adminClient.auth.admin.deleteUser(newUserId);
        
        return new Response(JSON.stringify({ ok: false, erro: `Erro ao salvar perfil: ${insertProfileError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, mensagem: 'Usuário criado com sucesso.', id: newUserId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- AÇÃO: ATUALIZAR PERFIL ---
    if (action === 'atualizar_perfil') {
      const { id, nome, iniciais, role } = body;

      if (!id || !nome || !iniciais || !role) {
        return new Response(JSON.stringify({ ok: false, erro: 'ID, nome, iniciais e role são obrigatórios.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (role !== 'despachante' && role !== 'supervisor') {
        return new Response(JSON.stringify({ ok: false, erro: 'Role inválida. Use despachante ou supervisor.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: updateError } = await adminClient
        .from('usuarios')
        .update({ nome, iniciais, role })
        .eq('id', id);

      if (updateError) {
        return new Response(JSON.stringify({ ok: false, erro: `Erro ao atualizar perfil: ${updateError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, mensagem: 'Perfil atualizado com sucesso.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- AÇÃO: TROCAR SENHA ---
    if (action === 'trocar_senha') {
      const { id, novaSenha } = body;

      if (!id || !novaSenha) {
        return new Response(JSON.stringify({ ok: false, erro: 'ID e nova senha são obrigatórios.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (novaSenha.length < 6) {
        return new Response(JSON.stringify({ ok: false, erro: 'A nova senha deve ter no mínimo 6 caracteres.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: resetError } = await adminClient.auth.admin.updateUserById(id, {
        password: novaSenha,
      });

      if (resetError) {
        return new Response(JSON.stringify({ ok: false, erro: `Erro ao trocar senha: ${resetError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, mensagem: 'Senha alterada com sucesso.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação desconhecida
    return new Response(JSON.stringify({ ok: false, erro: 'Ação inválida.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Erro interno na Edge Function:', err);
    return new Response(JSON.stringify({ ok: false, erro: 'Erro interno no servidor.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
