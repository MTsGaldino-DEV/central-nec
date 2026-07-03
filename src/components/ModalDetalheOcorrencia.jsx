import { useEffect, useState } from 'react';
import { obterUrlAssinada } from '../data/fotos';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL = {
  em_analise: 'Em análise',
  aprovado:   'Aprovado',
  reprovado:  'Reprovado',
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

// ── Componente principal ──────────────────────────────────────────────────────

const SLOTS = [
  { key: 'rota',            label: 'Foto da Rota' },
  { key: 'conversa_csi',    label: 'Conversa CSI' },
  { key: 'conversa_equipe', label: 'Conversa Equipe' },
];

/**
 * ModalDetalheOcorrencia
 *
 * Props:
 *  - ocorrencia: objeto da ocorrência selecionada (ou null para fechar)
 *  - onClose: () => void
 */
export default function ModalDetalheOcorrencia({ ocorrencia, onClose }) {
  // URLs assinadas geradas sob demanda: { rota: string|null, conversa_csi: ..., conversa_equipe: ... }
  const [signedUrls, setSignedUrls] = useState({
    rota: null, conversa_csi: null, conversa_equipe: null,
  });
  const [loadingFotos, setLoadingFotos] = useState(false);

  // Gera as URLs assinadas toda vez que a ocorrência muda
  useEffect(() => {
    if (!ocorrencia) return;

    const fotos = ocorrencia.fotos ?? {};
    const slots = SLOTS.filter(({ key }) => fotos[key]);

    if (slots.length === 0) return;

    setLoadingFotos(true);
    setSignedUrls({ rota: null, conversa_csi: null, conversa_equipe: null });

    Promise.all(
      slots.map(async ({ key }) => {
        try {
          const url = await obterUrlAssinada(fotos[key]);
          return [key, url];
        } catch {
          return [key, null]; // falha silenciosa — slot aparece como "não disponível"
        }
      })
    ).then((results) => {
      const urls = Object.fromEntries(results);
      setSignedUrls((prev) => ({ ...prev, ...urls }));
      setLoadingFotos(false);
    });
  }, [ocorrencia?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ocorrencia) return null;

  const fotos = ocorrencia.fotos ?? {};
  const statusCls = `badge st-${ocorrencia.status}`;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
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
            <h2>Detalhe da Ocorrência</h2>
            <div className="sub" style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.02em' }}>
              {ocorrencia.numero_servico}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar modal">
            <IcClose />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Badge de status */}
          <div style={{ marginBottom: 16 }}>
            <span className={statusCls}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 16 }}>
            <Detail label="Tipo de ocorrência" value={ocorrencia.tipo} />
            <Detail label="Equipe"             value={ocorrencia.equipe} />
            <Detail label="CSI"                value={ocorrencia.csi} />
          </div>

          {/* Descrição */}
          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ marginBottom: 4, display: 'block' }}>Descrição</label>
            <div
              style={{
                background: 'var(--surface-alt, rgba(255,255,255,0.03))',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--text)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {ocorrencia.descricao || '—'}
            </div>
          </div>

          {/* Observação do supervisor (se houver) */}
          {ocorrencia.observacao_supervisor && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label style={{ marginBottom: 4, display: 'block' }}>Observação do supervisor</label>
              <div
                style={{
                  background: 'var(--surface-alt, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: 'var(--text)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {ocorrencia.observacao_supervisor}
              </div>
            </div>
          )}

          {/* Fotos */}
          <div className="field">
            <label style={{ marginBottom: 8, display: 'block' }}>Fotos de evidência</label>

            {loadingFotos ? (
              <div style={{ color: 'var(--text-faint)', fontSize: 12, padding: '8px 0' }}>
                Carregando fotos…
              </div>
            ) : (
              <div className="photo-grid">
                {SLOTS.map(({ key, label }) => {
                  const path     = fotos[key];
                  const signedUrl = signedUrls[key];

                  if (path && signedUrl) {
                    // Foto disponível
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
                          style={{
                            width: '100%',
                            aspectRatio: '4/3',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.65))',
                            color: '#fff',
                            fontSize: 10,
                            padding: '6px 8px',
                          }}
                        >
                          {label}
                        </div>
                      </a>
                    );
                  }

                  if (path && !signedUrl) {
                    // Path existe mas URL falhou
                    return (
                      <div key={key} className="photo-slot" style={{ opacity: 0.5, cursor: 'default' }}>
                        <IcImage />
                        <div className="lbl">{label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                          Indisponível
                        </div>
                      </div>
                    );
                  }

                  // Sem foto
                  return (
                    <div key={key} className="photo-slot" style={{ opacity: 0.35, cursor: 'default' }}>
                      <IcImage />
                      <div className="lbl">{label}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                        Não anexada
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente auxiliar ───────────────────────────────────────────────────

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
