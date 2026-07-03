import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { buscarUsuario } from '../data/usuarios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [erroPerfil, setErroPerfil] = useState(null);

  // Fetches the user profile from public.usuarios
  const carregarPerfil = async (sessionUser) => {
    try {
      const perfil = await buscarUsuario(sessionUser.id);
      if (!perfil) {
        setErroPerfil('Perfil não encontrado.');
        setUsuarioAtual(null);
      } else {
        setUsuarioAtual(perfil);
        setErroPerfil(null);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
      setErroPerfil(err.message || 'Erro ao carregar perfil.');
      setUsuarioAtual(null);
    }
  };

  useEffect(() => {
    // Resolve the initial session once on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        await carregarPerfil(session.user);
      }
      setLoading(false);
    });

    // React to subsequent auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        await carregarPerfil(session.user);
      } else {
        // Logged out — clear profile
        setUsuarioAtual(null);
        setErroPerfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      usuarioAtual,
      role: usuarioAtual?.role ?? null,
      loading,
      erroPerfil,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
