
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
  const [viewDate, setViewDate] = useState(new Date(2026, 0, 1));

  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  const isAuthorized = useMemo(() => user?.id === ADMIN_UID, [user]);
  const shiftDays = useMemo(() => getDaysForScale(currentYear, currentMonth), [currentYear, currentMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Busca membros da equipe
      const { data: dbPeople, error: peopleError } = await supabase
        .from('equipes')
        .select('*')
        .order('name');
      
      if (peopleError) throw peopleError;

      // Busca atribuições da escala
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*');

      if (assignmentsError) throw assignmentsError;

      setPeople(dbPeople || []);
      setAssignments(assignmentsData || []);
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      console.error('Erro ao buscar dados:', errorMsg);
      alert('Erro ao carregar dados: ' + errorMsg);
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
      const errorMsg = err.message || JSON.stringify(err);
      console.error('Erro ao adicionar na tabela equipes:', errorMsg);
      alert('Erro ao cadastrar pessoa: ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const removePerson = async (id: string) => {
    if (!user || !isAuthorized) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('equipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPeople(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      console.error('Erro ao remover pessoa:', errorMsg);
      alert('Erro ao remover: ' + errorMsg);
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
      if (slot === 1) updatedItem.person1Name = personName;
      else updatedItem.person2Name = personName;
      upsertData = { ...updatedItem, user_id: user.id };
      const idx = updatedAssignments.findIndex(a => a.date === date && a.period === period);
      updatedAssignments[idx] = updatedItem;
    } else {
      const newItem: Assignment = {
        date,
        period,
        person1Name: slot === 1 ? personName : '',
        person2Name: slot === 2 ? personName : '',
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
      
      if (error) throw error;
    } catch (err: any) {
      const errorMsg = err.message || JSON.stringify(err);
      console.error('Erro ao salvar escala:', errorMsg);
      fetchData(); // Reverte o estado local em caso de erro
    } finally {
      setSaving(false);
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
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Conectando ao Supabase...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLoginSuccess={() => setLoading(true)} />;

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {saving && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in zoom-in duration-300">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <i className="fas fa-sync-alt animate-spin"></i>
            Sincronizando Banco
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-calendar-check text-2xl"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Escala 2026</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Equipe Online</p>
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
              {isAuthorized && (
                <button
                  onClick={() => setActiveTab('equipe')}
                  className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'equipe' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  Equipe
                </button>
              )}
            </nav>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"
              title="Sair"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-10">
        {activeTab === 'equipe' && isAuthorized ? (
          <TeamManager 
            people={people} 
            onAdd={addPerson} 
            onRemove={removePerson}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-[#1e3a8a] text-white p-8 rounded-[40px] shadow-2xl mb-12 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
              <button onClick={() => changeMonth(-1)} className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all z-10 border border-white/10 active:scale-90">
                <i className="fas fa-chevron-left text-xl"></i>
              </button>
              <div className="text-center z-10">
                <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-2">{getMonthName(currentMonth)}</h2>
                <p className="text-blue-200 font-black tracking-[0.4em] text-sm">{currentYear}</p>
              </div>
              <button onClick={() => changeMonth(1)} className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 transition-all z-10 border border-white/10 active:scale-90">
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
      </main>

      <footer className="max-w-4xl mx-auto px-4 mt-20 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8"></div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
          Gerenciador de Escala &copy; 2026 &bull; Cloud Verified
        </p>
      </footer>
    </div>
  );
};

export default App;
