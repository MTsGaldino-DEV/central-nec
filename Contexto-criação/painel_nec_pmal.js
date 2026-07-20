import React, { useState, useMemo, useCallback } from "react";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
    RefreshCw, MapPin, Clock, AlertTriangle, Search, ChevronDown, CheckCircle2, X,
    Navigation, Copy, Check, Zap, Layers, DollarSign, Users, ClipboardList,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Domain data
// ---------------------------------------------------------------------------
const PMAL_TYPES = [
    { code: "OSLN", desc: "Ligar novo consumidor" },
    { code: "OSLQ", desc: "Ligação nova de UC em QM vistoriado" },
    { code: "OSRL", desc: "Restabelecer na caixa" },
    { code: "OSAA", desc: "Alt. carga acessante micro/mini geração BT" },
    { code: "OSML", desc: "Mudar local medição" },
    { code: "OSAC", desc: "Alteração de carga" },
    { code: "OSMR", desc: "Restabelecer com instalação medidor" },
    { code: "RC79", desc: "Vistoria em quadro de medição coletivo" },
    { code: "OSLA", desc: "Lig. nova p/acessante micro/mini geração" },
    { code: "OSLI", desc: "Ligar novo consumidor - medição indireta" },
    { code: "OSA1", desc: "Alteração de carga em instalação cortada" },
    { code: "OSIM", desc: "Instalar medidor" },
    { code: "OSA2", desc: "Alt carg acess/micro/mini ger in cortada" },
    { code: "OSM1", desc: "Mudar local de med em instalação cortada" },
    { code: "OSTA", desc: "Trocar medição para aferição" },
    { code: "OSAQ", desc: "Alterar carga de UC em QM vistoriado" },
    { code: "OSIN", desc: "Restabelecer med. ind" },
    { code: "OSVQ", desc: "Vistoria de QM para adequação da ligação" },
];
const TYPE_MAP = Object.fromEntries(PMAL_TYPES.map((t) => [t.code, t.desc]));

const PROCESSO_GROUPS = {
    "Ligação Nova": ["OSLN", "OSLQ", "OSLI", "OSLA"],
    "Restabelecimento": ["OSRL", "OSMR", "OSIN"],
    "Alteração de Carga": ["OSAC", "OSAA", "OSA1", "OSA2", "OSAQ"],
    "Medição": ["OSML", "OSIM", "OSM1", "OSTA"],
    "Vistoria": ["RC79", "OSVQ"],
};

