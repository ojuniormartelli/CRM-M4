
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { FormTemplate, FormQuestion, Lead, FormResponse } from '../types';
import { supabase } from '../lib/supabase';

interface MeetingFormsProps {
  leads: Lead[];
  workspaceId: string;
}

const MeetingForms: React.FC<MeetingFormsProps> = ({ leads, workspaceId }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'builder' | 'execution'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const AGENCY_TEMPLATES = [
    {
      id: 'tpl_briefing',
      title: 'Sondagem Inicial (Briefing)',
      description: 'Coleta de dados básicos para qualificação de leads.',
      questions: [
        { id: '1', type: 'script', label: 'Olá! Sou da M4 Marketing. Gostaria de entender um pouco mais sobre seu negócio para vermos como podemos ajudar.', required: false },
        { id: '2', type: 'text', label: 'Qual o principal objetivo da sua empresa hoje?', required: true },
        { id: '3', type: 'multiple_choice', label: 'Qual o seu orçamento mensal para marketing?', options: ['Até R$ 1.000', 'R$ 1.000 - R$ 5.000', 'R$ 5.000 - R$ 10.000', 'Acima de R$ 10.000'], required: true },
        { id: '4', type: 'text', label: 'Quem é o seu público-alvo principal?', required: true }
      ]
    },
    {
      id: 'tpl_diag',
      title: 'Diagnóstico de Tráfego Pago',
      description: 'Análise profunda para propostas de Google/Meta Ads.',
      questions: [
        { id: '1', type: 'script', label: 'Vamos analisar seu histórico de anúncios para identificar gargalos e oportunidades.', required: false },
        { id: '2', type: 'multiple_choice', label: 'Você já anuncia hoje?', options: ['Sim, Google Ads', 'Sim, Meta Ads', 'Sim, Ambos', 'Não anuncio'], required: true },
        { id: '3', type: 'text', label: 'Qual o seu Custo por Lead (CPL) atual?', required: false },
        { id: '4', type: 'text', label: 'Qual o faturamento médio mensal vindo de anúncios?', required: true }
      ]
    }
  ];

  // Builder State
  const [builderForm, setBuilderForm] = useState<Partial<FormTemplate>>({
    title: '',
    description: '',
    questions: []
  });

  useEffect(() => {
    if (workspaceId) {
      fetchTemplates();
    }
  }, [workspaceId]);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('m4_form_templates')
      .select('*')
      .eq('workspace_id', workspaceId);
      
    if (data) setTemplates(data);
  };

  const deleteTemplate = async (templateId: string) => {
    if (!templateId) return;
    
    if (!window.confirm('Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    setIsSyncing(true);
    try {
      console.log('MeetingForms: sending delete request to Supabase for ID ->', templateId);
      const { error } = await supabase
        .from('m4_form_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('MeetingForms: deletion error ->', error);
        throw error;
      }
      
      alert("Modelo excluído com sucesso!");
      await fetchTemplates();
    } catch (error: any) {
      console.error('Erro detalhado ao excluir modelo:', error);
      alert(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSyncing(false);
      setDeletingId(null);
    }
  };

  const handleCreateTemplate = () => {
    setBuilderForm({
      title: 'Novo Formulário de Sondagem',
      description: '',
      questions: [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        label: 'Pergunta sem título',
        required: false
      }]
    });
    setActiveView('builder');
  };

  const addQuestion = () => {
    const newQuestion: FormQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'text',
      label: 'Nova Pergunta',
      required: false
    };
    setBuilderForm({
      ...builderForm,
      questions: [...(builderForm.questions || []), newQuestion]
    });
  };

  const updateQuestion = (id: string, updates: Partial<FormQuestion>) => {
    setBuilderForm({
      ...builderForm,
      questions: builderForm.questions?.map(q => q.id === id ? { ...q, ...updates } : q)
    });
  };

  const removeQuestion = (id: string) => {
    setBuilderForm({
      ...builderForm,
      questions: builderForm.questions?.filter(q => q.id !== id)
    });
  };

  const saveTemplate = async () => {
    if (!workspaceId) {
      alert("Erro: ID do Workspace não identificado. Por favor, recarregue o sistema.");
      return;
    }

    if (!builderForm.title) {
      alert("Por favor, insira um título para o formulário.");
      return;
    }

    setIsSaving(true);
    try {
      const { id, ...rest } = builderForm;
      const templateData: any = {
        ...rest,
        workspace_id: workspaceId,
        created_at: builderForm.created_at || new Date().toISOString()
      };

      // Se o ID existir e NÃO for um dos modelos estáticos da agência (tpl_...), usamos ele para UPSERT.
      // Caso contrário, deixamos o Supabase gerar um novo UUID.
      if (id && !String(id).startsWith('tpl_')) {
        templateData.id = id;
      } else {
        // Se for um modelo da agência ou novo, removemos o ID para criar um novo no banco do usuário
        delete templateData.id;
      }

      console.log('MeetingForms: Salvando Template ->', templateData);

      const { data, error } = await supabase
        .from('m4_form_templates')
        .upsert([templateData])
        .select();

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42P01') {
          throw new Error("Tabela m4_form_templates não encontrada. Por favor, execute o script de INSTALAÇÃO no Painel Técnico e recarregue a página.");
        }
        throw error;
      }
      
      console.log('MeetingForms: Template salvo com sucesso ->', data);
      alert("Formulário salvo com sucesso!");
      await fetchTemplates();
      setActiveView('list');
    } catch (error: any) {
      console.error('Erro ao salvar formulário:', error);
      alert(`Erro ao salvar formulário: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const startMeeting = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setActiveView('execution');
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const nextQuestion = () => {
    const currentQuestion = selectedTemplate?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const answer = answers[currentQuestion.id];

    // Logic Branching
    const logic = currentQuestion.logic?.find(l => {
      if (currentQuestion.type === 'checkbox' && Array.isArray(answer)) {
        return answer.includes(l.trigger_value);
      }
      return l.trigger_value === answer;
    });

    if (logic) {
      if (logic.go_to_question_id === 'end') {
        finishMeeting();
        return;
      }
      const nextIdx = selectedTemplate?.questions.findIndex(q => q.id === logic.go_to_question_id);
      if (nextIdx !== undefined && nextIdx !== -1) {
        setCurrentQuestionIndex(nextIdx);
        return;
      }
    }

    if (currentQuestionIndex < (selectedTemplate?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishMeeting();
    }
  };

  const finishMeeting = async () => {
    if (!workspaceId) {
      alert("Erro: ID do Workspace não identificado.");
      return;
    }

    if (!selectedLeadId) {
      alert("Por favor, selecione um lead antes de finalizar.");
      return;
    }

    setIsSaving(true);
    try {
      const response = {
        form_id: selectedTemplate?.id,
        lead_id: selectedLeadId,
        workspace_id: workspaceId,
        answers: Object.entries(answers).map(([question_id, value]) => ({ question_id, value })),
        created_at: new Date().toISOString()
      };

      console.log('Salvando Resposta:', response);

      const { data, error: responseError } = await supabase.from('m4_form_responses').insert([response]).select();
      if (responseError) {
        if (responseError.code === 'PGRST205') {
          throw new Error("Tabela m4_form_responses não encontrada. Por favor, execute a migração SQL.");
        }
        throw responseError;
      }

      console.log('Resposta salva:', data);

      // Also add an interaction to the lead
      const { error: interactionError } = await supabase.from('m4_interactions').insert([{
        lead_id: selectedLeadId,
        workspace_id: workspaceId,
        type: 'Reunião',
        note: `Sondagem Realizada: ${selectedTemplate?.title}. ${Object.keys(answers).length} perguntas respondidas.`,
        success: true,
        created_at: new Date().toISOString()
      }]);
      if (interactionError) throw interactionError;

      alert("Sondagem salva com sucesso!");
      setActiveView('list');
    } catch (error: any) {
      console.error('Erro ao finalizar reunião:', error);
      alert(`Erro ao finalizar reunião: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-10 shrink-0">
        <div className="flex items-center gap-6">
          {activeView !== 'list' && (
            <button 
              onClick={() => setActiveView('list')}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"
            >
              <ICONS.ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Sondagem & Reunião</h2>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Formulários dinâmicos para qualificação</p>
          </div>
        </div>
        {activeView === 'list' && (
          <button 
            onClick={handleCreateTemplate}
            className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all hover:-translate-y-1"
          >
            <ICONS.Plus /> NOVO FORMULÁRIO
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-4 scrollbar-none space-y-10 pb-10">

      {activeView === 'list' && (
        <div className="space-y-12">
          {/* Agency Templates */}
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Modelos Prontos (M4 Agency)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {AGENCY_TEMPLATES.map(tpl => (
                <div key={tpl.id} className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100/50 group hover:-translate-y-1 transition-all">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    <ICONS.Form width="24" height="24" />
                  </div>
                  <h3 className="text-xl font-black mb-2 uppercase tracking-tight">{tpl.title}</h3>
                  <p className="text-blue-100 text-sm font-medium mb-8 line-clamp-2">{tpl.description}</p>
                  <button 
                    onClick={() => {
                      setBuilderForm({
                        title: tpl.title,
                        description: tpl.description,
                        questions: tpl.questions as FormQuestion[]
                      });
                      setActiveView('builder');
                    }}
                    className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all"
                  >
                    Usar este Modelo
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* User Templates */}
          <section>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Meus Formulários</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {templates.map(template => (
                <div key={template.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <ICONS.Form width="28" height="28" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{template.title}</h3>
                  <p className="text-slate-400 text-sm font-medium mb-8 line-clamp-2">{template.description || 'Sem descrição'}</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => startMeeting(template)}
                      disabled={isSyncing}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all disabled:opacity-50"
                    >
                      Iniciar Reunião
                    </button>
                    <button 
                      onClick={() => {
                        setBuilderForm(template);
                        setActiveView('builder');
                      }}
                      disabled={isSyncing}
                      className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all disabled:opacity-50"
                      title="Editar Modelo"
                    >
                      <ICONS.Edit width="18" height="18" />
                    </button>
                    <button 
                      onClick={() => deleteTemplate(template.id)}
                      disabled={isSyncing}
                      className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all disabled:opacity-50"
                      title="Excluir Modelo"
                    >
                      <ICONS.Trash width="18" height="18" />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={handleCreateTemplate}
                className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-200 shadow-sm">
                  <ICONS.Plus />
                </div>
                <span className="font-black text-xs uppercase tracking-widest">Criar do Zero</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {activeView === 'builder' && (
        <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl max-w-4xl mx-auto">
          <div className="space-y-8">
            <div className="border-b border-slate-100 pb-8">
              <input 
                type="text" 
                value={builderForm.title}
                onChange={(e) => setBuilderForm({ ...builderForm, title: e.target.value })}
                className="text-3xl font-black text-slate-900 w-full outline-none placeholder:text-slate-200"
                placeholder="Título do Formulário"
              />
              <textarea 
                value={builderForm.description}
                onChange={(e) => setBuilderForm({ ...builderForm, description: e.target.value })}
                className="text-slate-400 font-medium w-full mt-4 outline-none resize-none placeholder:text-slate-200"
                placeholder="Descrição (opcional)"
                rows={2}
              />
            </div>

            <div className="space-y-6">
              {builderForm.questions?.map((q, idx) => (
                <div key={q.id} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 relative group">
                  <button 
                    onClick={() => removeQuestion(q.id)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ICONS.X width="16" height="16" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        {q.type === 'script' ? 'Conteúdo do Script' : `Pergunta ${idx + 1}`}
                      </label>
                      {q.type === 'script' ? (
                        <textarea 
                          value={q.label}
                          onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none min-h-[120px]"
                          placeholder="Digite aqui o texto que o vendedor deve ler..."
                        />
                      ) : (
                        <input 
                          type="text" 
                          value={q.label}
                          onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo de Resposta</label>
                      <select 
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as any })}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none"
                      >
                        <option value="text">Texto Curto</option>
                        <option value="long_text">Texto Longo</option>
                        <option value="multiple_choice">Múltipla Escolha</option>
                        <option value="checkbox">Caixas de Seleção</option>
                        <option value="script">Script / Texto de Orientação</option>
                      </select>
                    </div>
                    {q.type !== 'script' && (
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={q.required}
                          onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-300 text-blue-600"
                        />
                        <span className="text-sm font-bold text-slate-600">Obrigatória</span>
                      </div>
                    )}
                  </div>

                  {(q.type === 'multiple_choice' || q.type === 'checkbox') && (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Opções</label>
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-3">
                          <input 
                            type="text" 
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[optIdx] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold"
                          />
                          <button 
                            onClick={() => {
                              const newOpts = q.options?.filter((_, i) => i !== optIdx);
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            className="p-3 text-slate-300 hover:text-red-500"
                          >
                            <ICONS.X width="14" height="14" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateQuestion(q.id, { options: [...(q.options || []), 'Nova Opção'] })}
                        className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        + Adicionar Opção
                      </button>
                    </div>
                  )}

                  {/* Logic Branching UI */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Lógica de Desvio (Opcional)</h5>
                    <div className="space-y-3">
                      {q.logic?.map((l, lIdx) => (
                        <div key={lIdx} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-400">Se responder</span>
                          
                          {(q.type === 'multiple_choice' || q.type === 'checkbox') ? (
                            <select 
                              value={l.trigger_value}
                              onChange={(e) => {
                                const newLogic = [...(q.logic || [])];
                                newLogic[lIdx].trigger_value = e.target.value;
                                updateQuestion(q.id, { logic: newLogic });
                              }}
                              className="p-2 border-b border-slate-200 outline-none text-xs font-bold min-w-[120px]"
                            >
                              <option value="">Selecione...</option>
                              {q.options?.map((opt, i) => (
                                <option key={i} value={opt}>{String.fromCharCode(65 + i)}) {opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input 
                              type="text" 
                              value={l.trigger_value}
                              onChange={(e) => {
                                const newLogic = [...(q.logic || [])];
                                newLogic[lIdx].trigger_value = e.target.value;
                                updateQuestion(q.id, { logic: newLogic });
                              }}
                              className="p-2 border-b border-slate-200 outline-none text-xs font-bold w-24"
                              placeholder="Valor..."
                            />
                          )}

                          <span className="text-xs font-bold text-slate-400">ir para</span>
                          <select 
                            value={l.go_to_question_id}
                            onChange={(e) => {
                                const newLogic = [...(q.logic || [])];
                                newLogic[lIdx].go_to_question_id = e.target.value;
                                updateQuestion(q.id, { logic: newLogic });
                            }}
                            className="p-2 border-b border-slate-200 outline-none text-xs font-bold"
                          >
                            <option value="">Próxima Pergunta</option>
                            <option value="end">Finalizar Formulário</option>
                            {builderForm.questions?.filter(other => other.id !== q.id).map((other) => (
                              <option key={other.id} value={other.id}>
                                Pergunta {builderForm.questions?.indexOf(other)! + 1}: {other.label.substring(0, 20)}...
                              </option>
                            ))}
                          </select>
                          <button 
                            onClick={() => {
                              const newLogic = q.logic?.filter((_, i) => i !== lIdx);
                              updateQuestion(q.id, { logic: newLogic });
                            }}
                            className="ml-auto text-slate-300 hover:text-red-500"
                          >
                            <ICONS.X width="14" height="14" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateQuestion(q.id, { logic: [...(q.logic || []), { trigger_value: '', go_to_question_id: '' }] })}
                        className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600"
                      >
                        + Adicionar Lógica
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-10">
              <button 
                onClick={addQuestion}
                className="flex-1 py-5 border-2 border-dashed border-slate-200 rounded-[2rem] font-black text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-all"
              >
                + ADICIONAR PERGUNTA
              </button>
              <button 
                onClick={() => setActiveView('list')}
                className="px-8 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={saveTemplate}
                disabled={isSaving}
                className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Salvando...' : 'Salvar Formulário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'execution' && selectedTemplate && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-2xl">
            <div className="mb-12">
              <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Lead em Atendimento</label>
              <select 
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              >
                <option value="">Selecione o Lead...</option>
                {leads.map(l => (
                  <option key={l.id} value={l.id}>{l.contact_name || l.name} ({l.company?.name || l.company_name})</option>
                ))}
              </select>
            </div>

            <div className="space-y-10">
              <div className="flex justify-between items-center">
                <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Pergunta {currentQuestionIndex + 1} de {selectedTemplate.questions.length}
                </span>
                <div className="flex gap-1">
                  {selectedTemplate.questions.map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i === currentQuestionIndex ? 'bg-blue-600' : 'bg-slate-100'}`}></div>
                  ))}
                </div>
              </div>

              <div className="animate-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-8">
                  {selectedTemplate.questions[currentQuestionIndex].type === 'script' ? 'Roteiro de Abordagem' : selectedTemplate.questions[currentQuestionIndex].label}
                  {selectedTemplate.questions[currentQuestionIndex].required && <span className="text-red-500 ml-1">*</span>}
                </h3>

                {selectedTemplate.questions[currentQuestionIndex].type === 'script' && (
                  <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-3xl">
                    <p className="text-slate-700 text-lg font-medium leading-relaxed whitespace-pre-wrap">
                      {selectedTemplate.questions[currentQuestionIndex].label}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-blue-600">
                      <ICONS.Info width="16" height="16" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Script de Orientação</span>
                    </div>
                  </div>
                )}

                {selectedTemplate.questions[currentQuestionIndex].type === 'text' && (
                  <input 
                    type="text"
                    value={answers[selectedTemplate.questions[currentQuestionIndex].id] || ''}
                    onChange={(e) => handleAnswer(selectedTemplate.questions[currentQuestionIndex].id, e.target.value)}
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                    placeholder="Sua resposta..."
                  />
                )}

                {selectedTemplate.questions[currentQuestionIndex].type === 'long_text' && (
                  <textarea 
                    value={answers[selectedTemplate.questions[currentQuestionIndex].id] || ''}
                    onChange={(e) => handleAnswer(selectedTemplate.questions[currentQuestionIndex].id, e.target.value)}
                    className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl font-bold text-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[200px]"
                    placeholder="Sua resposta detalhada..."
                  />
                )}

                {selectedTemplate.questions[currentQuestionIndex].type === 'multiple_choice' && (
                  <div className="space-y-4">
                    {selectedTemplate.questions[currentQuestionIndex].options?.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(selectedTemplate.questions[currentQuestionIndex].id, opt)}
                        className={`w-full p-6 text-left rounded-3xl font-bold text-lg border-2 transition-all flex items-center justify-between ${answers[selectedTemplate.questions[currentQuestionIndex].id] === opt ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                      >
                        {opt}
                        {answers[selectedTemplate.questions[currentQuestionIndex].id] === opt && <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white"></div>}
                      </button>
                    ))}
                  </div>
                )}

                {selectedTemplate.questions[currentQuestionIndex].type === 'checkbox' && (
                  <div className="space-y-4">
                    {selectedTemplate.questions[currentQuestionIndex].options?.map((opt, i) => {
                      const currentAnswers = answers[selectedTemplate.questions[currentQuestionIndex].id] || [];
                      const isChecked = currentAnswers.includes(opt);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            const newAnswers = isChecked 
                              ? currentAnswers.filter((a: string) => a !== opt)
                              : [...currentAnswers, opt];
                            handleAnswer(selectedTemplate.questions[currentQuestionIndex].id, newAnswers);
                          }}
                          className={`w-full p-6 text-left rounded-3xl font-bold text-lg border-2 transition-all flex items-center justify-between ${isChecked ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-600 hover:border-slate-200'}`}
                        >
                          {opt}
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200'}`}>
                            {isChecked && <ICONS.Plus className="rotate-0" width="14" height="14" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-10">
                {currentQuestionIndex > 0 && (
                  <button 
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                    className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Anterior
                  </button>
                )}
                <button 
                  onClick={nextQuestion}
                  disabled={selectedTemplate.questions[currentQuestionIndex].required && !answers[selectedTemplate.questions[currentQuestionIndex].id]}
                  className="flex-1 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all disabled:opacity-50"
                >
                  {currentQuestionIndex === selectedTemplate.questions.length - 1 ? (isSaving ? 'Salvando...' : 'Finalizar Sondagem') : 'Próxima Pergunta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default MeetingForms;
