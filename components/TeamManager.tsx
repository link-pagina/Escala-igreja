import { supabase } from './supabaseClient';
import React, { useState } from 'react';
import { Person } from '../types';

interface TeamManagerProps {
  people: Person[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}

// 1. Esta parte carrega os dados do banco assim que o site abre
  useEffect(() => {
    const fetchPeople = async () => {
      const { data, error } = await supabase
        .from('equipes')
        .select('*')
        .order('nome', { ascending: true });

      if (data) {
        // Converte o formato do banco para o formato que o seu site entende
        const formattedPeople = data.map(p => ({
          id: p.id.toString(),
          name: p.nome
        }));
        setPeople(formattedPeople);
      }
    };

    fetchPeople();
  }, []);

  // 2. Esta função salva o nome no Supabase
  const handleAddPerson = async (name: string) => {
    const { data, error } = await supabase
      .from('equipes')
      .insert([{ nome: name }])
      .select();

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else if (data) {
      const newPerson = { id: data[0].id.toString(), name: name };
      setPeople(prev => [...prev, newPerson]);
    }
  };


  // 3. Esta função remove o nome do Supabase
  const handleRemovePerson = async (id: string) => {
    const { error } = await supabase
      .from('equipes')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Erro ao remover");
    } else {
      setPeople(prev => prev.filter(p => p.id !== id));
    }
  };

    }

{activeTab === 'teams' && (
  <TeamManager 
    people={people} 
    onAdd={handleAddPerson} 
    onRemove={handleRemovePerson} 
  />
)}

   return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-3 text-gray-900">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-users-cog text-xl"></i>
            </div>
            Gestão da Equipe
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Os nomes abaixo aparecem na escala.</p>
        </div>
        <div className="flex gap-2">
           <button
            onClick={exportToTxt}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2"
          >
            <i className="fas fa-file-export"></i>
            Exportar TXT
          </button>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 flex items-center">
            {people.length} Membros
          </div>
        </div>
      </div>

      <div className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-10 p-4 bg-gray-50 rounded-2xl border border-gray-100">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
              <i className="fas fa-user-plus"></i>
            </span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome completo do voluntário"
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <i className="fas fa-plus"></i>
            Cadastrar
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Origem</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Nome do Voluntário</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {people.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-20 text-center">
                    <p className="text-gray-400 italic font-medium">Nenhum membro cadastrado ainda.</p>
                  </td>
                </tr>
              ) : (
                people.map((person) => (
                  <tr key={person.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${person.id.startsWith('txt-') ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {person.id.startsWith('txt-') ? 'Arquivo TXT' : 'Banco de Dados'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{person.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!person.id.startsWith('txt-') && (
                        <button
                          onClick={() => {
                            if(confirm(`Deseja realmente remover ${person.name}?`)) {
                              onRemove(person.id);
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                          title="Remover"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeamManager;
