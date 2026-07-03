import { useAuth } from '../context/AuthContext';

const roleLabel = {
  despachante: 'Despachante',
  supervisor: 'Supervisor',
};

export default function Topbar({ title, subtitle }) {
  const { usuarioAtual, logout } = useAuth();

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title ?? 'Painel'}</div>
        {subtitle && <div className="topbar-sub">{subtitle}</div>}
      </div>

      <div className="topbar-right">
        {usuarioAtual && (
          <div className="user-chip">
            <div className="avatar">{usuarioAtual.iniciais}</div>
            <div>
              <div className="name">{usuarioAtual.nome}</div>
              <div className="role">{roleLabel[usuarioAtual.role] ?? usuarioAtual.role}</div>
            </div>
          </div>
        )}

        <button className="btn btn-outline" onClick={logout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
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
