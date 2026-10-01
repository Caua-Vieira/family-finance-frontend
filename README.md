# Family Finance — Frontend

Interface web do **Razão Financeira**, um app de controle financeiro familiar: várias pessoas da mesma família registram receitas e despesas, organizam categorias, definem orçamentos e acompanham o mês em um painel compartilhado.

> **Backend:** a API consumida por este projeto vive em um repositório separado — [family-finance-backend](https://github.com/Caua-Vieira/family-finance-backend).

## Sumário

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Rodando Localmente](#rodando-localmente)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Rotas](#rotas)
- [Arquitetura](#arquitetura)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Deploy](#deploy)

---

## Funcionalidades

- **Login e cadastro** — Ao se cadastrar, a pessoa cria uma nova família (informando o nome) ou entra em uma existente usando o **código de convite**.
- **Código da família** — Fica na barra lateral e é copiado com um clique para convidar outras pessoas.
- **Painel** — Resumo do mês com receitas, despesas e saldo, comparação com o mês anterior, **ritmo do mês** (tempo decorrido vs. orçamento consumido), progresso de gasto por categoria e gráfico de despesas por categoria. Meses futuros aparecem como projeção a partir das recorrências.
- **Lançamentos** — Cadastro, edição e exclusão de receitas e despesas, com filtro por tipo, navegação por mês e resumo de receitas/despesas/saldo do período.
- **Recorrências** — Um lançamento pode ser marcado como "Repetir todo mês" (dia do mês, início e fim opcional). As regras são gerenciadas em um modal (editar, pausar, reativar e excluir), e os lançamentos previstos aparecem na lista com o selo **Previsto**.
- **Categorias** — Categorias principais e subcategorias, com edição.
- **Cartões** — Cartões de cada membro da família, que podem ser vinculados às despesas.
- **Orçamentos** — Valor planejado por categoria principal para cada mês.
- **Extrato por cartão** — Detalhamento dos itens da fatura de cada cartão, com total por cartão e gasto por subcategoria. É informativo: não entra no painel nem no orçamento, já que a fatura em si é registrada como um lançamento.
- **Tema claro/escuro** — Segue o sistema operacional por padrão; a escolha manual fica salva no navegador.
- **Sessão expirada** — Quando a API responde `401`, o token é descartado e o usuário volta para o login.

---

## Tecnologias

| Categoria        | Tecnologia                         |
|------------------|------------------------------------|
| Framework        | React 19                           |
| Linguagem        | TypeScript                         |
| Build / Dev      | Vite                               |
| Roteamento       | React Router 7                     |
| Gráficos         | Recharts                           |
| Estilo           | CSS puro com design tokens (CSS variables) |
| Lint             | ESLint + typescript-eslint         |
| Hospedagem       | Vercel                             |

---

## Rodando Localmente

### Pré-requisitos

- Node.js 20.19+ (ou 22.12+)
- A [API do backend](https://github.com/Caua-Vieira/family-finance-backend) rodando (por padrão em `http://localhost:3333`)

### Passo a passo

**1. Clone o repositório:**
```bash
git clone https://github.com/Caua-Vieira/family-finance-frontend.git
cd family-finance-frontend
```

**2. Instale as dependências:**
```bash
npm install
```

**3. Configure o `.env`** a partir do exemplo:
```bash
cp .env.example .env
```

**4. Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:5173`.

---

## Variáveis de Ambiente

| Variável       | Descrição                                   | Exemplo                      |
|----------------|---------------------------------------------|------------------------------|
| `VITE_API_URL` | URL base da API, incluindo o prefixo `/api` | `http://localhost:3333/api`  |

---

## Scripts

| Comando           | Descrição                                           |
|-------------------|-----------------------------------------------------|
| `npm run dev`     | Servidor de desenvolvimento com hot reload          |
| `npm run build`   | Checagem de tipos (`tsc -b`) + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção localmente                |
| `npm run lint`    | Roda o ESLint                                       |

---

## Rotas

| Rota          | Página                                  | Autenticada |
|---------------|-----------------------------------------|-------------|
| `/login`      | Login e cadastro                        | Não         |
| `/dashboard`  | Painel do mês                           | Sim         |
| `/transacoes` | Lançamentos e recorrências              | Sim         |
| `/extrato`    | Extrato por cartão                      | Sim         |
| `/categorias` | Categorias e subcategorias              | Sim         |
| `/cartoes`    | Cartões                                 | Sim         |
| `/orcamento`  | Orçamentos mensais                      | Sim         |

Qualquer outra rota redireciona para `/dashboard`. As rotas autenticadas passam pelo `ProtectedRoute`, que manda para `/login` quando não há token.

---

## Arquitetura

- **Camada de API (`src/api/`)** — Um cliente `fetch` central (`client.ts`) injeta o token JWT (`Authorization: Bearer`), converte erros da API em `ApiError` e dispara o evento de sessão expirada em respostas `401`. Cada recurso (transações, cartões, categorias…) tem seu próprio módulo que usa esse cliente.
- **Autenticação** — O token retornado pelo login/cadastro fica no `localStorage`. Todo o escopo por família é feito pelo backend, a partir do token.
- **Feedback global** — `ToastProvider` (notificações) e `ConfirmProvider` (diálogo de confirmação baseado em Promise, via `useConfirm`) envolvem o app inteiro.
- **Estilo** — Cada página/componente tem seu próprio `.css`. Cores, fontes e raios vêm de `src/styles/tokens.css`, e o tema escuro redefine os tokens em `:root[data-theme="dark"]`. Um script inline no `index.html` aplica o tema antes do primeiro render para evitar o flash de tema errado.
- **Valores monetários** — Os campos de valor trabalham em centavos (`src/utils/currency.ts`) e só convertem para reais no envio à API.

---

## Estrutura do Projeto

```
src/
├── api/            # Cliente HTTP e um módulo por recurso da API
├── components/     # Componentes compartilhados (modais, toast, confirmação, rotas protegidas)
├── hooks/          # Hooks reutilizáveis (ex.: useTheme)
├── layouts/        # AppLayout: barra lateral, navegação, código da família e tema
├── pages/          # Uma pasta por página (Auth, Dashboard, Transactions, Statement…)
├── styles/         # Design tokens (cores, fontes, raios) para os temas claro e escuro
├── types/          # Tipos TypeScript espelhando os DTOs da API
├── utils/          # Helpers de moeda e data
├── App.tsx         # Providers globais e definição das rotas
└── main.tsx        # Entry point
```

---

## Deploy

O frontend é publicado na **Vercel**. O `vercel.json` reescreve todas as rotas para `index.html`, para que o React Router funcione ao acessar ou recarregar uma URL interna (sem isso, a Vercel devolveria 404).

Para publicar, configure a variável `VITE_API_URL` no projeto da Vercel apontando para a URL da API em produção.
