const IcList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IcInbox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IcLayers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const IcPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/**
 * Sidebar
 *
 * Props:
 *  - role: 'despachante' | 'supervisor'
 *  - ocorrencias: Array (full list for counts)
 *  - activeView: string
 *  - onNavigate: (id: string) => void
 *  - onNovaOcorrencia: () => void
 */
export default function Sidebar({ role, ocorrencias = [], activeView, onNavigate, onNovaOcorrencia }) {
  const total = ocorrencias.length;
  const pendentes = ocorrencias.filter((o) => o.status === 'em_analise').length;

  const despachanteItems = [
    {
      id: 'minhas',
      label: 'Minhas Ocorrências',
      icon: <IcList />,
      count: total,
    },
    {
      id: 'nova',
      label: 'Nova Ocorrência',
      icon: <IcPlus />,
      isAction: true,
    },
  ];

  const supervisorItems = [
    {
      id: 'pendentes',
      label: 'Aprovações Pendentes',
      icon: <IcInbox />,
      count: pendentes,
    },
    {
      id: 'todas',
      label: 'Todas as Ocorrências',
      icon: <IcLayers />,
      count: total,
    },
    {
      id: 'nova',
      label: 'Nova Ocorrência',
      icon: <IcPlus />,
      isAction: true,
    },
  ];

  const items = role === 'supervisor' ? supervisorItems : despachanteItems;

  const handleClick = (item) => {
    if (item.isAction) {
      onNovaOcorrencia?.();
    } else {
      onNavigate?.(item.id);
    }
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0B1220" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="l1">Central de Ocorrências</div>
          <div className="l2">CSC · Despacho de Campo</div>
        </div>
      </div>

      <div className="nav-section-label">Navegação</div>

      <nav id="nav-items">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item${!item.isAction && activeView === item.id ? ' active' : ''}`}
            onClick={() => handleClick(item)}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span className="count">{item.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="demo-note">
          {role === 'supervisor'
            ? 'Supervisor — acesso completo à central.'
            : 'Despachante — visualiza apenas suas ocorrências.'}
        </div>
      </div>
    </aside>
  );
}
