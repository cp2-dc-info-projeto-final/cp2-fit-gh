<script lang="ts">
  import {
    Table,
    TableHead,
    TableHeadCell,
    TableBody,
    TableBodyRow,
    TableBodyCell
  } from 'flowbite-svelte';

  import {
    UserEditOutline,
    TrashBinOutline
  } from 'flowbite-svelte-icons';

  import ConfirmModal from './ConfirmModal.svelte';

  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  import api from '$lib/api';
  import type { ApiResponse } from '$lib/api';
	import type { User } from '$lib/auth';


  // =========================================================
  // INTERFACE DO USUÁRIO
  // =========================================================

  interface UserAtividade {id: number;login: string;email: string;datanascimento: string;role: User;atividade: string;}


  // =========================================================
  // ESTADOS
  // =========================================================

let users: UserAtividade[] = [];
let loading = true;
let error = '';
let filtro = '';
let deletingId: number | null = null;
let confirmOpen = false;

let confirmTargetId: number | null = null;


  // =========================================================
  // CARREGAR USUÁRIOS
  // =========================================================

  async function carregaUsuarios() {
    try {
      loading = true;
      error = '';

      const response = await api.get(
        `/users/prof?login=${encodeURIComponent(filtro)}`
      );

      const body =
        response.data as ApiResponse<UserAtividade[]>;

      if (body.success) {
        users = body.data ?? [];
      } else {
        users = [];

        error =
          body.message ||
          'Não foi possível carregar os usuários.';
      }

    } catch (err: any) {

      console.error(
        'Erro ao carregar usuários:',
        err
      );

      users = [];

      error =
        err.response?.data?.message ||
        'Erro ao carregar usuários.';

    } finally {
      loading = false;
    }
  }


  // =========================================================
  // FILTRO
  // =========================================================

  async function filtraUsuarios() {
    await carregaUsuarios();
  }


  // =========================================================
  // FORMATAR DATA
  // =========================================================

  function formatarData(data: string) {
    if (!data) {
      return '-';
    }

    const dataLimpa = data.split('T')[0];

    const partes = dataLimpa.split('-');

    if (partes.length !== 3) {
      return data;
    }

    const [ano, mes, dia] = partes;

    return `${dia}/${mes}/${ano}`;
  }



  // =========================================================
  // CARREGAR AO ABRIR A PÁGINA
  // =========================================================

  onMount(async () => {
    await carregaUsuarios();
  });
</script>


<!-- =========================================================
     CONTAINER PRINCIPAL
========================================================= -->

