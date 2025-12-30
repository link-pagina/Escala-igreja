
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

  // Handle Auth changes
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
      // Fetch People
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .eq('user_id', userId);
      
      if (peopleError) throw peopleError;
      setPeople(peopleData || []);

      // Fetch Assignments
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
      fetchData(user.id); // Rollback
    }
  };

  const removePerson = async (id: string) => {
    if (!user) return;
    setPeople(prev => prev.filter(p => p.id !== id));
    
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar pessoa:', error);
      fetchData(user.id); // Rollback
    }
  };

  const handleAssign = async (date: string, period: 'MANHÃ' | 'NOITE', slot: 1 | 2, personId: string) => {
    if (!user) return;
    
    setAssignments(prev => {
      const existingIdx = prev.findIndex(a => a.date === date && a.period === period);
      const updated = [...prev];

      if (existingIdx > -1) {
        const item = { ...updated[existingIdx] };
        if (slot === 1) item.person1Id = personId;
        else item.person2Id = personId;
        updated[existingIdx] = item;
      } else {
        updated.push({
          date,
          period,
          person1Id: slot === 1 ? personId : '',
          person2Id: slot === 2 ? personId : ''
        });
      }
      return updated;
    });

    const existingAssign = assignments.find(a => a.date === date && a.period === period);
    
    if (existingAssign) {
      const updateData = slot === 1 ? { person1Id: personId } : { person2Id: personId };
      const { error } = await supabase
        .from('assignments')
        .update(updateData)
        .match({ date, period, user_id: user.id });
      if (error) console.error('Erro ao atualizar:', error);
    } else {
      const insertData = {
        date,
        period,
        person1Id: slot === 1 ? personId : '',
        person2Id: slot === 2 ? personId : '',
        user_id: user.id
      };
      const { error } = await supabase.from('assignments').insert([insertData]);
      if (error) console.error('Erro ao inserir:', error);
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
          <p className="text-gray-500 font-medium">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <i className="fas fa-calendar-alt text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none">Sistema de Escala</h1>
              <p className="text-sm text-gray-500 mt-1">
                {getMonthName(targetInfo.month)} {targetInfo.year}
                {targetInfo.isTransitioned && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold uppercase">
                    Próximo Mês
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors"
              title="Sair"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        {/* Mobile Navigation Tabs */}
        <div className="flex sm:hidden gap-1 p-1 bg-gray-100 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('escala')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'escala' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500'
            }`}
          >
            Escala
          </button>
          <button
            onClick={() => setActiveTab('equipe')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'equipe' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-500'
            }`}
          >
            Equipe
          </button>
        </div>

        {activeTab === 'equipe' ? (
          <TeamManager
            people={people}
            onAdd={addPerson}
            onRemove={removePerson}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Escala de Serviço</h2>
              <div className="flex gap-4 text-xs font-semibold uppercase text-gray-400">
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#c5e1a5]"></div> Domingo
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#4285f4]"></div> Quarta
                </span>
              </div>
            </div>
            
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
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 mt-12 text-center text-xs text-gray-400">
        <p>A escala é automaticamente trocada para o mês seguinte todo último dia do mês às 18:30.</p>
        <p className="mt-1 italic">Conectado ao Supabase Cloud Sync</p>
      </footer>
    </div>
  );
};

export default App;
