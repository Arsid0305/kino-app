import { describe, expect, it } from 'vitest';
import { parseMovieFile } from '@/lib/fileParser';

describe('parseMovieFile', () => {
  it('creates stable ids for repeated JSON imports', () => {
    const payload = JSON.stringify([
      {
        titleRu: 'Интерстеллар',
        title: 'Interstellar',
        year: 2014,
        genre: ['фантастика'],
        duration: 169,
        type: 'film',
      },
    ]);

    const first = parseMovieFile(payload, 'movies.json');
    const second = parseMovieFile(payload, 'movies.json');

    expect(first.toWatch).toHaveLength(1);
    expect(second.toWatch).toHaveLength(1);
    expect(first.toWatch[0].id).toBe(second.toWatch[0].id);
  });
});
