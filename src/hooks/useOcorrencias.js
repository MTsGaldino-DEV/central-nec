import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { buscarOcorrencias } from '../data/ocorrencias';

/**
 * Hook that fetches occurrences and subscribes to Realtime updates.
 *
 * @param {{ despachanteId?: string }} filtros
 * @returns {{ ocorrencias: Array, loading: boolean }}
 */
export function useOcorrencias(filtros = {}) {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Keep filtros stable for the dependency array
  const despachanteId = filtros.despachanteId ?? null;

  useEffect(() => {
    let cancelled = false;

    // ── 1. Initial fetch ──────────────────────────────────────────────────
    setLoading(true);
    buscarOcorrencias({ despachanteId })
      .then((data) => {
        if (!cancelled) {
          setOcorrencias(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('useOcorrencias fetch error:', err);
        if (!cancelled) setLoading(false);
      });

    // ── 2. Realtime subscription ──────────────────────────────────────────
    const channel = supabase
      .channel(`ocorrencias-changes-${despachanteId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ocorrencias' },
        (payload) => {
          if (cancelled) return;

          if (payload.eventType === 'INSERT') {
            const nova = payload.new;
            // Ignore events that don't belong to this despachante's view
            if (despachanteId && nova.despachante_id !== despachanteId) return;
            setOcorrencias((prev) =>
              [nova, ...prev].sort(
                (a, b) => new Date(b.data_hora) - new Date(a.data_hora)
              )
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            if (despachanteId && updated.despachante_id !== despachanteId) return;
            setOcorrencias((prev) =>
              prev.map((o) => (o.id === updated.id ? updated : o))
            );
          } else if (payload.eventType === 'DELETE') {
            setOcorrencias((prev) =>
              prev.filter((o) => o.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // ── 3. Cleanup — remove channel to avoid duplicate subscriptions ──────
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [despachanteId]); // re-run only if the filter changes

  return { ocorrencias, loading };
}
