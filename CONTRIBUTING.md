# Guia de Contribuição 🚀

Obrigado pelo seu interesse em contribuir com o **OrganizaGrana**.
Sua ajuda é bem-vinda para melhorar o aplicativo e o projeto oficial.

> [!IMPORTANT]
> **Este projeto é source-available e proprietário. Não é open source.**
>
> Você pode visualizar o código, fazer fork/clone e executar o projeto localmente **somente na medida necessária para desenvolver e testar uma contribuição destinada a este repositório oficial**.
>
> Não é permitido usar o OrganizaGrana como aplicativo pessoal, ferramenta interna, produto comercial, serviço hospedado, projeto independente ou base para outro produto.
>
> Antes de contribuir, leia o **[LICENSE](LICENSE)** e o **[CLA.md](CLA.md)**.

---

## ⚖️ Condições para contribuir

Ao enviar um Pull Request, você declara que:

1. leu e concorda com o `LICENSE` e o `CLA.md`;
2. possui os direitos necessários sobre o código ou material enviado;
3. não está enviando código copiado de terceiros sem licença compatível e identificação da origem;
4. concede ao OrganizaGrana / SalesCode os direitos descritos no `CLA.md`; e
5. entende que a contribuição poderá ser modificada, integrada, comercializada e relicenciada pelo projeto conforme o `CLA.md`.

O fork no GitHub e a cópia local são permitidos para colaboração. O uso do código fora desse objetivo continua proibido nos termos do `LICENSE`.

---

## 🛠 Como configurar o ambiente

### 1. Faça um fork e clone o repositório

Use o botão **Fork** do GitHub e clone o seu fork:

```bash
git clone https://github.com/SEU-USUARIO/app-financas.git
cd app-financas
```

> O fork e o clone devem ser utilizados para preparar e testar contribuições destinadas ao projeto oficial.

### 2. Instale as dependências

```bash
npm install
```

### 3. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

O aplicativo abrirá no navegador. Para mudanças de interface, você pode utilizar o modo de dispositivo do DevTools para simular uma tela mobile.

Você pode executar, compilar e testar o projeto localmente enquanto estiver trabalhando em uma contribuição. Isso **não** autoriza o uso do aplicativo para controle financeiro pessoal, produção ou qualquer finalidade independente do projeto oficial.

---

## 🏗 Arquitetura do Projeto

O OrganizaGrana foi construído com **React (Vite)** e exportado para Android via **Apache Cordova**.
O armazenamento é offline via **SQLite**.

A estrutura principal fica em `/src`:

- `components/`: componentes visuais reaproveitáveis;
- `pages/`: telas do aplicativo, como Dashboard, Transações, Cartões e Configurações;
- `services/`: lógica de negócio, banco de dados e APIs, como `db.js`, `transactions.js` e `ai.js`;
- `utils/`: funções auxiliares, como datas e formatação de moeda;
- `store/`: gerenciamento de estado global usando React Context (`AppContext.jsx`).

---

## 📏 Padrões de Código e Commits

### Branches

Crie uma branch descritiva a partir da `main`:

```bash
git checkout -b feat/minha-nova-funcionalidade
```

ou:

```bash
git checkout -b fix/corrigindo-bug-no-dashboard
```

### Código

- Utilize JavaScript moderno (ES6+).
- A estilização é feita em Vanilla CSS.
- Utilize as variáveis definidas no `:root` em `index.css`.
- Evite hard-code de cores quando já existir uma variável apropriada.

Exemplo:

```css
color: var(--color-primary);
```

### Commits

Utilizamos o padrão **Conventional Commits**.

Exemplos:

```text
feat: adiciona filtro avançado no extrato
fix: corrige duplicação de categorias
docs: atualiza README
refactor: otimiza query do banco de dados
```

---

## ✅ Antes de abrir o Pull Request

Garanta que o projeto compila corretamente:

```bash
npm run build
```

Quando aplicável, teste também a funcionalidade alterada e verifique se não houve regressões visíveis.

---

## 📤 Enviando seu Pull Request

1. Faça push da sua branch para o seu fork:

```bash
git push origin feat/minha-nova-funcionalidade
```

2. Abra um Pull Request para o Repositório Oficial.

3. Descreva:
   - o problema resolvido ou a funcionalidade adicionada;
   - como testar a alteração;
   - possíveis impactos;
   - prints ou vídeos, caso exista mudança visual.

4. Marque a confirmação de aceite do `CLA.md` no template do Pull Request.

O mantenedor revisará a contribuição e poderá aprová-la, solicitar alterações ou recusá-la.

Obrigado por contribuir com o OrganizaGrana.
