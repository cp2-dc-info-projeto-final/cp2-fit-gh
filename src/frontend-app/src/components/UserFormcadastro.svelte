<script lang="ts">
  // Formulário de usuário
  import { Card, Button, Label, Input, Heading, Select } from 'flowbite-svelte'; // UI
  import { onMount } from 'svelte'; // ciclo de vida
  import api from '$lib/api'; // API backend
  import type { ApiFieldError, ApiResponse } from '$lib/api';
  import { goto } from '$app/navigation'; // navegação
  import { ArrowLeftOutline, FloppyDiskAltOutline } from 'flowbite-svelte-icons'; // ícones
  import type { User, UserFormData } from '$lib/models/User';

  export let id: number | null = null; // id do usuário

  let user: UserFormData = { id: 0, login: '', email: '', senha: '', role: 'user', horario: '', dataNascimento: '' }; // dados do form

  // Opções de roles
  const roleOptions = [
    { value: 'user', name: 'Usuário' },
    { value: 'admin', name: 'Administrador' }
  ];
  let loading = false;
  let error = '';
  let fieldErrors: ApiFieldError[] = [];

  function errorOf(field: string): string | null {
    return fieldErrors.find((item) => item.field === field)?.message ?? null;
  }


  function calcularIdade(dataNascimento: string): number {
  const hoje = new Date();
  const nascimento = new Date(`${dataNascimento}T00:00:00`);

  let idade = hoje.getFullYear() - nascimento.getFullYear();

  const mes = hoje.getMonth() - nascimento.getMonth();

  if (
    mes < 0 ||
    (mes === 0 && hoje.getDate() < nascimento.getDate())
  ) {
    idade--;
  }

  return idade;
}


  // Submissão do formulário
  async function handleSubmit() {
    fieldErrors = [];

    // Validação de senha
    if (id === null && (!user.senha || user.senha.length < 6)) {
      fieldErrors = [{ field: 'senha', message: 'Senha deve ter pelo menos 6 caracteres.' }];
      error = 'Senha deve ter pelo menos 6 caracteres.';
      return;
    }
    
    if (id !== null && user.senha && user.senha.length < 6) {
      fieldErrors = [{ field: 'senha', message: 'Senha deve ter pelo menos 6 caracteres.' }];
      error = 'Senha deve ter pelo menos 6 caracteres.';
      return;
    }

    if (!user.dataNascimento) {
  fieldErrors = [
    { field: 'dataNascimento', message: 'Data de nascimento é obrigatória.' }
  ];
  error = 'Informe a data de nascimento.';
  return;
}

const idade = calcularIdade(user.dataNascimento);

if (idade < 18) {
  fieldErrors = [
    {
      field: 'dataNascimento',
      message: 'O usuário deve ter pelo menos 18 anos.'
    }
  ];
  error = 'O cadastro não pode ser realizado. O usuário deve ser maior de 18 anos.';
  return;
}

    loading = true;
    error = '';
    try {
      const userData = { ...user };

      // Remove senha vazia na edição para não sobrescrever indevidamente
      if (id !== null && !userData.senha) {
        delete userData.senha;
      }
      
      if (id === null) {
        const res = await api.post('/users/register', userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors;
          return;
        }
      } else {
        const res = await api.put(`/users/${id}`, userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors;
          return;
        }
      }
      goto('/users/');
    } catch (e: any) {
      const body = e.response?.data as ApiResponse<User> | undefined;
      error = body?.message || 'Erro ao salvar usuário.';
      fieldErrors = body?.errors || [];
    } finally {
      loading = false;
    }
  }

  function handleCancel() {
    goto('/users');
  }
</script>

<!-- Card do formulário -->
<Card class="max-w-md mx-auto mt-10 p-0 overflow-hidden shadow-lg border border-gray-200 rounded-lg">
  <!-- Formulário principal -->
  <form class="flex flex-col gap-6 p-6" on:submit|preventDefault={handleSubmit}>
    <!-- Título -->
    <Heading tag="h3" class="mb-2 text-center">
      {id === null ? 'Cadastrar Usuário' : 'Editar Usuário'}
    </Heading>
    <!-- Mensagem de erro -->
    {#if error}
      <div class="text-red-500 text-center">{error}</div>
    {/if}
    <!-- Campo login -->
    <div>
      <Label for="login">Login</Label>
      <Input id="login" bind:value={user.login} placeholder="Digite o login" required class="mt-1" />
      {#if errorOf('login')}
        <div class="mt-1 text-sm text-red-500">{errorOf('login')}</div>
      {/if}
    </div>
    <!-- Campo email -->
    <div>
      <Label for="email">Email</Label>
      <Input id="email" type="email" bind:value={user.email} placeholder="Digite o e-mail" required class="mt-1" />
      {#if errorOf('email')}
        <div class="mt-1 text-sm text-red-500">{errorOf('email')}</div>
      {/if}
    </div>
    <!-- Campo senha -->
    <div>
      <Label for="senha">Senha {id !== null ? '(deixe vazio para manter atual)' : ''}</Label>
      <Input 
        id="senha" 
        type="password" 
        bind:value={user.senha} 
        placeholder={id === null ? 'Digite a senha (mínimo 6 caracteres)' : 'Nova senha (opcional)'} 
        required={id === null}
        minlength={6}
        class="mt-1" 
      />
      {#if errorOf('senha')}
        <div class="mt-1 text-sm text-red-500">{errorOf('senha')}</div>
      {/if}
    </div>
    <!--horarios de disponibilidade-->

      <div>
        <Label for="horario">Horário</Label>
      
        <select
          id="horario"
          bind:value={user.horario}
          required
          class="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="" disabled>Selecione o horário</option>
          <option value="manha">Manhã</option>
          <option value="tarde">Tarde</option>
          <option value="noite">Noite</option>
        </select>
      </div>

      <!-- Campo data de nascimento -->
<div>
  <Label for="dataNascimento">Data de nascimento</Label>

  <Input
    id="dataNascimento"
    type="date"
    bind:value={user.dataNascimento}
    required
    class="mt-1"
  />

  {#if errorOf('dataNascimento')}
    <div class="mt-1 text-sm text-red-500">
      {errorOf('dataNascimento')}
    </div>
  {/if}
</div>

    <!-- Botões de ação -->
    <div class="flex gap-4 justify-end mt-4">
      <!-- Botão cancelar/voltar -->
      <Button color="light" type="button" onclick={handleCancel} disabled={loading}>
        <ArrowLeftOutline class="inline w-5 h-5 mr-2 align-text-bottom" />
        {id === null ? 'Voltar' : 'Cancelar'}
      </Button>
      <!-- Botão salvar -->
      <Button type="submit" color="primary" disabled={loading}>
        <FloppyDiskAltOutline class="inline w-5 h-5 mr-2 align-text-bottom" />
        {id === null ? 'Cadastrar' : 'Salvar'}
      </Button>

    </div>
  </form>
</Card>
