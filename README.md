# VitraGlobal — Sistema Back-office

Sistema web acadêmico para empresa exportadora de copos de vidro. Desenvolvido a partir do painel HTML/CSS/JavaScript original.

## Requisitos
- Node.js **22.13 ou superior** (SQLite integrado ao Node.js)
- Internet para instalar o Express e consultar câmbio internacional

## Como executar
1. Abra a pasta `VitraGlobal` no VS Code.
2. Abra o terminal integrado (`Ctrl + crase`).
3. Execute `npm install`.
4. Execute `npm start`.
5. Abra **http://localhost:3000** no navegador (não abra o HTML diretamente).

## Funcionalidades
- Cadastro, edição, listagem e exclusão de produtos
- Estoque persistente em SQLite (`data/vitraglobal.sqlite`, criado automaticamente)
- Preço de venda com lucro de 100% sobre o custo (`custo × 2`)
- Cotação de moedas via API pública `https://open.er-api.com/v6/latest/BRL`, com cache de 30 minutos
- Conversão de preço para BRL, USD, EUR, GBP, JPY, ARS, CAD e CNY
- Pedidos de exportação com redução automática de estoque e cotação/preço gravados no pedido
- Indicadores no dashboard
- Programação Orientada a Objetos: classes `Produto` e `Pedido`
- API REST em Express, consumida pelo front-end usando `fetch` HTTP

## Estrutura
- `public/` — HTML, CSS e JavaScript do front-end
- `server.js` — servidor Express e endpoints REST
- `src/models.js` — classes POO
- `src/db.js` — criação e conexão SQLite
- `data/` — banco de dados gerado ao executar

## Endpoints HTTP
| Método | Endpoint | Finalidade |
|---|---|---|
| GET | `/api/status` | Estado do servidor |
| GET | `/api/dashboard` | Indicadores |
| GET | `/api/produtos` | Listar produtos |
| POST | `/api/produtos` | Cadastrar produto |
| PUT | `/api/produtos/:id` | Editar produto |
| DELETE | `/api/produtos/:id` | Excluir produto |
| GET | `/api/moedas` | Moedas disponíveis |
| GET | `/api/cotacoes` | Taxas de câmbio |
| GET | `/api/converter/:id?moeda=USD` | Preço convertido |
| GET | `/api/pedidos` | Listar pedidos |
| POST | `/api/pedidos` | Registrar pedido |

## Exemplo de cálculo
Custo de um copo: **R$ 10,00**. Venda com lucro de 100%: **R$ 20,00**. Com uma cotação hipotética de 1 BRL = 0,20 USD, preço convertido: **US$ 4,00**. A aplicação usa a cotação retornada pela API no momento da consulta (com cache de 30 minutos).

## Observações
- Se a API externa estiver indisponível, novas conversões internacionais não poderão ser feitas até a conexão voltar. Operações em BRL continuam disponíveis.
- O banco é local, para fins de demonstração; não há autenticação de usuários, impostos, frete ou integração com pagamentos.
- Para uma demonstração, cadastre um produto, converta para USD e registre um pedido, observando a baixa do estoque.
