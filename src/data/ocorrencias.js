import { supabase } from '../supabaseClient';

/**
 * Busca ocorrências ordenadas por data_hora desc.
 * Se filtros.despachanteId for fornecido, filtra pelo despachante.
 */
export async function buscarOcorrencias(filtros = {}) {
  let query = supabase
    .from('ocorrencias')
    .select('*')
    .order('data_hora', { ascending: false });

  if (filtros.despachanteId) {
    query = query.eq('despachante_id', filtros.despachanteId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Insere uma nova ocorrência com status inicial 'em_analise'.
 * Retorna a linha criada ou lança um erro tratável.
 */
export async function criarOcorrencia(dados) {
  const { data, error } = await supabase
    .from('ocorrencias')
    .insert({ ...dados, status: 'em_analise' })
    .select()
    .single();

  if (error) throw new Error('Falha ao registrar ocorrência: ' + error.message);
  return data;
}

/**
 * Atualiza o status de uma ocorrência (aprovado | reprovado).
 * supervisor: { id, nome }
 */
export async function atualizarStatusOcorrencia(id, status, observacao, supervisor) {
  const { data, error } = await supabase
    .from('ocorrencias')
    .update({
      status,
      observacao_supervisor: observacao,
      supervisor_id: supervisor.id,
      supervisor_nome: supervisor.nome,
      decidido_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Falha ao atualizar ocorrência: ' + error.message);
  return data;
}

/**
 * Salva os paths das fotos na coluna fotos (jsonb) da ocorrência.
 * Recebe um objeto com as chaves dos slots e o path (ou null) de cada um.
 * Ex: { rota: '123/rota_17200.jpg', conversa_csi: null, conversa_equipe: '123/equipe_17201.jpg' }
 *
 * @param {string|number} id - ID da ocorrência
 * @param {Record<string, string|null>} fotos - mapa slot → path
 * @returns {Promise<object>} ocorrência atualizada
 */
export async function atualizarFotosOcorrencia(id, fotos) {
  const { data, error } = await supabase
    .from('ocorrencias')
    .update({ fotos })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Falha ao salvar fotos: ' + error.message);
  return data;
}
