<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import api, { type ApiResponse } from '$lib/api';
  import { getCurrentUser, type User } from '$lib/auth';

  type Turma = { id:number; nome:string; atividadeId:number; atividadeNome:string; professorId:number; professorNome:string; diaSemana:string; horarioInicio:string; horarioFim:string; vagas:number; quantidadeAlunos:number; vagasRestantes?:number; ativa:boolean; inscrito?:boolean };
  type Pessoa = { id:number; login:string; email?:string };
  type Atividade = { id:number; nome:string };
  type Aluno = { id:number; login:string; email:string };

  let user:User|null=null, turmas:Turma[]=[], alunos:Pessoa[]=[], professores:Pessoa[]=[], atividades:Atividade[]=[];
  let loading=true, error='', success='', showForm=false, editingId:number|null=null, selectedTurma:number|null=null;
  let selectedAlunos:number[]=[]; let turmaAlunos:Record<number,Aluno[]>={};
  let form={nome:'',atividadeId:'',professorId:'',diaSemana:'segunda',horarioInicio:'08:00',horarioFim:'09:00',vagas:20,ativa:true};
  const dias:Record<string,string>={segunda:'Segunda-feira',terca:'Terça-feira',quarta:'Quarta-feira',quinta:'Quinta-feira',sexta:'Sexta-feira',sabado:'Sábado'};
  const msg=(e:any,f:string)=>e?.response?.data?.message||f;
  const clear=()=>{error='';success='';};

  async function load(){
    loading=true; clear();
    try{
      user=await getCurrentUser(); if(!user){goto('/login');return;}
      const r=await api.get(user.role==='user'?'/turma/publicas':'/turma/minhas'); const b=r.data as ApiResponse<Turma[]>;
      turmas=b.success?b.data??[]:[];
      if(user.role!=='user'){
        const [ar,ur,pr]=await Promise.all([api.get('/turma/atividades'),api.get('/turma/usuarios'),api.get('/turma/professores')]);
        const ab=ar.data as ApiResponse<Atividade[]>; const ub=ur.data as ApiResponse<Pessoa[]>; const pb=pr.data as ApiResponse<Pessoa[]>;
        atividades=ab.success?ab.data??[]:[]; alunos=ub.success?ub.data??[]:[]; professores=pb.success?pb.data??[]:[];
      }
    }catch(e){error=msg(e,'Não foi possível carregar as turmas.');}finally{loading=false;}
  }

  function reset(){editingId=null;selectedAlunos=[];form={nome:'',atividadeId:'',professorId:user?.role==='professor'?String(user.id):'',diaSemana:'segunda',horarioInicio:'08:00',horarioFim:'09:00',vagas:20,ativa:true};}
  function create(){clear();reset();showForm=true;}

  async function edit(t:Turma){
    clear(); editingId=t.id; form={nome:t.nome,atividadeId:String(t.atividadeId),professorId:String(t.professorId),diaSemana:t.diaSemana,horarioInicio:t.horarioInicio.slice(0,5),horarioFim:t.horarioFim.slice(0,5),vagas:t.vagas,ativa:t.ativa};
    try{const r=await api.get(`/turma/${t.id}/alunos`);const b=r.data as ApiResponse<Aluno[]>;selectedAlunos=b.success?(b.data??[]).map(a=>a.id):[];showForm=true;}catch(e){error=msg(e,'Não foi possível carregar os alunos.');}
  }

  async function save(){
    clear();
    try{const payload={...form,atividadeId:Number(form.atividadeId),professorId:form.professorId?Number(form.professorId):undefined,vagas:Number(form.vagas),usuarioIds:selectedAlunos};
      if(editingId) await api.put(`/turma/${editingId}`,payload); else await api.post('/turma',payload);
      success=editingId?'Turma atualizada com sucesso.':'Turma criada com sucesso.';showForm=false;reset();await load();
    }catch(e){error=msg(e,'Não foi possível salvar a turma.');}
  }
  async function remove(t:Turma){if(!confirm(`Excluir a turma "${t.nome}"?`))return;clear();try{await api.delete(`/turma/${t.id}`);success='Turma removida com sucesso.';await load();}catch(e){error=msg(e,'Não foi possível remover a turma.');}}
  async function enroll(t:Turma){clear();try{await api.post(`/turma/${t.id}/inscricao`);success='Inscrição realizada com sucesso.';await load();}catch(e){error=msg(e,'Não foi possível realizar a inscrição.');}}
  async function cancel(t:Turma){clear();try{await api.delete(`/turma/${t.id}/inscricao`);success='Inscrição cancelada.';await load();}catch(e){error=msg(e,'Não foi possível cancelar a inscrição.');}}
  async function students(t:Turma){clear();if(selectedTurma===t.id){selectedTurma=null;return;}try{const r=await api.get(`/turma/${t.id}/alunos`);const b=r.data as ApiResponse<Aluno[]>;turmaAlunos[t.id]=b.success?b.data??[]:[];selectedTurma=t.id;}catch(e){error=msg(e,'Não foi possível consultar os alunos.');}}
  function toggleAluno(id:number){selectedAlunos=selectedAlunos.includes(id)?selectedAlunos.filter(x=>x!==id):[...selectedAlunos,id];}
  onMount(load);
</script>

<svelte:head><title>Turmas | CP2Fit</title></svelte:head>

