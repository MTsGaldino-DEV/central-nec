import { supabase } from '../supabaseClient';

/**
 * Busca o perfil do usuário na tabela public.usuarios.
 * @param {string} id - UUID do usuário (= auth.users.id)
 * @returns {Promise<{nome, iniciais, email, role, ativo, criado_em}>}
 */
export async function buscarUsuario(id) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca todos os usuários, ordenado por nome (A-Z).
 * Depende da policy de select em public.usuarios para a role supervisor.
 * @returns {Promise<Array>}
 */
export async function buscarTodosUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome', { ascending: true });

  if (error) throw error;
  return data;
}
