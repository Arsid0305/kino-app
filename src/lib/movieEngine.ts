import { FilterState, Movie, WatchedMovie } from './movieTypes';
import { MOVIE_DATABASE } from './movieData';

export function getRecommendation(filters: FilterState, watched: WatchedMovie[]): Movie | null {
  const watchedIds = new Set(watched.map(w => w.id));
  
  let candidates = MOVIE_DATABASE.filter(m => !watchedIds.has(m.id));

  // Score each candidate
  const scored = candidates.map(movie => {
    let score = 50; // base score

    if (filters.timeOfDay && movie.timeOfDay.includes(filters.timeOfDay as any)) score += 20;
    if (filters.format && movie.format === filters.format) score += 20;
    if (filters.genre && movie.genre.includes(filters.genre)) score += 25;
    if (filters.mood && movie.mood.includes(filters.mood)) score += 25;
    if (filters.company) {
      if (movie.forCompany === 'any' || movie.forCompany === filters.company) score += 15;
    }
    if (filters.context === 'break' && movie.format === 'short') score += 15;
    if (filters.context === 'work' && movie.format === 'short') score += 10;

    // Boost based on similar watched movies ratings
    const similarWatched = watched.filter(w => 
      w.genre.some(g => movie.genre.includes(g)) && w.rating
    );
    if (similarWatched.length > 0) {
      const avgRating = similarWatched.reduce((s, w) => s + w.rating, 0) / similarWatched.length;
      score += (avgRating - 5) * 3; // boost or penalize based on genre preference
    }

    return { movie, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return top candidate with some randomness among top 3
  const top = scored.slice(0, Math.min(3, scored.length));
  if (top.length === 0) return null;
  return top[Math.floor(Math.random() * top.length)].movie;
}
