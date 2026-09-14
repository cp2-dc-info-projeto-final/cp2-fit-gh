const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const sendSuccess=(res,status,message,data)=>res.status(status).json({success:true,...(message?{message}:{}),...(data!==undefined?{data}:{})});
const sendError=(res,status,message,errors=[])=>res.status(status).json({success:false,message,errors});
const professorOnly=(req,res,next)=>req.user?.role==='professor'||req.user?.role==='admin'?next():sendError(res,403,'Acesso permitido apenas a professores e administradores.');

// CRUD simples nº 1. Professores administram suas próprias atividades; admin administra todas.
router.get('/', verifyToken, async (req,res)=>{
  try{
    const params=[]; let query=`SELECT a.id,a.nome,a.descricao,a.ativa,a.professor_id AS "professorId",u.login AS "professorNome",COUNT(t.id)::int AS "quantidadeTurmas" FROM atividade a JOIN usuario u ON u.id=a.professor_id LEFT JOIN turma t ON t.atividade_id=a.id`;
    if(req.user.role==='professor'){params.push(req.user.id);query+=` WHERE a.professor_id=$1`;}
    query+=` GROUP BY a.id,u.login ORDER BY a.nome`;
    const result=await pool.query(query,params);return sendSuccess(res,200,null,result.rows);
  }catch(e){console.error(e);return sendError(res,500,'Erro ao consultar atividades.');}
});

router.get('/professores',verifyToken,isAdmin,async(req,res)=>{try{const r=await pool.query(`SELECT id,login,email FROM usuario WHERE role='professor' ORDER BY login`);return sendSuccess(res,200,null,r.rows);}catch(e){return sendError(res,500,'Erro ao consultar professores.');}});

router.get('/:id',verifyToken,async(req,res)=>{try{const r=await pool.query(`SELECT a.id,a.nome,a.descricao,a.ativa,a.professor_id AS "professorId",u.login AS "professorNome" FROM atividade a JOIN usuario u ON u.id=a.professor_id WHERE a.id=$1`,[req.params.id]);if(!r.rows.length)return sendError(res,404,'Atividade não encontrada.');if(req.user.role==='professor'&&r.rows[0].professorId!==req.user.id)return sendError(res,403,'Você não comanda esta atividade.');return sendSuccess(res,200,null,r.rows[0]);}catch(e){return sendError(res,500,'Erro ao consultar atividade.');}});

router.post('/',verifyToken,professorOnly,async(req,res)=>{try{const {nome,descricao='',professorId}=req.body;const owner=req.user.role==='admin'?Number(professorId):req.user.id;if(!nome||!owner)return sendError(res,400,'Nome e professor são obrigatórios.');const p=await pool.query(`SELECT id FROM usuario WHERE id=$1 AND role='professor'`,[owner]);if(!p.rows.length)return sendError(res,400,'Professor inválido.');const r=await pool.query(`INSERT INTO atividade(nome,descricao,professor_id) VALUES($1,$2,$3) RETURNING id,nome,descricao,ativa,professor_id AS "professorId"`,[nome,descricao,owner]);return sendSuccess(res,201,'Atividade criada.',r.rows[0]);}catch(e){if(e.code==='23505')return sendError(res,409,'Já existe uma atividade com esse nome.');console.error(e);return sendError(res,500,'Erro ao criar atividade.');}});

router.put('/:id',verifyToken,professorOnly,async(req,res)=>{try{const current=await pool.query('SELECT professor_id FROM atividade WHERE id=$1',[req.params.id]);if(!current.rows.length)return sendError(res,404,'Atividade não encontrada.');if(req.user.role==='professor'&&current.rows[0].professor_id!==req.user.id)return sendError(res,403,'Você não comanda esta atividade.');const {nome,descricao,ativa=true,professorId}=req.body;const owner=req.user.role==='admin'?(professorId??current.rows[0].professor_id):req.user.id;const r=await pool.query(`UPDATE atividade SET nome=$1,descricao=$2,ativa=$3,professor_id=$4 WHERE id=$5 RETURNING id,nome,descricao,ativa,professor_id AS "professorId"`,[nome,descricao||'',ativa,owner,req.params.id]);return sendSuccess(res,200,'Atividade atualizada.',r.rows[0]);}catch(e){if(e.code==='23505')return sendError(res,409,'Já existe uma atividade com esse nome.');console.error(e);return sendError(res,500,'Erro ao atualizar atividade.');}});

router.delete('/:id',verifyToken,professorOnly,async(req,res)=>{try{const current=await pool.query('SELECT professor_id FROM atividade WHERE id=$1',[req.params.id]);if(!current.rows.length)return sendError(res,404,'Atividade não encontrada.');if(req.user.role==='professor'&&current.rows[0].professor_id!==req.user.id)return sendError(res,403,'Você não comanda esta atividade.');await pool.query('DELETE FROM atividade WHERE id=$1',[req.params.id]);return sendSuccess(res,200,'Atividade removida.');}catch(e){if(e.code==='23503')return sendError(res,409,'Não é possível remover uma atividade que possui turmas.');return sendError(res,500,'Erro ao remover atividade.');}});
module.exports=router;
