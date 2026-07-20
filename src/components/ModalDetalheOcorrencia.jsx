import { useEffect, useState } from 'react';
import { obterUrlAssinada } from '../data/fotos';
import { atualizarStatusOcorrencia, editarOcorrencia } from '../data/ocorrencias';
import { useAuth } from '../context/AuthContext';
import { useToast, ToastContainer } from './Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  cancelado: 'Cancelada',
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

const MSG_ERRO_GENERICO =
  'Não foi possível concluir a ação. Atualize a página e tente novamente.';

// ── Ícones ────────────────────────────────────────────────────────────────────

const IcClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IcImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const IcCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IcUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IcSpinner = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" style={{ width: 15, height: 15, animation: 'spin 0.8s linear infinite' }}>
    <path d="M12 2a10 10 0 1 0 10 10" />
  </svg>
);

// ── Slots de foto ─────────────────────────────────────────────────────────────

const SLOTS = [
  { key: 'evidencia1', label: 'Evidência 1' },
  { key: 'evidencia2', label: 'Evidência 2' },
  { key: 'evidencia3', label: 'Evidência 3' },
  { key: 'evidencia4', label: 'Evidência 4' },
  { key: 'evidencia5', label: 'Evidência 5' },
];

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * ModalDetalheOcorrencia
 *
 * Props:
 *  - ocorrencia : objeto selecionado (ou null para fechar)
 *  - onClose    : () => void
 *  - onDecisao  : (ocorrenciaAtualizada) => void  — notifica o pai após aprovar/reprovar
 */
