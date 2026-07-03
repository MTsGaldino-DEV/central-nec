/**
 * StatsRow — cards de estatísticas calculados a partir da lista de ocorrências.
 *
 * Para despachante: total / em análise / aprovadas / reprovadas
 * Para supervisor:  pendentes / aprovadas / reprovadas / total
 */
export default function StatsRow({ ocorrencias = [], role }) {
  const total      = ocorrencias.length;
  const emAnalise  = ocorrencias.filter((o) => o.status === 'em_analise').length;
  const aprovado   = ocorrencias.filter((o) => o.status === 'aprovado').length;
  const reprovado  = ocorrencias.filter((o) => o.status === 'reprovado').length;

  const cards = role === 'supervisor'
    ? [
        { label: 'Pendentes de aprovação', value: emAnalise,  colorClass: 'amber' },
        { label: 'Aprovadas',              value: aprovado,   colorClass: 'green' },
        { label: 'Reprovadas',             value: reprovado,  colorClass: 'red'   },
        { label: 'Total na central',       value: total,      colorClass: ''      },
      ]
    : [
        { label: 'Total registrado', value: total,     colorClass: ''      },
        { label: 'Em análise',       value: emAnalise, colorClass: 'blue'  },
        { label: 'Aprovadas',        value: aprovado,  colorClass: 'green' },
        { label: 'Reprovadas',       value: reprovado, colorClass: 'red'   },
      ];

  return (
    <div className="stats-row">
      {cards.map((c) => (
        <div key={c.label} className={`stat-card${c.colorClass ? ' ' + c.colorClass : ''}`}>
          <div className="num">{c.value}</div>
          <div className="lbl">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
