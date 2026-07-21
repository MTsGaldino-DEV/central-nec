// ---------------------------------------------------------------------------
// pmalService.js
// Responsável por buscar os 3 endpoints GDIS e fazer o join em memória,
// retornando apenas os serviços do tipo PMAL prontos para o painel.
// ---------------------------------------------------------------------------

// Credenciais/paths dos endpoints (roteados pelo proxy Vite em dev)
const GDIS_BASE_URL = import.meta.env.VITE_GDIS_BASE_URL || '/api/gdis';
// O proxy remove /api/gdis, então precisamos incluir o /WebConsultaGdis aqui
const BASE = `${GDIS_BASE_URL}/WebConsultaGdis/ws/contratada`;
const CNPJ = '21066139000108';
const COD_LOCAL = '3944471200017';
const MATRICULA = 'e252135';

const EP_NOTASERVICO = `${BASE}/notaservico/${CNPJ}/${COD_LOCAL}/${MATRICULA}`;
const EP_SERVICO     = `${BASE}/servico/${CNPJ}/${COD_LOCAL}/${MATRICULA}`;
const EP_TURMA       = `${BASE}/turma/${CNPJ}/${COD_LOCAL}/${MATRICULA}`;

// ---------------------------------------------------------------------------
// Tipos PMAL (espelho do protótipo)
// ---------------------------------------------------------------------------
export const PMAL_TYPES = [
  'OSLN', 'OSLQ', 'OSRL', 'OSAA', 'OSML', 'OSAC', 'OSMR',
  'RC79', 'RC87', 'OSLA', 'OSLI', 'OSA1', 'OSIM', 'OSA2', 'OSM1',
  'OSTA', 'OSAQ', 'OSIN', 'OSVQ',
];
const PMAL_SET = new Set(PMAL_TYPES);

export const PMAL_TYPE_MAP = {
  OSLN: 'Ligar novo consumidor',
  OSLQ: 'Ligação nova de UC em QM vistoriado',
  OSRL: 'Restabelecer na caixa',
  OSAA: 'Alt. carga acessante micro/mini geração BT',
  OSML: 'Mudar local medição',
  OSAC: 'Alteração de carga',
  OSMR: 'Restabelecer com instalação medidor',
  RC79: 'Vistoria em quadro de medição coletivo',
  RC87: 'Marcar local de entrada',
  OSLA: 'Lig. nova p/acessante micro/mini geração',
  OSLI: 'Ligar novo consumidor - medição indireta',
  OSA1: 'Alteração de carga em instalação cortada',
  OSIM: 'Instalar medidor',
  OSA2: 'Alt carg acess/micro/mini ger in cortada',
  OSM1: 'Mudar local de med em instalação cortada',
  OSTA: 'Trocar medição para aferição',
  OSAQ: 'Alterar carga de UC em QM vistoriado',
  OSIN: 'Restabelecer med. ind',
  OSVQ: 'Vistoria de QM para adequação da ligação',
};

