DROP TABLE IF EXISTS turma_usuario CASCADE;
DROP TABLE IF EXISTS turma CASCADE;
DROP TABLE IF EXISTS atividade CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;

CREATE TABLE usuario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    login TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    dataNascimento DATE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    CONSTRAINT ck_usuario_role CHECK (role IN ('admin', 'user', 'professor')),
    CONSTRAINT ck_usuario_login CHECK (length(login) BETWEEN 3 AND 50),
    CONSTRAINT ck_usuario_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE TABLE atividade (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    professor_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE turma (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    atividade_id BIGINT NOT NULL REFERENCES atividade(id) ON DELETE RESTRICT,
    professor_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    dia_semana TEXT NOT NULL,
    horario_inicio TIME NOT NULL,
    horario_fim TIME NOT NULL,
    vagas INTEGER NOT NULL DEFAULT 20,
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_turma_dia CHECK (dia_semana IN ('segunda','terca','quarta','quinta','sexta','sabado')),
    CONSTRAINT ck_turma_horario CHECK (horario_fim > horario_inicio),
    CONSTRAINT ck_turma_vagas CHECK (vagas BETWEEN 1 AND 200)
);

CREATE TABLE turma_usuario (
    turma_id BIGINT NOT NULL REFERENCES turma(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    inscrito_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (turma_id, usuario_id)
);

CREATE INDEX idx_atividade_professor ON atividade(professor_id);
CREATE INDEX idx_turma_atividade ON turma(atividade_id);
CREATE INDEX idx_turma_professor ON turma(professor_id);
CREATE INDEX idx_turma_usuario_usuario ON turma_usuario(usuario_id);

INSERT INTO usuario (login, email, senha, dataNascimento, role) VALUES
('hermenegildo', 'hermenegildo@email.com', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG', '1980-08-08', 'admin'),
('zoroastra', 'zoroastra@email.com', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG', '2000-07-09', 'user'),
('professor', 'professor@cp2fit.local', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG', '1985-05-10', 'professor');

INSERT INTO atividade (nome, descricao, professor_id) VALUES
('Treino funcional', 'Atividade coletiva de condicionamento físico.', 3),
('Corrida', 'Treino coletivo de corrida e resistência.', 3);

INSERT INTO turma (nome, atividade_id, professor_id, dia_semana, horario_inicio, horario_fim, vagas) VALUES
('Funcional A', 1, 3, 'segunda', '08:00', '09:00', 20),
('Corrida A', 2, 3, 'quarta', '16:00', '17:00', 15);
