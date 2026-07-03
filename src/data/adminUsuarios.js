import { supabase } from '../supabaseClient';

/**
 * Chama a Edge Function 'admin-usuarios'.
 */
async function invocarAdmin(action, payload) {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', {
    body: { action, ...payload },
  });

  // error do Supabase Edge Functions client (erro de rede/timeout/etc)
  if (error) throw new Error(error.message || 'Erro na comunicação com o servidor.');

  // Nossa Edge Function retorna { ok: false, erro: '...' } em caso de falhas tratadas
  if (!data?.ok) {
    throw new Error(data?.erro || 'Erro desconhecido na operação.');
  }

  return data;
}

export async function criarUsuario(usuarioData) {
  return invocarAdmin('criar', usuarioData);
}

export async function atualizarPerfilUsuario(perfilData) {
  return invocarAdmin('atualizar_perfil', perfilData);
}

export async function trocarSenhaUsuario({ id, novaSenha }) {
  return invocarAdmin('trocar_senha', { id, novaSenha });
}
