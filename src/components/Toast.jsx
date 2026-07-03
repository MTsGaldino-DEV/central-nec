/**
 * Toast.jsx — sistema de notificação reutilizável.
 *
 * Uso:
 *   import { useToast, ToastContainer } from './Toast';
 *
 *   // No componente raiz (ou onde quiser exibir os toasts):
 *   const { toasts, addToast, removeToast } = useToast();
 *   <ToastContainer toasts={toasts} onRemove={removeToast} />
 *
 *   // Para disparar:
 *   addToast('Mensagem de sucesso', 'success');
 *   addToast('Erro ao salvar.', 'error');
 *   addToast('Atenção!', 'warning');
 */

import { useState, useCallback } from 'react';

// ── Ícones inline ─────────────────────────────────────────────────────────────

function IcCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IcError() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IcWarn() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IcClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Estilos por tipo ──────────────────────────────────────────────────────────

const TYPE_STYLES = {
  success: {
    bg:     'rgba(22, 163, 74, 0.12)',
    border: 'rgba(22, 163, 74, 0.35)',
    color:  '#4ade80',
    Icon:   IcCheck,
  },
  error: {
    bg:     'rgba(220, 38, 38, 0.12)',
    border: 'rgba(220, 38, 38, 0.35)',
    color:  '#f87171',
    Icon:   IcError,
  },
  warning: {
    bg:     'rgba(217, 119, 6, 0.12)',
    border: 'rgba(217, 119, 6, 0.35)',
    color:  '#fbbf24',
    Icon:   IcWarn,
  },
};

// ── ToastItem ─────────────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }) {
  const style = TYPE_STYLES[toast.type] ?? TYPE_STYLES.error;
  const { Icon } = style;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 10,
        padding: '11px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        maxWidth: 360,
        animation: 'toastIn 0.22s ease',
        color: 'var(--text, #e2e8f0)',
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <span style={{ color: style.color, marginTop: 1 }}>
        <Icon />
      </span>
      <span style={{ flex: 1 }}>{toast.msg}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-faint, #94a3b8)',
          padding: 0,
          marginTop: 1,
          lineHeight: 1,
        }}
        aria-label="Fechar notificação"
      >
        <IcClose />
      </button>
    </div>
  );
}

// ── ToastContainer ────────────────────────────────────────────────────────────

/**
 * Renderiza a pilha de toasts num canto fixo da tela.
 * Coloque uma única instância próximo da raiz da aplicação.
 */
export function ToastContainer({ toasts = [], onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} onRemove={onRemove} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

// ── useToast ──────────────────────────────────────────────────────────────────

/**
 * Hook que gerencia a lista de toasts.
 *
 * @param {number} [duration=4500] - ms até o toast sumir automaticamente
 * @returns {{ toasts, addToast, removeToast }}
 */
export function useToast(duration = 4500) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * @param {string} msg  - Mensagem a exibir
   * @param {'success'|'error'|'warning'} [type='error']
   */
  const addToast = useCallback((msg, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, type }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [duration, removeToast]);

  return { toasts, addToast, removeToast };
}
