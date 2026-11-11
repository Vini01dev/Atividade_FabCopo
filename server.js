const express=require('express');
const path=require('node:path');
const db=require('./src/db');
const {Produto,Pedido}=require('./src/models');
const app=express();const PORT=process.env.PORT||3000;
app.use(express.json());app.use(express.static(path.join(__dirname,'public')));
const moedas={BRL:'Brasil',USD:'Estados Unidos',EUR:'Zona do Euro',GBP:'Reino Unido',JPY:'Japão',ARS:'Argentina',CAD:'Canadá',CNY:'China'};
const arred=v=>Math.round((v+Number.EPSILON)*100)/100;
let cotacoes={BRL:1}, atualizado=null, origem='indisponível';
async function obterCotacoes(){
  if(atualizado && Date.now()-atualizado<30*60*1000)return {taxas:cotacoes,atualizado:new Date(atualizado).toISOString(),origem};
  try{
    const resposta=await fetch('https://open.er-api.com/v6/latest/BRL',{signal:AbortSignal.timeout(7000)});
    if(!resposta.ok)throw Error('Serviço de câmbio indisponível');
    const dados=await resposta.json();if(dados.result!=='success')throw Error('Cotação inválida');
    cotacoes=Object.fromEntries(Object.keys(moedas).map(c=>[c,c==='BRL'?1:Number(dados.rates[c])]));
    if(Object.values(cotacoes).some(v=>!Number.isFinite(v)||v<=0))throw Error('Cotação incompleta');
    atualizado=Date.now();origem='open.er-api.com';
  }catch(e){if(!atualizado)throw Error('Não foi possível consultar as taxas de câmbio. Verifique sua conexão; BRL continua disponível.');}
  return {taxas:cotacoes,atualizado:new Date(atualizado).toISOString(),origem};
}
function erro(res,status,msg){return res.status(status).json({erro:msg});}
function validoProduto(b){return typeof b.nome==='string'&&b.nome.trim().length>=2&&b.nome.trim().length<=120&&Number.isFinite(b.custo)&&b.custo>0&&Number.isSafeInteger(b.estoque)&&b.estoque>=0;}
app.get('/api/status',(req,res)=>res.json({status:'online',banco:'SQLite',poo:true}));
app.get('/api/produtos',(req,res)=>res.json(db.prepare('SELECT * FROM produtos ORDER BY id DESC').all().map(p=>new Produto(p))));
app.post('/api/produtos',(req,res)=>{const b=req.body;if(!validoProduto(b))return erro(res,400,'Informe nome, custo positivo e estoque inteiro não negativo.');const r=db.prepare('INSERT INTO produtos (nome,custo,estoque) VALUES (?,?,?)').run(b.nome.trim(),arred(b.custo),b.estoque);res.status(201).json(new Produto(db.prepare('SELECT * FROM produtos WHERE id=?').get(r.lastInsertRowid)));});
app.put('/api/produtos/:id',(req,res)=>{const b=req.body;if(!validoProduto(b))return erro(res,400,'Dados inválidos.');const r=db.prepare('UPDATE produtos SET nome=?,custo=?,estoque=? WHERE id=?').run(b.nome.trim(),arred(b.custo),b.estoque,req.params.id);if(!r.changes)return erro(res,404,'Produto não encontrado.');res.json(new Produto(db.prepare('SELECT * FROM produtos WHERE id=?').get(req.params.id)));});
app.delete('/api/produtos/:id',(req,res)=>{try{const r=db.prepare('DELETE FROM produtos WHERE id=?').run(req.params.id);if(!r.changes)return erro(res,404,'Produto não encontrado.');res.status(204).end();}catch(e){return erro(res,409,'Produto com pedidos não pode ser excluído.');}});
app.get('/api/moedas',(req,res)=>res.json(moedas));
app.get('/api/cotacoes',async(req,res)=>{try{res.json(await obterCotacoes());}catch(e){erro(res,503,e.message);}});
app.get('/api/converter/:id',async(req,res)=>{const p=db.prepare('SELECT * FROM produtos WHERE id=?').get(req.params.id);if(!p)return erro(res,404,'Produto não encontrado.');const moeda=String(req.query.moeda||'BRL').toUpperCase();if(!moedas[moeda])return erro(res,400,'Moeda não suportada.');try{const c=moeda==='BRL'?{taxas:{BRL:1},origem:'moeda base',atualizado:null}:await obterCotacoes();res.json({produto:new Produto(p),moeda,taxa:c.taxas[moeda],preco:new Produto(p).converter(c.taxas[moeda]),atualizado:c.atualizado,origem:c.origem});}catch(e){erro(res,503,e.message);}});
app.get('/api/pedidos',(req,res)=>res.json(db.prepare('SELECT pedidos.*,produtos.nome AS produto_nome FROM pedidos JOIN produtos ON produtos.id=pedidos.produto_id ORDER BY pedidos.id DESC').all().map(p=>new Pedido(p))));
app.post('/api/pedidos',async(req,res)=>{
  const {cliente,pais,moeda,produto_id,quantidade}=req.body;
  if(typeof cliente!=='string'||!cliente.trim()||cliente.length>120||typeof pais!=='string'||!pais.trim()||pais.length>100||!moedas[moeda]||!Number.isSafeInteger(produto_id)||!Number.isSafeInteger(quantidade)||quantidade<=0)return erro(res,400,'Confira os dados do pedido.');
  const produto=db.prepare('SELECT * FROM produtos WHERE id=?').get(produto_id);if(!produto)return erro(res,404,'Produto não encontrado.');if(produto.estoque<quantidade)return erro(res,409,'Estoque insuficiente.');
  let taxa;try{taxa=moeda==='BRL'?1:(await obterCotacoes()).taxas[moeda];}catch(e){return erro(res,503,e.message);}
  const preco=new Produto(produto).converter(taxa),total=arred(preco*quantidade);
  try{
    db.exec('BEGIN IMMEDIATE');
    const baixa=db.prepare('UPDATE produtos SET estoque=estoque-? WHERE id=? AND estoque>=?').run(quantidade,produto_id,quantidade);
    if(!baixa.changes){db.exec('ROLLBACK');return erro(res,409,'Estoque insuficiente.');}
    const r=db.prepare('INSERT INTO pedidos (cliente,pais,moeda,taxa,produto_id,quantidade,preco_unitario,total) VALUES (?,?,?,?,?,?,?,?)').run(cliente.trim(),pais.trim(),moeda,taxa,produto_id,quantidade,preco,total);
    db.exec('COMMIT');res.status(201).json(new Pedido(db.prepare('SELECT pedidos.*,produtos.nome AS produto_nome FROM pedidos JOIN produtos ON produtos.id=pedidos.produto_id WHERE pedidos.id=?').get(r.lastInsertRowid)));
  }catch(e){try{db.exec('ROLLBACK');}catch(_){}erro(res,500,'Erro ao registrar pedido.');}
});
app.get('/api/dashboard',(req,res)=>{const p=db.prepare("SELECT COUNT(*) AS produtos,COALESCE(SUM(estoque),0) AS estoque,COUNT(CASE WHEN date(criado_em)=date('now','localtime') THEN 1 END) AS hoje FROM produtos").get();const o=db.prepare('SELECT COUNT(*) AS pedidos FROM pedidos').get();res.json({...p,...o});});
app.use((req,res)=>erro(res,404,'Rota não encontrada.'));
if(require.main===module)app.listen(PORT,()=>console.log(`VitraGlobal: http://localhost:${PORT}`));
module.exports=app;
