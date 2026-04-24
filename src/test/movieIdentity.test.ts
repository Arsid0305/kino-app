import { describe, expect, it } from 'vitest';
import { buildStableMovieId, mergeUniqueMovies } from '@/lib/movieIdentity';

describe('movieIdentity helpers', () => {
  it('builds deterministic ids for the same movie payload', () => {
    const first = buildStableMovieId('upload', {
      titleRu: 'Интерстеллар',
      year: 2014,
      type: 'film',
    });
    const second = buildStableMovieId('upload', {
      titleRu: 'Интерстеллар',
      year: 2014,
      type: 'film',
    });

    expect(first).toBe(second);
  });

  it('removes duplicates by movie identity instead of random ids', () => {
    const merged = mergeUniqueMovies(
      [
        { id: 'a', title: 'Interstellar', titleRu: 'Интерстеллар', year: 2014, type: 'film' as const },
      ],
      [
        { id: 'b', title: 'Interstellar', titleRu: 'Интерстеллар', year: 2014, type: 'film' as const },
        { id: 'c', title: 'Arrival', titleRu: 'Прибытие', year: 2016, type: 'film' as const },
      ],
    );

    expect(merged).toHaveLength(2);
    expect(merged.map(movie => movie.id)).toEqual(['a', 'c']);
  });
});
