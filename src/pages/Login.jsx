import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msgMap = {
        'Invalid login credentials': 'E-mail ou senha inválidos. Verifique seus dados.',
        'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
        'Too many requests': 'Muitas tentativas. Aguarde alguns instantes.',
      };
      setError(msgMap[error.message] || 'Ocorreu um erro ao entrar. Tente novamente.');
      setLoading(false);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="login-body">
      <div className="login-card">
        <div className="login-logo">
          <div className="mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="#0B1220" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h7l-1 8 11-14h-7z" />
            </svg>
          </div>
        </div>

        <h1 className="login-title">Central de Ocorrências</h1>
        <p className="login-subtitle">CSC · Despacho de Campo — Acesso restrito</p>

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="login-field">
            <label htmlFor="email">E-mail corporativo</label>
            <input
              id="email"
              type="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading || !email || !password}
            style={{ marginTop: error ? 10 : 16 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="login-footer">
          Acesso somente para colaboradores autorizados. <br />
          Em caso de problemas, contate o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
