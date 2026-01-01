
import React, { useState, useEffect, useMemo } from 'react';
import { Person, Assignment, ShiftDay } from './types';
import { getDaysForScale, getMonthName } from './utils/dateUtils';
import TeamManager from './components/TeamManager';
import ShiftCard from './components/ShiftCard';
import Login from './components/Login';
import { supabase } from './lib/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'escala' | 'equipe'>('escala');
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar o mês visível, iniciando em Janeiro de 2026
  const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  const shiftDays = useMemo(() => getDaysForScale(currentYear, currentMonth), [currentYear, currentMonth]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    setLoading(true);
    try {
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', userId);
      
      if (peopleError) throw peopleError;
      setPeople(peopleData || []);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const addPerson = async (name: string) => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const newPerson = { id: newId, name, user_id: user.id };
    
    setPeople(prev => [...prev, { id: newId, name }]);
    
    const { error } = await supabase.from('people').insert([newPerson]);
    if (error) {
      console.error('Erro ao salvar pessoa:', error);
      fetchData(user.id);
    }
  };

  const removePerson = async (id: string) => {
    if (!user) return;
    setPeople(prev => prev.filter(p => p.id !== id));
    
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar pessoa:', error);
      fetchData(user.id);
    }
  };

  const handleAssign = async (date: string, period: 'MANHÃ' | 'NOITE', slot: 1 | 2, personId: string) => {
    if (!user) return;
    
    const existingAssignIdx = assignments.findIndex(a => a.date === date && a.period === period);
    const updatedAssignments = [...assignments];

    if (existingAssignIdx > -1) {
      const item = { ...updatedAssignments[existingAssignIdx] };
      if (slot === 1) item.person1Id = personId;
      else item.person2Id = personId;
      updatedAssignments[existingAssignIdx] = item;
      
      setAssignments(updatedAssignments);
      
      const updateData = slot === 1 ? { person1Id: personId } : { person2Id: personId };
      await supabase
        .from('assignments')
        .update(updateData)
        .match({ date, period, user_id: user.id });
    } else {
      const newItem = {
        date,
        period,
        person1Id: slot === 1 ? personId : '',
        person2Id: slot === 2 ? personId : '',
        user_id: user.id
      };
      setAssignments(prev => [...prev, newItem]);
      await supabase.from('assignments').insert([newItem]);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const changeMonth = (offset: number) => {
    setViewDate(prev => {
      const nextDate = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      return nextDate;
    });
  };

  if (!user && !loading) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen pb-12 bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-calendar-check text-xl sm:text-2xl"></i>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Escala 2026</h1>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter">Gerenciamento Anual</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <nav className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setActiveTab('escala')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'escala' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Escala
              </button>
              <button
                onClick={() => setActiveTab('equipe')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'equipe' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Equipe
              </button>
            </nav>

            <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>

            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-gray-400">Olá,</span>
              <span className="text-sm font-semibold text-gray-700">{userName}</span>
            </div>

            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
              title="Sair"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 sm:mt-10">
        {activeTab === 'equipe' ? (
          <TeamManager people={people} onAdd={addPerson} onRemove={removePerson} />
        ) : (
          <div className="space-y-6">
            {/* Navegação de Mês */}
            <div className="flex items-center justify-between bg-[#1e3a8a] text-white p-4 sm:p-6 rounded-2xl shadow-xl mb-8">
              <button 
                onClick={() => changeMonth(-1)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
              >
                <i className="fas fa-chevron-left text-xl"></i>
              </button>
              
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest">
                  {getMonthName(currentMonth)}
                </h2>
                <p className="text-blue-200 font-bold tracking-widest mt-1">{currentYear}</p>
              </div>

              <button 
                onClick={() => changeMonth(1)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
              >
                <i className="fas fa-chevron-right text-xl"></i>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Cronograma de Atividades</h3>
                <p className="text-sm text-gray-400">Defina os responsáveis para cada culto</p>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c5e1a5]/20 text-[#689f38]">
                  <div className="w-2 h-2 rounded-full bg-[#c5e1a5] shadow-sm"></div> Domingo
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600">
                  <div className="w-2 h-2 rounded-full bg-[#4285f4] shadow-sm"></div> Quarta
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              {shiftDays.length > 0 ? (
                shiftDays.map((day, idx) => (
                  <ShiftCard
                    key={`${day.date.getTime()}-${idx}`}
                    day={day}
                    people={people}
                    assignments={assignments}
                    onAssign={handleAssign}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">
                  Nenhum dia de escala encontrado para este período.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 mt-16 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6"></div>
        <p className="text-gray-400 text-xs font-medium">
          Sistema de Escala &copy; 2026 - Controle de Voluntários
        </p>
        <div className="flex justify-center items-center gap-4 mt-4 opacity-50 grayscale">
          <img src="https://xbttslpdmbzdfpyypdtj.supabase.co/storage/v1/object/public/logos/supabase.svg" alt="Supabase" className="h-4" />
        </div>
      </footer>
    </div>
  );
};

export default App;
