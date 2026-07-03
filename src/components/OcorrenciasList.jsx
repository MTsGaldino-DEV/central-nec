const STATUS_LABEL = {
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
};

function fmtData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR') +
    '\u00A0·\u00A0' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function Badge({ status }) {
  return (
    <span className={`badge st-${status}`}>
      <span className="dot" />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function Relay({ status }) {
  // Node 1 (origin) always amber-lit
  // Node 2 (analysis) blue while em_analise, amber once decided
  // Node 3 (decision) green or red
  const seg2 = status === 'em_analise' ? 'lit-blue' : 'lit-amber';
  const seg3 = status === 'aprovado' ? 'lit-green' : status === 'reprovado' ? 'lit-red' : '';
  const wire2 = status !== 'em_analise' ? 'on' : '';

  return (
    <div className="relay-wrap">
      <div className="relay">
        <div className="node lit-amber" />
        <div className="wire on" />
        <div className="node" style={status === 'em_analise' ? { boxShadow: '0 0 0 3px var(--blue-bg)', background: 'var(--blue)', borderColor: '#1863C4' } : { background: 'var(--amber)', borderColor: 'var(--amber-dark)' }} />
        <div className={`wire ${wire2}`} />
        <div className={`node ${seg3}`} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
      <div className="t">Nenhuma ocorrência encontrada</div>
      <div className="s">Ajuste os filtros ou registre uma nova ocorrência.</div>
    </div>
  );
}

/**
 * OcorrenciasList
 *
 * Props:
 *  - ocorrencias: filtered list to display
 *  - busca: string search term (controlled by parent)
 *  - filtroStatus: string ('todos' | 'em_analise' | 'aprovado' | 'reprovado')
 *  - onBuscaChange: (value: string) => void
 *  - onFiltroStatusChange: (value: string) => void
 *  - onRowClick: (ocorrencia) => void  (optional, for future detail modal)
 */
export default function OcorrenciasList({
  ocorrencias = [],
  busca = '',
  filtroStatus = 'todos',
  onBuscaChange,
  onFiltroStatusChange,
  onRowClick,
}) {
  const STATUS_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'em_analise', label: 'Em análise' },
    { id: 'aprovado', label: 'Aprovado' },
    { id: 'reprovado', label: 'Reprovado' },
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Buscar por nº do serviço, CSI ou equipe..."
            value={busca}
            onChange={(e) => onBuscaChange?.(e.target.value)}
          />
        </div>

        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip-filter${filtroStatus === f.id ? ' active' : ''}`}
            onClick={() => onFiltroStatusChange?.(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="list-card">
        <div className="row head">
          <div>Data / Hora</div>
          <div>Nº Serviço</div>
          <div>Ocorrência</div>
          <div>Equipe</div>
          <div>Status</div>
          <div>Fluxo</div>
        </div>

        {ocorrencias.length === 0 ? (
          <EmptyState />
        ) : (
          ocorrencias.map((o) => (
            <div
              key={o.id}
              className="row body-row"
              onClick={() => onRowClick?.(o)}
            >
              <div className="cell-date mono">{fmtData(o.data_hora)}</div>
              <div className="cell-servico mono">{o.numero_servico}</div>
              <div className="cell-desc">
                <div className="tipo">{o.tipo}</div>
                <div className="csi">{o.csi}</div>
              </div>
              <div className="cell-equipe">{o.equipe}</div>
              <div><Badge status={o.status} /></div>
              <div><Relay status={o.status} /></div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
