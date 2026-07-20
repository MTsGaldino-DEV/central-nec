import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  RefreshCw, MapPin, Clock, AlertTriangle, Search, ChevronDown,
  CheckCircle2, X, Navigation, Copy, Check, Zap, Layers,
  DollarSign, Users, ClipboardList,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';
import { usePmalData } from '../hooks/usePmalData';
import {
  POSTO_KEYS, MUNICIPIOS,
} from '../data/pmalService';

// ---------------------------------------------------------------------------
// Domínio (espelhos do protótipo — sem mock)
// ---------------------------------------------------------------------------
const PROCESSO_GROUPS = {
  'Ligação Nova':      ['OSLN', 'OSLQ', 'OSLI', 'OSLA'],
  'Restabelecimento':  ['OSRL', 'OSMR', 'OSIN'],
  'Alteração de Carga':['OSAC', 'OSAA', 'OSA1', 'OSA2', 'OSAQ'],
  'Medição':           ['OSML', 'OSIM', 'OSM1', 'OSTA'],
  'Vistoria':          ['RC79', 'OSVQ'],
};

const SITUACOES = {
  P: { label: 'Pendente',   color: '#F5A524' },
  D: { label: 'Designado',  color: '#2E90FA' },
  A: { label: 'Acionado',   color: '#a855f7' },
  E: { label: 'Execução',   color: '#0B1220' },
  F: { label: 'Finalizado', color: '#98A2B3' },
};

/**
 * Ordena labels de bucket cronologicamente:
 * Vencido < Vence hoje < Vence em 2 dias < Vence em N dias
 */
