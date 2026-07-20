import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Ícones SVG inline
// ---------------------------------------------------------------------------
const IcList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IcUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
const IcBarChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
// Seta para grupos colapsáveis
const IcChevron = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ---------------------------------------------------------------------------
// Sidebar
//
// Props:
//  - role: 'despachante' | 'supervisor'
//  - ocorrencias: Array (full list for counts)
//  - activeView: string
//  - onNavigate: (id: string) => void
//  - onNovaOcorrencia: () => void
//  - pmalCount: number (quantidade de serviços PMAL carregados)
// ---------------------------------------------------------------------------
export default function Sidebar({
  role,
  ocorrencias = [],
  activeView,
  onNavigate,
  onNovaOcorrencia,
  pmalCount = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const total = ocorrencias.length;
  const pendentes = ocorrencias.filter((o) => o.status === 'em_analise').length;

  // Grupos abertos por padrão
  const defaultGroups = role === 'supervisor' ? ['ocorrencias', 'indicadores'] : ['ocorrencias'];
  const [openGroups, setOpenGroups] = useState(new Set(defaultGroups));

  const toggleGroup = (id) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Definição dos grupos ────────────────────────────────────────────────
  const ocorrenciasItems = [
    {
      id: 'minhas',
      label: 'Minhas Ocorrências',
      icon: <IcList />,
      count: role === 'despachante' ? total : undefined,
    },
    ...(role === 'supervisor' ? [
      { id: 'pendentes', label: 'Aprovações Pendentes', icon: <IcInbox />, count: pendentes },
      { id: 'todas', label: 'Todas as Ocorrências', icon: <IcLayers />, count: total },
    ] : []),
    { id: 'nova', label: 'Nova Ocorrência', icon: <IcPlus />, isAction: true },
    ...(role === 'supervisor' ? [
      { id: 'usuarios', label: 'Gestão de Usuários', icon: <IcUsers />, path: '/usuarios' },
    ] : []),
  ];

  const indicadoresItems = [
    {
      id: 'pmal',
      label: 'PMAL',
      icon: <IcBarChart />,
      path: '/indicadores/pmal',
      count: pmalCount > 0 ? pmalCount : undefined,
    },
  ];

  const groups = [
    { id: 'ocorrencias', label: 'Ocorrências', items: ocorrenciasItems },
    ...(role === 'supervisor' ? [{ id: 'indicadores', label: 'Indicadores', items: indicadoresItems }] : []),
  ];

  // ── Click handler ────────────────────────────────────────────────────────
  const handleClick = (item) => {
    if (item.isAction) {
      onNovaOcorrencia?.();
    } else if (item.path) {
      if (location.pathname !== item.path) navigate(item.path);
    } else {
      if (location.pathname !== '/') {
        navigate('/');
      } else {
        onNavigate?.(item.id);
      }
    }
  };

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.isAction) return false;
    return location.pathname === '/' && activeView === item.id;
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0B1220" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="l1">Central NEC</div>
          <div className="l2">NEC · Despacho de Campo</div>
        </div>
      </div>

      {/* Grupos de navegação */}
      <nav id="nav-items" style={{ flex: 1, overflowY: 'auto' }}>
        {groups.map((group) => {
          const isOpen = openGroups.has(group.id);
          return (
            <div key={group.id} className="nav-group">
              {/* Label do grupo + seta */}
              <button
                className="nav-group-label"
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
              >
                <span>{group.label}</span>
                <span className="nav-group-chevron">
                  <IcChevron open={isOpen} />
                </span>
              </button>

              {/* Items do grupo (colapsável) */}
              <div className={`nav-group-items${isOpen ? ' open' : ''}`}>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item${isItemActive(item) ? ' active' : ''}${item.isAction ? ' nav-item-action' : ''}`}
                    onClick={() => handleClick(item)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.count !== undefined && (
                      <span className="count">{item.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
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
