
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Goal, User } from '../types';
import { goalService } from '../services/goalService';
import { goalsUtils } from '../utils/goals';
import { ICONS } from '../constants';
import { 
  format, 
  startOfMonth, 
  addMonths, 
  subMonths, 
  isSameMonth, 
  parseISO,
  isAfter,
  isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface GoalSettingsProps {
  currentUser: User | null;
}

const GoalSettings: React.FC<GoalSettingsProps> = ({ currentUser }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<{
    month: string;
    revenue_goal: number;
    leads_goal: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const workspaceId = currentUser?.workspace_id || '';

  const fetchGoals = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await goalService.getAll(workspaceId);
      setGoals(data);
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [workspaceId]);

  const handleSaveGoal = async () => {
    if (!editingGoal || !workspaceId) return;
    setIsSaving(true);
    try {
      await goalService.upsert({
        workspace_id: workspaceId,
        month: editingGoal.month,
        revenue_goal: editingGoal.revenue_goal,
        leads_goal: editingGoal.leads_goal
      });
      await fetchGoals();
      setEditingGoal(null);
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert('Erro ao salvar meta. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const getGoalForMonth = (monthDate: Date) => {
    const monthStr = goalsUtils.formatMonthStr(monthDate);
    return goals.find(g => g.month === monthStr);
  };

  const currentMonth = startOfMonth(new Date());
  const nextMonths = Array.from({ length: 6 }, (_, i) => addMonths(currentMonth, i + 1));
  const pastMonths = Array.from({ length: 6 }, (_, i) => subMonths(currentMonth, i + 1));

  const renderGoalCard = (monthDate: Date, isFuture: boolean = false) => {
    const goal = getGoalForMonth(monthDate);
    const monthStr = goalsUtils.formatMonthStr(monthDate);
    const isCurrent = isSameMonth(monthDate, currentMonth);

    return (
      <div 
        key={monthStr}
        className={`bg-white dark:bg-slate-900 p-6 rounded-[2rem] border transition-all ${
          isCurrent 
            ? 'border-blue-500 shadow-lg shadow-blue-100 dark:shadow-none ring-1 ring-blue-500' 
            : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'
        }`}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {format(monthDate, 'MMMM yyyy', { locale: ptBR })}
            </h4>
            {isCurrent && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                Mês Atual
              </span>
            )}
          </div>
          {(isCurrent || isFuture) && (
            <button 
              onClick={() => setEditingGoal({
                month: monthStr,
                revenue_goal: goal?.revenue_goal || 0,
                leads_goal: goal?.leads_goal || 0
              })}
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            >
              <ICONS.Edit width="18" height="18" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <ICONS.Finance width="16" height="16" />
              <span className="text-[10px] font-black uppercase tracking-widest">Meta Receita</span>
            </div>
            <span className="font-black text-slate-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal?.revenue_goal || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <ICONS.Sales width="16" height="16" />
              <span className="text-[10px] font-black uppercase tracking-widest">Meta Leads</span>
            </div>
            <span className="font-black text-slate-900 dark:text-white">
              {goal?.leads_goal || 0}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Configurações de Metas</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Defina e acompanhe os objetivos comerciais do seu workspace.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none pb-10 space-y-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Carregando metas...</p>
          </div>
        ) : (
          <>
            {/* Mês Atual */}
            <section>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                Mês Atual
              </h3>
              <div className="max-w-md">
                {renderGoalCard(currentMonth)}
              </div>
            </section>

            {/* Próximos 6 Meses */}
            <section>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                Próximos 6 Meses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nextMonths.map(m => renderGoalCard(m, true))}
              </div>
            </section>

            {/* Histórico */}
            <section>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                Histórico de Metas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-70">
                {pastMonths.map(m => renderGoalCard(m, false))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Editar Meta
                  </h3>
                  <button onClick={() => setEditingGoal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ICONS.X width="20" height="20" />
                  </button>
                </div>

                <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-8">
                  {format(parseISO(editingGoal.month), 'MMMM yyyy', { locale: ptBR })}
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Meta de Receita (R$)</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</div>
                      <input 
                        type="number"
                        value={editingGoal.revenue_goal}
                        onChange={(e) => setEditingGoal({ ...editingGoal, revenue_goal: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Meta de Leads</label>
                    <input 
                      type="number"
                      value={editingGoal.leads_goal}
                      onChange={(e) => setEditingGoal({ ...editingGoal, leads_goal: Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      placeholder="0"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      onClick={() => setEditingGoal(null)}
                      className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveGoal}
                      disabled={isSaving}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Meta'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GoalSettings;
