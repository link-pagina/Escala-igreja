
export type Period = 'MANHÃ' | 'NOITE';

export interface Person {
  id: string;
  name: string;
}

export interface Assignment {
  date: string; // ISO string or YYYY-MM-DD
  period: Period;
  person1Id: string;
  person2Id: string;
}

export interface ShiftDay {
  date: Date;
  dayOfWeek: string;
  periods: Period[];
}
