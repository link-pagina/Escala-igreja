
export type Period = 'MANHÃ' | 'NOITE';

export interface Person {
  id: string;
  name: string;
  user_id?: string;
}

export interface Assignment {
  id?: string;
  date: string; // Formato YYYY-MM-DD
  period: Period;
  person1Id: string;
  person2Id: string;
  user_id?: string;
}

export interface ShiftDay {
  date: Date;
  dayOfWeek: string;
  periods: Period[];
}
