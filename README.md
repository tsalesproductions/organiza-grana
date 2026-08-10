<div align="center">
  <img src="https://via.placeholder.com/150/6C5CE7/FFFFFF?text=OrganizaGrana" alt="OrganizaGrana Logo" width="120" height="120" style="border-radius: 24px;" />
  <h1>OrganizaGrana</h1>
  <p>Gestão Financeira Pessoal</p>
</div>

---

> [!IMPORTANT]
> ### Código-fonte disponível para colaboração — não é Open Source
>
> O código deste repositório é disponibilizado publicamente para **transparência, avaliação técnica e contribuição com o projeto oficial**.
>
> **Permitido:** visualizar, fazer fork/clone, modificar, compilar e executar localmente na medida necessária para desenvolver e testar Pull Requests destinados ao projeto oficial.
>
> **Não permitido:** utilizar o aplicativo para uso pessoal, produção, uso interno, fins comerciais, hospedar uma versão própria, distribuir builds/APKs ou criar um projeto independente baseado neste código.
>
> Consulte **[LICENSE](LICENSE)**, **[CONTRIBUTING.md](CONTRIBUTING.md)** e **[CLA.md](CLA.md)** antes de utilizar ou contribuir com o código.

---

## 📱 O que é o OrganizaGrana?

O **OrganizaGrana** é um aplicativo de gestão financeira pessoal com funcionamento offline e integração opcional com Inteligência Artificial (GPT/Gemini) para auxiliar na organização de informações financeiras.

O projeto utiliza **Apache Cordova**, React e Vite, combinando tecnologias web com recursos de aplicativo mobile híbrido.

## ✨ Funcionalidades Principais

- **Gestão de Despesas e Receitas:** lance gastos fixos, pontuais, compras no crédito ou dinheiro.
- **Cartões de Crédito Inteligentes:** controle faturas e datas de fechamento. Compras no crédito são direcionadas automaticamente para a fatura correspondente.
- **Transações Recorrentes e Parceladas:** cadastre despesas recorrentes ou compras parceladas e acompanhe os lançamentos futuros.
- **Contas a Pagar (Boletos e PIX):** marque despesas como pendentes e armazene o código do boleto/PIX para facilitar o pagamento.
- **Dashboard Resumo:** acompanhe categorias, despesas e limites por meio de uma visão consolidada.
- **Listas de Compras Dinâmicas:** marque produtos durante uma compra e converta a lista em uma despesa no extrato.
- **Inteligência Artificial (GPT/Gemini):** utilize IA para interpretar textos de faturas e auxiliar na categorização de gastos. *(O aplicativo não fornece chaves de API. O usuário autorizado deve configurar sua própria chave da OpenAI ou do Google AI Studio.)*
- **Offline e Privado:** os dados financeiros são armazenados localmente no dispositivo. No uso explícito da IA, os dados enviados no prompt são processados pela API configurada pelo usuário autorizado.

---

## 🛠 Tecnologias e Arquitetura

O projeto utiliza tecnologias web portadas para ambiente mobile híbrido:

- **Core:** [React](https://reactjs.org/)
- **Bundler:** [Vite](https://vitejs.dev/)
- **Mobile Engine:** [Apache Cordova](https://cordova.apache.org/)
- **Banco de Dados:** SQLite (`cordova-sqlite-storage`)
- **Estilização:** Vanilla CSS com CSS Variables, Flexbox, CSS Grid e temas Dark/Light.

---

## 🚀 Ambiente de Desenvolvimento

> As instruções abaixo são fornecidas exclusivamente para pessoas que estejam avaliando tecnicamente o projeto ou desenvolvendo uma contribuição destinada ao Repositório Oficial. Elas não concedem autorização para uso pessoal ou independente do aplicativo.

### Pré-requisitos

- **Node.js** v18+
- **NPM** ou Yarn

### Web

1. Faça um fork/clone do repositório seguindo o **[CONTRIBUTING.md](CONTRIBUTING.md)**.

2. Instale as dependências:

```bash
npm install
```

3. Rode o servidor de desenvolvimento:

```bash
npm run dev
```

4. Acesse `http://localhost:5173` no navegador.

> Quando executado no navegador, recursos dependentes do ambiente mobile podem se comportar de forma diferente do aplicativo instalado no dispositivo.

### Android

Para validar uma contribuição em ambiente Android:

1. Tenha o **Android SDK / Android Studio** configurado, incluindo `ANDROID_HOME` quando necessário.

2. Adicione a plataforma Android, caso ainda não exista:

```bash
npx cordova platform add android
```

3. Execute o build:

```bash
npm run build-cordova
```

> Builds e APKs gerados durante o desenvolvimento destinam-se exclusivamente à validação de contribuições e não podem ser distribuídos, publicados ou utilizados como uma versão independente do aplicativo.

---

## 🤝 Como Contribuir

Contribuições são bem-vindas no projeto oficial.

Antes de abrir o primeiro Pull Request, leia:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — fluxo e regras de contribuição;
- **[CLA.md](CLA.md)** — direitos concedidos pelo contribuidor ao projeto;
- **[LICENSE](LICENSE)** — permissões e restrições aplicáveis ao código-fonte.

---

## ⚖️ Licença e Direitos Autorais

**Copyright © 2026 OrganizaGrana / SalesCode. Todos os direitos reservados.**

Este repositório utiliza uma **licença proprietária source-available**. A publicação do código-fonte não transforma o OrganizaGrana em software open source e não concede autorização geral para uso, cópia, distribuição ou exploração do aplicativo.

O GitHub permite determinadas ações dentro de sua própria plataforma, como visualizar e fazer fork de repositórios públicos, conforme seus Termos de Serviço. As permissões adicionais para modificar, compilar e executar localmente este projeto são concedidas apenas para desenvolvimento e teste de contribuições destinadas ao projeto oficial.

Consulte o arquivo **[LICENSE](LICENSE)** para os termos completos.