function bucketSortKey(label) {
  if (label === 'Vencido')     return -1;
  if (label === 'Vence hoje')  return 1;
  const m = label.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pad(n) { return String(n).padStart(2, '0'); }
function hhmm(totalMinutes) {
  const neg = totalMinutes < 0;
  const abs = Math.abs(Math.round(totalMinutes));
  return `${neg ? '-' : ''}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
}
function amperageOf(disjuntor) {
  if (!disjuntor) return null;
  const m = disjuntor.match(/(\d+)\s*A/i);
  return m ? parseInt(m[1], 10) : null;
}
function matchesBusca(d, busca) {
  if (!busca.trim()) return true;
  const q = busca.trim().toUpperCase();
  return (
    (d.bairro || '').toUpperCase().includes(q) ||
    (d.endereco || '').toUpperCase().includes(q) ||
    String(d.numeroServico).includes(q) ||
    (d.municipio || '').toUpperCase().includes(q)
  );
}

// ---------------------------------------------------------------------------
// Pequenos componentes UI
// ---------------------------------------------------------------------------
function PulseDot({ color, size = 9 }) {
  return (
    <span className="pmal-pulse-dot" style={{ width: size, height: size }}>
      <span className="pmal-pulse-ring" style={{ backgroundColor: color }} />
      <span className="pmal-pulse-core" style={{ backgroundColor: color }} />
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, accentClass }) {
  return (
    <div className="pmal-kpi-card">
      <div className={`pmal-kpi-icon ${accentClass}`}>
        <Icon size={18} color="#fff" />
      </div>
      <div>
        <div className="pmal-kpi-label">{label}</div>
        <div className="pmal-kpi-value">{value}</div>
      </div>
    </div>
  );
}

function SituacaoBadge({ code }) {
  const s = SITUACOES[code] || { label: code, color: '#98A2B3' };
  return (
    <span className="pmal-situacao-badge" style={{ backgroundColor: s.color }}>
      {s.label}
    </span>
  );
}

function PillToggle({ options, value, onChange }) {
  return (
    <div className="pmal-pill-toggle">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`pmal-pill-btn${value === opt.value ? ' active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de detalhe
// ---------------------------------------------------------------------------
function ServiceModal({ row, onClose, annotation, onSaveAnnotation }) {
  const [text, setText] = useState(annotation || '');
  const deadline = new Date(row.dataCadastro.getTime() + row.prazoAtualMin * 60000);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pmal-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="pmal-modal-tag">
              <span className="pmal-tag-gv">GV</span>
              Serviço nº {row.numeroServico}
            </div>
            <div className="pmal-modal-tipo">
              <span className="pmal-mono-badge">{row.tipoServico}</span>
              <span>{row.tipoDescricao}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Grid de info */}
        <div className="modal-body">
          <div className="detail-grid">
            <div className="detail-item">
              <div className="k">Situação</div>
              <div className="v"><SituacaoBadge code={row.situacao} /></div>
            </div>
            <div className="detail-item">
              <div className="k">Reincidência</div>
              <div className="v">{row.quantidadeReincidencia}x</div>
            </div>
            <div className="detail-item">
              <div className="k">Área</div>
              <div className="v">{row.tipoArea === 'U' ? 'Urbana' : 'Rural'}</div>
            </div>
            <div className="detail-item">
              <div className="k">Turma designada</div>
              <div className="v">
                {row.eletricista ? `${row.eletricista} · ${row.placa}` : '— não designada'}
              </div>
            </div>
            <div className="detail-item">
              <div className="k">Tempo pendência</div>
              <div className="v mono">{hhmm(row.tempoPendenciaMin)}</div>
            </div>
            <div className="detail-item">
              <div className="k">Prazo até</div>
              <div className={`v mono${row.vencido ? ' pmal-vencido' : ''}`}>
                {deadline.toLocaleDateString('pt-BR')}{' '}
                {deadline.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="detail-item detail-full">
              <div className="k">Localidade</div>
              <div className="v">{row.local} · {row.municipio}</div>
              {row.posto && <div className="pmal-posto-hint">{row.posto}</div>}
            </div>
            <div className="detail-item">
              <div className="k">Bairro</div>
              <div className="v">{row.bairro || '—'}</div>
            </div>
            <div className="detail-item">
              <div className="k">Endereço</div>
              <div className="v">{row.endereco}, {row.numero}</div>
            </div>
            <div className="detail-item">
              <div className="k">Equipamento</div>
              <div className="v mono">{row.numeroDispositivo || '—'}</div>
            </div>
            <div className="detail-item">
              <div className="k">Alimentador</div>
              <div className="v mono">{row.alimentador || '—'}</div>
            </div>
            <div className="detail-item">
              <div className="k">Disjuntor</div>
              <div className="v">{row.disjuntor || '—'}</div>
            </div>
            <div className="detail-item detail-full">
              <div className="k">Multa prevista (compensação financeira)</div>
              <div className="pmal-multa-aviso">
                <AlertTriangle size={12} />
                Indisponível — aguardando integração desse dado
              </div>
            </div>
          </div>

          {/* Mapa */}
          {row.latitude && row.longitude && (
            <div style={{ marginBottom: 14 }}>
              <a
                href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-dark"
                style={{ fontSize: 12 }}
              >
                <Navigation size={13} /> Abrir no Maps
              </a>
            </div>
          )}

          {/* Anotações */}
          <div className="pmal-annotation-section">
            <div className="pmal-annotation-label">Anotações (sessão)</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Adicionar observação sobre este serviço..."
              className="pmal-annotation-textarea"
              rows={3}
            />
            <button
              onClick={() => onSaveAnnotation(row.numeroServico, text)}
              className="btn btn-primary"
              style={{ fontSize: 12, marginTop: 8 }}
            >
              Salvar anotação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function PainelPMAL() {
  const { role, usuarioAtual } = useAuth();
  const { data, loading, error, lastUpdate, refresh } = usePmalData();

  // Busca inicial ao montar
  useEffect(() => { refresh(); }, [refresh]);

  // Filtros
  const [activeSituacoes, setActiveSituacoes] = useState(new Set(['P', 'D', 'A', 'E', 'F']));
  const [activePostos, setActivePostos]       = useState(new Set());
  const [localidade, setLocalidade]           = useState('TODAS');
  const [processo, setProcesso]               = useState('TODOS');
  const [area, setArea]                       = useState('TODAS');
  const [busca, setBusca]                     = useState('');

  const [selectedRow, setSelectedRow]         = useState(null);
  const [annotations, setAnnotations]         = useState({});
  const [copiedGroup, setCopiedGroup]         = useState(null);
  // Multi-seleção de buckets via clique no gráfico → filtra a lista
  const [activeBuckets, setActiveBuckets]     = useState(new Set());

  const toggleSituacao = (code) => {
    setActiveSituacoes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next.size === 0 ? new Set(['P', 'D', 'A', 'E', 'F']) : next;
    });
  };
  const togglePosto = (posto) => {
    setActivePostos((prev) => {
      const next = new Set(prev);
      if (next.has(posto)) next.delete(posto); else next.add(posto);
      return next;
    });
  };

  // Filtros geo/processo/área/busca (sem situação) — usado no donut e postos
  const geoFiltered = useMemo(() => data.filter((d) =>
    (localidade === 'TODAS' || d.municipio === localidade) &&
    (processo === 'TODOS' || PROCESSO_GROUPS[processo]?.includes(d.tipoServico)) &&
    (area === 'TODAS' || d.tipoArea === (area === 'URBANA' ? 'U' : 'R')) &&
    matchesBusca(d, busca)
  ), [data, localidade, processo, area, busca]);

  const situacaoCounts = useMemo(() => {
    const counts = { P: 0, D: 0, A: 0, E: 0, F: 0 };
    geoFiltered.forEach((d) => {
      if (activePostos.size === 0 || activePostos.has(d.posto)) counts[d.situacao]++;
    });
    return counts;
  }, [geoFiltered, activePostos]);

  const totalSelecionado = useMemo(() =>
    Object.entries(situacaoCounts)
      .filter(([k]) => activeSituacoes.has(k))
      .reduce((a, [, v]) => a + v, 0),
    [situacaoCounts, activeSituacoes]);

  const postoCounts = useMemo(() => {
    const map = {};
    POSTO_KEYS.forEach((p) => { map[p] = 0; });
    geoFiltered.forEach((d) => {
      if (d.posto && activeSituacoes.has(d.situacao)) map[d.posto]++;
    });
    return map;
  }, [geoFiltered, activeSituacoes]);

  // baseFiltered: situação + posto (sem bucket) — base para gráfico e KPIs
  const baseFiltered = useMemo(() => geoFiltered.filter((d) =>
    activeSituacoes.has(d.situacao) &&
    (activePostos.size === 0 || activePostos.has(d.posto))
  ), [geoFiltered, activeSituacoes, activePostos]);

  // listFiltered: aplica bucket filter por cima — usado na tabela e cards
  const listFiltered = useMemo(() =>
    activeBuckets.size === 0
      ? baseFiltered
      : baseFiltered.filter((d) => activeBuckets.has(d.bucket))
  , [baseFiltered, activeBuckets]);

  const vencidosCount = useMemo(() =>
    baseFiltered.filter((d) => d.vencido && d.situacao !== 'F').length, [baseFiltered]);

  const noPrazoPct = useMemo(() => {
    const abertos = baseFiltered.filter((d) => d.situacao !== 'F');
    if (abertos.length === 0) return '0';
    return ((abertos.filter((d) => !d.vencido).length / abertos.length) * 100).toFixed(1);
  }, [baseFiltered]);

  // Chart sempre mostra TODOS os buckets (baseFiltered, sem filtro de bucket)
  const bucketChartData = useMemo(() => {
    const bucketMap = {};
    baseFiltered.forEach((d) => {
      const b = d.bucket;
      if (!bucketMap[b]) {
        bucketMap[b] = { bucket: b, sortKey: bucketSortKey(b), P: 0, D: 0, A: 0, E: 0, F: 0 };
      }
      bucketMap[b][d.situacao] = (bucketMap[b][d.situacao] || 0) + 1;
    });
    return Object.values(bucketMap).sort((a, b) => a.sortKey - b.sortKey);
  }, [baseFiltered]);

  // Clique em barra → multi-toggle do filtro por bucket
  const handleBarClick = useCallback((chartData) => {
    const clicked = chartData?.activeLabel;
    if (!clicked) return;
    setActiveBuckets((prev) => {
      const next = new Set(prev);
      if (next.has(clicked)) next.delete(clicked); else next.add(clicked);
      return next;
    });
  }, []);

  const materialPesado = useMemo(() =>
    listFiltered
      .filter((d) => (amperageOf(d.disjuntor) || 0) >= 100)
      .sort((a, b) => (amperageOf(b.disjuntor) || 0) - (amperageOf(a.disjuntor) || 0)),
    [listFiltered]);

  const servicosConjunto = useMemo(() => {
    const groups = {};
    listFiltered.forEach((d) => {
      const key = `${d.endereco}|${d.numero}|${d.municipio}`;
      if (!groups[key]) groups[key] = { endereco: d.endereco, numero: d.numero, municipio: d.municipio, itens: [] };
      groups[key].itens.push(d);
    });
    return Object.values(groups).filter((g) => g.itens.length > 1).sort((a, b) => b.itens.length - a.itens.length);
  }, [listFiltered]);

  const localidadesDisponiveis = useMemo(() => {
    const set = new Set(geoFiltered.map((d) => d.municipio));
    return Array.from(set).sort();
  }, [geoFiltered]);

  const copyGroup = (group, idx) => {
    const text = group.itens.map((i) => i.numeroServico).join(',');
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedGroup(idx);
    setTimeout(() => setCopiedGroup(null), 1500);
  };

  const donutOrder = ['P', 'D', 'A', 'E', 'F'];
  const donutData  = donutOrder.map((k) => ({
    key: k, name: SITUACOES[k].label, value: situacaoCounts[k], color: SITUACOES[k].color,
  }));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="app">
      <Sidebar
        role={role}
        ocorrencias={[]}
        activeView="pmal"
        onNavigate={() => {}}
        onNovaOcorrencia={() => {}}
        pmalCount={data.length}
      />

      <div className="main">
        <Topbar
          title="Painel PMAL"
          subtitle="Planejadas de Manutenção — NEC"
          ocorrenciasFiltradas={[]}
          filtroLabel="PMAL"
        />

        <div className="content pmal-content">

          {/* Erro */}
          {error && (
            <div className="pmal-error-banner">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button className="pmal-error-retry" onClick={refresh}>Tentar novamente</button>
            </div>
          )}

          {/* Header do painel */}
          <div className="pmal-header">
            <div>
              <div className="pmal-header-tag">
                <Zap size={14} /> PMAL · Planejadas de Manutenção
              </div>
              <h1 className="pmal-header-title">Painel do Operador</h1>
            </div>
            <div className="pmal-header-right">
              {lastUpdate && (
                <div className="pmal-last-update">
                  Dados atualizados
                  <div className="pmal-last-update-time">
                    {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
              <button
                onClick={refresh}
                disabled={loading}
                className="btn btn-primary pmal-refresh-btn"
              >
                <RefreshCw size={16} className={loading ? 'pmal-spin' : ''} />
                {loading ? 'Puxando dados...' : 'Atualizar dados'}
              </button>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && data.length === 0 ? (
            <div className="pmal-skeleton-wrap">
              <div className="pmal-skeleton-kpis">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="skeleton-stat-card">
                    <div className="skeleton sk-num" />
                    <div className="skeleton sk-lbl" />
                  </div>
                ))}
              </div>
              <div className="skeleton-list">
                <div className="row head">
                  <div>Nº Serviço</div><div>Tipo</div><div>Situação</div>
                  <div>Município</div><div>Turma</div><div>Restante</div>
                </div>
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="skeleton-row">
                    {[1,2,3,4,5,6].map((j) => (
                      <div key={j} className="skeleton sk-cell" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="pmal-kpis">
                <KpiCard icon={Zap}          label="Total selecionado"  value={totalSelecionado} accentClass="pmal-kpi-navy" />
                <KpiCard icon={AlertTriangle} label="Vencidos"           value={vencidosCount}    accentClass="pmal-kpi-red" />
                <KpiCard icon={CheckCircle2} label="Dentro do prazo"    value={`${noPrazoPct}%`} accentClass="pmal-kpi-green" />
                <KpiCard icon={Clock}        label="Prazos vigentes"    value="72h / 120h"       accentClass="pmal-kpi-amber" />
              </div>

              {/* Situação donut + Postos */}
              <div className="pmal-row-2col">
                {/* Donut */}
                <div className="pmal-card pmal-donut-card">
                  <div className="pmal-card-head">
                    <span className="pmal-card-title">Situação</span>
                    <span className="pmal-card-hint">clique para filtrar</span>
                  </div>
                  <div className="pmal-donut-wrap">
                    <div className="pmal-donut-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData} dataKey="value" nameKey="name"
                            innerRadius={58} outerRadius={82} paddingAngle={3}
                            cornerRadius={8} stroke="none" isAnimationActive
                          >
                            {donutData.map((entry) => (
                              <Cell
                                key={entry.key}
                                fill={entry.color}
                                opacity={activeSituacoes.has(entry.key) ? 1 : 0.18}
                                onClick={() => toggleSituacao(entry.key)}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pmal-donut-center">
                        <div className="pmal-donut-total">{totalSelecionado}</div>
                        <div className="pmal-donut-sub">Total</div>
                      </div>
                    </div>
                    <div className="pmal-donut-legend">
                      {donutOrder.map((k) => (
                        <button
                          key={k}
                          onClick={() => toggleSituacao(k)}
                          className={`pmal-legend-btn${activeSituacoes.has(k) ? ' active' : ''}`}
                        >
                          <span className="pmal-legend-left">
                            <PulseDot color={SITUACOES[k].color} />
                            {SITUACOES[k].label}
                          </span>
                          <span className="pmal-legend-count">{situacaoCounts[k]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Postos */}
                <div className="pmal-card pmal-postos-card">
                  <div className="pmal-card-head">
                    <span className="pmal-card-title">Postos</span>
                    <span className="pmal-card-hint">multi-seleção</span>
                  </div>
                  <div className="pmal-postos-grid">
                    {POSTO_KEYS.map((posto) => {
                      const [num, supervisor] = posto.split('—').map((s) => s.trim());
                      const active = activePostos.has(posto);
                      return (
                        <button
                          key={posto}
                          onClick={() => togglePosto(posto)}
                          className={`pmal-posto-btn${active ? ' active' : ''}`}
                        >
                          <div>
                            <div className="pmal-posto-num">{num}</div>
                            <div className="pmal-posto-name">{supervisor}</div>
                          </div>
                          <div className="pmal-posto-count">{postoCounts[posto] || 0}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <div className="pmal-card pmal-filters">
                <div className="pmal-filter-select-wrap">
                  <select
                    value={localidade}
                    onChange={(e) => setLocalidade(e.target.value)}
                    className="pmal-select"
                  >
                    <option value="TODAS">Todas as localidades</option>
                    {localidadesDisponiveis.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="pmal-select-chevron" />
                </div>

                <div className="pmal-filter-select-wrap">
                  <select
                    value={processo}
                    onChange={(e) => setProcesso(e.target.value)}
                    className="pmal-select"
                  >
                    <option value="TODOS">Todos os processos</option>
                    {Object.keys(PROCESSO_GROUPS).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown size={14} className="pmal-select-chevron" />
                </div>

                <PillToggle
                  value={area}
                  onChange={setArea}
                  options={[
                    { label: 'Todas', value: 'TODAS' },
                    { label: 'Urbana', value: 'URBANA' },
                    { label: 'Rural', value: 'RURAL' },
                  ]}
                />

                <div className="pmal-search-wrap">
                  <Search size={14} className="pmal-search-icon" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar bairro, endereço, nº serviço..."
                    className="pmal-search-input"
                  />
                </div>
              </div>

              {/* Gráfico de barras agrupadas por situação × bucket de prazo */}
              <div className="pmal-card">
                <div className="pmal-card-head">
                  <span className="pmal-card-title">Distribuição por prazo × situação</span>
                  <span className="pmal-card-hint">
                    {activeBuckets.size > 0 ? (
                      <span className="pmal-bucket-chips">
                        {Array.from(activeBuckets).map((b) => (
                          <button
                            key={b}
                            className="pmal-bucket-chip"
                            onClick={() => setActiveBuckets(prev => { const n = new Set(prev); n.delete(b); return n; })}
                          >
                            {b} <X size={10} />
                          </button>
                        ))}
                        <button className="pmal-bucket-clear" onClick={() => setActiveBuckets(new Set())}>
                          Limpar
                        </button>
                      </span>
                    ) : 'clique nas barras — multi-seleção filtra a lista'}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={bucketChartData}
                    margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                    onClick={handleBarClick}
                    style={{ cursor: 'pointer' }}
                    barCategoryGap="22%"
                    barGap={2}
                  >
                    <defs>
                      <linearGradient id="gbar-P" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F5A524" /><stop offset="100%" stopColor="#C97F0A" />
                      </linearGradient>
                      <linearGradient id="gbar-D" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#60A5FA" /><stop offset="100%" stopColor="#2563EB" />
                      </linearGradient>
                      <linearGradient id="gbar-A" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C084FC" /><stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                      <linearGradient id="gbar-E" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#1E293B" />
                      </linearGradient>
                      <linearGradient id="gbar-F" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#CBD5E1" /><stop offset="100%" stopColor="#94A3B8" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3E7ED" />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fontSize: 11, fill: '#667085' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#667085' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(11,18,32,0.04)', rx: 6 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ backgroundColor: '#fff', border: '1px solid #E3E7ED', borderRadius: '10px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}>
                              <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#0B1220' }}>{label}</p>
                              {payload.map((entry, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: SITUACOES[entry.dataKey]?.color || entry.color, marginRight: '8px' }}></span>
                                  <span style={{ color: '#667085', marginRight: '8px' }}>{entry.name}:</span>
                                  <span style={{ fontWeight: '600', color: '#0B1220' }}>{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Uma barra por situação, agrupadas lado a lado */}
                    {Object.entries(SITUACOES).map(([code, sit]) => (
                      <Bar
                        key={code}
                        dataKey={code}
                        name={sit.label}
                        fill={`url(#gbar-${code})`}
                        maxBarSize={13}
                        radius={[4, 4, 0, 0]}
                      >
                        {bucketChartData.map((entry) => (
                          <Cell
                            key={entry.bucket}
                            fill={`url(#gbar-${code})`}
                            opacity={
                              activeBuckets.size === 0 || activeBuckets.has(entry.bucket) ? 1 : 0.18
                            }
                          />
                        ))}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                {/* Legenda */}
                <div className="pmal-chart-legend">
                  {Object.entries(SITUACOES).map(([code, sit]) => (
                    <span key={code} className="pmal-chart-legend-item">
                      <span className="pmal-chart-legend-dot" style={{ background: sit.color }} />
                      {sit.label}
                    </span>
                  ))}
                </div>
              </div>


              {/* Material pesado / Serviços em conjunto / Compensação */}
              <div className="pmal-row-3col">
                {/* Compensação financeira */}
                <div className="pmal-card">
                  <div className="pmal-card-head">
                    <span className="pmal-card-title pmal-flex-gap">
                      <DollarSign size={16} style={{ color: '#12B76A' }} /> Top compensação financeira
                    </span>
                  </div>
                  <div className="pmal-placeholder-box">
                    <AlertTriangle size={18} style={{ color: '#C97F0A' }} />
                    <div className="pmal-placeholder-title">Dado de multa prevista ainda não integrado.</div>
                    <div className="pmal-placeholder-sub">Área reservada — assim que o campo estiver disponível no endpoint, essa lista é preenchida automaticamente.</div>
                  </div>
                </div>

                {/* Material pesado */}
                <div className="pmal-card">
                  <div className="pmal-card-head">
                    <span className="pmal-card-title pmal-flex-gap">
                      <Layers size={16} style={{ color: '#667085' }} /> Material pesado
                    </span>
                    <span className="pmal-count-badge">{materialPesado.length}</span>
                  </div>
                  <div className="pmal-scroll-list">
                    {materialPesado.length === 0 && (
                      <div className="pmal-empty-msg">Nenhum serviço com disjuntor ≥ 100A no filtro atual.</div>
                    )}
                    {materialPesado.slice(0, 20).map((d) => (
                      <button
                        key={d.numeroServico}
                        onClick={() => setSelectedRow(d)}
                        className="pmal-list-row"
                      >
                        <span>
                          <span className="pmal-mono-badge-dark">{d.disjuntor}</span>
                          {d.tipoServico}
                        </span>
                        <span className="pmal-num-mono">#{d.numeroServico}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Serviços em conjunto */}
                <div className="pmal-card">
                  <div className="pmal-card-head">
                    <span className="pmal-card-title pmal-flex-gap">
                      <Users size={16} style={{ color: '#667085' }} /> Serviços em conjunto
                    </span>
                    <span className="pmal-count-badge">{servicosConjunto.length}</span>
                  </div>
                  <div className="pmal-scroll-list">
                    {servicosConjunto.length === 0 && (
                      <div className="pmal-empty-msg">Nenhum endereço com múltiplos serviços no filtro atual.</div>
                    )}
                    {servicosConjunto.slice(0, 15).map((g, idx) => (
                      <div key={idx} className="pmal-conjunto-item">
                        <div className="pmal-conjunto-info">
                          <div className="pmal-conjunto-end">{g.endereco}, {g.numero}</div>
                          <div className="pmal-conjunto-muni">{g.municipio} · {g.itens.length} notas</div>
                        </div>
                        <button onClick={() => copyGroup(g, idx)} className="pmal-copy-btn">
                          {copiedGroup === idx ? <Check size={12} /> : <Copy size={12} />}
                          {copiedGroup === idx ? 'Copiado' : 'Copiar'}
                        </button>
                        <div className="pmal-conjunto-nums">
                          {g.itens.map((i) => i.numeroServico).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lista de serviços */}
              <div className="list-card">
                <div className="pmal-table-head">
                  <span className="pmal-card-title pmal-flex-gap">
                    <ClipboardList size={16} /> Lista de serviços
                    {activeBuckets.size > 0 && (
                      <span className="pmal-bucket-chips">
                        {Array.from(activeBuckets).map((b) => (
                          <button
                            key={b}
                            className="pmal-bucket-chip"
                            onClick={() => setActiveBuckets(prev => { const n = new Set(prev); n.delete(b); return n; })}
                          >
                            {b} <X size={10} />
                          </button>
                        ))}
                        <button className="pmal-bucket-clear" onClick={() => setActiveBuckets(new Set())}>Limpar</button>
                      </span>
                    )}
                  </span>
                  <span className="pmal-card-hint">{listFiltered.length} serviço(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="pmal-table">
                    <thead>
                      <tr>
                        <th>Nº Serviço</th>
                        <th>Tipo</th>
                        <th>Situação</th>
                        <th>Município</th>
                        <th>Bairro</th>
                        <th>Turma</th>
                        <th>Restante</th>
                        <th>Prazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listFiltered.slice(0, 100).map((d) => (
                        <tr
                          key={d.numeroServico}
                          onClick={() => setSelectedRow(d)}
                          className="pmal-table-row"
                        >
                          <td className="pmal-td-mono">{d.numeroServico}</td>
                          <td>
                            <span className="pmal-tipo-badge" title={d.tipoDescricao}>{d.tipoServico}</span>
                          </td>
                          <td><SituacaoBadge code={d.situacao} /></td>
                          <td className="pmal-td-muted">{d.municipio}</td>
                          <td className="pmal-td-muted">{d.bairro}</td>
                          <td className="pmal-td-muted">{d.eletricista || <span className="pmal-dash">—</span>}</td>
                          <td className={`pmal-td-mono${d.remainingMin < 0 ? ' pmal-vencido' : ''}`}>
                            {hhmm(d.remainingMin)}
                          </td>
                          <td>
                            {d.situacao === 'F'
                              ? <span className="pmal-dash">—</span>
                              : d.vencido
                                ? <span className="pmal-badge-vencido"><AlertTriangle size={11} /> Vencido</span>
                                : <span className="pmal-badge-bucket">{d.bucket}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {listFiltered.length > 100 && (
                  <div className="pmal-table-footer">
                    Mostrando 100 de {listFiltered.length} — adicionar paginação se necessário
                  </div>
                )}
                {listFiltered.length === 0 && !loading && (
                  <div className="pmal-table-empty">
                    Nenhum serviço encontrado com os filtros atuais.
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      </div>

      {/* Modal detalhe */}
      {selectedRow && (
        <ServiceModal
          row={selectedRow}
          onClose={() => setSelectedRow(null)}
          annotation={annotations[selectedRow.numeroServico]}
          onSaveAnnotation={(id, text) => setAnnotations((prev) => ({ ...prev, [id]: text }))}
        />
      )}
    </div>
  );
}
