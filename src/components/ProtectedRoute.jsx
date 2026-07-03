import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ErroPerfilScreen({ logout }) {
  return (
    <div className="login-body">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-logo">
          <div className="mark" style={{ background: 'var(--red)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
        </div>

        <h1 className="login-title" style={{ fontSize: 19, color: 'var(--red)', marginBottom: 8 }}>
          Conta não configurada
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 28 }}>
          Sua conta existe no sistema de autenticação, mas ainda não foi configurada com um perfil de acesso.
          <br /><br />
          Contate o administrador do sistema.
        </p>

        <button className="btn btn-dark" onClick={logout} style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair da conta
        </button>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const { session, loading, erroPerfil, logout } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="#0B1220" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
          </svg>
        </div>
        <p>Verificando autenticação...</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (erroPerfil) {
    return <ErroPerfilScreen logout={logout} />;
  }

  return children;
}