const MUNICIPIOS = [
    { local: "4164", nome: "AGUA BOA" }, { local: "4162", nome: "AIMORES" },
    { local: "4106", nome: "ALPERCATA" }, { local: "4238", nome: "ALVARENGA" },
    { local: "4351", nome: "BARRA MANSA" }, { local: "4143", nome: "CANTAGALO" },
    { local: "0012", nome: "CAPITAO ANDRADE" }, { local: "4190", nome: "CENTRAL DE MINAS" },
    { local: "4165", nome: "COLUNA" }, { local: "4102", nome: "CONSELHEIRO PENA" },
    { local: "4108", nome: "COROACI" }, { local: "4154", nome: "CUPARAQUE" },
    { local: "4105", nome: "DIVINO LARANJEIRAS" }, { local: "4168", nome: "ENGENHEIRO CALDAS" },
    { local: "4170", nome: "FERNANDES TOURINHO" }, { local: "4109", nome: "FREI INOCENCIO" },
    { local: "4538", nome: "FREI LAGO NEGRO" }, { local: "4110", nome: "GALILEIA" },
    { local: "4194", nome: "GOIABEIRA" }, { local: "4186", nome: "GONZAGA" },
    { local: "4101", nome: "GOVERNADOR VALADARES" }, { local: "4103", nome: "ITABIRINHA DE MANTENA" },
    { local: "4174", nome: "ITANHOMI" }, { local: "4161", nome: "ITUETA" },
    { local: "4410", nome: "JAMPRUCA" }, { local: "4558", nome: "JATAI" },
    { local: "4199", nome: "JOSE RAYDAN" }, { local: "4189", nome: "MANTENA" },
    { local: "4175", nome: "MARILAC" }, { local: "4115", nome: "MATHIAS LOBATO" },
    { local: "4104", nome: "MENDES PIMENTEL" }, { local: "4177", nome: "NACIP RAYDAN" },
    { local: "4506", nome: "NOVA BELEM" }, { local: "4183", nome: "PAULISTAS" },
    { local: "4128", nome: "PECANHA" }, { local: "4157", nome: "RESPLENDOR" },
    { local: "4185", nome: "SANTA EFIGENIA DE MINAS" }, { local: "4132", nome: "SANTA MARIA DO SUACUI" },
    { local: "4158", nome: "SANTA RITA DO ITUETO" }, { local: "4191", nome: "SAO FELIX DE MINAS" },
    { local: "4187", nome: "SAO GERALDO DA PIEDADE" }, { local: "4535", nome: "SAO GERALDO DO BAIXIO" },
    { local: "4530", nome: "SAO GERALDO TUMIRITINGA" }, { local: "4518", nome: "SAO JOAO DO MANTENINHA" },
    { local: "4131", nome: "SAO JOAO EVANGELISTA" }, { local: "4176", nome: "SAO JOSE DA SAFIRA" },
    { local: "4163", nome: "SAO JOSE DO JACURI" }, { local: "4134", nome: "SAO PEDRO DO SUACUI" },
    { local: "4172", nome: "SAO SEBASTIAO DO MARANHAO" }, { local: "4184", nome: "SARDOA" },
    { local: "4169", nome: "SOBRALIA" }, { local: "4235", nome: "TARUMIRIM" },
    { local: "4532", nome: "TIPITI" }, { local: "4114", nome: "TUMIRITINGA" },
    { local: "4173", nome: "VIRGOLANDIA" },
];

const POSTOS = {
    "Posto 1 — Pedro": [
        "Frei Inocêncio", "Alpercata", "Alvarenga", "Capitão Andrade", "Engenheiro Caldas",
        "Fernandes Tourinho", "Governador Valadares", "Itanhomi", "Jampruca", "Jataí",
        "Mathias Lobato", "São Geraldo do Tumiritinga", "Sobrália", "Tarumirim", "Tumiritinga",
    ],
    "Posto 2 — Elton": [
        "Coluna", "São Geraldo da Piedade", "Água Boa", "José Raydan", "Paulistas",
        "Cantagalo", "Peçanha", "São João Evangelista", "São José do Jacuri",
        "Santa Efigênia de Minas", "Gonzaga", "Santa Maria do Suaçuí", "Frei Lago Negro",
        "São Pedro do Suaçuí", "São Sebastião do Maranhão", "Sardoá",
    ],
    "Posto 3 — Vinicius": [
        "Cuparaque", "Conselheiro Pena", "Resplendor", "Aimorés", "Goiabeira",
        "Itueta", "Santa Rita do Itueto", "São Geraldo do Baixio", "Galileia",
    ],
    "Posto 4 — Victor": [
        "Itabirinha de Mantena", "Divino das Laranjeiras", "Central de Minas", "Mendes Pimentel",
        "Nova Belém", "São Félix de Minas", "Tipiti", "Mantena", "São João do Manteninha",
        "Marilac", "Coroaci", "Virgolândia", "Nacip Raydan", "São José da Safira",
    ],
};

function slug(str) {
    return str
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\b(DE|DO|DA|DOS|DAS)\b/g, "")
        .replace(/[^A-Z]/g, "");
}

const CIDADE_TO_POSTO = {};
Object.entries(POSTOS).forEach(([posto, cidades]) => {
    cidades.forEach((c) => { CIDADE_TO_POSTO[slug(c)] = posto; });
});
const MUNICIPIOS_COM_POSTO = MUNICIPIOS.map((m) => ({
    ...m,
    posto: CIDADE_TO_POSTO[slug(m.nome)] || null,
}));
const POSTO_KEYS = Object.keys(POSTOS);

