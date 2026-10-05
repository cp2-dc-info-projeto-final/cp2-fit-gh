const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const { verifyToken } = require('../middlewares/auth');

const sendSuccess = (res, status, message, data) =>
  res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    ...(data !== undefined ? { data } : {})
  });

const sendError = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

const manager = (req, res, next) =>
  ['admin', 'professor'].includes(req.user?.role)
    ? next()
    : sendError(res, 403, 'Acesso restrito a professores e administradores.');

const fields = `
  t.id,
  t.nome,
  t.atividade_id AS "atividadeId",
  a.nome AS "atividadeNome",
  t.professor_id AS "professorId",
  p.login AS "professorNome",
  t.dia_semana AS "diaSemana",
  t.horario_inicio AS "horarioInicio",
  t.horario_fim AS "horarioFim",
  t.vagas,
  t.ativa,
  COUNT(tu.usuario_id)::int AS "quantidadeAlunos"
`;

const base = `
  FROM turma t
  JOIN atividade a ON a.id = t.atividade_id
  JOIN usuario p ON p.id = t.professor_id
  LEFT JOIN turma_usuario tu ON tu.turma_id = t.id
`;

router.get('/publicas', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${fields},
        GREATEST(t.vagas - COUNT(tu.usuario_id), 0)::int AS "vagasRestantes",
        EXISTS (
          SELECT 1 FROM turma_usuario x
          WHERE x.turma_id = t.id AND x.usuario_id = $1
        ) AS "inscrito"
       ${base}
       WHERE t.ativa = true AND a.ativa = true
       GROUP BY t.id, a.nome, p.login
       ORDER BY a.nome, t.nome`,
      [req.user.id]
    );
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Erro ao listar turmas.');
  }
});

router.get('/minhas', verifyToken, manager, async (req, res) => {
  try {
    const params = [];
    let where = '';

    if (req.user.role === 'professor') {
      params.push(req.user.id);
      where = ' WHERE t.professor_id = $1';
    }

    const result = await pool.query(
      `SELECT ${fields} ${base}${where}
       GROUP BY t.id, a.nome, p.login
       ORDER BY a.nome, t.nome`,
      params
    );

    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Erro ao listar turmas.');
  }
});

router.get('/usuarios', verifyToken, manager, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, login, email
       FROM usuario
       WHERE role = 'user'
       ORDER BY login`
    );
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    return sendError(res, 500, 'Erro ao listar alunos.');
  }
});

router.get('/professores', verifyToken, manager, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, login, email
       FROM usuario
       WHERE role = 'professor'
       ORDER BY login`
    );
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    return sendError(res, 500, 'Erro ao listar professores.');
  }
});

router.get('/atividades', verifyToken, manager, async (req, res) => {
  try {
    const params = [];
    let where = 'WHERE ativa = true';

    if (req.user.role === 'professor') {
      params.push(req.user.id);
      where += ' AND professor_id = $1';
    }

    const result = await pool.query(
      `SELECT id, nome, professor_id AS "professorId"
       FROM atividade
       ${where}
       ORDER BY nome`,
      params
    );

    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    return sendError(res, 500, 'Erro ao listar atividades.');
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${fields}
       ${base}
       WHERE t.id = $1
       GROUP BY t.id, a.nome, p.login`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    if (
      req.user.role === 'professor' &&
      Number(result.rows[0].professorId) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Você não comanda esta turma.');
    }

    return sendSuccess(res, 200, null, result.rows[0]);
  } catch (error) {
    return sendError(res, 500, 'Erro ao consultar turma.');
  }
});

