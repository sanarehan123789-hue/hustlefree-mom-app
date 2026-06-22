export type MomProfile = 'housewife' | 'working' | 'remote';

export interface Chore {
  id: string;
  userId: string;
  title: string;
  type: 'tiny' | 'deep';
  completed: boolean;
  createdAt: string;
  profile: MomProfile;
}

export interface BudgetLog {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  profile: MomProfile;
}

export interface TimeBlock {
  id: string;
  userId: string;
  time: string; // e.g. "07:00 AM - 08:30 AM"
  activity: string;
  profile: MomProfile;
  isCompleted: boolean;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}