<div class="w-full">

  <div class="max-w-5xl mx-auto my-8 px-4">


    <!-- =====================================================
         TÍTULO
    ====================================================== -->

    <div class="mb-6">

      <h1 class="text-2xl font-bold text-gray-900">
        Alunos
      </h1>

      <p class="mt-1 text-sm text-gray-500">
        Lista de alunos e suas respectivas atividades.
      </p>

    </div>


    <!-- =====================================================
         BUSCA
    ====================================================== -->

    <div class="mb-6">

      <input
        type="search"
        id="busca"
        placeholder="Digite o nome do aluno"
        bind:value={filtro}
        on:input={filtraUsuarios}
        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      />

    </div>


    <!-- =====================================================
         ERRO
    ====================================================== -->

    {#if error}

      <div
        class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        {error}
      </div>

    {/if}


    <!-- =====================================================
         CARREGANDO
    ====================================================== -->

    {#if loading}

      <div class="flex justify-center py-12">

        <div class="text-sm text-gray-500">
          Carregando usuários...
        </div>

      </div>


    <!-- =====================================================
         TABELA DESKTOP
    ====================================================== -->

    {:else}

      <div class="hidden xl:block">

        <Table
          class="w-full overflow-hidden rounded-lg border border-gray-200 shadow-lg"
        >

          <!-- CABEÇALHO -->

          <TableHead>

            <TableHeadCell>
              Atividade
            </TableHeadCell>

            <TableHeadCell>
              Nome do aluno
            </TableHeadCell>

            <TableHeadCell>
              Data de nascimento
            </TableHeadCell>

          </TableHead>


          <!-- CORPO -->

          <TableBody>

            {#if users.length === 0}

              <TableBodyRow>

                <TableBodyCell
                  colspan="4"
                  class="py-8 text-center text-gray-500"
                >
                  Nenhum aluno encontrado.
                </TableBodyCell>

              </TableBodyRow>


            {:else}

              {#each users as user}

                <TableBodyRow>

                  <!-- ATIVIDADE -->

                  <TableBodyCell>

                    <span class="font-medium text-gray-900">
                      {user.atividade || 'Sem atividade'}
                    </span>

                  </TableBodyCell>


                  <!-- NOME -->

                  <TableBodyCell>

                    <span class="font-medium text-gray-900">
                      {user.login}
                    </span>

                  </TableBodyCell>


                  <!-- DATA DE NASCIMENTO -->

                  <TableBodyCell>

                    {formatarData(user.datanascimento)}

                  </TableBodyCell>






                </TableBodyRow>

              {/each}

            {/if}

          </TableBody>

        </Table>

      </div>


      <!-- ===================================================
           CARDS MOBILE / TABLET
      ==================================================== -->

      <div class="grid grid-cols-1 gap-4 xl:hidden">

        {#if users.length === 0}

          <div
            class="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500 shadow"
          >
            Nenhum aluno encontrado.
          </div>


        {:else}

          {#each users as user}

            <div
              class="rounded-lg border border-gray-200 bg-white p-5 shadow"
            >

              <!-- NOME -->

              <div class="mb-4">

                <p class="text-xs font-medium uppercase text-gray-500">
                  Nome do aluno
                </p>

                <p class="mt-1 text-lg font-semibold text-gray-900">
                  {user.login}
                </p>

              </div>


              <!-- ATIVIDADE -->

              <div class="mb-4">

                <p class="text-xs font-medium uppercase text-gray-500">
                  Atividade
                </p>

                <p class="mt-1 text-sm font-medium text-gray-900">
                  {user.atividade || 'Sem atividade'}
                </p>

              </div>


              <!-- DATA -->

              <div class="mb-4">

                <p class="text-xs font-medium uppercase text-gray-500">
                  Data de nascimento
                </p>

                <p class="mt-1 text-sm text-gray-900">
                  {formatarData(user.datanascimento)}
                </p>

              </div>


              <!-- EMAIL -->

              <div class="mb-4">

                <p class="text-xs font-medium uppercase text-gray-500">
                  E-mail
                </p>

                <p class="mt-1 break-all text-sm text-gray-900">
                  {user.email}
                </p>

              </div>


              <!-- AÇÕES -->

              <div class="flex gap-2 border-t border-gray-100 pt-4">


                <!-- EDITAR -->

                <button
                  type="button"
                  class="flex items-center gap-2 rounded border border-primary-200 px-3 py-2 text-sm text-primary-600 transition hover:border-primary-400 hover:bg-primary-50"
                  on:click={() =>
                    editarUsuario(user.id)
                  }
                >

                  <UserEditOutline
                    class="h-5 w-5"
                  />

                  Editar

                </button>


                <!-- EXCLUIR -->

                <button
                  type="button"
                  class="flex items-center gap-2 rounded border border-red-200 px-3 py-2 text-sm text-red-500 transition hover:border-red-400 hover:bg-red-50"
                  on:click={() =>
                    openConfirm(user.id)
                  }
                  disabled={
                    deletingId === user.id
                  }
                >

                  <TrashBinOutline
                    class="h-5 w-5"
                  />

                  Excluir

                </button>

              </div>

            </div>

          {/each}

        {/if}

      </div>

    {/if}

  </div>

</div>

