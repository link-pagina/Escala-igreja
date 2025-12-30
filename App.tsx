
import React, { useState, useEffect, useMemo } from 'react';
import { Person, Assignment, ShiftDay } from './types';
import { getTargetMonthInfo, getDaysForScale, getMonthName } from './utils/dateUtils';
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
  
  const targetInfo = useMemo(() => getTargetMonthInfo(), []);
  const shiftDays = useMemo(() => getDaysForScale(targetInfo.year, targetInfo.month), [targetInfo]);

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

  if (!user && !loading) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Sincronizando com a nuvem...</p>
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
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">Sistema de Escala</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-tighter">
                {getMonthName(targetInfo.month)} {targetInfo.year}
                {targetInfo.isTransitioned && (
                  <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">PRÓXIMO</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-gray-400">Logado como</span>
              <span className="text-sm font-semibold text-gray-700">{userName}</span>
            </div>
            
            <nav className="hidden sm:flex gap-1 p-1 bg-gray-100 rounded-lg">
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

            <button 
              onClick={handleLogout}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
              title="Sair do sistema"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 sm:mt-10">
        <div className="flex sm:hidden gap-1 p-1 bg-gray-100 rounded-xl mb-6 shadow-inner">
          <button
            onClick={() => setActiveTab('escala')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'escala' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'
            }`}
          >
            <i className="fas fa-list-ul mr-2"></i>Escala
          </button>
          <button
            onClick={() => setActiveTab('equipe')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'equipe' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'
            }`}
          >
            <i className="fas fa-users mr-2"></i>Equipe
          </button>
        </div>

        {activeTab === 'equipe' ? (
          <TeamManager people={people} onAdd={addPerson} onRemove={removePerson} />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Cronograma Mensal</h2>
                <p className="text-sm text-gray-400">Preencha os responsáveis por cada período</p>
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
            
            <div className="grid grid-cols-1 gap-4">
              {shiftDays.map((day, idx) => (
                <ShiftCard
                  key={idx}
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

      <footer className="max-w-4xl mx-auto px-4 mt-16 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6"></div>
        <p className="text-gray-400 text-xs font-medium">
          Reset automático todo último dia do mês às 18:30
        </p>
        <div className="flex justify-center items-center gap-4 mt-4 opacity-50 grayscale">
          <img src="https://xbttslpdmbzdfpyypdtj.supabase.co/storage/v1/object/public/logos/supabase.svg" alt="Supabase" className="h-4" />
          <span className="text-[10px] text-gray-400">Powered by Supabase Auth & Cloud Data</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
