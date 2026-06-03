import React, { useState } from 'react';
import { Task } from '../../types';
import { format } from 'date-fns';
import { taskService } from '../../services/taskService';
import { 
  Activity, 
  Plus, 
  Calendar, 
  Clock, 
  Video, 
  Phone, 
  FileText, 
  MessageSquare,
  BookmarkCheck
} from 'lucide-react';

interface ClientMeetingsTabProps {
  clientId: string;
  companyId: string | null;
  workspaceId: string;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ClientMeetingsTab: React.FC<ClientMeetingsTabProps> = ({
  clientId,
  companyId,
  workspaceId,
  tasks,
  setTasks,
  onShowToast,
}) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Form states for new meetings
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingType, setMeetingType] = useState<'meeting' | 'call' | 'interaction_record'>('meeting');
  const [isFutureAppointment, setIsFutureAppointment] = useState(false);

  // Filter tasks that are meetings, calls or interaction records for this client
  const meetingsTimeline = tasks.filter(t => 
    t.client_id === clientId && 
    (t.type === 'meeting' || t.type === 'call' || t.type === 'Ligação' || t.type === 'Reunião' || t.type === 'interaction_record')
  ).sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
  });

  const handleRegisterMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle.trim()) return;

    setIsProcessing('register_meeting');
    try {
      const selectedDate = meetingDate ? new Date(meetingDate).toISOString() : new Date().toISOString();
      const isInteraction = meetingType === 'interaction_record';
      const payload = {
        title: meetingTitle.trim(),
        description: meetingDesc.trim(),
        status: isInteraction ? 'Concluído' : (isFutureAppointment ? 'Pendente' : 'Concluído'),
        priority: 'Média',
        due_date: selectedDate,
        client_id: clientId,
        company_id: companyId,
        workspace_id: workspaceId,
        task_type: 'operational' as const,
        type: meetingType,
        is_recurring: false
      };

      const created = await taskService.create(payload, workspaceId);
      setTasks(prev => [created, ...prev]);

      // Reset
      setMeetingTitle('');
      setMeetingDesc('');
      setMeetingDate('');
      setMeetingType('meeting');
      setIsFutureAppointment(false);

      onShowToast(
        isInteraction 
          ? 'Registro de fato operacional adicionado ao histórico!'
          : (isFutureAppointment 
            ? 'Compromisso agendado com sucesso!' 
            : 'Reunião de histórico registrada na linha do tempo!'), 
        'success'
      );
    } catch (err: any) {
      onShowToast(err.message || 'Erro ao registrar interação', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-in fade-in duration-300">
      <div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white">Linha de Tempo & Reuniões de Alinhamento</h3>
        <p className="text-xs text-slate-500 mt-1">Registros históricos de checkpoints, reuniões decisórias e chamadas rápidas de alinhamento com clientes.</p>
      </div>

      <form onSubmit={handleRegisterMeeting} className="flex flex-col gap-4 p-5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100/50 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Registrar Nova Interação</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <input
              type="text"
              required
              placeholder="Ex: Call semanal de alinhamento de tráfego, Reunião de Kick-off..."
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={meetingType}
              onChange={e => {
                const val = e.target.value as any;
                setMeetingType(val);
                if (val === 'interaction_record') {
                  setIsFutureAppointment(false);
                }
              }}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none text-slate-900 dark:text-white"
            >
              <option value="meeting">Reunião Presencial/Online</option>
              <option value="call">Call Rápida / Telefone</option>
              <option value="interaction_record">Anotação / Registro de Fato</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={e => setMeetingDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-855 dark:text-slate-355 outline-none w-full cursor-pointer"
            />
          </div>

          {meetingType !== 'interaction_record' && (
            <div className="flex items-center gap-3 pl-2">
              <input
                type="checkbox"
                id="is_future"
                checked={isFutureAppointment}
                onChange={e => setIsFutureAppointment(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="is_future" className="text-xs font-black text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                Agendar compromisso futuro? (Ficará pendente)
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <textarea
            rows={3}
            placeholder="Ata de reunião ou observações gerais decididas no alinhamento..."
            value={meetingDesc}
            onChange={e => setMeetingDesc(e.target.value)}
            className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
          <div className="flex justify-end mt-1">
            <button
              type="submit"
              disabled={isProcessing === 'register_meeting'}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-sm"
            >
              {isFutureAppointment ? 'Agendar Compromisso' : 'Registrar na Linha de Tempo'}
            </button>
          </div>
        </div>
      </form>

      <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-800 space-y-8">
        {meetingsTimeline.length === 0 ? (
          <div className="py-6 text-slate-400 text-sm">Nenhuma call, checkpoint ou reunião registrada nesta conta ainda.</div>
        ) : (
          meetingsTimeline.map((item, idx) => {
            const isCall = item.type === 'call' || item.type === 'Ligação';
            const isInteraction = item.type === 'interaction_record';
            const isCompleted = item.status === 'Concluído';
            return (
              <div key={item.id || idx} className="relative group animate-in slide-in-from-left duration-200">
                {/* Visual node */}
                <span className={`absolute -left-[35px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-xs transition-all ${
                  isCompleted 
                    ? (isInteraction ? 'bg-amber-500' : 'bg-blue-600')
                    : 'bg-amber-500 animate-pulse'
                }`} />

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="font-extrabold text-slate-400">
                      {item.due_date ? format(new Date(item.due_date), "dd/MM/yyyy 'às' HH:mm") : 'Sem data'}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      isInteraction
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                        : isCall 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/20'
                    }`}>
                      {isInteraction ? (
                        <>
                          <MessageSquare className="w-2.5 h-2.5" />
                          Anotação / Fato
                        </>
                      ) : isCall ? (
                        <>
                          <Phone className="w-2.5 h-2.5" />
                          Ligação / Call
                        </>
                      ) : (
                        <>
                          <Video className="w-2.5 h-2.5" />
                          Reunião / Meeting
                        </>
                      )}
                    </span>
                    {!isCompleted && (
                      <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                        Agendado
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    {item.title}
                  </h4>

                  {item.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-850 leading-relaxed max-w-2xl">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-slate-450 shrink-0 mt-0.5" />
                        <span>{item.description}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
