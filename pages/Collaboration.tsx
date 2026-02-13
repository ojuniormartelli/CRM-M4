
import React, { useState } from 'react';
import { ICONS } from '../constants';

const Collaboration: React.FC = () => {
  const [posts, setPosts] = useState([
    {
      id: 1,
      user: 'Carlos Mendes',
      role: 'Head de Ads',
      time: '2h atrás',
      content: 'Batemos a meta de ROAS do cliente Loja XYZ! Parabéns a todo o time de criativos pelo empenho. 🚀',
      likes: 12,
      comments: 3,
      type: 'update'
    },
    {
      id: 2,
      user: 'Julia Silva',
      role: 'Account Manager',
      time: '5h atrás',
      content: 'Novo cliente onboardado com sucesso: Tech Solutions. Reunião de kickoff agendada para amanhã às 10h.',
      likes: 8,
      comments: 1,
      type: 'announcement'
    }
  ]);

  return (
    <div className="flex gap-8 h-full overflow-hidden">
      {/* Feed Column */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Fluxo de Atividade</h2>
        </div>

        {/* Create Post */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex gap-4">
            <img src="https://picsum.photos/40/40?u=1" className="w-10 h-10 rounded-full" />
            <textarea 
              placeholder="O que está acontecendo hoje na M4?"
              className="flex-1 bg-slate-50 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none resize-none h-24"
            ></textarea>
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-3 text-slate-500">
              <button className="hover:text-blue-600 transition-colors"><ICONS.Drive /></button>
              <button className="hover:text-blue-600 transition-colors"><ICONS.Calendar /></button>
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-100">Publicar</button>
          </div>
        </div>

        {/* Feed Posts */}
        {posts.map(post => (
          <div key={post.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between mb-4">
              <div className="flex gap-3">
                <img src={`https://picsum.photos/40/40?u=${post.id}`} className="w-10 h-10 rounded-full" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{post.user}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{post.role} • {post.time}</p>
                </div>
              </div>
              <button className="text-slate-400">•••</button>
            </div>
            <p className="text-slate-700 text-sm leading-relaxed mb-6">{post.content}</p>
            <div className="flex items-center gap-6 pt-4 border-t border-slate-50 text-slate-500 text-xs font-bold uppercase">
              <button className="flex items-center gap-2 hover:text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                Curtir ({post.likes})
              </button>
              <button className="flex items-center gap-2 hover:text-blue-600">
                <ICONS.MessageCircle />
                Comentar ({post.comments})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Right Chat/Widget Column */}
      <div className="w-80 space-y-6 hidden xl:block">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
            Mensagens Diretas
            <span className="bg-blue-600 w-5 h-5 rounded-full text-[10px] text-white flex items-center justify-center">3</span>
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Ana Souza', status: 'online', last: 'Me manda o deck?' },
              { name: 'Ricardo Dias', status: 'away', last: 'Reunião daqui a pouco' },
              { name: 'Marina Oliveira', status: 'online', last: 'Ok, aprovado!' },
            ].map((chat, i) => (
              <div key={i} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors">
                <div className="relative">
                  <img src={`https://picsum.photos/32/32?r=${i}`} className="w-8 h-8 rounded-full" />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${chat.status === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800">{chat.name}</p>
                  <p className="text-[10px] text-slate-400 truncate font-medium">{chat.last}</p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 border border-slate-100 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50">VER TODAS</button>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
          <h3 className="font-bold mb-2">M4 Knowledge Base</h3>
          <p className="text-xs text-blue-100 mb-4 font-medium">Consulte nossos processos internos e padrões de criativos.</p>
          <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all">ABRIR WIKI</button>
        </div>
      </div>
    </div>
  );
};

export default Collaboration;
