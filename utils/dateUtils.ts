
import { ShiftDay, Period } from '../types';

export const getDaysForScale = (year: number, month: number): ShiftDay[] => {
  const days: ShiftDay[] = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    // 0 = Domingo, 3 = Quarta
    if (dayOfWeek === 0) {
      days.push({
        date: new Date(date),
        dayOfWeek: 'DOMINGO',
        periods: ['MANHÃ', 'NOITE']
      });
    } else if (dayOfWeek === 3) {
      days.push({
        date: new Date(date),
        dayOfWeek: 'QUARTA-FEIRA',
        periods: ['NOITE']
      });
    }
    date.setDate(date.getDate() + 1);
  }

  return days;
};

export const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const dateToId = (date: Date): string => {
  // Ajuste para evitar problemas de fuso horário ao converter para ID
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getMonthName = (monthIndex: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex];
};
