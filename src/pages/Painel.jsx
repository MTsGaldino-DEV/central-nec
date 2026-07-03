import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOcorrencias } from '../hooks/useOcorrencias';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import StatsRow from '../components/StatsRow';
import OcorrenciasList from '../components/OcorrenciasList';
import ModalNovaOcorrencia from '../components/ModalNovaOcorrencia';
import ModalDetalheOcorrencia from '../components/ModalDetalheOcorrencia';

const VIEW_META = {
  minhas:    { title: 'Minhas Ocorrências',    sub: 'Registros enviados por você' },
  pendentes: { title: 'Aprovações Pendentes',  sub: 'Ocorrências aguardando sua decisão' },
  todas:     { title: 'Todas as Ocorrências',  sub: 'Histórico completo da central' },
};

export default function Painel() {
  const { usuarioAtual, role } = useAuth();

  // ── View / filter state ───────────────────────────────────────────────
  const defaultView = role === 'supervisor' ? 'pendentes' : 'minhas';
  const [activeView, setActiveView]       = useState(defaultView);
  const [busca, setBusca]                 = useState('');
  const [filtroStatus, setFiltroStatus]   = useState('todos');
  const [modalAberto, setModalAberto]     = useState(false);
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada] = useState(null);

  // ── Realtime data ─────────────────────────────────────────────────────
  // Despachantes only see their own records; supervisors see all
  const filtros = useMemo(
    () => (role === 'despachante' ? { despachanteId: usuarioAtual?.id } : {}),
    [role, usuarioAtual?.id]
  );
  const { ocorrencias, loading: loadingOcorrencias } = useOcorrencias(filtros);

  // ── Client-side filtering ─────────────────────────────────────────────
  const listaBase = useMemo(() => {
    if (role === 'supervisor' && activeView === 'pendentes') {
      return ocorrencias.filter((o) => o.status === 'em_analise');
    }
    return ocorrencias;
  }, [ocorrencias, role, activeView]);

  const listaFiltrada = useMemo(() => {
    let lista = listaBase;

    if (filtroStatus !== 'todos') {
      lista = lista.filter((o) => o.status === filtroStatus);
    }

    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(
        (o) =>
          o.numero_servico?.toLowerCase().includes(q) ||
          o.csi?.toLowerCase().includes(q) ||
          o.equipe?.toLowerCase().includes(q)
      );
    }

    return lista;
  }, [listaBase, filtroStatus, busca]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleNavigate = (id) => {
    setActiveView(id);
    setBusca('');
    setFiltroStatus('todos');
  };

  const meta = VIEW_META[activeView] ?? VIEW_META[defaultView];

  return (
    <div className="app">
      <Sidebar
        role={role}
        ocorrencias={ocorrencias}
        activeView={activeView}
        onNavigate={handleNavigate}
        onNovaOcorrencia={() => setModalAberto(true)}
      />

      <div className="main">
        <Topbar title={meta.title} subtitle={meta.sub} />

        <div className="content">
          {loadingOcorrencias ? (
            <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>
              Carregando ocorrências...
            </div>
          ) : (
            <>
              <StatsRow ocorrencias={ocorrencias} role={role} />
              <OcorrenciasList
                ocorrencias={listaFiltrada}
                busca={busca}
                filtroStatus={filtroStatus}
                onBuscaChange={(v) => setBusca(v)}
                onFiltroStatusChange={(v) => setFiltroStatus(v)}
                onRowClick={(o) => setOcorrenciaSelecionada(o)}
              />
            </>
          )}
        </div>
      </div>

      {/* Modal nova ocorrência */}
      {modalAberto && (
        <ModalNovaOcorrencia
          onClose={() => setModalAberto(false)}
          onSuccess={() => {
            // Realtime subscription handles the state update automatically
          }}
        />
      )}

      {/* Modal detalhe */}
      {ocorrenciaSelecionada && (
        <ModalDetalheOcorrencia
          ocorrencia={ocorrenciaSelecionada}
          onClose={() => setOcorrenciaSelecionada(null)}
        />
      )}
    </div>
  );
}
