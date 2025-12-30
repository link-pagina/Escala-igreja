
import { ShiftDay, Period } from '../types';

/**
 * Returns the month and year that should be displayed based on the rule:
 * Always on the last day of each month, starting at 18:30, the scale resets to the next month.
 */
export const getTargetMonthInfo = (referenceDate: Date = new Date()) => {
  const now = referenceDate;
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Find last day of current month
  const lastDay = new Date(year, month + 1, 0);
  lastDay.setHours(18, 30, 0, 0);

  if (now >= lastDay) {
    // Show next month
    const nextMonthDate = new Date(year, month + 1, 1);
    return {
      month: nextMonthDate.getMonth(),
      year: nextMonthDate.getFullYear(),
      isTransitioned: true
    };
  }

  return {
    month,
    year,
    isTransitioned: false
  };
};

export const getDaysForScale = (year: number, month: number): ShiftDay[] => {
  const days: ShiftDay[] = [];
  const date = new Date(year, month, 1);

  while (date.getMonth() === month) {
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 3 = Wednesday
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
  return date.toISOString().split('T')[0];
};

export const getMonthName = (monthIndex: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex];
};