// ---------------------------------------------------------------------------
// Municípios (local → nome)
// ---------------------------------------------------------------------------
export const MUNICIPIOS = [
  { local: '4164', nome: 'AGUA BOA' },       { local: '4162', nome: 'AIMORES' },
  { local: '4106', nome: 'ALPERCATA' },       { local: '4238', nome: 'ALVARENGA' },
  { local: '4351', nome: 'BARRA MANSA' },     { local: '4143', nome: 'CANTAGALO' },
  { local: '0012', nome: 'CAPITAO ANDRADE' }, { local: '4190', nome: 'CENTRAL DE MINAS' },
  { local: '4165', nome: 'COLUNA' },          { local: '4102', nome: 'CONSELHEIRO PENA' },
  { local: '4108', nome: 'COROACI' },         { local: '4154', nome: 'CUPARAQUE' },
  { local: '4105', nome: 'DIVINO LARANJEIRAS' }, { local: '4168', nome: 'ENGENHEIRO CALDAS' },
  { local: '4170', nome: 'FERNANDES TOURINHO' }, { local: '4109', nome: 'FREI INOCENCIO' },
  { local: '4538', nome: 'FREI LAGO NEGRO' }, { local: '4110', nome: 'GALILEIA' },
  { local: '4194', nome: 'GOIABEIRA' },       { local: '4186', nome: 'GONZAGA' },
  { local: '4101', nome: 'GOVERNADOR VALADARES' }, { local: '4103', nome: 'ITABIRINHA DE MANTENA' },
  { local: '4174', nome: 'ITANHOMI' },        { local: '4161', nome: 'ITUETA' },
  { local: '4410', nome: 'JAMPRUCA' },        { local: '4558', nome: 'JATAI' },
  { local: '4199', nome: 'JOSE RAYDAN' },     { local: '4189', nome: 'MANTENA' },
  { local: '4175', nome: 'MARILAC' },         { local: '4115', nome: 'MATHIAS LOBATO' },
  { local: '4104', nome: 'MENDES PIMENTEL' }, { local: '4177', nome: 'NACIP RAYDAN' },
  { local: '4506', nome: 'NOVA BELEM' },      { local: '4183', nome: 'PAULISTAS' },
  { local: '4128', nome: 'PECANHA' },         { local: '4157', nome: 'RESPLENDOR' },
  { local: '4185', nome: 'SANTA EFIGENIA DE MINAS' }, { local: '4132', nome: 'SANTA MARIA DO SUACUI' },
  { local: '4158', nome: 'SANTA RITA DO ITUETO' }, { local: '4191', nome: 'SAO FELIX DE MINAS' },
  { local: '4187', nome: 'SAO GERALDO DA PIEDADE' }, { local: '4535', nome: 'SAO GERALDO DO BAIXIO' },
  { local: '4530', nome: 'SAO GERALDO TUMIRITINGA' }, { local: '4518', nome: 'SAO JOAO DO MANTENINHA' },
  { local: '4131', nome: 'SAO JOAO EVANGELISTA' }, { local: '4176', nome: 'SAO JOSE DA SAFIRA' },
  { local: '4163', nome: 'SAO JOSE DO JACURI' }, { local: '4134', nome: 'SAO PEDRO DO SUACUI' },
  { local: '4172', nome: 'SAO SEBASTIAO DO MARANHAO' }, { local: '4184', nome: 'SARDOA' },
  { local: '4169', nome: 'SOBRALIA' },        { local: '4235', nome: 'TARUMIRIM' },
  { local: '4532', nome: 'TIPITI' },          { local: '4114', nome: 'TUMIRITINGA' },
  { local: '4173', nome: 'VIRGOLANDIA' },
];

const MUNICIPIO_MAP = Object.fromEntries(MUNICIPIOS.map((m) => [m.local, m.nome]));

// ---------------------------------------------------------------------------
// Postos de supervisão (nome → posto)
// ---------------------------------------------------------------------------
const POSTOS = {
  'Posto 1 — Pedro': [
    'FREI INOCENCIO', 'ALPERCATA', 'ALVARENGA', 'CAPITAO ANDRADE', 'ENGENHEIRO CALDAS',
    'FERNANDES TOURINHO', 'GOVERNADOR VALADARES', 'ITANHOMI', 'JAMPRUCA', 'JATAI',
    'MATHIAS LOBATO', 'SAO GERALDO TUMIRITINGA', 'SOBRALIA', 'TARUMIRIM', 'TUMIRITINGA',
  ],
  'Posto 2 — Elton': [
    'COLUNA', 'SAO GERALDO DA PIEDADE', 'AGUA BOA', 'JOSE RAYDAN', 'PAULISTAS',
    'CANTAGALO', 'PECANHA', 'SAO JOAO EVANGELISTA', 'SAO JOSE DO JACURI',
    'SANTA EFIGENIA DE MINAS', 'GONZAGA', 'SANTA MARIA DO SUACUI', 'FREI LAGO NEGRO',
    'SAO PEDRO DO SUACUI', 'SAO SEBASTIAO DO MARANHAO', 'SARDOA',
  ],
  'Posto 3 — Vinicius': [
    'CUPARAQUE', 'CONSELHEIRO PENA', 'RESPLENDOR', 'AIMORES', 'GOIABEIRA',
    'ITUETA', 'SANTA RITA DO ITUETO', 'SAO GERALDO DO BAIXIO', 'GALILEIA',
  ],
  'Posto 4 — Victor': [
    'ITABIRINHA DE MANTENA', 'DIVINO LARANJEIRAS', 'CENTRAL DE MINAS', 'MENDES PIMENTEL',
    'NOVA BELEM', 'SAO FELIX DE MINAS', 'TIPITI', 'MANTENA', 'SAO JOAO DO MANTENINHA',
    'MARILAC', 'COROACI', 'VIRGOLANDIA', 'NACIP RAYDAN', 'SAO JOSE DA SAFIRA',
  ],
};

export const POSTO_KEYS = Object.keys(POSTOS);

const CIDADE_TO_POSTO = {};
Object.entries(POSTOS).forEach(([posto, cidades]) => {
  cidades.forEach((c) => { CIDADE_TO_POSTO[c] = posto; });
});

// ---------------------------------------------------------------------------
// Helpers de parsing
// ---------------------------------------------------------------------------

