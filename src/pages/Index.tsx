import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clapperboard, History, Sparkles } from 'lucide-react';
import { FilterSection } from '@/components/FilterSection';
import { MovieCard } from '@/components/MovieCard';
import { RatingModal } from '@/components/RatingModal';
import { WatchHistory } from '@/components/WatchHistory';
import { FileUpload } from '@/components/FileUpload';
import {
  FilterState, Movie, WatchedMovie,
  TIME_OPTIONS, CONTEXT_OPTIONS, FORMAT_OPTIONS,
  GENRE_OPTIONS, MOOD_OPTIONS, COMPANY_OPTIONS,
} from '@/lib/movieTypes';
import { getRecommendation } from '@/lib/movieEngine';
import { MOVIE_DATABASE } from '@/lib/movieData';

type Tab = 'recommend' | 'history';

const Index = () => {
  const [tab, setTab] = useState<Tab>('recommend');
  const [filters, setFilters] = useState<FilterState>({
    timeOfDay: null, context: null, format: null,
    genre: null, mood: null, company: null,
  });
  const [recommendation, setRecommendation] = useState<Movie | null>(null);
  const [ratingMovie, setRatingMovie] = useState<Movie | null>(null);
  const [watched, setWatched] = useState<WatchedMovie[]>(() => {
    const saved = localStorage.getItem('cinema-watched');
    return saved ? JSON.parse(saved) : [];
  });
  const [customMovies, setCustomMovies] = useState<Movie[]>(() => {
    const saved = localStorage.getItem('cinema-custom-movies');
    return saved ? JSON.parse(saved) : [];
  });

  const updateFilter = (key: keyof FilterState) => (value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMoviesLoaded = (movies: Movie[]) => {
    const updated = [...customMovies, ...movies];
    setCustomMovies(updated);
    localStorage.setItem('cinema-custom-movies', JSON.stringify(updated));
  };

  const getMovie = useCallback(() => {
    const movie = getRecommendation(filters, watched, customMovies);
    setRecommendation(movie);
  }, [filters, watched, customMovies]);

  const handleRate = (rating: number, notes: string) => {
    if (!ratingMovie) return;
    const entry: WatchedMovie = {
      ...ratingMovie,
      rating,
      notes,
      watchedAt: new Date().toISOString(),
    };
    const updated = [entry, ...watched];
    setWatched(updated);
    localStorage.setItem('cinema-watched', JSON.stringify(updated));
    setRatingMovie(null);
    setRecommendation(null);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 glass-surface border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl text-foreground tracking-wide">КИНО</h1>
          </div>
          <div className="flex bg-secondary rounded-xl p-1">
            <button
              onClick={() => setTab('recommend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === 'recommend' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />
              Подбор
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <History className="w-3.5 h-3.5 inline mr-1" />
              История
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5 space-y-6">
        <AnimatePresence mode="wait">
          {tab === 'recommend' ? (
            <motion.div
              key="recommend"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
              <FilterSection title="Время дня" options={TIME_OPTIONS} selected={filters.timeOfDay} onSelect={updateFilter('timeOfDay')} />
              <FilterSection title="Контекст" options={CONTEXT_OPTIONS} selected={filters.context} onSelect={updateFilter('context')} />
              <FilterSection title="Формат" options={FORMAT_OPTIONS} selected={filters.format} onSelect={updateFilter('format')} />
              <FilterSection title="Жанр" options={GENRE_OPTIONS} selected={filters.genre} onSelect={updateFilter('genre')} />
              <FilterSection title="Настроение" options={MOOD_OPTIONS} selected={filters.mood} onSelect={updateFilter('mood')} />
              <FilterSection title="Компания" options={COMPANY_OPTIONS} selected={filters.company} onSelect={updateFilter('company')} />

              <FileUpload onMoviesLoaded={handleMoviesLoaded} />
              {customMovies.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  📂 Загружено фильмов: {customMovies.length} (всего в базе: {MOVIE_DATABASE.length + customMovies.length})
                </p>
              )}

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={getMovie}
                className={`w-full py-4 rounded-2xl font-display text-xl tracking-wider transition-all ${
                  hasFilters
                    ? 'bg-primary text-primary-foreground cinema-glow'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                🎬 ПОДОБРАТЬ ФИЛЬМ
              </motion.button>

              <AnimatePresence mode="wait">
                {recommendation && (
                  <MovieCard
                    key={recommendation.id}
                    movie={recommendation}
                    onRate={setRatingMovie}
                    onSkip={getMovie}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <WatchHistory watched={watched} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {ratingMovie && (
          <RatingModal
            movie={ratingMovie}
            onSubmit={handleRate}
            onClose={() => setRatingMovie(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
