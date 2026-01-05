
import React, { useState } from 'react';
import { Person } from '../types';

interface TeamManagerProps {
  people: Person[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onRefresh: () => Promise<void>;
}

const TeamManager: React.FC<TeamManagerProps> = ({ people, onAdd, onRemove, onRefresh }) => {
  const [newName, setNewName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

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
          <p className="text-sm text-gray-500 mt-1 font-medium">Controle de acesso exclusivo para administradores.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              isRefreshing 
                ? 'bg-gray-100 text-gray-400' 
                : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 shadow-sm active:scale-95'
            }`}
          >
            <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
            Recarregar Lista
          </button>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
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
            <i className="fas fa-save"></i>
            Salvar no Banco
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Membro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isRefreshing ? (
                <tr>
                  <td colSpan={2} className="px-6 py-20 text-center">
                    <i className="fas fa-circle-notch fa-spin text-blue-600 text-2xl mb-4"></i>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Buscando nomes no Supabase...</p>
                  </td>
                </tr>
              ) : people.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-20 text-center">
                    <p className="text-gray-400 italic font-medium">Nenhum membro cadastrado.</p>
                  </td>
                </tr>
              ) : (
                people.map((person) => (
                  <tr key={person.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-700 group-hover:text-blue-700 transition-colors">{person.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          if(confirm(`Remover ${person.name} permanentemente do banco?`)) {
                            onRemove(person.id);
                          }
                        }}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-300 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                        title="Remover do Banco"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
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
