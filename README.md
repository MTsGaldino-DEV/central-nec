# Central de Ocorrências CSC — NEC

Aplicação web desenvolvida com **React + Vite** para a central de serviços da NEC, permitindo que despachantes de campo registrem ocorrências com evidências fotográficas e supervisores aprovem/reprovem com feedback.

O projeto utiliza **Supabase** no backend para banco de dados relacional (PostgreSQL), Storage (buckets privados para fotos), Autenticação e Realtime (atualizações via WebSockets).

## Tecnologias Principais
- React 18 + Vite
- React Router DOM
- Supabase JS Client (`@supabase/supabase-js`)
- CSS Vanilla (Design system migrado de protótipo estático)

## Como rodar localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` para `.env` e preencha com as credenciais do seu projeto Supabase:
   ```bash
   cp .env.example .env
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse no navegador: `http://localhost:5173`

## Gerando Build para Produção

Para gerar a versão otimizada de produção, execute:
```bash
npm run build
```
Os arquivos gerados estarão na pasta `dist/`.

## Gerenciamento de Usuários (Manual)

Nesta versão, **não há tela de cadastro ou gestão de usuários no painel**. A criação de novos usuários deve ser feita manualmente pelo administrador:

1. Acesse o [Painel do Supabase](https://app.supabase.com) > **Authentication** > **Users**.
2. Clique em **Add user** e crie uma nova conta com e-mail e senha.
3. Copie o **UUID** gerado para o novo usuário.
4. Vá em **Table Editor** > tabela `usuarios`.
5. Insira uma nova linha (Insert row) informando:
   - `id`: o UUID copiado da aba de Autenticação.
   - `nome`: Nome completo do usuário.
   - `iniciais`: Duas letras (ex: "MG").
   - `role`: `despachante` ou `supervisor`.

*Importante: as regras de RLS dependem do relacionamento entre o `auth.users` e a tabela `public.usuarios`. O usuário só conseguirá acessar o sistema se a linha existir em `usuarios` correspondendo ao seu UUID de login.*

## Opções de Deploy

A pasta `dist/` resultante do build contém HTML/CSS/JS estáticos puros, podendo ser hospedada em qualquer servidor web.

### Opção A: Vercel ou Netlify (Recomendado/Fácil)
1. Conecte o repositório GitHub ao Vercel ou Netlify.
2. Eles detectarão automaticamente que é um projeto Vite e configurarão os comandos `npm install` e `npm run build`.
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) no painel de configurações da plataforma.
4. O deploy será feito automaticamente a cada push.

### Opção B: Deploy no VPS próprio com Nginx + Cloudflare Tunnel
Como você já possui um VPS rodando n8n via Cloudflare Tunnel, você pode hospedar os arquivos estáticos lá.

1. Gere o build localmente: `npm run build`.
2. Envie o conteúdo da pasta `dist/` para um diretório no seu servidor (ex: `/var/www/central-nec`).
3. Configure um bloco no servidor web (Nginx/Caddy/Apache) para apontar para essa pasta. Se for usar **Nginx**, um exemplo básico:
   ```nginx
   server {
       listen 8080;
       server_name localhost;
       root /var/www/central-nec;
       index index.html;

       # Redireciona todas as rotas para o index.html (SPA)
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```
4. Exponha a porta local do servidor web (ex: `8080`) através de um novo hostname no seu **Cloudflare Tunnel** apontando para `http://localhost:8080`.
