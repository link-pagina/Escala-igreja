
import React from 'react';
import { ShiftDay, Person, Assignment, Period } from '../types';
import { formatDateDisplay, dateToId } from '../utils/dateUtils';

interface PeriodRowProps {
  period: Period;
  dateKey: string;
  people: Person[];
  data: { person1Id: string; person2Id: string };
  onAssign: (date: string, period: Period, slot: 1 | 2, personId: string) => void;
}

const PeriodRow: React.FC<PeriodRowProps> = ({ period, dateKey, people, data, onAssign }) => (
  <div className="flex flex-col sm:flex-row items-center gap-4 py-3 first:pt-0 last:pb-0 border-b last:border-0 border-gray-100">
    <div className="w-24 font-bold text-gray-700 text-center sm:text-left">{period}</div>
    <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
      <select
        value={data.person1Id}
        onChange={(e) => onAssign(dateKey, period, 1, e.target.value)}
        className="flex-1 bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
      >
        <option value="">- Escolha -</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select
        value={data.person2Id}
        onChange={(e) => onAssign(dateKey, period, 2, e.target.value)}
        className="flex-1 bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
      >
        <option value="">- Escolha -</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  </div>
);

interface ShiftCardProps {
  day: ShiftDay;
  people: Person[];
  assignments: Assignment[];
  onAssign: (date: string, period: Period, slot: 1 | 2, personId: string) => void;
}

const ShiftCard: React.FC<ShiftCardProps> = ({ day, people, assignments, onAssign }) => {
  const isSunday = day.dayOfWeek === 'DOMINGO';
  const headerBg = isSunday ? 'bg-[#c5e1a5]' : 'bg-[#4285f4]';
  const headerText = isSunday ? 'text-gray-800' : 'text-white';
  const borderColor = isSunday ? 'border-[#aed581]' : 'border-[#3b78e7]';
  const dateKey = dateToId(day.date);

  const getAssignmentData = (period: Period) => {
    const found = assignments.find(a => a.date === dateKey && a.period === period);
    return {
      person1Id: found?.person1Id || '',
      person2Id: found?.person2Id || ''
    };
  };

  return (
    <div className={`mb-6 rounded-2xl overflow-hidden border-2 ${borderColor} bg-white shadow-md transition-transform hover:scale-[1.01]`}>
      <div className={`${headerBg} ${headerText} text-center py-4 font-bold text-xl uppercase tracking-wider`}>
        {day.dayOfWeek} - {formatDateDisplay(day.date)}
      </div>
      <div className="p-5 space-y-4">
        {day.periods.map(period => (
          <PeriodRow 
            key={`${dateKey}-${period}`} 
            period={period} 
            dateKey={dateKey}
            people={people}
            data={getAssignmentData(period)}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
};

export default ShiftCard;