<div class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div><h1 class="text-3xl font-bold text-gray-900">Turmas</h1><p class="mt-1 text-gray-600">{user?.role==='user'?'Encontre uma atividade e faça sua inscrição.':'Gerencie as turmas, atividades, professores e alunos.'}</p></div>
    {#if user && (user.role==='admin'||user.role==='professor')}<button class="rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white" on:click={create}>Nova turma</button>{/if}
  </div>
  {#if error}<div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>{/if}
  {#if success}<div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">{success}</div>{/if}

  {#if showForm}
    <section class="mb-8 rounded-xl border bg-white p-6 shadow-sm">
      <div class="mb-5 flex justify-between"><h2 class="text-xl font-bold">{editingId?'Editar turma':'Criar turma'}</h2><button class="text-gray-500" on:click={()=>{showForm=false;reset();}}>Fechar</button></div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <label><span class="mb-1 block text-sm font-medium">Nome</span><input bind:value={form.nome} class="w-full rounded-lg border-gray-300" /></label>
        <label><span class="mb-1 block text-sm font-medium">Atividade</span><select bind:value={form.atividadeId} class="w-full rounded-lg border-gray-300"><option value="">Selecione</option>{#each atividades as a}<option value={a.id}>{a.nome}</option>{/each}</select></label>
        {#if user?.role==='admin'}<label><span class="mb-1 block text-sm font-medium">Professor</span><select bind:value={form.professorId} class="w-full rounded-lg border-gray-300"><option value="">Selecione</option>{#each professores as p}<option value={p.id}>{p.login}</option>{/each}</select></label>{/if}
        <label><span class="mb-1 block text-sm font-medium">Dia</span><select bind:value={form.diaSemana} class="w-full rounded-lg border-gray-300">{#each Object.entries(dias) as [v,l]}<option value={v}>{l}</option>{/each}</select></label>
        <label><span class="mb-1 block text-sm font-medium">Início</span><input type="time" bind:value={form.horarioInicio} class="w-full rounded-lg border-gray-300" /></label>
        <label><span class="mb-1 block text-sm font-medium">Fim</span><input type="time" bind:value={form.horarioFim} class="w-full rounded-lg border-gray-300" /></label>
        <label><span class="mb-1 block text-sm font-medium">Vagas</span><input type="number" min="1" max="200" bind:value={form.vagas} class="w-full rounded-lg border-gray-300" /></label>
        <label class="flex items-center gap-2 pt-7"><input type="checkbox" bind:checked={form.ativa}/><span class="text-sm font-medium">Turma ativa</span></label>
      </div>
      <div class="mt-6"><p class="mb-2 text-sm font-medium">Alunos</p><div class="grid max-h-52 gap-2 overflow-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">{#each alunos as a}<label class="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedAlunos.includes(a.id)} on:change={()=>toggleAluno(a.id)}/><span>{a.login}</span></label>{/each}{#if !alunos.length}<p class="text-sm text-gray-500">Nenhum aluno disponível.</p>{/if}</div></div>
      <div class="mt-6 flex gap-3"><button class="rounded-lg bg-primary-600 px-5 py-2 font-semibold text-white" on:click={save}>Salvar</button><button class="rounded-lg border px-5 py-2 font-semibold" on:click={()=>{showForm=false;reset();}}>Cancelar</button></div>
    </section>
  {/if}

  {#if loading}<div class="rounded-xl border bg-white p-10 text-center text-gray-500">Carregando turmas...</div>
  {:else if !turmas.length}<div class="rounded-xl border bg-white p-10 text-center text-gray-500">Nenhuma turma encontrada.</div>
  {:else}<div class="grid gap-5 lg:grid-cols-2">{#each turmas as t}
    <article class="rounded-xl border bg-white p-5 shadow-sm">
      <div class="flex items-start justify-between gap-4"><div><h2 class="text-xl font-bold">{t.nome}</h2><p class="mt-1 font-medium text-primary-700">{t.atividadeNome}</p></div><span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">{t.ativa?'Ativa':'Inativa'}</span></div>
      <div class="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2"><p><strong>Professor:</strong> {t.professorNome}</p><p><strong>Dia:</strong> {dias[t.diaSemana]??t.diaSemana}</p><p><strong>Horário:</strong> {t.horarioInicio.slice(0,5)} - {t.horarioFim.slice(0,5)}</p><p><strong>Alunos:</strong> {t.quantidadeAlunos} / {t.vagas}</p></div>
      {#if user?.role==='user'}<div class="mt-5"><p class="mb-3 text-sm text-gray-600">Vagas restantes: <strong>{t.vagasRestantes??t.vagas-t.quantidadeAlunos}</strong></p>{#if t.inscrito}<button class="w-full rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-700" on:click={()=>cancel(t)}>Cancelar inscrição</button>{:else}<button disabled={(t.vagasRestantes??0)<=0} class="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white disabled:opacity-50" on:click={()=>enroll(t)}>Inscrever-se</button>{/if}</div>
      {:else}<div class="mt-5 flex flex-wrap gap-2"><button class="rounded-lg border px-3 py-2 text-sm font-semibold" on:click={()=>students(t)}>{selectedTurma===t.id?'Ocultar alunos':'Ver alunos'}</button><button class="rounded-lg border px-3 py-2 text-sm font-semibold" on:click={()=>edit(t)}>Editar</button><button class="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700" on:click={()=>remove(t)}>Excluir</button></div>
        {#if selectedTurma===t.id}<div class="mt-4 rounded-lg bg-gray-50 p-4"><p class="mb-2 font-semibold">Alunos inscritos</p>{#if !(turmaAlunos[t.id]??[]).length}<p class="text-sm text-gray-500">Nenhum aluno inscrito.</p>{:else}<ul class="space-y-1 text-sm">{#each turmaAlunos[t.id] as a}<li>{a.login} — {a.email}</li>{/each}</ul>{/if}</div>{/if}
      {/if}
    </article>
  {/each}</div>{/if}
</div>
