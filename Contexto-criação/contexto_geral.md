# Contexto Geral do Projeto: Central de Ocorrências (CSC - Despacho de Campo)

Este documento descreve a arquitetura, a ideia e as principais integrações da aplicação. Serve como guia principal para manutenção e entendimento da base de código.

## 1. A Ideia por Trás do Projeto

A **Central de Ocorrências** foi concebida para digitalizar e agilizar o fluxo de despacho de campo e análise de ocorrências técnicas (como avarias, intercorrências de rotas, desvios de procedimento, etc.).
A plataforma possui regras de negócio baseadas em níveis de acesso (roles):
- **Despachante:** Pode abrir novas ocorrências, enviar evidências fotográficas e cancelar ocorrências que ainda estejam "Em análise". Ele enxerga apenas as suas próprias ocorrências.
- **Supervisor:** Pode aprovar, reprovar ou cancelar qualquer ocorrência (com exigência de observação para reprovação), além de reverter ocorrências para o status "Em análise". Também possui acesso privilegiado a indicadores operacionais (Dashboard PMAL) e visão global de todas as ocorrências do sistema.

## 2. Comunicação com o Banco de Dados (Supabase)

O sistema utiliza o **Supabase** (PostgreSQL + Auth + Storage) como backend-as-a-service (BaaS). A comunicação é toda feita via cliente JavaScript (`@supabase/supabase-js`), instanciado no arquivo `src/supabaseClient.js`.

### Principais interações de Banco (CRUD):
Arquivo responsável: `src/data/ocorrencias.js`
- **`buscarOcorrencias(filtros)`**: Lê a tabela `ocorrencias`. Usa política condicional onde o *despachante* filtra pelo seu próprio ID (`despachante_id`), enquanto o *supervisor* não recebe filtros restritivos.
- **`criarOcorrencia(dados)`**: Insere uma nova linha na tabela `ocorrencias`. O status inicial é sempre `"em_analise"`.
- **`atualizarStatusOcorrencia(id, status, observacao, supervisor)`**: Atualiza as colunas de aprovação/reprovação (`status`, `observacao_supervisor`, `supervisor_id`, `decidido_em`).
- **`atualizarFotosOcorrencia(id, fotos)`**: Atualiza a coluna JSONB `fotos`. Como a coluna é do tipo flexível `JSONB`, ela aceita a estrutura atual contendo as 5 evidências dinamicamente, não necessitando de migrations pesadas caso mude o número de fotos futuramente.

> **Storage**: As fotos (até 5 por ocorrência) fazem upload para um bucket no Supabase através do arquivo `src/data/fotos.js`, que cuida da geração de URLs assinadas seguras (signed URLs) para exibição na tela.

## 3. Integração Externa: Dados do GDIS (Dashboard PMAL)

A plataforma se comunica com endpoints do sistema GDIS para renderizar a aba de indicadores de serviços e prazos para o supervisor. 

O arquivo `src/data/pmalService.js` cuida dessas buscas utilizando os seguintes endpoints:
**Caminho Base (URL):** `/api/gdis/WebConsultaGdis/ws/contratada`
**Parâmetros na URL:** `CNPJ` (21066139000108), `COD_LOCAL` (3944471200017) e `MATRICULA` (e252135).

### Os 3 Endpoints Chamados Simultaneamente:
1. **Nota de Serviço:** `/api/gdis/WebConsultaGdis/ws/contratada/notaservico/...`
2. **Serviço:** `/api/gdis/WebConsultaGdis/ws/contratada/servico/...`
3. **Turma (Equipes):** `/api/gdis/WebConsultaGdis/ws/contratada/turma/...`

> **Atenção:** Em ambiente de desenvolvimento local, o arquivo `vite.config.js` está configurado para interceptar qualquer chamada feita para `/api/gdis` e redirecionar para a rede interna (ex: `http://192.168.1.110`). Isso evita erros de CORS durante os testes do GDIS.

A função `joinPmalData()` varre todos os arrays que retornam destes links e realiza um "join em memória", agrupando-os por `numeroServico` e `numeroVeiculo`.

## 4. O Painel PMAL (Aba de Indicadores)

