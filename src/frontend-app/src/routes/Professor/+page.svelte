<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/turmas');
  });
</script>

<p class="p-8 text-gray-500">Redirecionando para Turmas...</p>
