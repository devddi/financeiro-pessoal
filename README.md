# Meu Financeiro 💰

O **Meu Financeiro** é uma aplicação web moderna e minimalista para gestão de finanças pessoais, focada no acompanhamento e detalhamento de despesas. Inspirado em painéis profissionais de *Data Hubs*, o sistema transforma os seus gastos diários em uma DRE (Demonstração do Resultado do Exercício) interativa, limpa e altamente analítica.

Desenvolvido para trabalhar em conjunto com fluxos de automação (como n8n) ou lançamentos manuais, o aplicativo agrupa inteligentemente os dados e calcula a variação dos seus gastos mês a mês de forma automática.

## ✨ Principais Funcionalidades

- **DRE Dinâmica (Detalhamento de Despesas):** Agrupamento inteligente das suas despesas por categoria e cruzamento de dados ao longo dos meses do ano.
- **Análise Horizontal (AH):** Cálculo automático (em porcentagem) da evolução de uma despesa de um mês para o outro, indicando graficamente o aumento ou a redução dos custos.
- **Filtros Interativos:** Oculte ou exiba colunas de meses específicos, alterne anos de referência, e filtre dados instantaneamente por método de pagamento (PIX ou CARTÃO) e status (Pago ou Pendente).
- **Lançamentos Inteligentes e Parcelamento:** Criação de novos registros com opção de recorrência/parcelamento. O sistema divide a transação no banco de dados automaticamente para os próximos meses (até 12 parcelas), ajustando as datas de vencimento com precisão.
- **Agrupamento Automático de Parcelas:** O algoritmo de leitura da DRE ignora a marcação de parcelas `(1/X)` e agrupa tudo sob a mesma descrição base (ex: "Curso de Inglês") para que você veja o custo linear ao longo do tempo.
- **Autenticação Segura:** Login protegido integrado ao Supabase.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Estilização:** Vanilla CSS (Zero frameworks CSS, focado em alta customização e design premium Light Mode)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Backend / Banco de Dados / Autenticação:** [Supabase](https://supabase.com/)

## 🚀 Como rodar o projeto localmente

1. **Clone o repositório** para a sua máquina.
2. **Instale as dependências:**
   ```bash
   npm install
   ```
3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto contendo as suas credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   ```
4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
5. Acesse `http://localhost:5173` no seu navegador.

## ☁️ Deploy na Vercel

Este projeto já está configurado para deploy transparente na Vercel (SPA Routing). 

1. Importe o projeto no painel da Vercel.
2. O framework "Vite" será detectado automaticamente.
3. **Importante:** Vá em *Settings > Environment Variables* e adicione o `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Faça o deploy. Graças ao arquivo `vercel.json` incluso no projeto, as regras de rotas e o fallback para o `index.html` já estão garantidos!

---
*Criado com carinho e focado em ter as finanças na ponta do lápis (ou do mouse).* 🎯
