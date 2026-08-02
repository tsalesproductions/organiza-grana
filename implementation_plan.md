# App de Gestão Financeira Pessoal — Plano de Implementação

## Visão Geral

Aplicativo **100% offline** de Gestão Financeira Pessoal para **Android**, construído com **Framework7 + React + Apache Cordova**. O app terá identidade visual própria (paleta neutra + roxa), banco de dados local SQLite, notificações locais e gráficos interativos.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| UI Framework | Framework7 + React |
| Empacotamento Nativo | Apache Cordova |
| Banco de Dados | SQLite (`cordova-sqlite-storage`) |
| Gráficos | Chart.js |
| Notificações | `cordova-plugin-local-notification` |
| Build Tool | Vite (para o bundle React) |
| Plataforma alvo | Android |

---

## Decisões de Design

> [!IMPORTANT]
> O app terá tema **único e customizado** — não segue o Material Design nem o tema nativo do Android. Isso garante identidade visual consistente.

**Paleta de Cores:**
- **Fundo:** `#F8F7FA` (cinza neutro levemente warm)
- **Cards:** `#FFFFFF` com bordas suaves e sombra leve
- **Primária (CTA / Destaques):** `#6C5CE7` (roxo refinado)
- **Primária escura:** `#5849C2`
- **Texto principal:** `#1E1E2E`
- **Texto secundário:** `#6B7280`
- **Sucesso (Receitas):** `#00B894`
- **Perigo (Despesas):** `#E17055`

---

## Etapas de Implementação

---

### 🏗️ ETAPA 1 — Configuração do Ambiente e Estrutura do Projeto

**Objetivo:** Ter o projeto Cordova + React + Vite funcionando no Android.

#### Tarefas:
1. **Inicializar projeto Cordova** para Android
   - `cordova create app-financas com.salescode.financas AppFinancas`
   - Adicionar plataforma Android: `cordova platform add android`
2. **Configurar Vite + React** dentro da pasta `www/`
   - Setup do `vite.config.js` com output apontando para `www/`
   - Configurar `package.json` com scripts de build e dev
3. **Instalar plugins Cordova**
   - `cordova-sqlite-storage`
   - `cordova-plugin-local-notification`
   - `cordova-plugin-device` (detecção de ambiente)
4. **Instalar dependências NPM**
   - `framework7`, `framework7-react`
   - `react`, `react-dom`
   - `chart.js`, `react-chartjs-2`
5. **Estrutura de pastas do `src/`**
   ```
   src/
   ├── assets/          # ícones, imagens
   ├── components/      # componentes reutilizáveis
   ├── pages/           # telas do app
   │   ├── Onboarding/
   │   ├── Dashboard/
   │   ├── Transactions/
   │   ├── Cards/
   │   ├── Reports/
   │   └── Settings/
   ├── services/        # camada de acesso ao banco de dados
   │   ├── db.js        # inicialização e conexão SQLite
   │   ├── transactions.js
   │   ├── cards.js
   │   ├── categories.js
   │   └── notifications.js
   ├── store/           # gerenciamento de estado global (Context API)
   ├── styles/          # CSS Variables, tema global
   │   └── theme.css
   ├── utils/           # funções utilitárias (formatação, datas etc.)
   ├── App.jsx
   └── main.jsx
   ```

**Entregável:** Projeto rodando no emulador Android com tela em branco.

---

### 🎨 ETAPA 2 — Sistema de Design e Tema Visual

**Objetivo:** Implementar a identidade visual completa do app.

#### Tarefas:
1. **`theme.css`** — Definir todas as CSS Variables
   - Cores, tipografia, espaçamentos, border-radius, sombras
   - Override completo dos estilos padrão do Framework7
2. **Componentes base de UI:**
   - `<Card />` — card com sombra suave e borda arredondada
   - `<Badge />` — label de categoria colorida
   - `<CurrencyDisplay />` — valor monetário formatado (R$)
   - `<ActionButton />` — botão CTA primário roxo
   - `<EmptyState />` — ilustração para listas vazias
