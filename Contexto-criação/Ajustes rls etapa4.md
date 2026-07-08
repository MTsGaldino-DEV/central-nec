# Ajustes nas Policies de RLS — Etapa 4 (pós-checkpoint Prompt 4)

## Contexto

Durante o teste do checkpoint do Prompt 4 ("crie uma ocorrência com as 3 fotos, confirme que sobem para o bucket e aparecem no modal de detalhe"), foram identificados dois problemas nas policies de RLS originais da Etapa 4, além de uma mudança de requisito. Este documento registra o que foi alterado e por quê, para manter o SQL da Etapa 4 sincronizado com o que está de fato rodando no banco.

## O que mudou

### 1. Supervisor também pode criar ocorrência (mudança de requisito)

O plano original só previa `despachante` como papel capaz de criar ocorrências. Foi decidido que `supervisor` também deve poder criar.

**Policy original (substituída):**
```sql
create policy "ocorrencias_insert_despachante"
  on public.ocorrencias for insert
  to authenticated
  with check (
    despachante_id = auth.uid()
    and status = 'em_analise'
    and (select role from public.usuarios where id = auth.uid()) = 'despachante'
  );
```

**Policy nova:**
```sql
drop policy if exists "ocorrencias_insert_despachante" on public.ocorrencias;

create policy "ocorrencias_insert_despachante_supervisor"
  on public.ocorrencias for insert
  to authenticated
  with check (
    despachante_id = auth.uid()
    and status = 'em_analise'
    and (select role from public.usuarios where id = auth.uid()) in ('despachante', 'supervisor')
  );
```

**O que não mudou:** a trava `despachante_id = auth.uid()` continua valendo — quem cria a ocorrência (seja despachante ou supervisor) só pode registrá-la em nome de si mesmo. Não existe, por enquanto, um fluxo onde o supervisor cria uma ocorrência em nome de outro despachante.

### 2. Despachante precisa de permissão de UPDATE para salvar as fotos (lacuna do plano)

**Causa raiz:** o Prompt 4 introduziu um fluxo onde o despachante, após criar a ocorrência (`insert`), precisa fazer um `update` nela mesma para salvar os paths das fotos enviadas ao bucket (coluna `fotos`, jsonb). A Etapa 4 original só previa uma policy de `update` para o papel `supervisor` (usada no fluxo de aprovação/reprovação do Prompt 5). Como resultado, o `update` do despachante era bloqueado pelo RLS (`PATCH 406`), e as fotos ficavam salvas no Storage mas nunca eram vinculadas à ocorrência no banco.

**Policy nova (adicionada, não substitui nenhuma):**
```sql
create policy "ocorrencias_update_despachante_fotos"
  on public.ocorrencias for update
  to authenticated
  using (
    despachante_id = auth.uid()
    and status = 'em_analise'
  )
  with check (
    despachante_id = auth.uid()
    and status = 'em_analise'
  );
```

Isso permite que o despachante (ou supervisor, já que agora também pode ser o `despachante_id` de uma ocorrência) atualize a própria ocorrência enquanto ela ainda está `em_analise` — cobrindo o caso de anexar as fotos após a criação.

**Ponto de atenção para o futuro:** essa policy libera `update` em qualquer coluna da linha, não só em `fotos`. Hoje isso não é um problema porque o front-end só usa esse update para salvar paths de fotos, mas nada no banco impede que um despachante, via chamada direta à API REST (fora da UI), altere `status`, `observacao_supervisor` ou outros campos da própria ocorrência enquanto ela está `em_analise`. Se isso vier a ser uma preocupação (por exemplo, um despachante mudar o próprio status para `aprovado` diretamente), a mitigação seria uma das duas:
- Restringir via trigger (`before update`) quais colunas podem ser alteradas por não-supervisores; ou
- Mover a lógica de salvar `fotos` para uma função `security definer` (RPC) chamada pelo front, em vez de um `update` direto na tabela.

Isso não foi implementado agora porque está fora do escopo do checkpoint atual — mas fica registrado como débito técnico a considerar antes do deploy (Prompt 6).

## SQL consolidado (para referência rápida)

Todas as policies de `ocorrencias` como estão hoje no banco, já refletindo os ajustes acima:

```sql
create policy "ocorrencias_insert_despachante_supervisor"
  on public.ocorrencias for insert
  to authenticated
  with check (
    despachante_id = auth.uid()
    and status = 'em_analise'
    and (select role from public.usuarios where id = auth.uid()) in ('despachante', 'supervisor')
  );

create policy "ocorrencias_select_role_based"
  on public.ocorrencias for select
  to authenticated
  using (
    despachante_id = auth.uid()
    or (select role from public.usuarios where id = auth.uid()) = 'supervisor'
  );

create policy "ocorrencias_update_supervisor"
  on public.ocorrencias for update
  to authenticated
  using (
    status = 'em_analise'
    and (select role from public.usuarios where id = auth.uid()) = 'supervisor'
  )
  with check (
    -- condição de aprovação/reprovação (ver SQL original da Etapa 4)
  );

create policy "ocorrencias_update_despachante_fotos"
  on public.ocorrencias for update
  to authenticated
  using (
    despachante_id = auth.uid()
    and status = 'em_analise'
  )
  with check (
    despachante_id = auth.uid()
    and status = 'em_analise'
  );
```

## Status

✅ Testado e funcionando: supervisor cria ocorrência com fotos; despachante cria ocorrência com fotos; ambos aparecem corretamente no modal de detalhe.

📌 Pendente de decisão antes do deploy: avaliar se a policy `ocorrencias_update_despachante_fotos` precisa de restrição adicional por coluna (ver "Ponto de atenção para o futuro" acima).