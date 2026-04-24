import { FilterState, Movie, WatchedMovie } from './movieTypes';

function topEntries(values: string[], limit = 5): string[] {
  const counts = new Map<string, number>();

  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

export function buildFilterSummary(filters: FilterState): string[] {
  return [
    filters.type ? `type=${filters.type}` : null,
    filters.timeOfDay ? `timeOfDay=${filters.timeOfDay}` : null,
    filters.context ? `context=${filters.context}` : null,
    filters.format ? `format=${filters.format}` : null,
    filters.genre ? `genre=${filters.genre}` : null,
    filters.mood ? `mood=${filters.mood}` : null,
    filters.company ? `company=${filters.company}` : null,
  ].filter((value): value is string => Boolean(value));
}

export function buildTasteProfileSummary(watched: WatchedMovie[], watchlist: Movie[]): string {
  if (watched.length === 0) {
    return `История оценок пока пустая. Watchlist size=${watchlist.length}.`;
  }

  const rated = watched.filter(movie => typeof movie.rating === 'number');
  const favorites = rated
    .filter(movie => movie.rating >= 8)
    .slice(0, 8)
    .map(movie => `${movie.titleRu} (${movie.rating}/10)`);

  const frequentGenres = topEntries(rated.flatMap(movie => movie.genre));
  const frequentMoods = topEntries(rated.flatMap(movie => movie.mood));
  const favoriteDirectors = topEntries(rated.map(movie => movie.director).filter(Boolean), 4);
  const averageRating = rated.length > 0
    ? (rated.reduce((sum, movie) => sum + movie.rating, 0) / rated.length).toFixed(1)
    : 'n/a';

  return [
    `Watched=${watched.length}, watchlist=${watchlist.length}, avgRating=${averageRating}.`,
    favorites.length > 0 ? `Favorites: ${favorites.join(', ')}.` : null,
    frequentGenres.length > 0 ? `Preferred genres: ${frequentGenres.join(', ')}.` : null,
    frequentMoods.length > 0 ? `Preferred moods: ${frequentMoods.join(', ')}.` : null,
    favoriteDirectors.length > 0 ? `Recurring directors: ${favoriteDirectors.join(', ')}.` : null,
  ].filter(Boolean).join(' ');
}

export function toMovieContext(movie: Movie | WatchedMovie) {
  return {
    title: movie.title,
    titleRu: movie.titleRu,
    year: movie.year,
    type: movie.type ?? 'film',
    genre: movie.genre,
    mood: movie.mood,
    duration: movie.duration,
    kpRating: movie.kpRating ?? null,
    predictedRating: movie.predictedRating ?? null,
    director: movie.director || null,
    reasonToWatch: movie.reasonToWatch ?? null,
    userRating: 'rating' in movie ? movie.rating : null,
    notes: 'notes' in movie ? movie.notes ?? null : null,
  };
}
