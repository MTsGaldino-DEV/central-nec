import { useRef, useState } from 'react';
import { criarOcorrencia, atualizarFotosOcorrencia } from '../data/ocorrencias';
import { uploadFoto } from '../data/fotos';
import { useAuth } from '../context/AuthContext';

const TIPOS = [
  'Avaria em equipamento',
  'Ocorrência com equipe',
  'Intercorrência de Rota',
  'Desvio de procedimento',
  'Reclamação de cliente',
  'Outro',
];

const TIPOS_EQUIPE = [
  'Multifuncional',
  'Moto',
];

const SLOTS = [
  { key: 'evidencia1', label: 'Evidência 1' },
  { key: 'evidencia2', label: 'Evidência 2' },
  { key: 'evidencia3', label: 'Evidência 3' },
  { key: 'evidencia4', label: 'Evidência 4' },
  { key: 'evidencia5', label: 'Evidência 5' },
];

// ── Ícones ────────────────────────────────────────────────────────────────────

const IcClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

const IcSpinner = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }}>
    <path d="M12 2a10 10 0 1 0 10 10" />
  </svg>
);

const IcTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

// ── Componente ────────────────────────────────────────────────────────────────

export default function ModalNovaOcorrencia({ onClose, onSuccess }) {
  const { usuarioAtual } = useAuth();

  const [form, setForm] = useState({
    numero_servico: '',
    csi: '',
    equipe: '',
    tipo: '',
    tipo_equipe: '',
    descricao: '',
    data_hora: new Date().toISOString().slice(0, 16),
  });

  // preview local
  const [previews, setPreviews] = useState({ evidencia1: null, evidencia2: null, evidencia3: null, evidencia4: null, evidencia5: null });
  // arquivo selecionado por slot
  const [arquivos, setArquivos] = useState({ evidencia1: null, evidencia2: null, evidencia3: null, evidencia4: null, evidencia5: null });

  const [loading, setLoading] = useState(false); // campos do form
  const [enviando, setEnviando] = useState(false); // upload em progresso
  const [erro, setErro] = useState('');
  const [toasts, setToasts] = useState([]);    // avisos não-fatais de upload

  const inputRefs = {
    evidencia1: useRef(null),
    evidencia2: useRef(null),
    evidencia3: useRef(null),
    evidencia4: useRef(null),
    evidencia5: useRef(null),
  };

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Preview local via FileReader
  const handleFileChange = (slotKey, file) => {
    if (!file) return;
    setArquivos((prev) => ({ ...prev, [slotKey]: file }));
    const reader = new FileReader();
    reader.onload = (ev) =>
      setPreviews((prev) => ({ ...prev, [slotKey]: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const removerFoto = (slotKey) => {
    setArquivos((prev) => ({ ...prev, [slotKey]: null }));
    setPreviews((prev) => ({ ...prev, [slotKey]: null }));
    if (inputRefs[slotKey]?.current) inputRefs[slotKey].current.value = '';
  };

  const addToast = (msg) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type: 'warning' }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!form.csi || !form.tipo || !form.tipo_equipe || !form.descricao) {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    if (form.numero_servico && !/^\d{9}$/.test(form.numero_servico)) {
      setErro('O Nº do Serviço deve conter exatamente 9 dígitos.');
      return;
    }

    setLoading(true);
    setEnviando(true);

    let novaOcorrencia = null;

    try {
      // 1. Cria a ocorrência sem fotos
      const payload = {
        ...form,
        data_hora: new Date(form.data_hora).toISOString(),
        despachante_id: usuarioAtual.id,
        despachante_nome: usuarioAtual.nome,
      };
      novaOcorrencia = await criarOcorrencia(payload);
    } catch (err) {
      console.error('Erro ao criar ocorrência:', err);
      setErro('Não foi possível concluir a ação. Atualize a página e tente novamente.');
      setLoading(false);
      setEnviando(false);
      return;
    }

    // 2. Upload individual por slot — falhas geram toasts mas não apagam a ocorrência
    const fotoPaths = { evidencia1: null, evidencia2: null, evidencia3: null, evidencia4: null, evidencia5: null };

    const uploadPromises = SLOTS.map(async ({ key }) => {
      const file = arquivos[key];
      if (!file) return;
      try {
        fotoPaths[key] = await uploadFoto(novaOcorrencia.id, key, file);
      } catch (err) {
        console.error('Erro no upload de foto:', err);
        addToast(`Não foi possível enviar a foto "${key.replace('_', ' ')}". Verifique o arquivo e tente novamente.`);
      }
    });

    await Promise.all(uploadPromises);

    // 3. Se houver algum path, atualiza a coluna fotos
    const temFotos = Object.values(fotoPaths).some(Boolean);
    if (temFotos) {
      try {
        await atualizarFotosOcorrencia(novaOcorrencia.id, fotoPaths);
      } catch (err) {
        addToast('Não foi possível salvar os caminhos das fotos: ' + err.message);
      }
    }

    setLoading(false);
    setEnviando(false);
    onSuccess?.(novaOcorrencia);
    onClose();
  };

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget && !loading && !enviando) onClose();
  };

  const isBlocked = loading || enviando;

  return (
    <div className="overlay show" onClick={handleBackdrop}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Nova Ocorrência">

        {/* Head */}
        <div className="modal-head">
          <div>
            <h2>Nova Ocorrência</h2>
            <div className="sub">Registre a ocorrência de despacho de campo</div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar modal" disabled={isBlocked}>
            <IcClose />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Row 1: Nº Serviço + Data/Hora */}
            <div className="field-row">
              <div className="field">
                <label>Nº do Serviço</label>
                <input
                  type="text"
                  placeholder="ex: 243520170"
                  maxLength={9}
                  pattern="\d{9}"
                  title="Se informado, deve conter exatamente 9 dígitos"
                  value={form.numero_servico}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Apenas números
                    setForm((prev) => ({ ...prev, numero_servico: val }));
                  }}
                  disabled={isBlocked}
                />
              </div>
              <div className="field">
                <label>Data e Hora <span className="req">*</span></label>
                <input
                  type="datetime-local"
                  value={form.data_hora}
                  onChange={set('data_hora')}
                  required
                  disabled={isBlocked}
                />
              </div>
            </div>

            {/* Row 2: CSI + Equipe */}
            <div className="field-row">
              <div className="field">
                <label>CSI <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="Identificação do CSI"
                  value={form.csi}
                  onChange={set('csi')}
                  required
                  disabled={isBlocked}
                />
              </div>
              <div className="field">
                <label>Equipe</label>
                <input
                  type="text"
                  placeholder="Nome ou código da equipe"
                  value={form.equipe}
                  onChange={set('equipe')}
                  disabled={isBlocked}
                />
              </div>
            </div>

            {/* Tipo */}
            <div className="field-row">
              <div className="field">
                <label>Tipo de Ocorrência <span className="req">*</span></label>
                <select value={form.tipo} onChange={set('tipo')} required disabled={isBlocked}>
                  <option value="">Selecione o tipo...</option>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Tipo de Equipe <span className="req">*</span></label>
                <select value={form.tipo_equipe} onChange={set('tipo_equipe')} required disabled={isBlocked}>
                  <option value="">Selecione...</option>
                  {TIPOS_EQUIPE.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="field">
              <label>Descrição <span className="req">*</span></label>
              <textarea
                placeholder="Descreva o ocorrido com o máximo de detalhes..."
                value={form.descricao}
                onChange={set('descricao')}
                required
                disabled={isBlocked}
                style={{ minHeight: 90 }}
              />
            </div>

            {/* Slots de foto */}
            <div className="field">
              <label>Fotos de evidência</label>
              <div className="field-hint" style={{ marginBottom: 10 }}>
                JPEG, PNG ou WebP · máx. 5 MB por foto
              </div>
              <div className="photo-grid">
                {SLOTS.map(({ key, label }) => (
                  <div key={key} className="photo-slot-wrap">
                    {/* Input oculto */}
                    <input
                      ref={inputRefs[key]}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: 'none' }}
                      disabled={isBlocked}
                      onChange={(e) => handleFileChange(key, e.target.files?.[0])}
                    />

                    {previews[key] ? (
                      /* Preview da imagem selecionada */
                      <div
                        className="photo-slot photo-slot--preview"
                        style={{ position: 'relative', padding: 0, overflow: 'hidden' }}
                      >
                        <img
                          src={previews[key]}
                          alt={label}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        {/* Botão remover */}
                        {!isBlocked && (
                          <button
                            type="button"
                            onClick={() => removerFoto(key)}
                            title="Remover foto"
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              background: 'rgba(0,0,0,0.6)',
                              border: 'none',
                              borderRadius: 4,
                              color: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 22,
                              height: 22,
                              padding: 0,
                            }}
                          >
                            <IcTrash />
                          </button>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            color: '#fff',
                            fontSize: 10,
                            padding: '4px 6px',
                            lineHeight: 1.3,
                          }}
                        >
                          {label}
                        </div>
                      </div>
                    ) : (
                      /* Slot vazio — clique abre o file picker */
                      <button
                        type="button"
                        className="photo-slot"
                        disabled={isBlocked}
                        onClick={() => inputRefs[key].current?.click()}
                        title={`Anexar ${label}`}
                      >
                        <IcImage />
                        <div className="lbl">{label}</div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Toasts de erro de upload não-fatal */}
            {toasts.map(({ id, msg }) => (
              <div key={id} className="login-error" style={{ marginTop: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 14, height: 14, flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {msg}
              </div>
            ))}

            {/* Erro fatal */}
            {erro && (
              <div className="login-error" style={{ marginTop: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ width: 14, height: 14, flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {erro}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-foot">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={isBlocked}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isBlocked}>
              {enviando ? (
                <>
                  <IcSpinner />
                  <span style={{ marginLeft: 8 }}>Enviando para análise...</span>
                </>
              ) : (
                'Enviar para análise'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Keyframe de spin inline para o IcSpinner */}
      <style>{`@keyframes spin { to { transform: evidencia1te(360deg); } }`}</style>
    </div>
  );
}
