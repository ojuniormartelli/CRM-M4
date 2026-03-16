
import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { FormTemplate, FormQuestion, Lead, FormResponse } from '../types';
import { supabase } from '../lib/supabase';

interface MeetingFormsProps {
  leads: Lead[];
}

const MeetingForms: React.FC<MeetingFormsProps> = ({ leads }) => {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [activeView, setActiveView] = useState<'list' | 'builder' | 'execution'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Builder State
  const [builderForm, setBuilderForm] = useState<Partial<FormTemplate>>({
    title: '',
    description: '',
    questions: []
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('m4_form_templates').select('*');
    if (data) setTemplates(data);
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
    const { data, error } = await supabase
      .from('m4_form_templates')
      .upsert([{
        ...builderForm,
        createdAt: new Date().toISOString()
      }])
      .select();

    if (!error) {
      fetchTemplates();
      setActiveView('list');
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

    // Logic Branching
    const logic = currentQuestion.logic?.find(l => l.triggerValue === answers[currentQuestion.id]);
    if (logic) {
      if (logic.goToQuestionId === 'end') {
        finishMeeting();
        return;
      }
      const nextIdx = selectedTemplate?.questions.findIndex(q => q.id === logic.goToQuestionId);
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
    if (!selectedLeadId) {
      alert("Por favor, selecione um lead antes de finalizar.");
      return;
    }

    setIsSaving(true);
    const response: Partial<FormResponse> = {
      formId: selectedTemplate?.id,
      leadId: selectedLeadId,
      answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('m4_form_responses').insert([response]);

    if (!error) {
      // Also add an interaction to the lead
      await supabase.from('m4_interactions').insert([{
        leadId: selectedLeadId,
        type: 'ai_insight',
        title: `Sondagem Realizada: ${selectedTemplate?.title}`,
        content: `Formulário preenchido durante reunião. ${Object.keys(answers).length} perguntas respondidas.`,
        createdAt: new Date().toISOString()
      }]);

      alert("Sondagem salva com sucesso!");
      setActiveView('list');
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Sondagem & Reunião</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Formulários dinâmicos para qualificação</p>
        </div>
        {activeView === 'list' && (
          <button 
            onClick={handleCreateTemplate}
            className="flex items-center gap-3 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all hover:-translate-y-1"
          >
            <ICONS.Plus /> NOVO FORMULÁRIO
          </button>
        )}
      </div>

      {activeView === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map(template => (
            <div key={template.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ICONS.Form width="28" height="28" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">{template.title}</h3>
              <p className="text-slate-400 text-sm font-medium mb-8 line-clamp-2">{template.description || 'Sem descrição'}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => startMeeting(template)}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all"
                >
                  Iniciar Reunião
                </button>
                <button 
                  onClick={() => {
                    setBuilderForm(template);
                    setActiveView('builder');
                  }}
                  className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <ICONS.Settings width="18" height="18" />
                </button>
              </div>
            </div>
          ))}
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
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pergunta {idx + 1}</label>
                      <input 
                        type="text" 
                        value={q.label}
                        onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none"
                      />
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
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={q.required}
                        onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm font-bold text-slate-600">Obrigatória</span>
                    </div>
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
                          <input 
                            type="text" 
                            value={l.triggerValue}
                            onChange={(e) => {
                              const newLogic = [...(q.logic || [])];
                              newLogic[lIdx].triggerValue = e.target.value;
                              updateQuestion(q.id, { logic: newLogic });
                            }}
                            className="p-2 border-b border-slate-200 outline-none text-xs font-bold w-24"
                          />
                          <span className="text-xs font-bold text-slate-400">ir para</span>
                          <select 
                            value={l.goToQuestionId}
                            onChange={(e) => {
                              const newLogic = [...(q.logic || [])];
                              newLogic[lIdx].goToQuestionId = e.target.value;
                              updateQuestion(q.id, { logic: newLogic });
                            }}
                            className="p-2 border-b border-slate-200 outline-none text-xs font-bold"
                          >
                            <option value="">Próxima Pergunta</option>
                            <option value="end">Finalizar Formulário</option>
                            {builderForm.questions?.filter(other => other.id !== q.id).map(other => (
                              <option key={other.id} value={other.id}>{other.label.substring(0, 20)}...</option>
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
                        onClick={() => updateQuestion(q.id, { logic: [...(q.logic || []), { triggerValue: '', goToQuestionId: '' }] })}
                        className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600"
                      >
                        + Adicionar Lógica
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-10">
              <button 
                onClick={addQuestion}
                className="flex-1 py-5 border-2 border-dashed border-slate-200 rounded-[2rem] font-black text-slate-400 hover:border-blue-200 hover:text-blue-600 transition-all"
              >
                + ADICIONAR PERGUNTA
              </button>
              <button 
                onClick={saveTemplate}
                className="px-12 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
              >
                Salvar Formulário
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
                  <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
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
                <h3 className="text-2xl font-black text-slate-900 mb-8">
                  {selectedTemplate.questions[currentQuestionIndex].label}
                  {selectedTemplate.questions[currentQuestionIndex].required && <span className="text-red-500 ml-1">*</span>}
                </h3>

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
  );
};

export default MeetingForms;
