
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { TaskStatus, Priority } from '../types';

interface ProjectManagementProps {
  onlyTasks?: boolean;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ onlyTasks = false }) => {
  const [tasks, setTasks] = useState([
    { 
      id: '1', 
      title: 'Otimização Mensal Google Ads', 
      client: 'Indústria Metalúrgica SA', 
      priority: Priority.HIGH, 
      status: TaskStatus.TODO, 
      due: '2023-11-30',
      checklist: [
        { id: 'c1', label: 'Revisão de Palavras-chave Negativas', done: true },
        { id: 'c2', label: 'Ajuste de lances por público-alvo', done: false },
        { id: 'c3', label: 'Análise de termos de busca', done: false },
      ]
    },
    { id: '2', title: 'Relatório de Performance Mensal', client: 'BioEstética Ltda', priority: Priority.MEDIUM, status: TaskStatus.IN_PROGRESS, due: '2023-12-05', checklist: [] },
    { id: '3', title: 'Setup de Pixel de Conversão (GTM)', client: 'Tech Logistics', priority: Priority.URGENT, status: TaskStatus.REVIEW, due: '2023-11-28', checklist: [] },
    { id: '4', title: 'Design de 15 Criativos para Black Friday', client: 'Loja Kids & Co', priority: Priority.MEDIUM, status: TaskStatus.DONE, due: '2023-11-20', checklist: [] },
  ]);

  const columns = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.DONE];

  const getProgress = (checklist: any[]) => {
    if (!checklist.length) return null;
    const done = checklist.filter(c => c.done).length;
    return Math.round((done / checklist.length) * 100);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {onlyTasks ? 'Minhas Entregas' : 'Squads & Projetos'}
          </h2>
          <p className="text-slate-500 font-medium">Gestão operacional de campanhas e entregas.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex">
            <button className="px-4 py-2 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider">Kanban</button>
            <button className="px-4 py-2 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">Lista</button>
            <button className="px-4 py-2 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">Gantt</button>
          </div>
          <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-200 transition-all hover:bg-blue-700">
            + Nova Tarefa
          </button>
        </div>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-8 -mx-4 px-4 h-[calc(100vh-280px)] min-h-[500px] scrollbar-thin">
        {columns.map(status => (
          <div key={status} className="w-[340px] shrink-0 flex flex-col bg-slate-100/50 rounded-3xl border border-slate-200/60 p-2">
            <div className="p-4 flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  status === TaskStatus.TODO ? 'bg-slate-400' :
                  status === TaskStatus.IN_PROGRESS ? 'bg-blue-500' :
                  status === TaskStatus.REVIEW ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></div>
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.15em]">{status}</h3>
              </div>
              <span className="bg-white text-slate-800 px-3 py-1 rounded-xl text-[10px] font-black border border-slate-200 shadow-sm">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto px-1 scrollbar-none pb-4">
              {tasks.filter(t => t.status === status).map(task => (
                <div 
                  key={task.id} 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ${
                      task.priority === Priority.URGENT ? 'bg-red-50 text-red-600' :
                      task.priority === Priority.HIGH ? 'bg-amber-50 text-amber-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                      <ICONS.Calendar />
                      {task.due}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm mb-1 leading-tight group-hover:text-blue-600 transition-colors">{task.title}</h4>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter mb-4">{task.client}</p>
                  
                  {task.checklist.length > 0 && (
                    <div className="mb-5 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-black text-slate-500 mb-1">
                        <span>CHECKLIST</span>
                        <span>{getProgress(task.checklist)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-500" 
                          style={{ width: `${getProgress(task.checklist)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex -space-x-2">
                      <img src="https://i.pravatar.cc/150?u=a1" className="w-7 h-7 rounded-xl border-2 border-white shadow-sm" alt="Assigned" />
                      <div className="w-7 h-7 rounded-xl border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-500 shadow-sm">+2</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:bg-slate-50 hover:text-blue-600 transition-all"><ICONS.MessageCircle /></button>
                    </div>
                  </div>
                </div>
              ))}
              
              <button className="w-full py-4 flex items-center justify-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-slate-200 rounded-2xl hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all">
                <ICONS.Plus /> ADICIONAR ITEM
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectManagement;