3. **Bottom Tab Bar** — Navegação com 5 abas:
   - Início · Extrato · Cartões · Relatórios · Configurações
   - Ícones SVG customizados + rótulos
   - Indicador de aba ativa com cor roxa
4. **Tipografia:** Importar fonte `Inter` (Google Fonts bundled)

**Entregável:** App com identidade visual completa e navegação funcional entre telas vazias.

---

### 🗄️ ETAPA 3 — Banco de Dados SQLite e Modelagem

**Objetivo:** Estruturar e inicializar o banco de dados local.

#### Modelagem das Tabelas:

```sql
-- Configurações do usuário
CREATE TABLE IF NOT EXISTS user_config (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Categorias (com ícone e cor)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,        -- nome do ícone SVG
  color TEXT NOT NULL,       -- hex da cor
  type TEXT NOT NULL,        -- 'income' | 'expense'
  is_default INTEGER DEFAULT 0
);

-- Cartões de crédito
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  last_digits TEXT NOT NULL, -- últimos 4 dígitos
  closing_day INTEGER NOT NULL,  -- dia de fechamento
  due_day INTEGER NOT NULL,      -- dia de vencimento
  credit_limit REAL DEFAULT 0,
  color TEXT DEFAULT '#6C5CE7',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Transações (receitas e despesas)
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL,          -- 'income' | 'expense'
  payment_method TEXT NOT NULL, -- 'cash' | 'credit_card'
  card_id INTEGER REFERENCES cards(id),
  category_id INTEGER REFERENCES categories(id),
  date TEXT NOT NULL,
  is_recurring INTEGER DEFAULT 0,  -- 0 = não | 1 = sim
  recurrence_type TEXT,            -- 'monthly' | 'installment'
  installment_total INTEGER,       -- total de parcelas
  installment_current INTEGER,     -- parcela atual
  installment_group_id TEXT,       -- UUID para agrupar parcelas
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Notificações agendadas
CREATE TABLE IF NOT EXISTS notification_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,    -- 'bill_reminder' | 'card_due'
  enabled INTEGER DEFAULT 1,
  days_before INTEGER DEFAULT 3,  -- quantos dias antes notificar
  time TEXT DEFAULT '09:00'
);
```

#### Tarefas:
1. Implementar `db.js` — singleton de conexão SQLite com fila de queries
2. Criar função `initDatabase()` — executa todas as `CREATE TABLE IF NOT EXISTS`
3. Popular categorias padrão (Alimentação, Transporte, Saúde, etc.)
4. Criar camada de serviços (`transactions.js`, `cards.js`, `categories.js`)
5. Integrar inicialização do DB no boot do app (antes do render React)

**Entregável:** Banco criado e persistindo dados localmente no dispositivo.

---

### 🛫 ETAPA 4 — Onboarding

**Objetivo:** Tela de boas-vindas no primeiro acesso para captura do e-mail.

#### Tarefas:
1. Lógica de detecção de primeiro acesso (checar se `user_config` tem registro)
2. Tela de Onboarding com:
   - Logo e nome do app
   - Frase de impacto (ex: *"Suas finanças, sob controle."*)
   - Campo de e-mail com validação
   - Botão CTA "Começar" — salva e-mail no SQLite e redireciona ao Dashboard
3. Animações de entrada suaves (fade + slide)

**Entregável:** Onboarding exibido apenas no primeiro acesso, com e-mail salvo.

---

### 💳 ETAPA 5 — Gestão de Cartões de Crédito

**Objetivo:** CRUD completo de cartões de crédito.

#### Tarefas:
1. **Listagem de cartões** — tela `Cards/` com cards visuais (nome, últimos 4 dígitos, fatura atual)
2. **Formulário de cadastro/edição:**
   - Nome do cartão
   - Últimos 4 dígitos
   - Dia de fechamento
   - Dia de vencimento
   - Limite de crédito (opcional)
   - Cor do card (seletor de paleta)
3. **Cálculo de fatura atual** — soma das transações no período do ciclo ativo
4. **Exclusão com confirmação** — excluir cartão e transações vinculadas

