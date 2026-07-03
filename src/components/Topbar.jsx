import { useAuth } from '../context/AuthContext';

const roleLabel = {
  despachante: 'Despachante',
  supervisor: 'Supervisor',
};

const STATUS_LABEL_PRINT = {
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

function fmtDataPrint(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR') +
    '\u00A0·\u00A0' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

/**
 * Monta HTML imprimível a partir dos dados já carregados e abre window.print().
 * Respeita os filtros ativos — recebe apenas os registros visíveis na tela.
 */
function handlePrint(ocorrencias, filtroLabel) {
  const agora = new Date().toLocaleString('pt-BR');

  const linhas = ocorrencias
    .map(
      (o) => `
      <div class="p-item">
        <div class="p-head">
          <span class="p-num">${o.numero_servico ?? '—'}</span>
          <span class="p-badge ${o.status}">${STATUS_LABEL_PRINT[o.status] ?? o.status}</span>
          <span class="p-date">${fmtDataPrint(o.data_hora)}</span>
        </div>
        <div class="p-grid">
          <div><span class="p-k">Tipo</span><span class="p-v">${o.tipo ?? '—'}</span></div>
          <div><span class="p-k">CSI</span><span class="p-v">${o.csi ?? '—'}</span></div>
          <div><span class="p-k">Equipe</span><span class="p-v">${o.equipe ?? '—'}</span></div>
          <div><span class="p-k">Despachante</span><span class="p-v">${o.despachante_nome ?? '—'}</span></div>
        </div>
        ${o.descricao ? `<div class="p-desc">${o.descricao}</div>` : ''}
        ${
          o.status !== 'em_analise' && o.supervisor_nome
            ? `<div class="p-decision ${o.status}">
                <span class="p-k">${o.status === 'aprovado' ? '✓ Aprovado' : '✗ Reprovado'} por ${o.supervisor_nome}</span>
                ${o.decidido_em ? `<span class="p-date"> · ${fmtDataPrint(o.decidido_em)}</span>` : ''}
                ${o.observacao_supervisor ? `<p class="p-obs">${o.observacao_supervisor}</p>` : ''}
               </div>`
            : ''
        }
      </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Ocorrências — Central NEC</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #101828; padding: 28px; }
    h1  { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
    .sub { font-size: 11px; color: #667085; margin-bottom: 6px; }
    .meta { font-size: 10px; color: #98a2b3; margin-bottom: 20px; border-bottom: 1px solid #e3e7ed; padding-bottom: 10px; }
    .p-item { border: 1px solid #e3e7ed; border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; break-inside: avoid; }
    .p-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
    .p-num  { font-weight: 700; font-size: 13px; font-family: monospace; }
    .p-date { font-size: 11px; color: #667085; margin-left: auto; }
    .p-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
    .p-badge.em_analise { background: #eaf3ff; color: #1863c4; }
    .p-badge.aprovado   { background: #e9f9f1; color: #0b7a47; }
    .p-badge.reprovado  { background: #fdedec; color: #c4342a; }
    .p-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 16px; margin-bottom: 8px; }
    .p-k { display: block; font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; color: #98a2b3; margin-bottom: 2px; }
    .p-v { font-size: 12px; font-weight: 600; }
    .p-desc { font-size: 11.5px; color: #344054; line-height: 1.5; border-top: 1px solid #f2f4f7; padding-top: 8px; margin-top: 8px; }
    .p-decision { border-top: 1px solid #f2f4f7; padding-top: 8px; margin-top: 8px; font-size: 11px; }
    .p-decision.aprovado { color: #0b7a47; }
    .p-decision.reprovado { color: #c4342a; }
    .p-obs { color: #344054; margin-top: 4px; font-size: 11px; }
    @media print {
      body { padding: 10px; }
      .p-item { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Relatório de Ocorrências</h1>
  <div class="sub">Central de Ocorrências CSC · NEC</div>
  <div class="meta">
    Filtro: <strong>${filtroLabel}</strong> &nbsp;·&nbsp;
    ${ocorrencias.length} registro(s) &nbsp;·&nbsp;
    Gerado em ${agora}
  </div>
  ${linhas || '<p style="color:#98a2b3;text-align:center;padding:40px 0">Nenhuma ocorrência encontrada com os filtros aplicados.</p>'}
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return; // popups bloqueados
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

// ── Componente ─────────────────────────────────────────────────────────────────

/**
 * Topbar
 *
 * Props:
 *  - title               : string
 *  - subtitle            : string
 *  - ocorrenciasFiltradas: array  — lista já filtrada da tela (para o relatório)
 *  - filtroLabel         : string — descrição legível do filtro ativo
 */
export default function Topbar({
  title,
  subtitle,
  ocorrenciasFiltradas = [],
  filtroLabel = 'Todos',
}) {
  const { usuarioAtual, logout } = useAuth();

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title ?? 'Painel'}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>

      <div className="topbar-right">
        {/* Botão exportar */}
        <button
          className="btn btn-outline"
          title="Exportar / Imprimir lista atual"
          onClick={() => handlePrint(ocorrenciasFiltradas, filtroLabel)}
          id="btn-exportar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          <span className="topbar-export-label">Exportar</span>
        </button>

        {usuarioAtual && (
          <div className="user-chip">
            <div className="avatar">{usuarioAtual.iniciais}</div>
            <div>
              <div className="name">{usuarioAtual.nome}</div>
              <div className="role">{roleLabel[usuarioAtual.role] ?? usuarioAtual.role}</div>
            </div>
          </div>
        )}

        <button className="btn btn-outline" onClick={logout} id="btn-logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>
    </header>
  );
}
