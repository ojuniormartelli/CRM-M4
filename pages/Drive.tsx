
import React from 'react';
import { ICONS } from '../constants';

const Drive: React.FC = () => {
  const items = [
    { name: 'Contratos 2023', type: 'folder', size: '24 arquivos', date: 'Ontem' },
    { name: 'Criativos Meta Ads', type: 'folder', size: '150 arquivos', date: 'Hoje' },
    { name: 'Logos Clientes', type: 'folder', size: '42 arquivos', date: '01 Out' },
    { name: 'Proposta_M4_v2.pdf', type: 'file', size: '2.4 MB', date: 'Há 2 dias' },
    { name: 'Relatorio_Setembro.xlsx', type: 'file', size: '1.1 MB', date: 'Há 1 sem' },
  ];

  return (
    <div className="h-full overflow-y-auto pr-4 scrollbar-none space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Drive & Documentos</h2>
          <p className="text-slate-500">Repositório central de arquivos da agência.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200">
            Nova Pasta
          </button>
          <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-100">
            Upload de Arquivo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group text-center">
            <div className="flex justify-center mb-4">
              {item.type === 'folder' ? (
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
                </div>
              ) : (
                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
              )}
            </div>
            <h4 className="text-sm font-bold text-slate-800 truncate mb-1">{item.name}</h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.size}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 p-8 rounded-3xl border border-slate-200 border-dashed text-center">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
           <ICONS.Plus />
        </div>
        <h4 className="text-slate-800 font-bold">Arraste arquivos aqui para fazer upload</h4>
        <p className="text-slate-500 text-xs mt-1">Limite de 100MB por arquivo (v3.0)</p>
      </div>
    </div>
  );
};

export default Drive;