**Entregável:** Tela de Cartões com CRUD completo e fatura calculada.

---

### 💸 ETAPA 6 — Gestão de Transações (Receitas e Despesas)

**Objetivo:** Formulário de lançamento e extrato de transações.

#### Tarefas:
1. **Formulário de Nova Transação** (Sheet Modal / Bottom Sheet):
   - Toggle Receita / Despesa
   - Campo de valor (teclado numérico estilizado)
   - Descrição
   - Data (date picker)
   - Categoria (seletor com ícone e cor)
   - **Para Despesas:**
     - Forma de pagamento: À Vista | Cartão de Crédito
     - Se Cartão: selecionar qual cartão
     - Opção: Despesa fixa? → repetir mensalmente
     - Opção: Parcelado? → nº de parcelas
   - Notas (opcional)
   - Botão "Salvar"
2. **Extrato (Tela Transactions/):**
   - Lista agrupada por data
   - Filtro por mês (swipe ou seletor)
   - Busca por descrição
   - Chip de filtro por tipo (Receitas / Despesas)
   - Swipe-to-delete com confirmação
3. **Edição de transação** — ao clicar em um item, abre o formulário pré-preenchido

**Entregável:** Lançamento e listagem de transações funcionando com SQLite.

---

### 🏷️ ETAPA 7 — Categorias Personalizadas

**Objetivo:** CRUD de categorias com ícone e cor.

#### Tarefas:
1. **Listagem de categorias** — separadas por tipo (Receita / Despesa)
2. **Formulário de categoria:**
   - Nome
   - Tipo (Receita / Despesa)
   - Seletor de ícone (grid com ~30 ícones SVG)
   - Seletor de cor (paleta de 12 cores predefinidas)
3. **Proteção de categorias padrão** — não pode excluir, apenas editar

**Entregável:** Tela de categorias personalizadas dentro de Configurações.

---

### 📊 ETAPA 8 — Dashboard e Relatórios

**Objetivo:** Tela inicial com visão geral das finanças e tela de relatórios com gráficos.

#### Tarefas — Dashboard:
1. **Card de Saldo Total** — receitas − despesas do mês atual
2. **Resumo do mês** — barras de progresso: Receitas vs Despesas
3. **Botões de Ação Rápida** — `+ Receita`, `+ Despesa`, `+ Cartão`
4. **Últimas transações** — lista dos 5 lançamentos mais recentes
5. **Faturas ativas** — cards com valor atual e vencimento de cada cartão

#### Tarefas — Relatórios:
1. **Seletor de período** — mês/ano
2. **Gráfico de pizza** — gastos por categoria (Chart.js)
3. **Gráfico de barras** — comparativo mensal receitas vs despesas (últimos 6 meses)
4. **Resumo por categoria** — lista com valor e percentual

**Entregável:** Dashboard dinâmico e Relatórios com gráficos interativos.

---

### 🔔 ETAPA 9 — Notificações Locais

**Objetivo:** Lembretes de contas e vencimento de faturas de cartão.

#### Tarefas:
1. Integrar `cordova-plugin-local-notification`
2. Serviço `notifications.js`:
   - Agendar notificação X dias antes do vencimento de cada fatura
   - Cancelar e reagendar ao editar cartão
3. **Tela de Configurações > Notificações:**
   - Toggle geral de notificações
   - Configurar quantos dias antes notificar (1, 2, 3, 5, 7)
   - Horário preferido de notificação
   - Preview da próxima notificação agendada

**Entregável:** Notificações locais funcionando no Android.

---

### ⚙️ ETAPA 10 — Configurações Gerais e Polimento Final

**Objetivo:** Finalizar tela de configurações e polir toda a experiência.

#### Tarefas:
1. **Tela de Configurações:**
   - Dados do usuário (editar e-mail)
   - Gerenciar Categorias
   - Configurações de Notificações
   - Exportar dados (JSON simples para backup)
   - Sobre o app (versão, etc.)
