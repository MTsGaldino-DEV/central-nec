import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { buscarTodosUsuarios } from '../data/usuarios';
import { criarUsuario, atualizarPerfilUsuario, trocarSenhaUsuario } from '../data/adminUsuarios';
import Topbar from '../components/Topbar';
import Sidebar from '../components/Sidebar';
import { useToast, ToastContainer } from '../components/Toast';

// ── Icons ──────────────────────────────────────────────────────────────────
const IcEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const IcKey = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const IcPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IcSpinner = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 14, height: 14, animation: 'spin 0.8s linear infinite' }}>
    <path d="M12 2a10 10 0 1 0 10 10" />
  </svg>
);

const IcClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── Modal Components ────────────────────────────────────────────────────────

function ModalNovoUsuario({ onClose, onSave }) {
  const [form, setForm] = useState({ nome: '', iniciais: '', email: '', senha: '', role: 'despachante' });
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    await onSave(form, () => setSalvando(false));
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Novo Usuário</h2>
            <div className="sub">Criar novo acesso para o sistema</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><IcClose /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field-row">
              <div className="field">
                <label>Nome Completo</label>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="field">
                <label>Iniciais (Sigla)</label>
                <input required maxLength={3} value={form.iniciais} onChange={(e) => setForm({ ...form, iniciais: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Senha Inicial</label>
                <input type="password" required minLength={6} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                <div className="field-hint">Mínimo 6 caracteres</div>
              </div>
              <div className="field">
                <label>Perfil (Role)</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="despachante">Despachante</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <><IcSpinner /> Criando...</> : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalEditarUsuario({ usuario, onClose, onSave }) {
  const [form, setForm] = useState({ nome: usuario.nome, iniciais: usuario.iniciais, role: usuario.role });
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    await onSave({ id: usuario.id, ...form }, () => setSalvando(false));
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Editar Usuário</h2>
            <div className="sub">{usuario.email}</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><IcClose /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field-row">
              <div className="field">
                <label>Nome Completo</label>
                <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
              <div className="field">
                <label>Iniciais (Sigla)</label>
                <input required maxLength={3} value={form.iniciais} onChange={(e) => setForm({ ...form, iniciais: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="field">
              <label>Perfil (Role)</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="despachante">Despachante</option>
                <option value="supervisor">Supervisor</option>
              </select>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? <><IcSpinner /> Salvando...</> : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalTrocarSenha({ usuario, onClose, onSave }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    await onSave({ id: usuario.id, novaSenha }, () => setSalvando(false));
  };

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <div>
            <h2>Redefinir Senha</h2>
            <div className="sub">{usuario.email}</div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}><IcClose /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nova Senha</label>
              <input type="password" required minLength={6} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoFocus />
              <div className="field-hint">Mínimo 6 caracteres</div>
            </div>
          </div>
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>Cancelar</button>
            <button type="submit" className="btn btn-red" disabled={salvando}>
              {salvando ? <><IcSpinner /> Alterando...</> : 'Redefinir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function GestaoUsuarios() {
  const { usuarioAtual, role } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEdit, setModalEdit] = useState(null); // armazena o objeto do usuário
  const [modalSenha, setModalSenha] = useState(null); // armazena o objeto do usuário

  useEffect(() => {
    if (role === 'supervisor') {
      carregarUsuarios();
    }
  }, [role]);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await buscarTodosUsuarios();
      setUsuarios(data);
    } catch (err) {
      addToast('Erro ao carregar usuários.', 'error');
    }
    setLoading(false);
  };

  // Handlers para os modais
  const handleCriar = async (form, setSalvandoFalse) => {
    try {
      await criarUsuario(form);
      addToast('Usuário criado com sucesso.', 'success');
      setModalNovo(false);
      carregarUsuarios();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSalvandoFalse();
    }
  };

  const handleEditar = async (form, setSalvandoFalse) => {
    try {
      await atualizarPerfilUsuario(form);
      addToast('Perfil atualizado com sucesso.', 'success');
      setModalEdit(null);
      carregarUsuarios();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSalvandoFalse();
    }
  };

  const handleSenha = async (form, setSalvandoFalse) => {
    try {
      await trocarSenhaUsuario(form);
      addToast('Senha redefinida com sucesso.', 'success');
      setModalSenha(null);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSalvandoFalse();
    }
  };

  // Proteção da UI (se não for supervisor, nem renderiza)
  if (role !== 'supervisor') {
    return (
      <div className="app">
        <Sidebar role={role} activeView="minhas" />
        <div className="main">
          <Topbar title="Gestão de Usuários" />
          <div className="content">
            <div className="empty-state">
              <div className="t">Acesso restrito</div>
              <div className="s">Esta página é exclusiva para supervisores.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar role={role} activeView="usuarios" />

      <div className="main">
        <Topbar title="Gestão de Usuários" subtitle="Administração de acessos" />

        <div className="content">
          <div className="toolbar" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {usuarios.length} usuários cadastrados
            </div>
            <button className="btn btn-primary" onClick={() => setModalNovo(true)}>
              <IcPlus /> Novo Usuário
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>
              Carregando...
            </div>
          ) : (
            <div className="list-card">
              <div className="row head" style={{ gridTemplateColumns: '1fr 200px 150px 100px 180px' }}>
                <div>Nome / Sigla</div>
                <div>E-mail</div>
                <div>Role</div>
                <div>Status</div>
                <div style={{ textAlign: 'right' }}>Ações</div>
              </div>
              
              {usuarios.map(u => (
                <div key={u.id} className="row" style={{ gridTemplateColumns: '1fr 200px 150px 100px 180px', padding: '10px 18px' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{u.iniciais}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{u.email}</div>
                  <div>
                    <span className="badge" style={{ background: 'var(--gray-bg)', color: 'var(--text-muted)' }}>
                      {u.role}
                    </span>
                  </div>
                  <div>
                    {u.ativo ? (
                      <span className="badge st-aprovado"><span className="dot"></span> Ativo</span>
                    ) : (
                      <span className="badge st-reprovado"><span className="dot"></span> Inativo</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setModalEdit(u)}>
                      <IcEdit /> Editar
                    </button>
                    <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => setModalSenha(u)}>
                      <IcKey /> Senha
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalNovo && <ModalNovoUsuario onClose={() => setModalNovo(false)} onSave={handleCriar} />}
      {modalEdit && <ModalEditarUsuario usuario={modalEdit} onClose={() => setModalEdit(null)} onSave={handleEditar} />}
      {modalSenha && <ModalTrocarSenha usuario={modalSenha} onClose={() => setModalSenha(null)} onSave={handleSenha} />}
      
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
