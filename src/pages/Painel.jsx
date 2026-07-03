import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOcorrencias } from '../hooks/useOcorrencias';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import StatsRow from '../components/StatsRow';
import OcorrenciasList from '../components/OcorrenciasList';
import ModalNovaOcorrencia from '../components/ModalNovaOcorrencia';
import ModalDetalheOcorrencia from '../components/ModalDetalheOcorrencia';
import { useToast, ToastContainer } from '../components/Toast';

const VIEW_META = {
  minhas:    { title: 'Minhas Ocorrências',    sub: 'Registros enviados por você' },
  pendentes: { title: 'Aprovações Pendentes',  sub: 'Ocorrências aguardando sua decisão' },
  todas:     { title: 'Todas as Ocorrências',  sub: 'Histórico completo da central' },
};

export default function Painel() {
  const { usuarioAtual, role } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

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

  // Chamado pelo ModalDetalheOcorrencia após aprovar/reprovar
  const handleDecisao = (ocorrenciaAtualizada, msgSucesso) => {
    // O Realtime atualiza a lista automaticamente.
    // Se o modal passou uma mensagem de sucesso, exibimos aqui.
    if (msgSucesso) addToast(msgSucesso, 'success');
    setOcorrenciaSelecionada(null);
  };

  const meta = VIEW_META[activeView] ?? VIEW_META[defaultView];

  // Label legível do filtro ativo — usado no relatório impresso
  const filtroLabel = [
    meta.title,
    filtroStatus !== 'todos' ? `status: ${filtroStatus.replace('_', ' ')}` : null,
    busca.trim() ? `busca: "${busca.trim()}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
        <Topbar
          title={meta.title}
          subtitle={meta.sub}
          ocorrenciasFiltradas={listaFiltrada}
          filtroLabel={filtroLabel}
        />

        <div className="content">
          {loadingOcorrencias ? (
            <>
              {/* Skeleton Stats */}
              <div className="skeleton-stats">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="skeleton-stat-card">
                    <div className="skeleton sk-num"></div>
                    <div className="skeleton sk-lbl"></div>
                  </div>
                ))}
              </div>
              {/* Skeleton List */}
              <div className="skeleton-list">
                <div className="row head">
                  <div>Data / Hora</div>
                  <div>Nº Serviço</div>
                  <div>Ocorrência</div>
                  <div>Equipe</div>
                  <div>Status</div>
                  <div>Fluxo</div>
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="skeleton-row">
                    <div className="skeleton sk-cell" style={{ width: '80%' }}></div>
                    <div className="skeleton sk-cell" style={{ width: '90%' }}></div>
                    <div>
                      <div className="skeleton sk-cell" style={{ width: '100%', marginBottom: 6 }}></div>
                      <div className="skeleton sk-cell" style={{ width: '60%' }}></div>
                    </div>
                    <div className="skeleton sk-cell" style={{ width: '70%' }}></div>
                    <div className="skeleton sk-cell" style={{ width: '85px', borderRadius: 20 }}></div>
                    <div className="skeleton sk-cell" style={{ width: '60px' }}></div>
                  </div>
                ))}
              </div>
            </>
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
          onDecisao={handleDecisao}
        />
      )}

      {/* Toasts globais do painel */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
