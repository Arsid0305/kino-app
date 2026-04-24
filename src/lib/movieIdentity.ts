import { Movie } from './movieTypes';

type MovieIdentity = Partial<Pick<Movie, 'title' | 'titleRu' | 'year' | 'type'>>;

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getMovieIdentityKey(movie: MovieIdentity): string {
  const title = normalizeText(movie.titleRu || movie.title);
  const year = Number.isFinite(movie.year) && movie.year && movie.year > 0 ? String(movie.year) : 'unknown';
  const type = movie.type ?? 'unknown';

  if (!title) return `unknown-title::${year}::${type}`;
  return `${title}::${year}::${type}`;
}

export function getMovieDedupKey(movie: MovieIdentity & { id: string }): string {
  const identity = getMovieIdentityKey(movie);
  return identity.startsWith('unknown-title::') ? `id::${movie.id}` : identity;
}

export function buildStableMovieId(prefix: string, movie: MovieIdentity, externalId?: string | number | null): string {
  const identity = getMovieIdentityKey(movie);
  const normalizedExternalId = typeof externalId === 'string' ? externalId.trim() : externalId;

  if (normalizedExternalId === undefined || normalizedExternalId === null || normalizedExternalId === '') {
    return `${prefix}:${identity}`;
  }

  return `${prefix}:${identity}:${normalizedExternalId}`;
}

export function mergeUniqueMovies<T extends MovieIdentity & { id: string }>(...collections: T[][]): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();

  for (const collection of collections) {
    for (const movie of collection) {
      const key = getMovieDedupKey(movie);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(movie);
    }
  }

  return merged;
}
