var express = require('express');
var router = express.Router();
const pool = require('../db/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, isAdmin } = require('../middlewares/auth');

function sendSuccess(res, status, message, data) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (typeof data !== 'undefined') payload.data = data;
  return res.status(status).json(payload);
}

function sendError(res, status, message, errors = []) {
  return res.status(status).json({
    success: false,
    message,
    errors
  });
}

/* GET - Buscar todos os usuários (com filtro opcional por login) */
router.get('/', verifyToken, isAdmin, async function(req, res) {
  try {
    const { login } = req.query;

    let query = 'SELECT id, login, email, horario, dataNascimento, role FROM usuario';
    let params = [];

    if (login && login.trim() !== '') {
      query += ' WHERE login ILIKE $1';
      params.push(`%${login}%`);
    }

    query += ' ORDER BY id';

    const result = await pool.query(query, params);
    console.log(result.rows)
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET - Buscar usuário autenticado */
router.get('/me', verifyToken, async function(req, res) {
  try {
    const id = req.user.id;
    const result = await pool.query(
      'SELECT id, login, email, horario, dataNascimento, role FROM usuario WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    return sendSuccess(res, 200, null, result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET - Buscar usuário por ID */
router.get('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, login, email, horario, dataNascimento, role FROM usuario WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    return sendSuccess(res, 200, null, result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* POST - Criar novo usuário */
router.post('/', verifyToken, isAdmin, async function(req, res) {
  try {
    const { login, email, senha, horario, dataNascimento, role = 'user' } = req.body;
    
    // Validação básica
    if (!login || !email || !senha ) {
      const errors = [];
      if (!login) errors.push({ field: 'login', message: 'Login é obrigatório', code: 'REQUIRED' });
      if (!email) errors.push({ field: 'email', message: 'Email é obrigatório', code: 'REQUIRED' });
      if (!senha) errors.push({ field: 'senha', message: 'Senha é obrigatória', code: 'REQUIRED' });

      return sendError(res, 400, 'Login, email, senha são obrigatórios', errors);
    }
    
    // Verificar se o login já existe
    const existingUser = await pool.query('SELECT id FROM usuario WHERE login = $1', [login]);
    if (existingUser.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [
        { field: 'login', message: 'Login já está em uso', code: 'CONFLICT' }
      ]);
    }

    // Verificar se o email já existe
    const existingEmail = await pool.query('SELECT id FROM usuario WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [
        { field: 'email', message: 'Email já está em uso', code: 'CONFLICT' }
      ]);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 12);

    const result = await pool.query(
      'INSERT INTO usuario (login, email, senha, horario, dataNascimento, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, login, email, horario,dataNascimento, role',
      [login, email, hashedPassword, horario,dataNascimento, role]
    );

    return sendSuccess(res, 201, 'Usuário criado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    // Verificar se é erro de constraint
    if (error.code === '23514') {
      return sendError(res, 400, 'Dados inválidos. Verifique os campos e tente novamente.');
    }
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

router.post('/me', verifyToken, async function(req, res) {
  try {
    const { login, email, senha, horario, dataNascimento, role = 'user' } = req.body;
    
    // Validação básica
    if (!login || !email || !senha ) {
      const errors = [];
      if (!login) errors.push({ field: 'login', message: 'Login é obrigatório', code: 'REQUIRED' });
      if (!email) errors.push({ field: 'email', message: 'Email é obrigatório', code: 'REQUIRED' });
      if (!senha) errors.push({ field: 'senha', message: 'Senha é obrigatória', code: 'REQUIRED' });

      return sendError(res, 400, 'Login, email, senha são obrigatórios', errors);
    }
    
    // Verificar se o login já existe
    const existingUser = await pool.query('SELECT id FROM usuario WHERE login = $1', [login]);
    if (existingUser.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [
        { field: 'login', message: 'Login já está em uso', code: 'CONFLICT' }
      ]);
    }

    // Verificar se o email já existe
    const existingEmail = await pool.query('SELECT id FROM usuario WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [
        { field: 'email', message: 'Email já está em uso', code: 'CONFLICT' }
      ]);
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(senha, 12);

    const result = await pool.query(
      'INSERT INTO usuario (login, email, senha, horario,dataNascimento, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, login, email, horario, dataNascimento, role',
      [login, email, hashedPassword, horario, dataNascimento, role]
    );

    return sendSuccess(res, 201, 'Usuário criado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    // Verificar se é erro de constraint
    if (error.code === '23514') {
      return sendError(res, 400, 'Dados inválidos. Verifique os campos e tente novamente.');
    }
    return sendError(res, 500, 'Erro interno do servidor');
  }
});



/* POST - Cadastro público */
router.post('/register', async function(req, res) {
  try {
    const { login, email, senha, horario, dataNascimento } = req.body;

    const errors = [];

    if (!login) {
      errors.push({
        field: 'login',
        message: 'Login é obrigatório'
      });
    }

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email é obrigatório'
      });
    }

    if (!senha) {
      errors.push({
        field: 'senha',
        message: 'Senha é obrigatória'
      });
    }
    if (!horario) {
      errors.push({
        field: 'horario',
        message: 'horario é obrigatória'
      });
    }

    if (!dataNascimento) {
      errors.push({
        field: 'dataNascimento',
        message: 'data de nascimento é obrigatória'
      });
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Dados inválidos', errors);
    }

    const loginExists = await pool.query(
      'SELECT id FROM usuario WHERE login = $1',
      [login]
    );

    if (loginExists.rows.length > 0) {
      return sendError(res, 409, 'Login já existe', [
        {
          field: 'login',
          message: 'Login já existe'
        }
      ]);
    }

    const emailExists = await pool.query(
      'SELECT id FROM usuario WHERE email = $1',
      [email]
    );

    if (emailExists.rows.length > 0) {
      return sendError(res, 409, 'Email já existe', [
        {
          field: 'email',
          message: 'Email já existe'
        }
      ]);
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const result = await pool.query(
      `
      INSERT INTO usuario
      (login, email, senha, horario, dataNascimento,role)
      VALUES ($1, $2, $3, $4, $5, 'user')
      RETURNING id, login, email, horario, dataNascimento, role
      `,
      [login, email, senhaHash, horario, dataNascimento]
    );

    return sendSuccess(
      res,
      201,
      'Usuário cadastrado com sucesso',
      result.rows[0]
    );

  } catch (error) {
    console.error(error);

    return sendError(
      res,
      500,
      'Erro interno do servidor'
    );
  }
});

/* POST - Login */
router.post('/login', async function(req, res) {
  try {
    const { login, password } = req.body;

    const result = await pool.query(`
      SELECT id, login, email, senha as passwordHash, horario, dataNascimento, role
      FROM usuario
      WHERE login = $1
    `, [login]);

    if (result.rows.length === 0) {
      return sendError(res, 401, 'Credenciais inválidas');
    }

    const user = result.rows[0];

    bcrypt.compare(password, user.passwordhash, (err, isMatch) => {
      if (err) {
        console.error('Erro no bcrypt:', err);
        return sendError(res, 500, 'Erro interno do servidor');
      }

      if (!isMatch) {
        return sendError(res, 401, 'Credenciais inválidas');
      }

      const token = jwt.sign(
        {
          id: user.id,
          login: user.login,
          email: user.email,
          horario: user.horario,
          dataNascimento: user.dataNascimento,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return sendSuccess(res, 200, 'Autenticado com sucesso!', { token });
    });

  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});



// atualiza usuario ele mesmo
router.put('/me', verifyToken, async function (req, res) {
  try {
    const id  = req.user.id;
    console.log(id);
    const { login, email, senha, horario, dataNascimento, role } = req.body;

    // Validação
    const errors = [];

    if (!login) {
      errors.push({
        field: 'login',
        message: 'Login é obrigatório',
        code: 'REQUIRED'
      });
    }

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email é obrigatório',
        code: 'REQUIRED'
      });
    }
    if (!horario) {
      errors.push({
        field: 'horario',
        message: 'Horário é obrigatório',
        code: 'REQUIRED'
      });
    }
    if (!dataNascimento) {
      errors.push({
        field: 'dataNascimento',
        message: 'data de nascimento é obrigatória',
        code: 'REQUIRED'
      });
    }
    if (!role) {
      errors.push({
        field: 'role',
        message: 'Perfil é obrigatório',
        code: 'REQUIRED'
      });
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Dados inválidos', errors);
    }

    // Verifica se o usuário existe
    const userExists = await pool.query(
      'SELECT id FROM usuario WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    // Verifica login duplicado
    const loginExists = await pool.query(
      'SELECT id FROM usuario WHERE login = $1 AND id <> $2',
      [login, id]
    );

    if (loginExists.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [
        {
          field: 'login',
          message: 'Login já está em uso',
          code: 'CONFLICT'
        }
      ]);
    }

    // Verifica email duplicado
    const emailExists = await pool.query(
      'SELECT id FROM usuario WHERE email = $1 AND id <> $2',
      [email, id]
    );

    if (emailExists.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [
        {
          field: 'email',
          message: 'Email já está em uso',
          code: 'CONFLICT'
        }
      ]);
    }

    let result;

    // Atualiza com senha nova
    if (senha && senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(senha, 12);

      result = await pool.query(
        `UPDATE usuario
         SET login = $1,
             email = $2,
             senha = $3,
             horario = $4,
             dataNascimento = $5,
             role = $6
         WHERE id = $7
         RETURNING id, login, email, horario, dataNascimento, role`,
        [login, email, senhaHash, horario, dataNascimento, role, id]
      );
    } else {
      // Atualiza sem alterar senha
      result = await pool.query(
        `UPDATE usuario
         SET login = $1,
             email = $2,
             horario = $3,
             dataNascimento = $4,
             role = $5
         WHERE id = $6
         RETURNING id, login, email, horario,dataNascimento, role`,
        [login, email, horario, dataNascimento, role, id]
      );
    }

    return sendSuccess(
      res,
      200,
      'Usuário atualizado com sucesso',
      result.rows[0]
    );

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});


/* PUT - Atualizar usuário */
router.put('/:id', verifyToken, isAdmin, async function (req, res) {
  try {
    const { id } = req.params;
    const { login, email, senha, horario, dataNascimento, role } = req.body;

    // Validação
    const errors = [];

    if (!login) {
      errors.push({
        field: 'login',
        message: 'Login é obrigatório',
        code: 'REQUIRED'
      });
    }

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email é obrigatório',
        code: 'REQUIRED'
      });
    }
    if (!horario) {
      errors.push({
        field: 'horario',
        message: 'Horário é obrigatório',
        code: 'REQUIRED'
      });
    }
    if (!dataNascimento) {
      errors.push({
        field: 'dataNascimento',
        message: 'data de nascimento é obrigatória',
        code: 'REQUIRED'
      });
    }
    if (!role) {
      errors.push({
        field: 'role',
        message: 'Perfil é obrigatório',
        code: 'REQUIRED'
      });
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Dados inválidos', errors);
    }

    // Verifica se o usuário existe
    const userExists = await pool.query(
      'SELECT id FROM usuario WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    // Verifica login duplicado
    const loginExists = await pool.query(
      'SELECT id FROM usuario WHERE login = $1 AND id <> $2',
      [login, id]
    );

    if (loginExists.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [
        {
          field: 'login',
          message: 'Login já está em uso',
          code: 'CONFLICT'
        }
      ]);
    }

    // Verifica email duplicado
    const emailExists = await pool.query(
      'SELECT id FROM usuario WHERE email = $1 AND id <> $2',
      [email, id]
    );

    if (emailExists.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [
        {
          field: 'email',
          message: 'Email já está em uso',
          code: 'CONFLICT'
        }
      ]);
    }

    let result;

    // Atualiza com senha nova
    if (senha && senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(senha, 12);

      result = await pool.query(
        `UPDATE usuario
         SET login = $1,
             email = $2,
             senha = $3,
             horario = $4,
             dataNascimento = $5,
             role = $6
         WHERE id = $7
         RETURNING id, login, email, horario, dataNascimento, role`,
        [login, email, senhaHash, horario, dataNascimento, role, id]
      );
    } else {
      // Atualiza sem alterar senha
      result = await pool.query(
        `UPDATE usuario
         SET login = $1,
             email = $2,
             horario = $3,
             dataNascimento = $4,
             role = $5
         WHERE id = $6
         RETURNING id, login, email, horario, dataNascimento, role`,
        [login, email, horario, dataNascimento, role, id]
      );
    }

    return sendSuccess(
      res,
      200,
      'Usuário atualizado com sucesso',
      result.rows[0]
    );

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});


/* PUT - Atualizar usuário por ele mesmo */
router.put('/:me', verifyToken, async function (req, res) {
  try {

    const { login, email, senha, horario, dataNascimento, role } = req.body;

    // Validação
    const errors = [];

    if (!login) {
      errors.push({
        field: 'login',
        message: 'Login é obrigatório',
        code: 'REQUIRED'
      });
    }

    if (!email) {
      errors.push({
        field: 'email',
        message: 'Email é obrigatório',
        code: 'REQUIRED'
      });
    }
    if (!horario) {
      errors.push({
        field: 'horario',
        message: 'Horário é obrigatório',
        code: 'REQUIRED'
      });
      if (!dataNascimento) {
        errors.push({
          field: 'dataNascimento',
          message: 'data de nascimento é obrigatória',
          code: 'REQUIRED'
        });
      }
    }
    if (!role) {
      errors.push({
        field: 'role',
        message: 'Perfil é obrigatório',
        code: 'REQUIRED'
      });
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Dados inválidos', errors);
    }




    // Verifica login duplicado
    const loginExists = await pool.query(
      'SELECT id FROM usuario WHERE login = $1 AND id <> $2',
      [login, id]
    );

    if (loginExists.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [
        {
          field: 'login',
          message: 'Login já está em uso',
          code: 'CONFLICT'
        }
      ]);
    }

    // Verifica email duplicado
    const emailExists = await pool.query(
      'SELECT id FROM usuario WHERE email = $1 AND id <> $2',
      [email, id]
    );

    if (emailExists.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [
        {
          field: 'email',
          message: 'Email já está em uso',
          code: 'CONFLICT'
        }
      ]);
    }

    let result;

    // Atualiza com senha nova
    if (senha && senha.trim() !== '') {
      const senhaHash = await bcrypt.hash(senha, 12);

      result = await pool.query(
        `UPDATE usuario
         SET login = $1,
             email = $2,
             senha = $3,
             horario = $4,
             dataNascimento = $5,
             role = $6
         RETURNING id, login, email, horario, dataNascimento, role`,
        [login, email, senhaHash, horario, dataNascimento, role]
      );
    } else {
      // Atualiza sem alterar senha
      result = await pool.query(
        `UPDATE usuario
         SET login = $1,
             email = $2,
             horario = $3,
             dataNascimento = $4,
             role = $5
         RETURNING id, login, email, horario, dataNascimento, role`,
        [login, email, horario, dataNascimento, role]
      );
    }

    return sendSuccess(
      res,
      200,
      'Usuário atualizado com sucesso',
      result.rows[0]
    );

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* DELETE - Remover usuário */
router.delete('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;

    const userExists = await pool.query(
      'SELECT id FROM usuario WHERE id = $1',
      [id]
    );

    if (userExists.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    await pool.query('DELETE FROM usuario WHERE id = $1', [id]);

    return sendSuccess(res, 200, 'Usuário deletado com sucesso');

  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

module.exports = router;
