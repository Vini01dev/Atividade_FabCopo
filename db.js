const { DatabaseSync }=require('node:sqlite');
const path=require('node:path');
const fs=require('node:fs');
const dir=path.join(__dirname,'..','data');fs.mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'vitraglobal.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS produtos (id INTEGER PRIMARY KEY AUTOINCREMENT,nome TEXT NOT NULL,custo REAL NOT NULL CHECK(custo>0),estoque INTEGER NOT NULL CHECK(estoque>=0),criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')));
CREATE TABLE IF NOT EXISTS pedidos (id INTEGER PRIMARY KEY AUTOINCREMENT,cliente TEXT NOT NULL,pais TEXT NOT NULL,moeda TEXT NOT NULL,taxa REAL NOT NULL,produto_id INTEGER NOT NULL,quantidade INTEGER NOT NULL CHECK(quantidade>0),preco_unitario REAL NOT NULL,total REAL NOT NULL,criado_em TEXT NOT NULL DEFAULT (datetime('now','localtime')),FOREIGN KEY(produto_id) REFERENCES produtos(id));`);
module.exports=db;
