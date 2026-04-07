import React, { useState } from 'react';
import { ICONS } from '../constants';
import { Project, Task, TaskStatus, Priority } from '../types';
import { supabase } from '../lib/supabase';

interface ProjectsProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentUser?: any;
}

const Projects: React.FC<ProjectsProps> = ({ projects, setProjects, tasks, setTasks, currentUser }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState<Partial<Project>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    name: '', status: 'active', start_date: new Date().toISOString().split('T')[0], value: 0
  });

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const { data, error } = await supabase
      .from('m4_projects')
      .update(editProject)
      .eq('id', selectedProject.id)
      .select();

    if (!error && data) {
      setProjects(projects.map(p => p.id === selectedProject.id ? data[0] : p));
      setSelectedProject(data[0]);
      setIsEditing(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('m4_projects')
      .insert([{ ...newProject, workspace_id: currentUser?.workspace_id }])
      .select();

    if (!error && data) {
      setProjects([...projects, data[0]]);
      setIsModalOpen(false);
      setNewProject({ name: '', status: 'active', start_date: new Date().toISOString().split('T')[0], value: 0 });
    }
  };

  const openViewModal = (project: Project) => {
    setSelectedProject(project);
    setEditProject(project);
    setIsEditing(false);
  };

  const projectTasks = selectedProject ? tasks.filter(t => t.project_id === selectedProject.id) : [];

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Projetos & Onboarding</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Gestão de entregas e sucesso do cliente.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 dark:shadow-none transition-all">
          <ICONS.Plus /> NOVO PROJETO
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-10 pb-10">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <div 
            key={project.id} 
            onClick={() => openViewModal(project)}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ICONS.Projects width="24" height="24" />
              </div>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                project.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>
                {project.status === 'active' ? 'Em Andamento' : 'Concluído'}
              </span>
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-xl mb-2">{project.name}</h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Iniciado em {new Date(project.start_date).toLocaleDateString()}</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Progresso</span>
                <span>{tasks.filter(t => t.project_id === project.id && t.status === TaskStatus.DONE).length}/{tasks.filter(t => t.project_id === project.id).length} Tarefas</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-1000" 
                  style={{ width: `${(tasks.filter(t => t.project_id === project.id && t.status === TaskStatus.DONE).length / (tasks.filter(t => t.project_id === project.id).length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-700 mx-auto">
              <ICONS.Projects width="40" height="40" />
            </div>
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum projeto ativo</p>
          </div>
        )}
      </div>

      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex justify-end">
          <div className="w-full md:w-[750px] bg-slate-50 dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-700">
            <div className="p-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-200 dark:shadow-none">
                  <ICONS.Projects width="32" height="32" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isEditing ? `EDITANDO: ${selectedProject.name}` : selectedProject.name}
                  </h3>
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Gestão de Projeto</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                    title="Editar"
                  >
                    <ICONS.Edit className="w-5 h-5" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                      setEditProject(selectedProject);
                    } else {
                      setSelectedProject(null);
                    }
                  }} 
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {isEditing ? 'CANCELAR' : 'FECHAR'}
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateProject} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor do Projeto</p>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={editProject.value} 
                        onChange={e => setEditProject({...editProject, value: Number(e.target.value)})}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-3xl font-black text-slate-900 dark:text-white">R$ {Number(selectedProject.value).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Data de Início</p>
                    {isEditing ? (
                      <input 
                        type="date" 
                        value={editProject.start_date} 
                        onChange={e => setEditProject({...editProject, start_date: e.target.value})}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border-none font-bold text-slate-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-xl font-black text-slate-900 dark:text-white">{new Date(selectedProject.start_date).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Projeto</label>
                      <input 
                        required 
                        value={editProject.name} 
                        onChange={e => setEditProject({...editProject, name: e.target.value})} 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        value={editProject.status} 
                        onChange={e => setEditProject({...editProject, status: e.target.value as any})}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold text-slate-900 dark:text-white"
                      >
                        <option value="active">Em Andamento</option>
                        <option value="completed">Concluído</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-widest">Checklist de Onboarding</h4>
                  <button className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline">+ Adicionar Item</button>
                </div>
                <div className="space-y-3">
                  {projectTasks.map((task) => (
                    <div key={task.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${task.status === TaskStatus.DONE ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-slate-700'}`}>
                          {task.status === TaskStatus.DONE && <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
                        </div>
                        <span className={`text-sm font-bold text-slate-700 dark:text-slate-300 ${task.status === TaskStatus.DONE ? 'line-through opacity-50' : ''}`}>{task.title}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{task.priority}</span>
                    </div>
                  ))}
                  {projectTasks.length === 0 && (
                    <div className="p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                      <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhuma tarefa vinculada</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-10 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-4 shrink-0">
              {!isEditing ? (
                <button 
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  FECHAR
                </button>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditProject(selectedProject);
                    }}
                    className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    CANCELAR
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-200 dark:shadow-none"
                  >
                    SALVAR ALTERAÇÕES
                  </button>
                </>
              )}
            </div>
          </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-zoom-in-95">
            <div className="p-10 pb-6 flex justify-between items-center shrink-0 gap-4">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase truncate min-w-0">Novo Projeto</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shrink-0">
                <ICONS.X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6 scrollbar-none">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Nome do Projeto</label>
                  <textarea 
                    required 
                    placeholder="Ex: Campanha de Performance" 
                    value={newProject.name} 
                    onChange={e => setNewProject({...newProject, name: e.target.value})} 
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none overflow-hidden min-h-[56px] text-slate-900 dark:text-white"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Valor do Contrato</label>
                    <input type="number" placeholder="0.00" value={newProject.value} onChange={e => setNewProject({...newProject, value: Number(e.target.value)})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Data de Início</label>
                    <input type="date" value={newProject.start_date} onChange={e => setNewProject({...newProject, start_date: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all h-[56px] text-slate-900 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="p-10 pt-6 flex gap-4 border-t border-slate-50 dark:border-slate-800 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">CANCELAR</button>
                <button onClick={handleCreateProject} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-none transition-all">CRIAR PROJETO</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Projects;
