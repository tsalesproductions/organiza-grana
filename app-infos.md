Atue como um desenvolvedor especialista em UI/UX e desenvolvimento mobile com React, Framework7 e Apache Cordova.

Preciso criar um aplicativo de Gestão Financeira Pessoal completo, profissional e 100% offline.

### Identidade Visual & UI/UX (Estrito):
- Identidade própria: NÃO seguir o tema nativo do sistema operacional do celular. O app terá um tema único e consistente em todas as plataformas.
- Paleta de Cores: Cores neutras (fundo claro/slate neutro, cards limpos com bordas suaves e ótimo contraste de leitura) com detalhes, destaques e botões de ação principal (CTAs) na cor ROXA (ex: #6C5CE7 ou similar refinado).
- Navegação: Barra de navegação inferior (Bottom Tab Bar) fixa com ícones e rótulos para:
  1. Início (Dashboard)
  2. Extrato (Transações)
  3. Cartões
  4. Relatórios
  5. Configurações
- Dashboard (Tela Inicial):
  - No topo, destaque para o Saldo Total Atual e resumo do mês.
  - Botões de Ação Rápida no topo: "+ Receita", "+ Despesa", "+ Cartão/Fatura".
  - Seções logo abaixo com resumo dos últimos lançamentos e faturas ativas.

### Tech Stack:
- Framework: Framework7 + React
- Empacotamento/Nativo: Apache Cordova
- Banco de Dados: SQLite local via plugin `cordova-sqlite-storage`
- Notificações: Plugin `cordova-plugin-local-notification`
- Gráficos: Chart.js ou Recharts

### Requisitos Funcionais:
1. Onboarding:
   - No primeiro acesso, exibir uma tela de boas-vindas profissional com solicitação do e-mail do usuário. Salvar no SQLite local.
2. Cartões de Crédito:
   - Cadastro de cartões de crédito (Nome do cartão, últimos 4 dígitos, dia de fechamento e dia de vencimento da fatura).
3. Gerenciamento de Transações:
   - Lançamento de Receitas e Despesas.
   - Para despesas, selecionar a Forma de Pagamento: "À Vista" (Dinheiro/PIX/Débito) ou "Cartão de Crédito" (vinculando a um cartão).
   - Opção de despesa fixa/recorrente ou parcelada com escolha de quantidade de parcelas ou meses de repetição.
4. Categorias:
   - CRUD de categorias personalizadas com ícones e cores associadas.
5. Dashboard e Relatórios:
   - Balanço geral (saldo, receitas, despesas à vista e fatura atual dos cartões).
   - Gráficos visuais interativos (gráfico de pizza por categoria e gráfico de barras para fluxo financeiro mensal).
6. Notificações Locais:
   - Agendamento de notificações locais para lembrar contas a vencer e vencimento da fatura do cartão.
   - Tela de configurações para o usuário gerenciar/ativar/desativar essas notificações.
7. Roadmap Futuro:
   - Código limpo, modularizado e bem comentado, preparando terreno para integrar a chave de API da OpenAI (para leitura de recibos/notas por imagem) no futuro.

Por favor, comece estruturando os arquivos do projeto e me forneça o código da FASE 1:
- Configuração do tema customizado (CSS/Variables com a paleta neutra e roxa).
- Estrutura base da barra de navegação inferior (Tab Bar).
- Inicialização do banco SQLite local e modelagem das tabelas.
- Tela de Onboarding para captura do e-mail do usuário.