O **Painel PMAL** é uma área exclusiva para acompanhamento em tempo real do Indicador operacional da CEMIG para contratada "NEC", disponível para o nível de acesso **Supervisor** até o momento, por estar em fase de teste. Ele serve para acompanhamento de serviços comerciais de toda a localidade de atendimento da UEN211 ((ligações de energia, vistorias, etc.) e permite ter uma visão geral e atualizada para tomar ações corretivas antes de estourar os prazos das metas regulatórias.

### Principais Funcionalidades do Painel:
- **KPIs Resumidos:** Exibe cards com o total de serviços ativos, quantidade de serviços vencidos (fora do prazo) e o percentual geral de conformidade (serviços no prazo).
- **Filtros Dinâmicos:**
  - **Situação:** Filtra por Pendente (P), Designado (D), Acionado (A), Execução (E) ou Finalizado (F).
  - **Localidades (Dropdown com Busca):** Menu de seleção múltipla com barra de pesquisa textual. As cidades estão agrupadas por seus respectivos **Postos de Supervisão** (ex: Posto 1 — Pedro, Posto 2 — Elton, etc.).
  - **Processo, Área (Urbano/Rural) e Busca Textual:** Filtros adicionais para refinar a busca de notas e serviços.
- **Gráficos e Interatividade:**
  - Gráfico Donut para distribuição por situação (P, D, A, E, F).
  - Gráfico de Barras agrupando os serviços por faixas de prazo de vencimento (vence hoje, vence em 2 dias, etc.). Clicar em uma barra do gráfico aplica um filtro direto na tabela inferior para focar nos serviços daquele bucket específico.
- **Listas Auxiliares de Apoio Operacional:**
  - **Material Pesado:** Exibe serviços que possuem disjuntores com carga igual ou superior a 100A. Os cards mostram o tipo de serviço, número, fases e amperagem (no formato `{fases}x{carga}A`, ex: `2x100A`), status abreviado (badge circular), localidade resumida e prazo de vencimento.
  - **Serviços em Conjunto:** Agrupa automaticamente serviços que possuem o mesmo endereço e município. Permite copiar a lista de números de serviço de uma única vez para agilizar o despacho conjunto da equipe. Por regra de negócio, esta listagem considera **apenas serviços da zona urbana**.
- **Tabela de Serviços com Recursos:**
  - **Ordenação Dinâmica:** Ordena qualquer coluna (Crescente/Decrescente) clicando em seu título. A ordenação pode ser limpa a qualquer momento pelo botão "Limpar ordem".
  - **Paginação Real:** Mostra a lista de serviços de 100 em 100 com botões de navegação (Anterior/Próxima) e contador do intervalo de visualização para melhor performance.
  - **Exportação para Excel:** Gera um arquivo de planilha no formato CSV com todos os dados e filtros atualmente aplicados na listagem de serviços.
  - **Modal de Detalhes:** O clique no ícone do olho na lateral esquerda da linha abre um modal completo com complemento da nota, visualização de equipe, tempo detalhado de pendência, botão para abrir localização no Google Maps e campo para salvar anotações personalizadas da sessão.

## 5. Estrutura de Funções Frontend e Dicionário de Strings

Diversas partes da interface usam constantes de string que podem ser alteradas sem envolver lógica pesada. Se houver necessidade de expandir o sistema, procure as seguintes constantes:

### No arquivo `src/components/ModalNovaOcorrencia.jsx`
- `TIPOS`: Array que define as opções no menu dropdown "Tipo de Ocorrência" (ex: "Avaria em equipamento", "Intercorrência de Rota").
- `TIPOS_EQUIPE`: Array das equipes. Hoje suporta apenas `['Multifuncional', 'Moto']`.
- `SLOTS`: Define as 5 chaves e rótulos para as fotos que são salvas no banco. Se quiser adicionar mais fotos no futuro, basta criar `{ key: 'evidencia6', label: 'Evidência 6' }`.

### No arquivo `src/components/ModalDetalheOcorrencia.jsx`
- `STATUS_LABEL`: Um objeto que mapeia os dados do banco para strings visuais amigáveis. Exemplo: `em_analise: 'Em análise'`. Se um novo status surgir, ele deve ser incluído aqui.

### No arquivo `src/data/pmalService.js` (Dados GDIS)
- `PMAL_TYPES` e `PMAL_TYPE_MAP`: Lista os códigos que chegam do GDIS (ex: `OSLN`) e a tradução legível deles (`Ligar novo consumidor`).
- `MUNICIPIOS`: Um dicionário que transforma códigos de região da nota de serviço em nomes de cidades visíveis na tela.
- `POSTOS`: Um agrupamento que define quais cidades pertencem a qual posto de supervisão (ex: Posto 1 — Pedro cuida de Frei Inocencio, Alpercata, etc). Se a estrutura de equipes mudar, esta constante precisa ser atualizada.
