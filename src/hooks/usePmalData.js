import { useState, useCallback } from 'react';
import {
  fetchNotaservico,
  fetchServico,
  fetchTurma,
  joinPmalData,
} from '../data/pmalService';

/**
 * usePmalData
 *
 * Estado central do Painel PMAL.
 * Usa Promise.allSettled para que a falha de um endpoint
 * não impeça a carga dos demais (tolerância a falha parcial).
 */
export function usePmalData() {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // allSettled: mesmo que um endpoint retorne erro, os outros continuam
      const [notaRes, servicoRes, turmaRes] = await Promise.allSettled([
        fetchNotaservico(),
        fetchServico(),
        fetchTurma(),
      ]);

      // Extrai valores ou array vazio em caso de falha parcial
      const notaArray    = notaRes.status    === 'fulfilled' ? notaRes.value    : [];
      const servicoArray = servicoRes.status === 'fulfilled' ? servicoRes.value : [];
      const turmaArray   = turmaRes.status   === 'fulfilled' ? turmaRes.value   : [];

      // Log de erros parciais (não bloqueia a renderização)
      if (notaRes.status    === 'rejected') console.warn('[PMAL] notaservico falhou:', notaRes.reason?.message);
      if (servicoRes.status === 'rejected') console.warn('[PMAL] servico falhou:',     servicoRes.reason?.message);
      if (turmaRes.status   === 'rejected') console.warn('[PMAL] turma falhou:',       turmaRes.reason?.message);

      // ── Diagnóstico: inspeciona os primeiros registros para validar campos ──
      if (servicoArray.length > 0) {
        const amostra = servicoArray.slice(0, 3);
        console.group('[PMAL Diagnóstico] Primeiros 3 registros de servico:');
        amostra.forEach((r, i) => {
          console.log(`Registro ${i}:`, {
            numeroServico:    r.numeroServico,
            tipoServico:      r.tipoServico,
            situacao:         r.situacao,
            prazoAtual:       r.prazoAtual,
            tempoPendencia:   r.tempoPendencia,
            dataReclamacao:   r.dataReclamacao,
            dataDesignacao:   r.dataDesignacao,
          });
        });
        // Filtra PMAL e mostra campos de prazo para calibrar o parser
        const pmalSample = servicoArray.filter(r =>
          ['OSLN','OSLQ','OSRL','OSAA','OSML','OSAC','OSMR','RC79',
           'OSLA','OSLI','OSA1','OSIM','OSA2','OSM1','OSTA','OSAQ','OSIN','OSVQ']
          .includes(r.tipoServico)
        ).slice(0, 5);
        console.log('[PMAL Diagnóstico] Amostra de PMAL com prazos:');
        pmalSample.forEach(r => console.log(`  OS ${r.numeroServico} | tipo:${r.tipoServico} | situacao:${r.situacao} | prazoAtual:"${r.prazoAtual}" | tempoPendencia:"${r.tempoPendencia}"`));
        console.groupEnd();
      }

      if (servicoArray.length === 0 && notaArray.length === 0) {
        setError('Nenhum dado recebido dos endpoints. Verifique a conexão com o servidor GDIS.');
        return;
      }

      const joined = joinPmalData(notaArray, servicoArray, turmaArray);
      console.log(`[PMAL] Join concluído: ${joined.length} serviços PMAL de ${servicoArray.length} registros totais em servico.`);

      setData(joined);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('[usePmalData] Erro inesperado:', err);
      setError(err.message || 'Erro inesperado ao buscar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, lastUpdate, refresh };
}
