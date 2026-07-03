import { supabase } from '../supabaseClient';

const BUCKET = 'ocorrencias-fotos';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Faz upload de uma foto para o bucket privado e retorna o PATH salvo.
 *
 * @param {string|number} ocorrenciaId - ID da ocorrência
 * @param {string} tipo - nome do slot (ex: 'rota', 'conversa_csi', 'conversa_equipe')
 * @param {File} file - arquivo selecionado pelo usuário
 * @returns {Promise<string>} path no storage (ex: "123/rota_1720000000000.jpg")
 */
export async function uploadFoto(ocorrenciaId, tipo, file) {
  // Validação de tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`Arquivo inválido: apenas imagens JPEG, PNG, WebP ou GIF são aceitas.`);
  }

  // Validação de tamanho
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error(`Arquivo muito grande: o limite é 5 MB por foto.`);
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${ocorrenciaId}/${tipo}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false });

  if (error) throw new Error(`Falha no upload (${tipo}): ${error.message}`);

  return path;
}

/**
 * Gera uma URL assinada temporária (1 hora) para um path no bucket privado.
 *
 * @param {string} path - caminho do arquivo no bucket
 * @returns {Promise<string>} URL assinada pronta para uso em <img src>
 */
export async function obterUrlAssinada(path) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error) throw new Error(`Falha ao gerar URL assinada: ${error.message}`);

  return data.signedUrl;
}