export default function ModalDetalheOcorrencia({ ocorrencia, onClose, onDecisao }) {
  const { usuarioAtual, role } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  // ── URLs assinadas ────────────────────────────────────────────────────────
  const [signedUrls, setSignedUrls] = useState({
    rota: null, conversa_csi: null, conversa_equipe: null,
  });
  const [loadingFotos, setLoadingFotos] = useState(false);

  useEffect(() => {
    if (!ocorrencia) return;

    const fotos = ocorrencia.fotos ?? {};
    const slots = SLOTS.filter(({ key }) => fotos[key]);

    setSignedUrls({ rota: null, conversa_csi: null, conversa_equipe: null });
    if (slots.length === 0) return;

    setLoadingFotos(true);
    Promise.all(
      slots.map(async ({ key }) => {
        try {
          const url = await obterUrlAssinada(fotos[key]);
          return [key, url];
        } catch {
          return [key, null];
        }
      })
    ).then((results) => {
      setSignedUrls((prev) => ({ ...prev, ...Object.fromEntries(results) }));
      setLoadingFotos(false);
    });
  }, [ocorrencia?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Estado da decision-box (apenas supervisor + em_analise) ──────────────
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Reseta o campo de observação sempre que a ocorrência muda
  useEffect(() => { setObservacao(''); }, [ocorrencia?.id]);

  const [editando, setEditando] = useState(false);
  const [formEdit, setFormEdit] = useState({
    numero_servico: '',
    tipo: '',
    tipo_equipe: '',
    equipe: '',
    csi: '',
    descricao: '',
  });

  useEffect(() => {
    if (!ocorrencia) return;
    setFormEdit({
      numero_servico: ocorrencia.numero_servico ?? '',
      tipo: ocorrencia.tipo ?? '',
      tipo_equipe: ocorrencia.tipo_equipe ?? '',
      equipe: ocorrencia.equipe ?? '',
      csi: ocorrencia.csi ?? '',
      descricao: ocorrencia.descricao ?? '',
    });
  }, [ocorrencia]);

  const handleSalvarEdicao = async () => {
    if (!formEdit.csi || !formEdit.tipo || !formEdit.tipo_equipe || !formEdit.descricao) {
      addToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    if (formEdit.numero_servico && !/^\d{9}$/.test(formEdit.numero_servico)) {
      addToast('O Nº do Serviço deve conter exatamente 9 dígitos.', 'warning');
      return;
    }

    setSalvando(true);
    try {
      const atualizada = await editarOcorrencia(ocorrencia.id, formEdit);
      addToast('Ocorrência atualizada com sucesso!', 'success');
      setEditando(false);
      onDecisao?.(atualizada, 'Ocorrência editada com sucesso.');
    } catch (err) {
      console.error('Erro ao editar ocorrência:', err);
      addToast('Erro ao salvar as edições: ' + err.message, 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (!ocorrencia) return null;

  const fotos = ocorrencia.fotos ?? {};
  const podaDecidir = role === 'supervisor' && ocorrencia.status === 'em_analise';
  const jaDecidida = ocorrencia.status === 'aprovado' || ocorrencia.status === 'reprovado' || ocorrencia.status === 'cancelado';

  const despachantePodeCancelar = role === 'despachante' && ocorrencia.status === 'em_analise';
  const supervisorPodeCancelar = role === 'supervisor' && ocorrencia.status !== 'cancelado';
  const supervisorPodeVoltar = role === 'supervisor' && ocorrencia.status !== 'em_analise';

  const podeEditar = ocorrencia.status === 'em_analise' && (role === 'supervisor' || ocorrencia.despachante_id === usuarioAtual?.id);

  // ── Handlers de decisão ───────────────────────────────────────────────────
  const handleDecisao = async (novoStatus) => {
    // Reprovação exige observação
    if (novoStatus === 'reprovado' && !observacao.trim()) {
      addToast('A observação é obrigatória para reprovar uma ocorrência.', 'warning');
      return;
    }

    setSalvando(true);
    try {
      const atualizada = await atualizarStatusOcorrencia(
        ocorrencia.id,
        novoStatus,
        observacao.trim(),
        { id: usuarioAtual.id, nome: usuarioAtual.nome }
      );

      let msgSucesso = 'Ocorrência atualizada com sucesso.';
      if (novoStatus === 'aprovado') msgSucesso = 'Ocorrência aprovada.';
      if (novoStatus === 'reprovado') msgSucesso = 'Ocorrência reprovada e devolvida ao despachante.';
      if (novoStatus === 'cancelado') msgSucesso = 'Ocorrência cancelada.';
      if (novoStatus === 'em_analise') msgSucesso = 'Ocorrência voltou para análise.';

      // Notifica o pai com a mensagem — o toast aparece no Painel, após o modal fechar
      onDecisao?.(atualizada, msgSucesso);
      onClose();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      addToast(MSG_ERRO_GENERICO, 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !salvando) onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="overlay show" onClick={handleBackdrop}>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Detalhe da Ocorrência"
          style={{ maxWidth: 660 }}
        >
          {/* Head */}
          <div className="modal-head">
            <div>
              <h2>Detalhe da Ocorrência {ocorrencia.id_sequencial ? `#${ocorrencia.id_sequencial}` : ''}</h2>
              <div className="sub" style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.02em' }}>
                {ocorrencia.numero_servico ? `Serviço nº ${ocorrencia.numero_servico}` : 'Sem Nº de Serviço'}
              </div>
            </div>
            <button className="modal-close" onClick={onClose} disabled={salvando} aria-label="Fechar modal">
              <IcClose />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">

            {/* Badge de status */}
            <div style={{ marginBottom: 16 }}>
              <span className={`badge st-${ocorrencia.status}`}>
                <span className="dot" />
                {STATUS_LABEL[ocorrencia.status] ?? ocorrencia.status}
              </span>
            </div>

            {/* Meta info */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-faint)', fontSize: 12 }}>
                <IcCalendar />
                {fmtData(ocorrencia.data_hora)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-faint)', fontSize: 12 }}>
                <IcUser />
                {ocorrencia.despachante_nome ?? '—'}
              </div>
            </div>

            {/* Grid de detalhes */}
            {editando ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                  <div className="field">
                    <label>Nº do Serviço</label>
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="ex: 243520170"
                      value={formEdit.numero_servico}
                      onChange={(e) => setFormEdit(f => ({ ...f, numero_servico: e.target.value.replace(/\D/g, '') }))}
                      disabled={salvando}
                    />
                  </div>
                  <div className="field">
                    <label>CSI <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="CSI"
                      value={formEdit.csi}
                      onChange={(e) => setFormEdit(f => ({ ...f, csi: e.target.value }))}
                      required
                      disabled={salvando}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
                  <div className="field">
                    <label>Tipo de Ocorrência <span className="req">*</span></label>
                    <select
                      value={formEdit.tipo}
                      onChange={(e) => setFormEdit(f => ({ ...f, tipo: e.target.value }))}
                      required
                      disabled={salvando}
                    >
                      <option value="">Selecione o tipo...</option>
                      {['Avaria em equipamento', 'Ocorrência com equipe', 'Intercorrência de Rota', 'Desvio de procedimento', 'Reclamação de cliente', 'Outro'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Tipo de Equipe <span className="req">*</span></label>
                    <select
                      value={formEdit.tipo_equipe}
                      onChange={(e) => setFormEdit(f => ({ ...f, tipo_equipe: e.target.value }))}
                      required
                      disabled={salvando}
                    >
                      <option value="">Selecione...</option>
                      {['Multifuncional', 'Moto'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Equipe</label>
                  <input
                    type="text"
                    placeholder="Nome/código da equipe"
                    value={formEdit.equipe}
                    onChange={(e) => setFormEdit(f => ({ ...f, equipe: e.target.value }))}
                    disabled={salvando}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 16 }}>
                <Detail label="Tipo de ocorrência" value={ocorrencia.tipo} />
                <Detail label="Tipo de Equipe" value={ocorrencia.tipo_equipe} />
                <Detail label="Equipe" value={ocorrencia.equipe} />
                <Detail label="CSI" value={ocorrencia.csi} />
              </div>
            )}

            {/* Descrição */}
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ marginBottom: 4, display: 'block' }}>Descrição {editando && <span className="req">*</span>}</label>
              {editando ? (
                <textarea
                  placeholder="Descreva o ocorrido..."
                  value={formEdit.descricao}
                  onChange={(e) => setFormEdit(f => ({ ...f, descricao: e.target.value }))}
                  required
                  disabled={salvando}
                  style={{ minHeight: 90, width: '100%', resize: 'vertical' }}
                />
              ) : (
                <TextBox>{ocorrencia.descricao || '—'}</TextBox>
              )}
            </div>

            {/* ── Decision box ─────────────────────────────────────────── */}

            {/* A) Supervisor + em_analise → formulário de decisão */}
            {podaDecidir && (
              <DecisionForm
                observacao={observacao}
                onObservacaoChange={setObservacao}
                onDecisao={handleDecisao}
                salvando={salvando}
              />
            )}

            {/* B) Ocorrência já decidida → exibe dados reais do supervisor */}
            {jaDecidida && (
              <DecisionResult ocorrencia={ocorrencia} />
            )}

            {/* Fotos */}
            <div className="field" style={{ marginTop: 4 }}>
              <label style={{ marginBottom: 8, display: 'block' }}>Fotos de evidência</label>

              {loadingFotos ? (
                <div style={{ color: 'var(--text-faint)', fontSize: 12, padding: '8px 0' }}>
                  Carregando fotos…
                </div>
              ) : (
                <div className="photo-grid">
                  {SLOTS.map(({ key, label }) => {
                    const path = fotos[key];
                    const signedUrl = signedUrls[key];

                    if (path && signedUrl) {
                      return (
                        <a
                          key={key}
                          href={signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Abrir ${label} em nova aba`}
                          style={{ display: 'block', borderRadius: 8, overflow: 'hidden', textDecoration: 'none', position: 'relative' }}
                        >
                          <img
                            src={signedUrl}
                            alt={label}
                            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                          />
                          <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                            color: '#fff', fontSize: 10, padding: '6px 8px',
                          }}>
                            {label}
                          </div>
                        </a>
                      );
                    }

                    if (path && !signedUrl) {
                      return (
                        <div key={key} className="photo-slot" style={{ opacity: 0.5, cursor: 'default' }}>
                          <IcImage />
                          <div className="lbl">{label}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>Indisponível</div>
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="photo-slot" style={{ opacity: 0.35, cursor: 'default' }}>
                        <IcImage />
                        <div className="lbl">{label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>Não anexada</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-foot" style={{ display: 'flex', justifyContent: 'space-between' }}>
            {editando ? (
              <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditando(false)} disabled={salvando}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSalvarEdicao} disabled={salvando}>
                  {salvando ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><IcSpinner /> Salvando…</span>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(despachantePodeCancelar || supervisorPodeCancelar) && (
                    <button type="button" className="btn btn-outline" style={{ borderColor: 'rgba(220,38,38,0.5)', color: '#f87171' }} onClick={() => handleDecisao('cancelado')} disabled={salvando}>
                      Cancelar Ocorrência
                    </button>
                  )}
                  {supervisorPodeVoltar && (
                    <button type="button" className="btn btn-outline" onClick={() => handleDecisao('em_analise')} disabled={salvando}>
                      Voltar para Análise
                    </button>
                  )}
                  {podeEditar && (
                    <button type="button" className="btn btn-outline" onClick={() => setEditando(true)} disabled={salvando}>
                      Editar Ocorrência
                    </button>
                  )}
                </div>
                <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>
                  Fechar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toasts locais do modal (sucesso/erro de decisão) */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Detail({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
        {value || '—'}
      </div>
    </div>
  );
}

function TextBox({ children }) {
  return (
    <div style={{
      background: 'var(--surface-alt, rgba(255,255,255,0.03))',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 13,
      color: 'var(--text)',
      lineHeight: 1.6,
      whiteSpace: 'pre-wrap',
    }}>
      {children}
    </div>
  );
}

/**
 * Formulário de aprovação/reprovação — exibido apenas para supervisor + em_analise.
 */
function DecisionForm({ observacao, onObservacaoChange, onDecisao, salvando }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '16px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
        Decisão do supervisor
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label style={{ marginBottom: 4, display: 'block' }}>
          Observação{' '}
          <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(obrigatória para reprovar)</span>
        </label>
        <textarea
          placeholder="Adicione uma observação antes de decidir..."
          value={observacao}
          onChange={(e) => onObservacaoChange(e.target.value)}
          disabled={salvando}
          style={{ minHeight: 80, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={salvando}
          onClick={() => onDecisao('aprovado')}
          style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981', color: '#fff' }}
        >
          {salvando ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IcSpinner />Salvando…
            </span>
          ) : (
            '✓ Aprovar'
          )}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          disabled={salvando}
          onClick={() => onDecisao('reprovado')}
          style={{ flex: 1, borderColor: 'rgba(220,38,38,0.5)', color: '#f87171' }}
        >
          {salvando ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <IcSpinner />Salvando…
            </span>
          ) : (
            '✗ Reprovar'
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Exibe os dados reais de uma decisão já tomada pelo supervisor.
 */
function DecisionResult({ ocorrencia }) {
  if (ocorrencia.status === 'cancelado') {
    return (
      <div style={{ background: 'rgba(100,100,100,0.08)', border: '1px solid rgba(100,100,100,0.3)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          ∅ Cancelada
        </div>
        {ocorrencia.supervisor_nome && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
            <Detail label="Cancelado por" value={ocorrencia.supervisor_nome} />
            <Detail label="Decidido em" value={fmtData(ocorrencia.decidido_em)} />
          </div>
        )}
      </div>
    );
  }

  const corStatus = ocorrencia.status === 'aprovado'
    ? { bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.3)', label: '#4ade80' }
    : { bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)', label: '#f87171' };

  return (
    <div
      style={{
        background: corStatus.bg,
        border: `1px solid ${corStatus.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: corStatus.label, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {ocorrencia.status === 'aprovado' ? '✓ Aprovado pelo supervisor' : '✗ Reprovado pelo supervisor'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: ocorrencia.observacao_supervisor ? 10 : 0 }}>
        <Detail label="Supervisor" value={ocorrencia.supervisor_nome} />
        <Detail label="Decidido em" value={fmtData(ocorrencia.decidido_em)} />
      </div>

      {ocorrencia.observacao_supervisor && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Observação
          </div>
          <TextBox>{ocorrencia.observacao_supervisor}</TextBox>
        </div>
      )}
    </div>
  );
}