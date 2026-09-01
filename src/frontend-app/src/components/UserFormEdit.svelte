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

  let user: UserFormData = { id: 0, login: '', email: '', senha: '',horario: '',dataNascimento: '', role: 'user' }; // dados do form
  
  // Opções de roles
  const roleOptions = [
    { value: 'user', name: 'Usuário' },
    { value: 'admin', name: 'Administrador' }
  ];
    // Opções de horario
    const horarioOptions = [
    { value: 'manha', name: 'Manhã' },
    { value: 'tarde', name: 'Tarde' },
    { value: 'noite', name: 'Noite' }
  ];
  let loading = false;
  let error = '';
  let fieldErrors: ApiFieldError[] = [];

  function errorOf(field: string): string | null {
    return fieldErrors.find((item) => item.field === field)?.message ?? null;
  }

  // Carrega usuário se for edição
  onMount(async () => {
    //if (id !== null) {
      loading = true;
      try {
        const res = await api.get(`/users/me`);
        const body = res.data as ApiResponse<User>;
          console.log(body);
        if (body.success && body.data) {
          user = { ...body.data, senha: '' }; // não carrega senha na edição
        } else {
          error = body.message;
        }
      } catch (e: any) {
        const body = e.response?.data as ApiResponse<User> | undefined;
        error = body?.message || 'Erro ao carregar usuário.';
      } finally {
        loading = false;
      }
   // } 
  });

  // Submissão do formulário
  async function handleSubmit() {
    fieldErrors = [];

    // Validação de senha
    if ((user.senha && user.senha.length < 6)) {
      fieldErrors = [{ field: 'senha', message: 'Senha deve ter pelo menos 6 caracteres.' }];
      error = 'Senha deve ter pelo menos 6 caracteres.';
      return;
    }
    
    if (id !== null && user.senha && user.senha.length < 6) {
      fieldErrors = [{ field: 'senha', message: 'Senha deve ter pelo menos 6 caracteres.' }];
      error = 'Senha deve ter pelo menos 6 caracteres.';
      return;
    }

    loading = true;
    error = '';
    try {
      const userData = { ...user };
      // Remove senha vazia na edição para não sobrescrever indevidamente
      if (!userData.senha) {
        delete userData.senha;
      }
      
 
        const res = await api.put(`/users/me`, userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors;
          return;
        }
      
      goto('/users');
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
    <Heading tag="h3" class="mb-2 text-center"> Editar Usuario
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
      <Label for="senha">Senha {'(deixe vazio para manter atual)'}</Label>
      <Input 
        id="senha" 
        type="password" 
        bind:value={user.senha} 
        placeholder={'Nova senha (opcional)'} 
        class="mt-1" 
      />
      {#if errorOf('senha')}
        <div class="mt-1 text-sm text-red-500">{errorOf('senha')}</div>
      {/if}
    </div>

     <!-- Campo horario -->
     <div>
      <Label for="horario">Horário</Label>
      <Select id="horario" bind:value={user.horario} items={horarioOptions} class="mt-1" />
      {#if errorOf('horario')}
        <div class="mt-1 text-sm text-red-500">{errorOf('horario')}</div>
      {/if}
    </div>
    <!-- Botões de ação -->
    <div class="flex gap-4 justify-end mt-4">
      <!-- Botão cancelar/voltar -->
      <Button color="light" type="button" onclick={handleCancel} disabled={loading}>
        <ArrowLeftOutline class="inline w-5 h-5 mr-2 align-text-bottom" /> Cancelar
      </Button>
      <!-- Botão salvar -->
      <Button type="submit" color="primary" disabled={loading}>
        <FloppyDiskAltOutline class="inline w-5 h-5 mr-2 align-text-bottom" /> Salvar
      </Button>
    </div>
  </form>
</Card>
