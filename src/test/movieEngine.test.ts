import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRecommendation } from '@/lib/movieEngine';
import type { FilterState, Movie, WatchedMovie } from '@/lib/movieTypes';

const emptyFilters: FilterState = {
  type: null,
  timeOfDay: null,
  context: null,
  format: null,
  genre: null,
  mood: null,
  company: null,
};

describe('getRecommendation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not recommend a movie that is already watched under another id', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const watched: WatchedMovie[] = [
      {
        id: 'watched-1',
        title: 'Interstellar',
        titleRu: 'Интерстеллар',
        year: 2014,
        genre: ['фантастика'],
        duration: 169,
        mood: ['thoughtful'],
        description: '',
        director: 'Christopher Nolan',
        forCompany: 'any',
        timeOfDay: ['evening'],
        format: 'long',
        type: 'film',
        rating: 10,
        watchedAt: new Date().toISOString(),
      },
    ];

    const extraMovies: Movie[] = [
      {
        id: 'candidate-1',
        title: 'Interstellar',
        titleRu: 'Интерстеллар',
        year: 2014,
        genre: ['фантастика'],
        duration: 169,
        mood: ['thoughtful'],
        description: '',
        director: 'Christopher Nolan',
        forCompany: 'any',
        timeOfDay: ['evening'],
        format: 'long',
        type: 'film',
      },
      {
        id: 'candidate-2',
        title: 'Arrival',
        titleRu: 'Прибытие',
        year: 2016,
        genre: ['фантастика'],
        duration: 116,
        mood: ['thoughtful'],
        description: '',
        director: 'Denis Villeneuve',
        forCompany: 'any',
        timeOfDay: ['evening'],
        format: 'medium',
        type: 'film',
      },
    ];

    const result = getRecommendation(emptyFilters, watched, extraMovies);
    expect(result?.titleRu).toBe('Прибытие');
  });
});
