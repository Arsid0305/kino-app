import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { Movie } from './movieTypes';
import { serializeMovie } from './supabaseMovieStore';

type ChatMessageRow = Tables<'chat_messages'>;
type ChatMessageInsert = TablesInsert<'chat_messages'>;

export interface StoredChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions: Movie[];
  createdAt: string;
}

function hydrateSuggestion(value: unknown): Movie | null {
  if (!value || typeof value !== 'object') return null;

  const movie = value as Record<string, unknown>;
  return {
    id: String(movie.id ?? `chat:${crypto.randomUUID()}`),
    title: String(movie.title ?? movie.titleRu ?? 'Untitled'),
    titleRu: String(movie.titleRu ?? movie.title ?? 'Untitled'),
    year: Number(movie.year ?? 0),
    genre: Array.isArray(movie.genre) ? movie.genre.map(String) : [],
    duration: Number(movie.duration ?? 0),
    mood: Array.isArray(movie.mood) ? movie.mood.map(String) : [],
    poster: typeof movie.poster === 'string' ? movie.poster : undefined,
    description: typeof movie.description === 'string' ? movie.description : '',
    director: typeof movie.director === 'string' ? movie.director : '',
    forCompany: (movie.forCompany as Movie['forCompany']) ?? 'any',
    timeOfDay: Array.isArray(movie.timeOfDay)
      ? movie.timeOfDay as Movie['timeOfDay']
      : ['evening'],
    format: (movie.format as Movie['format']) ?? 'medium',
    kpRating: typeof movie.kpRating === 'number' ? movie.kpRating : undefined,
    country: typeof movie.country === 'string' ? movie.country : undefined,
    type: (movie.type as Movie['type']) ?? 'film',
    predictedRating: typeof movie.predictedRating === 'number' ? movie.predictedRating : undefined,
    reasonToWatch: typeof movie.reasonToWatch === 'string' ? movie.reasonToWatch : undefined,
    kpQuery: typeof movie.kpQuery === 'string' ? movie.kpQuery : undefined,
    source: (movie.source as Movie['source']) ?? 'ai-chat',
  };
}

function fromRow(row: ChatMessageRow): StoredChatMessage {
  const rawSuggestions = Array.isArray(row.movie_suggestions) ? row.movie_suggestions : [];

  return {
    id: row.id,
    role: row.role as StoredChatMessage['role'],
    content: row.content,
    suggestions: rawSuggestions.map(hydrateSuggestion).filter((movie): movie is Movie => Boolean(movie)),
    createdAt: row.created_at,
  };
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw error ?? new Error('Нет активного пользователя Supabase');
  }

  return data.user.id;
}

export async function loadChatMessages(limit = 40): Promise<StoredChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).slice().reverse().map(fromRow);
}

export async function saveChatMessage(
  role: StoredChatMessage['role'],
  content: string,
  suggestions: Movie[] = []
): Promise<StoredChatMessage> {
  const userId = await getCurrentUserId();
  const payload: ChatMessageInsert = {
    user_id: userId,
    role,
    content,
    movie_suggestions: suggestions.map(movie => serializeMovie(movie)),
  };

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return fromRow(data);
}
