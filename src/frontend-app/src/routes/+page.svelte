<script lang="ts">
	import { Heading, P, Button } from 'flowbite-svelte';
	import { goto } from '$app/navigation';
	import Menu from '../components/Menu.svelte';
	import { onMount } from 'svelte';
  	import { getCurrentUser } from '$lib/auth';
  

	let usuarioLogado = false;

	onMount(async () => {
		const user = await getCurrentUser();
		if (user) {
			usuarioLogado = true;
		}
	});
  
	async function handleAcao() {
	  if (usuarioLogado) {
		// usuário logado
		await goto('/turmas');
	  } else {
		// usuário não logado
		await goto('/login');
	  }
	}
  </script>
  
  <Menu />
  
  <div class="text-center p-8 pt-32">
	<Heading
	  tag="h2"
	  class="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6"
	>
	  Bem Vindo A CP2FIT
	</Heading>
  
	<P class="text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-6 text-justify">
	  Cp2 fit é a rede acadêmica para os alunos do cp2 que querem praticar
	  atividades físicas na área escolar.
	  <br /><br />
	  Para se cadastrar clique no botão abaixo.
	</P>
  

	<Button
	  size="lg"
	  color={usuarioLogado ? 'green' : 'blue'}
	  onclick={handleAcao}
	>
	  {#if usuarioLogado}
		Fazer Matrícula
	  {:else}
		Faça Login para se Matricular
	  {/if}
	</Button>
  </div>