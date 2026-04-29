export interface Movie {
  id: string;
  title: string;
  titleRu: string;
  year: number;
  genre: string[];
  duration: number; // minutes
  mood: string[];
  rating?: number; // user rating 1-10
  poster?: string;
  description: string;
  director: string;
  forCompany: 'solo' | 'pair' | 'group' | 'any';
  timeOfDay: ('morning' | 'afternoon' | 'evening' | 'night')[];
  format: 'short' | 'medium' | 'long'; // <90, 90-120, >120
  kpRating?: number;
  country?: string;
  type?: 'film' | 'series';
  predictedRating?: number;
  reasonToWatch?: string;
  kpQuery?: string;
  source?: 'local' | 'ai-global' | 'ai-chat';
}

export interface WatchedMovie extends Movie {
  watchedAt: string;
  rating: number;
  notes?: string;
}

export interface FilterState {
  type: string | null;
  timeOfDay: string | null;
  context: string | null;
  format: string | null;
  genre: string | null;
  mood: string | null;
  company: string | null;
}

export const TYPE_OPTIONS = [
  { value: 'film', label: 'Фильм', icon: '🎬' },
  { value: 'series', label: 'Сериал', icon: '📺' },
  { value: 'miniseries', label: 'Минисериал', icon: '📼' },
];

export const TIME_OPTIONS = [
  { value: 'morning', label: 'Утро', icon: '🌅' },
  { value: 'afternoon', label: 'День', icon: '☀️' },
  { value: 'evening', label: 'Вечер', icon: '🌆' },
  { value: 'night', label: 'Ночь', icon: '🌙' },
];

export const CONTEXT_OPTIONS = [
  { value: 'work', label: 'Работа', icon: '💼' },
  { value: 'break', label: 'Перерыв', icon: '☕' },
  { value: 'free', label: 'Свободное время', icon: '🎉' },
];

export const FORMAT_OPTIONS = [
  { value: 'short', label: 'Короткий', subtitle: '< 90 мин', icon: '⚡' },
  { value: 'medium', label: 'Средний', subtitle: '90–120 мин', icon: '🎬' },
  { value: 'long', label: 'Длинный', subtitle: '> 120 мин', icon: '🍿' },
];

export const GENRE_OPTIONS = [
  { value: 'drama', label: 'Драма', icon: '🎭' },
  { value: 'comedy', label: 'Комедия', icon: '😂' },
  { value: 'thriller', label: 'Триллер', icon: '😰' },
  { value: 'scifi', label: 'Фантастика', icon: '🚀' },
  { value: 'action', label: 'Боевик', icon: '💥' },
  { value: 'romance', label: 'Мелодрама', icon: '❤️' },
  { value: 'horror', label: 'Ужасы', icon: '👻' },
  { value: 'documentary', label: 'Документальный', icon: '📹' },
];

export const MOOD_OPTIONS = [
  { value: 'happy', label: 'Весёлое', icon: '😊' },
  { value: 'thoughtful', label: 'Задумчивое', icon: '🤔' },
  { value: 'excited', label: 'Азарт', icon: '🔥' },
  { value: 'calm', label: 'Спокойное', icon: '😌' },
  { value: 'sad', label: 'Грустное', icon: '😢' },
  { value: 'nostalgic', label: 'Ностальгия', icon: '🥹' },
];

export const COMPANY_OPTIONS = [
  { value: 'solo', label: 'Один', icon: '🧑' },
  { value: 'pair', label: 'Вдвоём', icon: '👫' },
  { value: 'group', label: 'Компания', icon: '👥' },
];
