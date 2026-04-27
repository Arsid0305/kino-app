import { supabase } from '@/integrations/supabase/client';
import { FilterState, Movie, WatchedMovie } from './movieTypes';
import { buildFilterSummary, buildTasteProfileSummary, toMovieContext } from './tasteProfile';

const RECOMMENDATION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/movie-recommendation`;

function normalizeRecommendation(raw: Record<string, unknown>): Movie {
  const duration = Number(raw.duration ?? 110);
  const format = raw.format === 'short' || raw.format === 'long' ? raw.format : 'medium';
  const type = raw.type === 'series' ? 'series' : raw.type === 'miniseries' ? 'miniseries' : 'film';
  const forCompany = raw.forCompany === 'solo' || raw.forCompany === 'pair' || raw.forCompany === 'group'
    ? raw.forCompany
    : 'any';

  return {
    id: `ai-global:${String(raw.kpQuery ?? raw.titleRu ?? raw.title ?? crypto.randomUUID())}`,
    title: String(raw.title ?? raw.titleRu ?? 'Untitled'),
    titleRu: String(raw.titleRu ?? raw.title ?? 'Untitled'),
    year: Number(raw.year ?? new Date().getFullYear()),
    genre: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
    duration,
    mood: Array.isArray(raw.mood) ? raw.mood.map(String) : ['thoughtful'],
    description: String(raw.description ?? ''),
    director: String(raw.director ?? ''),
    forCompany,
    timeOfDay: Array.isArray(raw.timeOfDay)
      ? raw.timeOfDay as Movie['timeOfDay']
      : ['evening'],
    format,
    kpRating: typeof raw.kpRating === 'number' ? raw.kpRating : undefined,
    country: typeof raw.country === 'string' ? raw.country : undefined,
    type,
    predictedRating: typeof raw.predictedRating === 'number' ? raw.predictedRating : undefined,
    reasonToWatch: String(raw.reasonToWatch ?? ''),
    kpQuery: String(raw.kpQuery ?? raw.titleRu ?? raw.title ?? ''),
    source: 'ai-global',
  };
}

export async function requestGlobalRecommendation(
  filters: FilterState,
  watched: WatchedMovie[],
  watchlist: Movie[],
  dismissed: Movie[] = []
) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Нужно войти в облачный аккаунт, чтобы получить глобальную рекомендацию.');
  }

  const response = await fetch(RECOMMENDATION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      filters: buildFilterSummary(filters),
      tasteProfile: buildTasteProfileSummary(watched, watchlist),
      watchedMovies: watched.slice(0, 80).map(toMovieContext),
      watchlistMovies: watchlist.slice(0, 80).map(toMovieContext),
      dismissedMovies: dismissed.slice(0, 80).map(toMovieContext),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Ошибка recommendation endpoint' }));
    throw new Error(error.error ?? `Ошибка ${response.status}`);
  }

  const payload = await response.json();
  const recs = Array.isArray(payload.recommendations)
    ? payload.recommendations
    : [payload.recommendation ?? payload.recommendations];
  return recs.map((r: Record<string, unknown>) => normalizeRecommendation(r));
}
