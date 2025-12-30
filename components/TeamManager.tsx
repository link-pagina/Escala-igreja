
import React, { useState } from 'react';
import { Person } from '../types';

interface TeamManagerProps {
  people: Person[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ people, onAdd, onRemove }) => {
  const [newName, setNewName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          <i className="fas fa-users text-blue-600"></i>
          Gestão de Equipe
        </h2>
        <p className="text-sm text-gray-500 mt-1">Adicione ou remova nomes que farão parte da escala.</p>
      </div>

      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Digite o nome completo"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Adicionar
          </button>
        </form>

        <div className="space-y-2">
          {people.length === 0 ? (
            <div className="text-center py-8 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
              Nenhum membro cadastrado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {people.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group hover:border-blue-200 hover:bg-blue-50 transition-all"
                >
                  <span className="font-medium text-gray-700 truncate">{person.name}</span>
                  <button
                    onClick={() => onRemove(person.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remover"
                  >
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManager;
