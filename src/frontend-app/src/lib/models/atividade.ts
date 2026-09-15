export interface atividade {
    nome: string;
    atividade_id: number;
    professor_id: number;
    dia_semana: string;
    horario_inicio: number;
    horario_fim: number;
    vagas: number;
}

export interface UserFormData {
    nome: string;
    atividade_id: number;
    professor_id: number;
    dia_semana: string;
    horario_inicio: number;
    horario_fim: number;
    vagas: number;
}