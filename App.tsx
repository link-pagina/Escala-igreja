
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Person, Assignment, ShiftDay, Period } from './types';
import { getDaysForScale, getMonthName, dateToId } from './utils/dateUtils';
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
  const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  const shiftDays = useMemo(() => getDaysForScale(currentYear, currentMonth), [currentYear, currentMonth]);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const [peopleRes, assignmentsRes] = await Promise.all([
        supabase.from('people').select('*').eq('user_id', userId).order('name'),
        supabase.from('assignments').select('*').eq('user_id', userId)
      ]);
      
      if (peopleRes.error) throw peopleRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setPeople(peopleRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (err) {
      console.error('Erro ao buscar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchData(currentUser.id);
      } else {
        setPeople([]);
        setAssignments([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  const addPerson = async (name: string) => {
    if (!user) return;
    const newId = crypto.randomUUID();
    const newPerson = { id: newId, name, user_id: user.id };
    setPeople(prev => [...prev, newPerson]);
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
      console.error('Erro ao remover do banco:', error);
      fetchData(user.id);
    }
  };

  const handleAssign = async (date: string, period: Period, slot: 1 | 2, personId: string) => {
    if (!user) return;
    const existingAssign = assignments.find(a => a.date === date && a.period === period);
    const updatedAssignments = [...assignments];
    let upsertData: any;

    if (existingAssign) {
      const updatedItem = { ...existingAssign };
      if (slot === 1) updatedItem.person1Id = personId;
      else updatedItem.person2Id = personId;
      upsertData = { ...updatedItem, user_id: user.id };
      const idx = updatedAssignments.findIndex(a => a.date === date && a.period === period);
      updatedAssignments[idx] = updatedItem;
    } else {
      const newItem: Assignment = {
        date,
        period,
        person1Id: slot === 1 ? personId : '',
        person2Id: slot === 2 ? personId : '',
        user_id: user.id
      };
      upsertData = newItem;
      updatedAssignments.push(newItem);
    }

    setAssignments(updatedAssignments);
    const { error } = await supabase.from('assignments').upsert(upsertData, { onConflict: 'user_id,date,period' });
    if (error) {
      console.error('Erro ao salvar escala:', error);
      fetchData(user.id);
    }
  };

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando Dados...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => setLoading(true)} />;
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-calendar-check text-2xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Escala 2026</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sincronizado na Nuvem</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <nav className="flex gap-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setActiveTab('escala')}
                className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'escala' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Escala
              </button>
              <button
                onClick={() => setActiveTab('equipe')}
                className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'equipe' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
              >
                Equipe
              </button>
            </nav>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-gray-400">Logado como</span>
              <span className="text-sm font-black text-gray-700">{userName}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
              title="Encerrar Sessão"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-10">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="flex-1">
            {activeTab === 'equipe' ? (
              <TeamManager people={people} onAdd={addPerson} onRemove={removePerson} />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-[#1e3a8a] text-white p-8 rounded-[40px] shadow-2xl mb-12 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
                  <button onClick={() => changeMonth(-1)} className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90 z-10 border border-white/10">
                    <i className="fas fa-chevron-left text-xl"></i>
                  </button>
                  <div className="text-center z-10">
                    <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-2">{getMonthName(currentMonth)}</h2>
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-px w-8 bg-blue-400"></div>
                      <p className="text-blue-200 font-black tracking-[0.4em] text-sm">{currentYear}</p>
                      <div className="h-px w-8 bg-blue-400"></div>
                    </div>
                  </div>
                  <button onClick={() => changeMonth(1)} className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all active:scale-90 z-10 border border-white/10">
                    <i className="fas fa-chevron-right text-xl"></i>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
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
          </div>

          {/* Sidebar de Referência da Equipe (Exibida na Escala) */}
          {activeTab === 'escala' && (
            <aside className="w-full lg:w-72 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                  <i className="fas fa-users text-blue-500"></i>
                  Equipe Disponível
                </h3>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {people.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhum membro cadastrado.</p>
                  ) : (
                    people.map(person => (
                      <div key={person.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-bold text-blue-600 shadow-sm">
                          {person.name.charAt(0)}
                        </div>
                        <span className="text-sm font-bold text-gray-700 truncate">{person.name}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-50">
                  <button 
                    onClick={() => setActiveTab('equipe')}
                    className="w-full py-3 text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    Editar Equipe
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
      
      <footer className="max-w-6xl mx-auto px-4 mt-20 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8"></div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
          Controle de Escala &copy; {currentYear} &bull; v2.0
        </p>
      </footer>
    </div>
  );
};

export default App;