const SITUACOES = {
    P: { label: "Pendente", color: "#f97316" },
    D: { label: "Designado", color: "#0891b2" },
    A: { label: "Acionado", color: "#a855f7" },
    E: { label: "Execução", color: "#2563eb" },
    F: { label: "Finalizado", color: "#94a3b8" },
};

const NOMES_ELETRICISTA = [
    { nome: "MARCOS VIN", placa: "QOY4770" }, { nome: "JOSE VICEN", placa: "RVO3D13" },
    { nome: "RONALDO RO", placa: "QQZ3262" }, { nome: "CARLOS ALB", placa: "PQR1122" },
    { nome: "EDUARDO SA", placa: "OTR9988" }, { nome: "FABIO HENR", placa: "QWE4455" },
];

const DISJUNTORES = [null, null, null, "2X40A", "2X60A", "2X100A", "2X150A", "2X200A", "3X100A", "3X150A"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pad(n) { return String(n).padStart(2, "0"); }
function hhmm(totalMinutes) {
    const neg = totalMinutes < 0;
    const abs = Math.abs(Math.round(totalMinutes));
    return `${neg ? "-" : ""}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
}
function weightedPick(weights) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const [key, w] of Object.entries(weights)) { if (r < w) return key; r -= w; }
    return Object.keys(weights)[0];
}
function bucketFromRemaining(h) {
    if (h <= 0) return "Vencido";
    if (h <= 24) return "Hoje";
    if (h <= 48) return "1 dia útil";
    if (h <= 72) return "2 dias úteis";
    if (h <= 96) return "3 dias úteis";
    if (h <= 120) return "4 dias úteis";
    return "5 dias úteis";
}
const BUCKET_ORDER = ["Vencido", "Hoje", "1 dia útil", "2 dias úteis", "3 dias úteis", "4 dias úteis", "5 dias úteis"];
function amperageOf(disjuntor) {
    if (!disjuntor) return null;
    const m = disjuntor.match(/(\d+)\s*A/i);
    return m ? parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Mock dataset — simulates the join notaservico + servico, filtered to PMAL
// ---------------------------------------------------------------------------
function generateMockDataset(count = 420) {
    const now = new Date();
    const rows = [];
    const enderecoPool = [];
    for (let i = 0; i < count; i++) {
        const tipo = PMAL_TYPES[Math.floor(Math.random() * PMAL_TYPES.length)];
        const muni = MUNICIPIOS_COM_POSTO[Math.floor(Math.random() * MUNICIPIOS_COM_POSTO.length)];
        const situacao = weightedPick({ P: 76, D: 23, A: 1.2, E: 0.3, F: 14 });

        const prazoAtualMin = parseInt(weightedPick({ "7200": 55, "4320": 35, "2880": 10 }), 10);
        const tempoPendenciaMin = Math.max(0, Math.round(
            Math.random() < 0.18 ? prazoAtualMin + Math.random() * 2400 : Math.random() * prazoAtualMin * 1.05
        ));
        const remainingMin = prazoAtualMin - tempoPendenciaMin;
        const vencido = remainingMin < 0;
        const dataCadastro = new Date(now.getTime() - tempoPendenciaMin * 60000);

        const temEquipe = situacao !== "P";
        const eletricista = temEquipe ? NOMES_ELETRICISTA[Math.floor(Math.random() * NOMES_ELETRICISTA.length)] : null;

        // endereços repetidos de propósito para "serviços em conjunto"
        let endereco;
        if (enderecoPool.length > 6 && Math.random() < 0.14) {
            endereco = enderecoPool[Math.floor(Math.random() * enderecoPool.length)];
        } else {
            endereco = { rua: `RUA ${["DAS FLORES", "SAO JORGE", "MINAS GERAIS", "ESPIRITO SANTO", "ALCINO LOPES", "DO CEMITERIO"][Math.floor(Math.random() * 6)]}`, numero: String(Math.floor(Math.random() * 900) + 1), bairro: ["CENTRO", "BOA UNIAO", "SANTA RITA", "VILA MARIA", "SAO RAIMUNDO", "GRA DUQUESA"][Math.floor(Math.random() * 6)] };
            enderecoPool.push(endereco);
        }

        rows.push({
            numeroServico: 240000000 + Math.floor(Math.random() * 6000000),
            tipoServico: tipo.code,
            tipoDescricao: tipo.desc,
            situacao,
            municipio: muni.nome,
            local: muni.local,
            posto: muni.posto,
            bairro: endereco.bairro,
            endereco: endereco.rua,
            numero: endereco.numero,
            tipoArea: Math.random() < 0.68 ? "U" : "R",
            dataCadastro,
            tempoPendenciaMin,
            prazoAtualMin,
            remainingMin,
            vencido,
            bucket: bucketFromRemaining(remainingMin / 60),
            eletricista: eletricista?.nome || null,
            placa: eletricista?.placa || null,
            quantidadeReincidencia: weightedPick({ "0": 80, "1": 14, "2": 4, "3": 2 }) | 0,
            alimentador: String(Math.floor(Math.random() * 900) + 1).padStart(3, "0"),
            numeroDispositivo: String(Math.floor(Math.random() * 300000) + 1000),
            disjuntor: DISJUNTORES[Math.floor(Math.random() * DISJUNTORES.length)],
            latitude: -18.5 - Math.random() * 1.4,
            longitude: -41.2 - Math.random() * 1.6,
        });
    }
    return rows;
}

function matchesBusca(d, busca) {
    if (!busca.trim()) return true;
    const q = busca.trim().toUpperCase();
    return d.bairro.includes(q) || d.endereco.includes(q) || String(d.numeroServico).includes(q) || d.municipio.includes(q);
}

// ---------------------------------------------------------------------------
// Small UI pieces
// ---------------------------------------------------------------------------
function PulseDot({ color, size = 9 }) {
    return (
        <span className="relative inline-flex" style={{ width: size, height: size }}>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: color }} />
            <span className="relative inline-flex h-full w-full rounded-full" style={{ backgroundColor: color }} />
        </span>
    );
}

function KpiCard({ icon: Icon, label, value, accent }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
                <Icon size={18} className="text-white" />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
                <div className="text-xl font-bold text-slate-800">{value}</div>
            </div>
        </div>
    );
}

function SituacaoBadge({ code }) {
    const s = SITUACOES[code];
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: s.color }}>
            {s.label}
        </span>
    );
}

function PillToggle({ options, value, onChange }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={`rounded-md px-3 py-1.5 transition ${value === opt.value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Modal de detalhe do serviço
// ---------------------------------------------------------------------------
function ServiceModal({ row, onClose, annotation, onSaveAnnotation }) {
    const [text, setText] = useState(annotation || "");
    const muniInfo = MUNICIPIOS_COM_POSTO.find((m) => m.nome === row.municipio);
    const deadline = new Date(row.dataCadastro.getTime() + row.prazoAtualMin * 60000);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-white">GV</span>
                            Serviço nº {row.numeroServico}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-sm font-bold text-slate-700">{row.tipoServico}</span>
                            <span className="text-sm text-slate-600">{row.tipoDescricao}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3 px-5 py-4 text-sm sm:grid-cols-3">
                    <div><div className="text-[11px] uppercase text-slate-400">Situação</div><div className="mt-0.5"><SituacaoBadge code={row.situacao} /></div></div>
                    <div><div className="text-[11px] uppercase text-slate-400">Reincidência</div><div className="mt-0.5 font-semibold text-slate-700">{row.quantidadeReincidencia}x</div></div>
                    <div><div className="text-[11px] uppercase text-slate-400">Área</div><div className="mt-0.5 font-semibold text-slate-700">{row.tipoArea === "U" ? "Urbana" : "Rural"}</div></div>

                    <div><div className="text-[11px] uppercase text-slate-400">Turma designada</div><div className="mt-0.5 font-semibold text-slate-700">{row.eletricista ? `${row.eletricista} · ${row.placa}` : "— não designada"}</div></div>
                    <div><div className="text-[11px] uppercase text-slate-400">Tempo pendência</div><div className="mt-0.5 font-mono font-semibold text-slate-700">{hhmm(row.tempoPendenciaMin)}</div></div>
                    <div>
                        <div className="text-[11px] uppercase text-slate-400">Prazo até</div>
                        <div className={`mt-0.5 font-mono font-semibold ${row.vencido ? "text-red-600" : "text-slate-700"}`}>
                            {deadline.toLocaleDateString("pt-BR")} {deadline.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <div className="text-[11px] uppercase text-slate-400">Localidade</div>
                        <div className="mt-0.5 font-semibold text-slate-700">{row.local} · {row.municipio}</div>
                        {muniInfo?.posto && <div className="text-xs text-slate-400">{muniInfo.posto}</div>}
                    </div>
                    <div><div className="text-[11px] uppercase text-slate-400">Bairro</div><div className="mt-0.5 font-semibold text-slate-700">{row.bairro}</div></div>
                    <div><div className="text-[11px] uppercase text-slate-400">Endereço</div><div className="mt-0.5 font-semibold text-slate-700">{row.endereco}, {row.numero}</div></div>

                    <div><div className="text-[11px] uppercase text-slate-400">Equipamento</div><div className="mt-0.5 font-mono font-semibold text-slate-700">{row.numeroDispositivo}</div></div>
                    <div><div className="text-[11px] uppercase text-slate-400">Alimentador</div><div className="mt-0.5 font-mono font-semibold text-slate-700">{row.alimentador}</div></div>
                    <div><div className="text-[11px] uppercase text-slate-400">Disjuntor</div><div className="mt-0.5 font-semibold text-slate-700">{row.disjuntor || "—"}</div></div>

                    <div className="col-span-2 sm:col-span-3">
                        <div className="text-[11px] uppercase text-slate-400">Multa prevista (compensação financeira)</div>
                        <div className="mt-0.5 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                            <AlertTriangle size={12} /> Indisponível — aguardando integração desse dado
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                    <a
                        href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
                    >
                        <Navigation size={13} /> Abrir localização no Maps
                    </a>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Anotações (sessão)</div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Adicionar observação sobre este serviço..."
                        className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-700 focus:border-orange-400 focus:outline-none"
                        rows={3}
                    />
                    <button
                        onClick={() => onSaveAnnotation(row.numeroServico, text)}
                        className="mt-2 rounded-md bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700"
                    >
                        Salvar anotação
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function PainelPMAL() {
    const [data, setData] = useState(() => generateMockDataset());
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    const [activeSituacoes, setActiveSituacoes] = useState(new Set(["P", "D", "A", "E", "F"]));
    const [activePostos, setActivePostos] = useState(new Set());
    const [localidade, setLocalidade] = useState("TODAS");
    const [processo, setProcesso] = useState("TODOS");
    const [area, setArea] = useState("TODAS");
    const [busca, setBusca] = useState("");

    const [selectedRow, setSelectedRow] = useState(null);
    const [annotations, setAnnotations] = useState({});
    const [copiedGroup, setCopiedGroup] = useState(null);

    const handlePush = useCallback(() => {
        setLoading(true);
        setTimeout(() => { setData(generateMockDataset()); setLastUpdate(new Date()); setLoading(false); }, 900);
    }, []);

    const toggleSituacao = (code) => {
        setActiveSituacoes((prev) => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next.size === 0 ? new Set(["P", "D", "A", "E", "F"]) : next;
        });
    };
    const togglePosto = (posto) => {
        setActivePostos((prev) => {
            const next = new Set(prev);
            if (next.has(posto)) next.delete(posto); else next.add(posto);
            return next;
        });
    };

    // Geo/processo/área/busca aplicados (sem o toggle de situação) — usados no donut e nos cards de posto
    const geoFiltered = useMemo(() => data.filter((d) =>
        (localidade === "TODAS" || d.municipio === localidade) &&
        (processo === "TODOS" || PROCESSO_GROUPS[processo].includes(d.tipoServico)) &&
        (area === "TODAS" || d.tipoArea === (area === "URBANA" ? "U" : "R")) &&
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
        Object.entries(situacaoCounts).filter(([k]) => activeSituacoes.has(k)).reduce((a, [, v]) => a + v, 0)
        , [situacaoCounts, activeSituacoes]);

    const postoCounts = useMemo(() => {
        const map = {};
        POSTO_KEYS.forEach((p) => { map[p] = 0; });
        geoFiltered.forEach((d) => {
            if (d.posto && activeSituacoes.has(d.situacao)) map[d.posto]++;
        });
        return map;
    }, [geoFiltered, activeSituacoes]);

    // Lista final: geo + situação + posto
    const listFiltered = useMemo(() => geoFiltered.filter((d) =>
        activeSituacoes.has(d.situacao) && (activePostos.size === 0 || activePostos.has(d.posto))
    ), [geoFiltered, activeSituacoes, activePostos]);

    const vencidosCount = useMemo(() => listFiltered.filter((d) => d.vencido && d.situacao !== "F").length, [listFiltered]);
    const noPrazoPct = useMemo(() => {
        const abertos = listFiltered.filter((d) => d.situacao !== "F");
        if (abertos.length === 0) return "0";
        return ((abertos.filter((d) => !d.vencido).length / abertos.length) * 100).toFixed(1);
    }, [listFiltered]);

    const bucketChartData = useMemo(() => {
        const base = {};
        BUCKET_ORDER.forEach((b) => { base[b] = { bucket: b, pendente: 0, emAtendimento: 0 }; });
        listFiltered.forEach((d) => {
            if (d.situacao === "F") return;
            if (d.situacao === "P") base[d.bucket].pendente++; else base[d.bucket].emAtendimento++;
        });
        return BUCKET_ORDER.map((b) => base[b]);
    }, [listFiltered]);

    const materialPesado = useMemo(() =>
        listFiltered.filter((d) => (amperageOf(d.disjuntor) || 0) >= 100)
            .sort((a, b) => (amperageOf(b.disjuntor) || 0) - (amperageOf(a.disjuntor) || 0))
        , [listFiltered]);

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
        const text = group.itens.map((i) => i.numeroServico).join(",");
        navigator.clipboard?.writeText(text).catch(() => { });
        setCopiedGroup(idx);
        setTimeout(() => setCopiedGroup(null), 1500);
    };

    const donutOrder = ["P", "D", "A", "E", "F"];
    const donutData = donutOrder.map((k) => ({ key: k, name: SITUACOES[k].label, value: situacaoCounts[k], color: SITUACOES[k].color }));

    return (
        <div className="min-h-screen w-full bg-slate-50 p-4 font-sans text-slate-800 sm:p-6">
            {/* Header */}
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
                        <Zap size={14} /> PMAL · Planejadas de Manutenção
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Painel do Operador</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right text-xs text-slate-500">
                        Dados atualizados
                        <div className="font-semibold text-slate-700">{lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <button
                        onClick={handlePush} disabled={loading}
                        className="flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {loading ? "Puxando dados..." : "Atualizar dados"}
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={Zap} label="Total selecionado" value={totalSelecionado} accent="bg-slate-700" />
                <KpiCard icon={AlertTriangle} label="Vencidos" value={vencidosCount} accent="bg-red-500" />
                <KpiCard icon={CheckCircle2} label="Dentro do prazo" value={`${noPrazoPct}%`} accent="bg-emerald-600" />
                <KpiCard icon={Clock} label="Prazos vigentes" value="72h / 120h" accent="bg-orange-500" />
            </div>

            {/* Situação (donut moderno multiselect) + Postos */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-700">Situação</div>
                        <div className="text-[11px] text-slate-400">clique para filtrar</div>
                    </div>
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                        <div className="relative h-44 w-44 shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={donutData} dataKey="value" nameKey="name"
                                        innerRadius={58} outerRadius={82} paddingAngle={3} cornerRadius={8}
                                        stroke="none" isAnimationActive
                                    >
                                        {donutData.map((entry) => (
                                            <Cell
                                                key={entry.key}
                                                fill={entry.color}
                                                opacity={activeSituacoes.has(entry.key) ? 1 : 0.18}
                                                onClick={() => toggleSituacao(entry.key)}
                                                style={{ cursor: "pointer" }}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v, n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                <div className="text-3xl font-extrabold text-slate-800">{totalSelecionado}</div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</div>
                            </div>
                        </div>
                        <div className="w-full flex-1 space-y-1.5">
                            {donutOrder.map((k) => (
                                <button
                                    key={k}
                                    onClick={() => toggleSituacao(k)}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${activeSituacoes.has(k) ? "bg-slate-50" : "opacity-40 hover:opacity-70"}`}
                                >
                                    <span className="flex items-center gap-2 font-medium text-slate-600">
                                        <PulseDot color={SITUACOES[k].color} />
                                        {SITUACOES[k].label}
                                    </span>
                                    <span className="font-bold text-slate-800">{situacaoCounts[k]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-slate-700">Postos</div>
                        <div className="text-[11px] text-slate-400">multi-seleção</div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {POSTO_KEYS.map((posto) => {
                            const [num, supervisor] = posto.split("—").map((s) => s.trim());
                            const active = activePostos.has(posto);
                            return (
                                <button
                                    key={posto}
                                    onClick={() => togglePosto(posto)}
                                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${active ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300" : "border-slate-200 bg-slate-50 hover:border-slate-300"}`}
                                >
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{num}</div>
                                        <div className="text-sm font-bold text-slate-800">{supervisor}</div>
                                    </div>
                                    <div className="text-2xl font-extrabold text-slate-700">{postoCounts[posto] || 0}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative">
                    <select value={localidade} onChange={(e) => setLocalidade(e.target.value)}
                        className="appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700">
                        <option value="TODAS">Todas as localidades</option>
                        {localidadesDisponiveis.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
                </div>

                <div className="relative">
                    <select value={processo} onChange={(e) => setProcesso(e.target.value)}
                        className="appearance-none rounded-md border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700">
                        <option value="TODOS">Todos os processos</option>
                        {Object.keys(PROCESSO_GROUPS).map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
                </div>

                <PillToggle
                    value={area} onChange={setArea}
                    options={[{ label: "Todas", value: "TODAS" }, { label: "Urbana", value: "URBANA" }, { label: "Rural", value: "RURAL" }]}
                />

                <div className="relative min-w-[220px] flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input value={busca} onChange={(e) => setBusca(e.target.value)}
                        placeholder="Buscar bairro, endereço, nº serviço..."
                        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400" />
                </div>
            </div>

            {/* Distribuição por prazo x situação */}
            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-700">Distribuição por prazo × situação</div>
                <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={bucketChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barGap={4}>
                        <defs>
                            <linearGradient id="gradPendente" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                            <linearGradient id="gradAtend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0891b2" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Bar dataKey="pendente" name="Pendente" fill="url(#gradPendente)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="emAtendimento" name="Em atendimento" fill="url(#gradAtend)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Compensação financeira / Material pesado / Serviços em conjunto */}
            <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <DollarSign size={16} className="text-emerald-600" /> Top compensação financeira
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-6 text-center">
                        <AlertTriangle size={18} className="text-amber-500" />
                        <div className="text-xs font-medium text-amber-700">Dado de multa prevista ainda não integrado.</div>
                        <div className="text-[11px] text-amber-600">Área reservada — assim que o campo estiver disponível no endpoint, essa lista é preenchida automaticamente.</div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Layers size={16} className="text-slate-600" /> Material pesado
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{materialPesado.length}</span>
                    </div>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                        {materialPesado.length === 0 && <div className="text-xs text-slate-400">Nenhum serviço com disjuntor ≥ 100A no filtro atual.</div>}
                        {materialPesado.slice(0, 20).map((d) => (
                            <button key={d.numeroServico} onClick={() => setSelectedRow(d)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100">
                                <span>
                                    <span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-white">{d.disjuntor}</span>
                                    {d.tipoServico}
                                </span>
                                <span className="font-mono text-slate-500">#{d.numeroServico}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Users size={16} className="text-slate-600" /> Serviços em conjunto
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{servicosConjunto.length}</span>
                    </div>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                        {servicosConjunto.length === 0 && <div className="text-xs text-slate-400">Nenhum endereço com múltiplos serviços no filtro atual.</div>}
                        {servicosConjunto.slice(0, 15).map((g, idx) => (
                            <div key={idx} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="truncate font-semibold text-slate-700">{g.endereco}, {g.numero}</div>
                                        <div className="text-[11px] text-slate-400">{g.municipio} · {g.itens.length} notas</div>
                                    </div>
                                    <button onClick={() => copyGroup(g, idx)} className="flex shrink-0 items-center gap-1 rounded-md bg-slate-800 px-2 py-1 font-semibold text-white hover:bg-slate-900">
                                        {copiedGroup === idx ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedGroup === idx ? "Copiado" : "Copiar"}
                                    </button>
                                </div>
                                <div className="mt-1 truncate font-mono text-[11px] text-slate-400">
                                    {g.itens.map((i) => i.numeroServico).join(", ")}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lista de serviços */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <ClipboardList size={16} /> Lista de serviços
                    </div>
                    <div className="text-xs text-slate-400">{listFiltered.length} serviço(s)</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5 font-semibold">Nº Serviço</th>
                                <th className="px-4 py-2.5 font-semibold">Tipo</th>
                                <th className="px-4 py-2.5 font-semibold">Situação</th>
                                <th className="px-4 py-2.5 font-semibold">Município</th>
                                <th className="px-4 py-2.5 font-semibold">Bairro</th>
                                <th className="px-4 py-2.5 font-semibold">Turma</th>
                                <th className="px-4 py-2.5 font-semibold">Restante</th>
                                <th className="px-4 py-2.5 font-semibold">Prazo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listFiltered.slice(0, 100).map((d) => (
                                <tr key={d.numeroServico} onClick={() => setSelectedRow(d)} className="cursor-pointer border-t border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-2.5 font-mono text-slate-700">{d.numeroServico}</td>
                                    <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-600" title={d.tipoDescricao}>{d.tipoServico}</span></td>
                                    <td className="px-4 py-2.5"><SituacaoBadge code={d.situacao} /></td>
                                    <td className="px-4 py-2.5 text-slate-600">{d.municipio}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{d.bairro}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{d.eletricista || <span className="text-slate-300">—</span>}</td>
                                    <td className={`px-4 py-2.5 font-mono font-semibold ${d.remainingMin < 0 ? "text-red-600" : "text-slate-700"}`}>{hhmm(d.remainingMin)}</td>
                                    <td className="px-4 py-2.5">
                                        {d.situacao === "F" ? <span className="text-slate-300">—</span> :
                                            d.vencido ? <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700"><AlertTriangle size={11} /> Vencido</span> :
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">{d.bucket}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {listFiltered.length > 100 && (
                    <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-400">Mostrando 100 de {listFiltered.length} — em produção, adicionar paginação</div>
                )}
                {listFiltered.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-400">Nenhum serviço encontrado com os filtros atuais.</div>
                )}
            </div>

            <div className="mt-4 text-center text-[11px] text-slate-400">
                Protótipo — dados simulados. Clique em uma linha, no material pesado ou nos serviços em conjunto para ver o detalhe.
            </div>

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