router.post('/', verifyToken, manager, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      nome,
      atividadeId,
      professorId,
      diaSemana,
      horarioInicio,
      horarioFim,
      vagas = 20,
      ativa = true,
      usuarioIds = []
    } = req.body;

    if (!nome || !atividadeId || !diaSemana || !horarioInicio || !horarioFim) {
      return sendError(res, 400, 'Nome, atividade, dia e horários são obrigatórios.');
    }

    const owner = req.user.role === 'professor'
      ? req.user.id
      : Number(professorId);

    if (!owner) {
      return sendError(res, 400, 'Professor é obrigatório.');
    }

    const activity = await client.query(
      `SELECT id, professor_id
       FROM atividade
       WHERE id = $1 AND ativa = true`,
      [atividadeId]
    );

    if (!activity.rows.length) {
      return sendError(res, 400, 'Atividade inválida ou inativa.');
    }

    if (
      req.user.role === 'professor' &&
      Number(activity.rows[0].professor_id) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Você só pode criar turmas das suas atividades.');
    }

    const professor = await client.query(
      `SELECT id FROM usuario WHERE id = $1 AND role = 'professor'`,
      [owner]
    );

    if (!professor.rows.length) {
      return sendError(res, 400, 'Professor inválido.');
    }

    if (!Number.isInteger(Number(vagas)) || Number(vagas) < 1 || Number(vagas) > 200) {
      return sendError(res, 400, 'O número de vagas deve estar entre 1 e 200.');
    }

    await client.query('BEGIN');

    const turma = await client.query(
      `INSERT INTO turma
        (nome, atividade_id, professor_id, dia_semana, horario_inicio, horario_fim, vagas, ativa)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [nome, atividadeId, owner, diaSemana, horarioInicio, horarioFim, Number(vagas), ativa]
    );

    for (const userId of Array.isArray(usuarioIds) ? usuarioIds : []) {
      await client.query(
        `INSERT INTO turma_usuario (turma_id, usuario_id)
         SELECT $1, id FROM usuario WHERE id = $2 AND role = 'user'
         ON CONFLICT DO NOTHING`,
        [turma.rows[0].id, userId]
      );
    }

    await client.query('COMMIT');

    return sendSuccess(res, 201, 'Turma criada.', { id: turma.rows[0].id });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return sendError(res, 409, 'Já existe uma turma com esse nome.');
    }

    if (error.code === '23503') {
      return sendError(res, 400, 'Atividade, professor ou aluno informado não existe.');
    }

    console.error(error);
    return sendError(res, 400, error.message || 'Erro ao criar turma.');
  } finally {
    client.release();
  }
});

router.put('/:id', verifyToken, manager, async (req, res) => {
  const client = await pool.connect();

  try {
    const current = await client.query(
      `SELECT professor_id, atividade_id, vagas
       FROM turma
       WHERE id = $1`,
      [req.params.id]
    );

    if (!current.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    if (
      req.user.role === 'professor' &&
      Number(current.rows[0].professor_id) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Você não comanda esta turma.');
    }

    const {
      nome,
      atividadeId,
      professorId,
      diaSemana,
      horarioInicio,
      horarioFim,
      vagas,
      ativa = true,
      usuarioIds = []
    } = req.body;

    const owner = req.user.role === 'professor'
      ? req.user.id
      : Number(professorId || current.rows[0].professor_id);

    const activity = await client.query(
      `SELECT id, professor_id
       FROM atividade
       WHERE id = $1 AND ativa = true`,
      [atividadeId]
    );

    if (!activity.rows.length) {
      return sendError(res, 400, 'Atividade inválida ou inativa.');
    }

    if (
      req.user.role === 'professor' &&
      Number(activity.rows[0].professor_id) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Atividade não pertence a você.');
    }

    const professor = await client.query(
      `SELECT id FROM usuario WHERE id = $1 AND role = 'professor'`,
      [owner]
    );

    if (!professor.rows.length) {
      return sendError(res, 400, 'Professor inválido.');
    }

    if (!nome || !diaSemana || !horarioInicio || !horarioFim || !Number.isInteger(Number(vagas))) {
      return sendError(res, 400, 'Nome, atividade, dia, horários e vagas são obrigatórios.');
    }

    if (Number(vagas) < 1 || Number(vagas) > 200) {
      return sendError(res, 400, 'O número de vagas deve estar entre 1 e 200.');
    }

    await client.query('BEGIN');

    const enrolled = await client.query(
      `SELECT COUNT(*)::int AS quantidade
       FROM turma_usuario
       WHERE turma_id = $1`,
      [req.params.id]
    );

    if (Number(vagas) < Number(enrolled.rows[0].quantidade)) {
      await client.query('ROLLBACK');
      return sendError(
        res,
        409,
        `A turma já possui ${enrolled.rows[0].quantidade} aluno(s); as vagas não podem ser menores que essa quantidade.`
      );
    }

    await client.query(
      `UPDATE turma
       SET nome = $1,
           atividade_id = $2,
           professor_id = $3,
           dia_semana = $4,
           horario_inicio = $5,
           horario_fim = $6,
           vagas = $7,
           ativa = $8
       WHERE id = $9`,
      [nome, atividadeId, owner, diaSemana, horarioInicio, horarioFim, Number(vagas), ativa, req.params.id]
    );

    if (Array.isArray(usuarioIds)) {
      await client.query('DELETE FROM turma_usuario WHERE turma_id = $1', [req.params.id]);

      for (const userId of usuarioIds) {
        await client.query(
          `INSERT INTO turma_usuario (turma_id, usuario_id)
           SELECT $1, id FROM usuario WHERE id = $2 AND role = 'user'
           ON CONFLICT DO NOTHING`,
          [req.params.id, userId]
        );
      }
    }

    await client.query('COMMIT');
    return sendSuccess(res, 200, 'Turma atualizada.');
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return sendError(res, 409, 'Já existe uma turma com esse nome.');
    }

    console.error(error);
    return sendError(res, 400, error.message || 'Erro ao atualizar turma.');
  } finally {
    client.release();
  }
});

router.delete('/:id', verifyToken, manager, async (req, res) => {
  try {
    const current = await pool.query(
      'SELECT professor_id FROM turma WHERE id = $1',
      [req.params.id]
    );

    if (!current.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    if (
      req.user.role === 'professor' &&
      Number(current.rows[0].professor_id) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Você não comanda esta turma.');
    }

    await pool.query('DELETE FROM turma WHERE id = $1', [req.params.id]);
    return sendSuccess(res, 200, 'Turma removida.');
  } catch (error) {
    return sendError(res, 500, 'Erro ao remover turma.');
  }
});

router.get('/:id/alunos', verifyToken, manager, async (req, res) => {
  try {
    const owner = await pool.query(
      'SELECT professor_id FROM turma WHERE id = $1',
      [req.params.id]
    );

    if (!owner.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    if (
      req.user.role === 'professor' &&
      Number(owner.rows[0].professor_id) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Você não comanda esta turma.');
    }

    const result = await pool.query(
      `SELECT u.id, u.login, u.email, tu.inscrito_em AS "inscritoEm"
       FROM turma_usuario tu
       JOIN usuario u ON u.id = tu.usuario_id
       WHERE tu.turma_id = $1
       ORDER BY u.login`,
      [req.params.id]
    );

    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    return sendError(res, 500, 'Erro ao listar alunos.');
  }
});

router.post('/:id/inscricao', verifyToken, async (req, res) => {
  if (req.user.role !== 'user') {
    return sendError(res, 403, 'Somente alunos podem realizar inscrições.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const turma = await client.query(
      `SELECT t.vagas, t.ativa, a.ativa AS "atividadeAtiva"
       FROM turma t
       JOIN atividade a ON a.id = t.atividade_id
       WHERE t.id = $1
       FOR UPDATE OF t`,
      [req.params.id]
    );

    if (!turma.rows.length) {
      await client.query('ROLLBACK');
      return sendError(res, 404, 'Turma não encontrada.');
    }

    const current = turma.rows[0];

    if (!current.ativa || !current.atividadeAtiva) {
      await client.query('ROLLBACK');
      return sendError(res, 400, 'Esta turma não está disponível para inscrição.');
    }

    const exists = await client.query(
      `SELECT 1 FROM turma_usuario WHERE turma_id = $1 AND usuario_id = $2`,
      [req.params.id, req.user.id]
    );

    if (exists.rows.length) {
      await client.query('ROLLBACK');
      return sendError(res, 409, 'Você já está inscrito nesta turma.');
    }

    const count = await client.query(
      `SELECT COUNT(*)::int AS inscritos
       FROM turma_usuario
       WHERE turma_id = $1`,
      [req.params.id]
    );

    if (Number(count.rows[0].inscritos) >= Number(current.vagas)) {
      await client.query('ROLLBACK');
      return sendError(res, 409, 'Não há vagas disponíveis.');
    }

    await client.query(
      `INSERT INTO turma_usuario (turma_id, usuario_id)
       VALUES ($1, $2)`,
      [req.params.id, req.user.id]
    );

    await client.query('COMMIT');
    return sendSuccess(res, 201, 'Inscrição realizada com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return sendError(res, 409, 'Você já está inscrito nesta turma.');
    }

    console.error(error);
    return sendError(res, 500, 'Erro ao realizar inscrição.');
  } finally {
    client.release();
  }
});

router.delete('/:id/inscricao', verifyToken, async (req, res) => {
  if (req.user.role !== 'user') {
    return sendError(res, 403, 'Somente alunos podem cancelar inscrições.');
  }

  try {
    const result = await pool.query(
      `DELETE FROM turma_usuario
       WHERE turma_id = $1 AND usuario_id = $2
       RETURNING turma_id`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      return sendError(res, 404, 'Inscrição não encontrada.');
    }

    return sendSuccess(res, 200, 'Inscrição cancelada.');
  } catch (error) {
    return sendError(res, 500, 'Erro ao cancelar inscrição.');
  }
});

router.post('/:id/alunos/:usuarioId', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return sendError(res, 403, 'Somente administradores podem adicionar alunos manualmente.');
  }

  try {
    const turma = await pool.query(
      'SELECT vagas FROM turma WHERE id = $1',
      [req.params.id]
    );

    if (!turma.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    const aluno = await pool.query(
      `SELECT id FROM usuario WHERE id = $1 AND role = 'user'`,
      [req.params.usuarioId]
    );

    if (!aluno.rows.length) {
      return sendError(res, 400, 'Aluno inválido.');
    }

    const count = await pool.query(
      `SELECT COUNT(*)::int AS inscritos FROM turma_usuario WHERE turma_id = $1`,
      [req.params.id]
    );

    if (Number(count.rows[0].inscritos) >= Number(turma.rows[0].vagas)) {
      return sendError(res, 409, 'Não há vagas disponíveis.');
    }

    await pool.query(
      `INSERT INTO turma_usuario (turma_id, usuario_id)
       VALUES ($1, $2)`,
      [req.params.id, req.params.usuarioId]
    );

    return sendSuccess(res, 201, 'Aluno adicionado à turma.');
  } catch (error) {
    if (error.code === '23505') {
      return sendError(res, 409, 'Aluno já está inscrito nesta turma.');
    }

    return sendError(res, 500, 'Erro ao adicionar aluno.');
  }
});

router.delete('/:id/alunos/:usuarioId', verifyToken, manager, async (req, res) => {
  try {
    const turma = await pool.query(
      'SELECT professor_id FROM turma WHERE id = $1',
      [req.params.id]
    );

    if (!turma.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    if (
      req.user.role === 'professor' &&
      Number(turma.rows[0].professor_id) !== Number(req.user.id)
    ) {
      return sendError(res, 403, 'Você não comanda esta turma.');
    }

    await pool.query(
      `DELETE FROM turma_usuario
       WHERE turma_id = $1 AND usuario_id = $2`,
      [req.params.id, req.params.usuarioId]
    );

    return sendSuccess(res, 200, 'Aluno removido da turma.');
  } catch (error) {
    return sendError(res, 500, 'Erro ao remover aluno.');
  }
});

router.put('/:id/professor/:professorId', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return sendError(res, 403, 'Somente administradores podem alterar o professor da turma.');
  }

  try {
    const professor = await pool.query(
      `SELECT id FROM usuario WHERE id = $1 AND role = 'professor'`,
      [req.params.professorId]
    );

    if (!professor.rows.length) {
      return sendError(res, 400, 'Professor inválido.');
    }

    const result = await pool.query(
      `UPDATE turma
       SET professor_id = $1
       WHERE id = $2
       RETURNING id, professor_id AS "professorId"`,
      [req.params.professorId, req.params.id]
    );

    if (!result.rows.length) {
      return sendError(res, 404, 'Turma não encontrada.');
    }

    return sendSuccess(res, 200, 'Professor da turma atualizado.', result.rows[0]);
  } catch (error) {
    return sendError(res, 500, 'Erro ao alterar professor da turma.');
  }
});

module.exports = router;
