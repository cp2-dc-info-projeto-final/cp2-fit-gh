export interface User {
  id: number;
  login: string;
  email: string;
  datanascimento: string;
  role: string;
  atividade?: string;
}

export interface UserFormData {
  id: number;
  login: string;
  email: string;
  senha?: string;
  dataNascimento: string;
  role: string;

}

export interface UserAtividade {
  id: number;
  login: string;
  email: string;
  datanascimento: string;
  atividade: string;
  role: User;
}
