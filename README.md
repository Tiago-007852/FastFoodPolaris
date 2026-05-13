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
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Firestore) para armazenamento de dados NoSQL em tempo real.
- **Autenticação**: [Firebase Auth](https://firebase.google.com/auth) com Google Login.
- **Animações**: [Framer Motion](https://www.framer.com/motion/) para micro-interações e transições de página.
- **Ícones**: [Lucide React](https://lucide.dev/) para uma iconografia consistente.
- **Routing**: [React Router DOM 7](https://reactrouter.com/) para navegação entre páginas (SPA).

## 🚀 Como Funciona

1. **Sincronização de Dados**: O site utiliza o `onSnapshot` do Firestore, o que significa que se o administrador mudar um preço no painel, o cliente vê essa mudança em segundos na sua tela.
2. **Segurança (Firestore Rules)**: A base de dados está protegida por regras granulares que garantem que apenas o administrador autorizado possa modificar os dados, enquanto o público tem acesso apenas de leitura.
3. **Gestão de Papéis**: O sistema identifica o email do administrador (`miguellanttonio007@gmail.com`) e concede privilégios de "Super Admin" automaticamente após o login.

---
*Desenvolvido com o objetivo de elevar a presença digital da Polaris Fast-Food.*