2. **Polimento UX:**
   - Skeleton loaders nas listas
   - Toast/Snackbar de feedback (salvo, excluído, erro)
   - Haptic feedback em ações importantes
   - Pull-to-refresh no Dashboard e Extrato
   - Animações de transição entre telas
3. **Revisão de acessibilidade:**
   - Contraste mínimo WCAG AA
   - Touch targets mínimos de 44x44dp

---

### 📦 ETAPA 11 — Build de Produção para Android

**Objetivo:** Gerar APK/AAB assinado pronto para distribuição.

#### Tarefas:
1. Configurar `config.xml` do Cordova (ícone, splash screen, permissões)
2. Gerar ícone e splash screen para todas as densidades de tela
3. Configurar `build.json` para build de release
4. Build de produção: `npm run build && cordova build android --release`
5. Assinar APK com keystore
6. Testar no dispositivo físico

**Entregável:** APK funcional pronto para distribuição.

---

## Estrutura de Arquivos Completa

```
app-financas/
├── config.xml                    # Configuração Cordova
├── package.json
├── vite.config.js
├── platforms/
│   └── android/                  # gerado pelo Cordova
├── plugins/                      # plugins Cordova instalados
├── www/                          # output do build Vite
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles/
    │   └── theme.css
    ├── assets/
    │   └── icons/
    ├── components/
    │   ├── ui/
    │   │   ├── Card.jsx
    │   │   ├── Badge.jsx
    │   │   ├── ActionButton.jsx
    │   │   ├── CurrencyDisplay.jsx
    │   │   └── EmptyState.jsx
    │   ├── forms/
    │   │   ├── TransactionForm.jsx
    │   │   ├── CardForm.jsx
    │   │   └── CategoryForm.jsx
    │   └── charts/
    │       ├── PieChart.jsx
    │       └── BarChart.jsx
    ├── pages/
    │   ├── Onboarding/
    │   │   └── OnboardingPage.jsx
    │   ├── Dashboard/
    │   │   └── DashboardPage.jsx
    │   ├── Transactions/
    │   │   └── TransactionsPage.jsx
    │   ├── Cards/
    │   │   └── CardsPage.jsx
    │   ├── Reports/
    │   │   └── ReportsPage.jsx
    │   └── Settings/
    │       └── SettingsPage.jsx
    ├── services/
    │   ├── db.js
    │   ├── transactions.js
    │   ├── cards.js
    │   ├── categories.js
    │   └── notifications.js
    ├── store/
    │   └── AppContext.jsx
    └── utils/
        ├── currency.js
        ├── dates.js
        └── installments.js
```

---

## Cronograma Estimado

| Etapa | Descrição | Complexidade |
|---|---|---|
| 1 | Ambiente e estrutura | 🟡 Média |
| 2 | Design System e Tema | 🟡 Média |
| 3 | Banco de Dados SQLite | 🟠 Alta |
| 4 | Onboarding | 🟢 Baixa |
| 5 | Cartões de Crédito | 🟡 Média |
| 6 | Transações (CRUD) | 🔴 Alta |
| 7 | Categorias | 🟢 Baixa |
| 8 | Dashboard + Relatórios | 🟠 Alta |
| 9 | Notificações Locais | 🟡 Média |
| 10 | Configurações + Polimento | 🟡 Média |
| 11 | Build Android | 🟡 Média |

---

## Perguntas Abertas

> [!IMPORTANT]
> Antes de iniciar a implementação, confirme as seguintes decisões:

1. **Nome do app**: Qual será o nome exibido no dispositivo e na Play Store? (ex: *"FinançasPro"*, *"MoneyFlow"*, *"Saldo+"*)
2. **Package ID**: Qual o identificador do app? (ex: `com.salescode.financas`)
3. **Chart.js vs Recharts**: O arquivo menciona ambos. Prefere **Chart.js** (mais leve, menos dependências) ou **Recharts** (mais integrado ao React)?
4. **Exportação de dados**: Deseja incluir backup/exportação de dados na Etapa 10, ou isso fica para um roadmap futuro?
5. **Ambiente de desenvolvimento**: Qual a versão do Java JDK e Android SDK instalados? (necessário para o Cordova)
