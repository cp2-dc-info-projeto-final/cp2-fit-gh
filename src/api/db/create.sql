DROP TABLE IF EXISTS usuario;

CREATE TABLE usuario (
    id bigint GENERATED ALWAYS AS IDENTITY,
    login text NOT NULL,
    email text NOT NULL,
    senha text NOT NULL,
    horario text NOT NULL DEFAULT 'manhã',
    dataNascimento TEXT NOT NULL,
    role text NOT NULL DEFAULT 'user',

    
    -- Constraints
    CONSTRAINT pk_usuario PRIMARY KEY (id),
    CONSTRAINT uk_usuario_login UNIQUE (login), -- unicidade
    CONSTRAINT uk_usuario_email UNIQUE (email), -- unicidade
    CONSTRAINT ck_usuario_login_length CHECK (length(login) >= 3 AND length(login) <= 50), -- comprimento
    CONSTRAINT ck_usuario_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), -- formato de email com expressão regular
    CONSTRAINT ck_usuario_senha_length CHECK (length(senha) >= 6), -- comprimento mínimo
    CONSTRAINT ck_usuario_horario_valid CHECK (horario IN ('manha','tarde','noite')), -- tipos de usuário
    CONSTRAINT ck_usuario_dataNascimento_format CHECK (dataNascimento ~* '^\d{4}-\d{2}-\d{2}$'),
    CONSTRAINT ck_usuario_role_valid CHECK (role IN ('admin', 'user', 'professor')) -- tipos de usuário
);

INSERT INTO usuario (login, email, senha, horario,dataNascimento, role ) VALUES
-- senha efelantinho
('hermenegildo', 'hermenegildo@email.com', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG','manha','1980-08-08', 'admin'),
('zoroastra', 'zoroastra@email.com', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG','noite','2000-07-09', 'user');
