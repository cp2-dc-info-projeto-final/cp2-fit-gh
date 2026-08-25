export interface User {
  id: number;
  login: string;
  email: string;
  horario: string;
  role: string;

}

export interface UserFormData {
  id: number;
  login: string;
  email: string;
  senha?: string;
  horario: string;
  dataNascimento: string;
  role: string;

}
