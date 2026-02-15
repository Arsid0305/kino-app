import { FilterState, Movie, WatchedMovie } from './movieTypes';
import { MOVIE_DATABASE } from './movieData';

export function getRecommendation(filters: FilterState, watched: WatchedMovie[], extraMovies: Movie[] = []): Movie | null {
  const watchedIds = new Set(watched.map(w => w.id));
  // Also match by titleRu to avoid recommending already-watched movies from different sources
  const watchedTitles = new Set(watched.map(w => w.titleRu.toLowerCase()));
  
  const allMovies = [...MOVIE_DATABASE, ...extraMovies];
  let candidates = allMovies.filter(m => !watchedIds.has(m.id) && !watchedTitles.has(m.titleRu.toLowerCase()));

  const scored = candidates.map(movie => {
    let score = 50;

    if (filters.timeOfDay && movie.timeOfDay.includes(filters.timeOfDay as any)) score += 20;
    if (filters.format && movie.format === filters.format) score += 20;
    if (filters.genre) {
      // Match genre in Russian (the Excel data uses Russian genre names)
      const genreLower = filters.genre.toLowerCase();
      const GENRE_MAP: Record<string, string[]> = {
        drama: ['драма'],
        comedy: ['комедия'],
        thriller: ['триллер'],
        scifi: ['фантастика', 'фэнтези'],
        action: ['боевик', 'экшн'],
        romance: ['мелодрама'],
        horror: ['ужасы'],
        documentary: ['документальный'],
      };
      const mappedGenres = GENRE_MAP[genreLower] || [genreLower];
      if (movie.genre.some(g => mappedGenres.includes(g.toLowerCase()) || g.toLowerCase() === genreLower)) {
        score += 25;
      }
    }
    if (filters.mood && movie.mood.includes(filters.mood)) score += 25;
    if (filters.company) {
      if (movie.forCompany === 'any' || movie.forCompany === filters.company) score += 15;
    }
    if (filters.context === 'break' && movie.format === 'short') score += 15;
    if (filters.context === 'work' && movie.format === 'short') score += 10;

    // Boost from predicted rating (from Excel model)
    if (movie.predictedRating) {
      score += (movie.predictedRating - 7) * 8;
    }

    // Boost from KP rating
    if (movie.kpRating && movie.kpRating > 0) {
      score += (movie.kpRating - 7) * 5;
    }

    // Boost based on similar watched movies ratings
    const similarWatched = watched.filter(w => 
      w.genre.some(g => movie.genre.some(mg => mg.toLowerCase() === g.toLowerCase())) && w.rating
    );
    if (similarWatched.length > 0) {
      const avgRating = similarWatched.reduce((s, w) => s + w.rating, 0) / similarWatched.length;
      score += (avgRating - 7) * 3;
    }

    return { movie, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick from top 5 with some randomness
  const top = scored.slice(0, Math.min(5, scored.length));
  if (top.length === 0) return null;
  return top[Math.floor(Math.random() * top.length)].movie;
}
