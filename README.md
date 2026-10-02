# Polaris Fast-Food 🍔🚀

**Polaris Fast-Food** é uma aplicação web moderna e responsiva desenvolvida para um restaurante de fast-food no Huambo, Angola. O site permite aos clientes explorar o menu, conhecer a história do restaurante e ver a galeria, enquanto oferece um painel administrativo robusto para a gestão de conteúdos em tempo real.

## 🌟 Funcionalidades

### Para Clientes
- **Menu Interativo**: Navegação por categorias (Hambúrgueres, Bebidas, etc.) com detalhes de preços e ingredientes.
- **Galeria de Imagens**: Visualização de fotos do restaurante, equipa e pratos.
- **Página "Sobre Nós"**: História da Polaris e informações sobre a equipa.
- **Contactos**: Localização via Google Maps, integração com WhatsApp e informações de contacto.
- **Design Responsivo**: Experiência otimizada para telemóveis, tablets e computadores.
- **Animações Fluidas**: Transições suaves e interações modernas usando Framer Motion.

### Para Administradores
- **Painel de Controlo**: Gestão centralizada de todo o site.
- **Gestão de Inventário**: Adicionar, editar ou remover categorias e itens do menu.
- **Edição de Conteúdo**: Alterar textos da história, imagens de herói e informações de contacto.
- **Sistema de Inicialização**: Botão "Resetar/Atualizar Menu" para carregar dados padrão instantaneamente.
- **Autenticação Segura**: Acesso restrito via Google Login, com permissões específicas para o Super Admin.
- **Atualização em Tempo Real**: Mudanças feitas no painel refletem-se imediatamente para os clientes sem necessidade de recarregar a página.

## 🛠️ Tecnologias Usadas

O projeto utiliza as tecnologias mais recentes e performantes do ecossistema web:

- **Frontend**: [React 19](https://react.dev/) com [Vite](https://vitejs.dev/) para uma experiência de desenvolvimento ultra-rápida.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) para um design limpo, moderno e altamente customizável.
- **Backend & Database**: [Neon](https://neon.tech/) (Postgres) através de uma API Express em `server/`.
- **Autenticação**: [Better Auth](https://better-auth.com) com sessões em cookie httpOnly e login por email + palavra-passe.
- **Animações**: [Framer Motion](https://www.framer.com/motion/) para micro-interações e transições de página.
- **Ícones**: [Lucide React](https://lucide.dev/) para uma iconografia consistente.
- **Routing**: [React Router DOM 7](https://reactrouter.com/) para navegação entre páginas (SPA).

## 🚀 Como Funciona

1. **API + Postgres**: o site fala com a API em `server/` (Express), que lê e escreve no Postgres do Neon. O browser nunca se liga diretamente à base de dados.
2. **Sincronização de Dados**: cada escrita na API transmite um evento SSE (`/api/events`) e os clientes vão buscar novamente apenas o recurso alterado — o mesmo efeito do antigo `onSnapshot` do Firestore.
3. **Segurança**: as regras do `firestore.rules` foram substituídas por autorização no servidor (`requireAdmin`), com base na role guardada na tabela `user`.
4. **Gestão de Papéis**: o sistema identifica o email do administrador (`miguellanttonio007@gmail.com`) e concede a role `admin` automaticamente no momento em que a conta é criada.

---

## 🗄️ Migração Firebase → Neon

### Variáveis de ambiente

| Variável | Onde | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | `.env.local` | Conexão Postgres do Neon |
| `BETTER_AUTH_SECRET` | `.env.local` | Segredo de sessão (≥32 chars) |
| `BETTER_AUTH_URL` | `.env.local` | URL pública da app (localhost:3000 em dev) |
| `FIREBASE_SERVICE_ACCOUNT` | só no importador | Service account para uma única importação |

O único método de entrada é **email + palavra-passe** (o login Google foi removido).

Em produção, as mesmas chaves são definidas em Settings → Environment.

### Comandos

```bash
bun install
bun run db:migrate   # cria as tabelas em server/schema.sql
bun run db:seed      # carrega o conteúdo padrão (mesmo menu do antigo seed)
bun run db:check     # smoke test: endpoints, permissões e auth
bun run db:check:products -- https://localhost:3000   # grava/edita/elimina um produto e confirma
bun run db:check:admin -- https://localhost:3000      # fluxo de admin + evento SSE
bun run api          # servidor Node (API + dist/) para produção
bun run db:import    # opcional: copia o conteúdo atual do Firestore para o Neon
```

### O que substitui o quê

| Firebase | Novo |
| --- | --- |
| Firestore (12 coleções) | Tabelas Postgres em `server/schema.sql` + API em `server/app.ts` |
| `onSnapshot` | Server-Sent Events (`GET /api/events`) + `useLiveResource` |
| Firebase Auth | Better Auth sobre o mesmo Postgres (`server/auth.ts`) |
| `firestore.rules` | `requireAdmin` / `isAdminUser` em `server/app.ts` |
| Base64 em documentos | Colunas `text` (imagens seguem a ser data URLs; upgrade para object storage é opcional) |

### Countdown regressiva editável

No separador **Geral** do painel pode mudar a data/hora e o **vídeo de fundo** (`countdownBgVideo`).
No novo separador **Prévias** pode criar, editar, ordenar, ativar/desativar e apagar os cartões
"O que está a chegar" (imagem + descrição). Sem prévias configuradas, a secção usa automaticamente
os pratos marcados como "Novidade" no menu.

---
*Desenvolvido com o objetivo de elevar a presença digital da Polaris Fast-Food.*
