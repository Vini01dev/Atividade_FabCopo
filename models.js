class Produto {
  constructor({id, nome, custo, estoque, criado_em}) {
    this.id=id; this.nome=nome; this.custo=Number(custo); this.estoque=Number(estoque); this.criado_em=criado_em;
  }
  get vendaBRL() { return Math.round(this.custo * 2 * 100)/100; }
  converter(taxa) { return Math.round(this.vendaBRL * taxa * 100)/100; }
  toJSON() { return {id:this.id,nome:this.nome,custo:this.custo,estoque:this.estoque,criado_em:this.criado_em,vendaBRL:this.vendaBRL}; }
}
class Pedido {
  constructor({id, cliente, pais, moeda, taxa, produto_id, quantidade, preco_unitario, total, criado_em, produto_nome}) {Object.assign(this,{id,cliente,pais,moeda,taxa,produto_id,quantidade,preco_unitario,total,criado_em,produto_nome});}
}
module.exports={Produto,Pedido};
