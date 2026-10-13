<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import api, { type ApiResponse } from '$lib/api';
    import { getCurrentUser } from '$lib/auth';
  
    type Atividade = { id:number; nome:string; descricao:string; ativa:boolean; professorId:number; professorNome?:string; quantidadeTurmas?:number };
    type Professor = { id:number; login:string; email?:string };
    let atividades:Atividade[]=[];
    let professores:Professor[]=[];
    let loading=true, saving=false, error='', success='', showForm=false, editingId:number|null=null;
    let form={nome:'',descricao:'',professorId:'',ativa:true};
    const msg=(e:any,f:string)=>e?.response?.data?.message||f;
  
    async function load(){
      loading=true; error='';
      try {
        const user=await getCurrentUser();
        if(!user){await goto('/login');return;}
        if(user.role!=='admin'){await goto('/');return;}
        const [ar,pr]=await Promise.all([api.get('/atividade'),api.get('/atividade/professores')]);
        const ab=ar.data as ApiResponse<Atividade[]>; const pb=pr.data as ApiResponse<Professor[]>;
        atividades=ab.success?ab.data??[]:[]; professores=pb.success?pb.data??[]:[];
      } catch(e){error=msg(e,'Não foi possível carregar as atividades.');}
      finally{loading=false;}
    }
    function novo(){editingId=null;form={nome:'',descricao:'',professorId:'',ativa:true};error='';success='';showForm=true;}
    function editar(a:Atividade){editingId=a.id;form={nome:a.nome,descricao:a.descricao??'',professorId:String(a.professorId),ativa:a.ativa};error='';success='';showForm=true;}
    async function salvar(){
      error='';success='';
      if(!form.nome.trim()||!form.professorId){error='Informe o nome da atividade e selecione um professor.';return;}
      saving=true;
      try{
        const payload={nome:form.nome.trim(),descricao:form.descricao.trim(),professorId:Number(form.professorId),ativa:form.ativa};
        if(editingId) await api.put(`/atividade/${editingId}`,payload); else await api.post('/atividade',payload);
        success=editingId?'Atividade atualizada com sucesso.':'Atividade criada com sucesso.';showForm=false;await load();
      }catch(e){error=msg(e,'Não foi possível salvar a atividade.');}finally{saving=false;}
    }
    async function excluir(a:Atividade){
      if(!confirm(`Deseja excluir a atividade "${a.nome}"?`))return;
      error='';success='';
      try{await api.delete(`/atividade/${a.id}`);success='Atividade excluída.';await load();}
      catch(e){error=msg(e,'Não foi possível excluir. Atividades vinculadas a turmas não podem ser removidas.');}
    }
    onMount(load);
  </script>
  
  <svelte:head><title>Atividades | CP2Fit</title></svelte:head>
  <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 class="text-3xl font-bold text-gray-900">Gerenciar atividades</h1><p class="mt-1 text-gray-600">Área exclusiva do administrador para criar, editar e excluir atividades.</p></div>
      <button class="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white" on:click={novo}>Nova atividade</button>
    </div>
    {#if error}<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>{/if}
    {#if success}<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">{success}</div>{/if}
    {#if showForm}
      <section class="mb-6 rounded-xl border bg-white p-6 shadow-sm">
        <h2 class="mb-4 text-xl font-bold">{editingId?'Editar atividade':'Criar atividade'}</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <label><span class="mb-1 block text-sm font-medium">Nome da atividade</span><input class="w-full rounded-lg border-gray-300" bind:value={form.nome} maxlength="120" /></label>
          <label><span class="mb-1 block text-sm font-medium">Professor responsável</span><select class="w-full rounded-lg border-gray-300" bind:value={form.professorId}><option value="">Selecione um professor</option>{#each professores as p}<option value={p.id}>{p.login}</option>{/each}</select></label>
          <label class="md:col-span-2"><span class="mb-1 block text-sm font-medium">Descrição</span><textarea class="w-full rounded-lg border-gray-300" rows="3" bind:value={form.descricao}></textarea></label>
          <label class="flex items-center gap-2"><input type="checkbox" bind:checked={form.ativa}/><span class="text-sm font-medium">Atividade ativa</span></label>
        </div>
        <div class="mt-5 flex gap-3"><button disabled={saving} class="rounded-lg bg-primary-600 px-5 py-2 font-semibold text-white disabled:opacity-50" on:click={salvar}>{saving?'Salvando...':'Salvar'}</button><button class="rounded-lg border px-5 py-2 font-semibold" on:click={()=>showForm=false}>Cancelar</button></div>
      </section>
    {/if}
    {#if loading}<div class="rounded-xl border bg-white p-10 text-center text-gray-500">Carregando atividades...</div>
    {:else if !atividades.length}<div class="rounded-xl border bg-white p-10 text-center text-gray-500">Nenhuma atividade cadastrada.</div>
    {:else}<div class="overflow-x-auto rounded-xl border bg-white shadow-sm"><table class="w-full text-left text-sm"><thead class="bg-gray-50 text-gray-700"><tr><th class="p-4">Atividade</th><th class="p-4">Professor</th><th class="p-4">Turmas</th><th class="p-4">Status</th><th class="p-4">Ações</th></tr></thead><tbody>{#each atividades as a}<tr class="border-t"><td class="p-4"><div class="font-semibold">{a.nome}</div><div class="mt-1 text-gray-500">{a.descricao||'Sem descrição'}</div></td><td class="p-4">{a.professorNome??professores.find(p=>p.id===a.professorId)?.login??`ID ${a.professorId}`}</td><td class="p-4">{a.quantidadeTurmas??0}</td><td class="p-4">{a.ativa?'Ativa':'Inativa'}</td><td class="p-4"><div class="flex gap-2"><button class="rounded border px-3 py-1.5" on:click={()=>editar(a)}>Editar</button><button class="rounded border border-red-300 px-3 py-1.5 text-red-700" on:click={()=>excluir(a)}>Excluir</button></div></td></tr>{/each}</tbody></table></div>{/if}
  </div>
  