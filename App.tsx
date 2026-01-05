
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Person, Assignment, ShiftDay, Period } from './types';
import { getDaysForScale, getMonthName, dateToId } from './utils/dateUtils';
import TeamManager from './components/TeamManager';
import ShiftCard from './components/ShiftCard';
import Login from './components/Login';
import { supabase } from './lib/supabase';

const ADMIN_UID = '017f9ffa-525e-49f5-bb91-0606963f9bb3';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'escala' | 'equipe'>('escala');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  const isAuthorized = useMemo(() => user?.id === ADMIN_UID, [user]);
  const shiftDays = useMemo(() => getDaysForScale(currentYear, currentMonth), [currentYear, currentMonth]);

  const fetchData = useCallback(async () => {
    // Se não houver usuário, não busca
    if (!supabase.auth.getSession()) return;
    
    setSchemaError(null);
    try {
      const { data: dbPeople, error: peopleError } = await supabase
        .from('equipes')
        .select('*')
        .order('name');
      
      if (peopleError) {
        if (peopleError.message.includes('schema cache') || peopleError.message.includes('does not exist')) {
          setSchemaError('A tabela "equipes" precisa ser criada ou atualizada.');
        }
        throw peopleError;
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*');

      if (assignmentsError) {
        if (assignmentsError.message.includes('column') || assignmentsError.message.includes('schema cache')) {
          setSchemaError('As colunas da tabela "assignments" estão incorretas.');
        }
        throw assignmentsError;
      }

      setPeople(dbPeople || []);
      setAssignments(assignmentsData || []);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) fetchData();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentUser) fetchData();
      else if (event === 'SIGNED_OUT') {
        setUser(null);
        setPeople([]);
        setAssignments([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  const addPerson = async (name: string) => {
    if (!user || !isAuthorized) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('equipes')
        .insert([{ name, user_id: user.id }])
        .select();
      
      if (error) throw error;
      if (data && data[0]) {
        setPeople(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } catch (err: any) {
      alert('Erro ao cadastrar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const removePerson = async (id: string) => {
    if (!user || !isAuthorized) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('equipes').delete().eq('id', id);
      if (error) throw error;
      setPeople(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert('Erro ao remover: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (date: string, period: Period, slot: 1 | 2, personName: string) => {
    if (!user) return;
    setSaving(true);
    
    const existingAssign = assignments.find(a => a.date === date && a.period === period);
    const updatedAssignments = [...assignments];
    let upsertData: any;

    if (existingAssign) {
      const updatedItem = { ...existingAssign };
      if (slot === 1) updatedItem.person1_name = personName;
      else updatedItem.person2_name = personName;
      upsertData = { ...updatedItem, user_id: user.id };
      const idx = updatedAssignments.findIndex(a => a.date === date && a.period === period);
      updatedAssignments[idx] = updatedItem;
    } else {
      const newItem: Assignment = {
        date,
        period,
        person1_name: slot === 1 ? personName : '',
        person2_name: slot === 2 ? personName : '',
        user_id: user.id
      };
      upsertData = newItem;
      updatedAssignments.push(newItem);
    }

    setAssignments(updatedAssignments);
    
    try {
      const { error } = await supabase
        .from('assignments')
        .upsert(upsertData, { onConflict: 'user_id,date,period' });
      
      if (error) {
        if (error.message.includes('column') || error.message.includes('schema cache')) {
          setSchemaError('Erro crítico: A coluna "person1_name" não existe no banco de dados.');
        }
        throw error;
      }
    } catch (err: any) {
      console.error('Erro ao salvar escala:', err.message);
      fetchData(); 
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Acessando Supabase...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLoginSuccess={() => setLoading(true)} />;

  if (schemaError) {
    const sqlScript = `/* 1. REMOVE AS TABELAS ANTIGAS */
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS equipes;

/* 2. CRIA A TABELA DE EQUIPE */
CREATE TABLE equipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

/* 3. CRIA A TABELA DE ESCALA COM COLUNAS CORRETAS (SNAKE_CASE) */
CREATE TABLE assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  period text NOT NULL,
  person1_name text,
  person2_name text,
  user_id uuid REFERENCES auth.users(id),
  UNIQUE(user_id, date, period)
);

/* 4. ATUALIZA O CACHE DO POSTGREST */
NOTIFY pgrst, 'reload schema';`;

    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-[40px] shadow-2xl p-10 border border-red-100 overflow-hidden">
           <div className="flex items-center gap-4 mb-6">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-inner">
               <i className="fas fa-database text-xl"></i>
             </div>
             <div>
               <h2 className="text-2xl font-black text-gray-900 leading-tight">Conflito de Colunas</h2>
               <p className="text-red-500 text-xs font-bold uppercase tracking-widest">Ação Necessária</p>
             </div>
           </div>
           
           <p className="text-gray-600 mb-8 text-sm leading-relaxed">
             O banco de dados está usando nomes de colunas antigos (como <code>person1Name</code>) ou a coluna <code>person1_name</code> ainda não foi criada. Copie o script abaixo para corrigir:
           </p>
           
           <div className="bg-gray-900 rounded-2xl p-6 relative mb-8 group">
               <pre className="text-blue-400 font-mono text-[13px] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                 {sqlScript}
               </pre>
               <button 
                  onClick={() => {
                    navigator.clipboard.writeText(sqlScript);
                    alert('Script copiado! Agora cole no SQL Editor do Supabase.');
                  }}
                  className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
               >
                 <i className="fas fa-copy mr-2"></i>
                 COPIAR SQL
               </button>
           </div>
           
           <div className="space-y-4">
               <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-600 font-bold text-sm">1</div>
                 <p className="text-xs text-gray-500 leading-relaxed">Vá ao painel do Supabase &gt; <strong>SQL Editor</strong> &gt; <strong>New Query</strong>.</p>
               </div>
               <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-blue-600 font-bold text-sm">2</div>
                 <p className="text-xs text-gray-500 leading-relaxed">Cole o script, clique em <strong>RUN</strong> e aguarde a mensagem de sucesso.</p>
               </div>
               <button 
                onClick={() => {
                  setSchemaError(null);
                  fetchData();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all hover:-translate-y-1 active:translate-y-0 mt-4 uppercase tracking-widest text-sm"
               >
                 Tabelas Atualizadas! Recarregar
               </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {saving && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-300">
          <div className="bg-blue-600 text-white px-5 py-2 rounded-full shadow-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-400">
            <i className="fas fa-sync-alt animate-spin"></i>
            Cloud Update
          </div>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div>
              <h1 className="text-md font-black text-gray-900 tracking-tight">ESCALA 2026</h1>
              <p className="text-[11px] font-bold text-blue-600 truncate max-w-[200px]">
                Olá, {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Sincronizado</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setActiveTab('escala')}
                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'escala' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Escala
              </button>
              {isAuthorized && (
                <button
                  onClick={() => setActiveTab('equipe')}
                  className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'equipe' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Equipe
                </button>
              )}
            </nav>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all ml-2"
              title="Sair"
            >
              <i className="fas fa-power-off"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {activeTab === 'equipe' && isAuthorized ? (
          <TeamManager 
            people={people} 
            onAdd={addPerson} 
            onRemove={removePerson} 
            onRefresh={fetchData} 
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mb-8">
              <button onClick={() => changeMonth(-1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all active:scale-90 border border-gray-100">
                <i className="fas fa-chevron-left"></i>
              </button>
              <div className="text-center">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">{getMonthName(currentMonth)}</h2>
                <p className="text-blue-600 font-black tracking-[0.4em] text-[10px] uppercase opacity-50">{currentYear}</p>
              </div>
              <button onClick={() => changeMonth(1)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-all active:scale-90 border border-gray-100">
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {shiftDays.map((day, idx) => (
                <ShiftCard
                  key={`${day.date.getTime()}-${idx}`}
                  day={day}
                  people={people}
                  assignments={assignments}
                  onAssign={handleAssign}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 mt-16 text-center pb-12">
        <p className="text-gray-300 text-[9px] font-black uppercase tracking-[0.5em] mb-2">
          SISTEMA DE GESTÃO DE VOLUNTÁRIOS
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-100 text-[8px] text-gray-400 font-bold">
          <i className="fas fa-shield-alt text-green-400"></i>
          DADOS PROTEGIDOS POR SUPABASE RLS
        </div>
      </footer>
    </div>
  );
};

export default App;
