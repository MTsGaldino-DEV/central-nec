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