/**
 * Converte string "HH:MM" ou " HH:MM" ou "-HH:MM" para minutos.
 * Valores negativos indicam prazo vencido (ex: " -5:34").
 */
function parseHHMM(str) {
  if (!str || typeof str !== 'string') return 0;
  const trimmed = str.trim();
  const neg = trimmed.startsWith('-');
  const clean = trimmed.replace(/^-/, '');
  const parts = clean.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const total = h * 60 + m;
  return neg ? -total : total;
}

/**
 * Classifica um serviço em buckets de 24 horas úteis de forma totalmente dinâmica.
 * h = horasRestantes = (prazoAtual - tempoPendencia) em horas decimais.
 * O gráfico exibe no máximo até "Vence em 5 dias"; serviços com mais de 5 dias
 * são agrupados nessa última faixa.
 */
function bucketFromRemaining(h) {
  if (h <= 0) return 'Vencido';
  const dia = Math.ceil(h / 24);
  if (dia === 1) return 'Vence hoje';
  if (dia >= 5) return 'Vence em 5 dias'; // cap: tudo acima de 4 dias → última faixa
  return `Vence em ${dia} dias`;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // sem credentials — rede interna sem autenticação HTTP
  });
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar ${url}`);
  return res.json();
}

export async function fetchNotaservico() {
  return fetchJSON(EP_NOTASERVICO);
}

export async function fetchServico() {
  return fetchJSON(EP_SERVICO);
}

export async function fetchTurma() {
  return fetchJSON(EP_TURMA);
}

// ---------------------------------------------------------------------------
// Join principal — retorna array pronto para o PainelPMAL
// ---------------------------------------------------------------------------
export function joinPmalData(notaArray, servicoArray, turmaArray) {
  // Indexar por chave
  const notaMap = new Map();
  (notaArray || []).forEach((n) => {
    if (n.numeroServico != null) {
      notaMap.set(String(n.numeroServico), n);
    }
  });

  const turmaMap = new Map();
  (turmaArray || []).forEach((t) => {
    if (t.numeroServico != null) {
      turmaMap.set(String(t.numeroServico), t);
    }
  });

  const result = [];

  (servicoArray || []).forEach((row) => {
    // Filtrar apenas tipos PMAL
    if (!PMAL_SET.has(row.tipoServico)) return;

    const notaRow = notaMap.get(String(row.numeroServico));
    const turmaRow = turmaMap.get(String(row.numeroServico)) || null;

    // prazoAtual  = prazo total permitido (ex: "120:00")
    // tempoPendencia = tempo já consumido  (ex: "112:43")
    // remainingMin   = quanto ainda resta  (pode ser negativo se vencido)
    const prazoAtualMin     = parseHHMM(row.prazoAtual);     // total permitido
    const tempoPendenciaMin = parseHHMM(row.tempoPendencia); // consumido
    const remainingMin      = prazoAtualMin - tempoPendenciaMin; // restante

    const vencido = remainingMin <= 0;

    // Localidade
    const localStr   = String(row.local || '');
    const municipio  = MUNICIPIO_MAP[localStr] || localStr;
    const posto      = CIDADE_TO_POSTO[municipio] || null;

    // Disjuntor da nota (pode ser string com espaços)
    const disjuntorRaw = notaRow?.disjuntor;
    const disjuntor    = disjuntorRaw && disjuntorRaw.trim() ? disjuntorRaw.trim() : null;

    result.push({
      numeroServico:         row.numeroServico,
      tipoServico:           row.tipoServico,
      tipoDescricao:         PMAL_TYPE_MAP[row.tipoServico] || row.tipoServico,
      situacao:              row.situacao || 'P',
      municipio,
      local:                 localStr,
      posto,
      bairro:                row.bairro || '',
      endereco:              row.endereco || '',
      numero:                row.numero || '',
      tipoArea:              row.tipoArea || 'U',
      dataCadastro:          new Date(row.dataReclamacao || row.dataDesignacao || Date.now()),
      tempoPendenciaMin,
      prazoAtualMin,
      remainingMin,
      vencido,
      bucket:                bucketFromRemaining(remainingMin / 60),
      numeroVeiculo:          row.numeroVeiculo || null,
      eletricista:           turmaRow?.nomeEletricista || null,
      placa:                 turmaRow?.placa || null,
      quantidadeReincidencia: parseInt(row.quantidadeReincidencia, 10) || 0,
      alimentador:           row.alimentador || '',
      numeroDispositivo:     row.numeroDispositivo || '',
      disjuntor,
      complemento:           notaRow?.complemento || row.complemento || '',
      latitude:              row.latitude  ? parseFloat(row.latitude)  : null,
      longitude:             row.longitude ? parseFloat(row.longitude) : null,
    });
  });

  return result;
}
