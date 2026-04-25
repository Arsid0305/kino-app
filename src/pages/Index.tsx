import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Session } from '@supabase/supabase-js';
import { Clapperboard, History, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FilterSection } from '@/components/FilterSection';
import { MovieCard } from '@/components/MovieCard';
import { RatingModal } from '@/components/RatingModal';
import { WatchHistory } from '@/components/WatchHistory';
import { FileUpload } from '@/components/FileUpload';
import { AiAdvisor } from '@/components/AiAdvisor';
import { AuthPanel } from '@/components/AuthPanel';
import { ParseResult } from '@/lib/fileParser';
import {
  FilterState,
  Movie,
  WatchedMovie,
  TYPE_OPTIONS,
  TIME_OPTIONS,
  CONTEXT_OPTIONS,
  FORMAT_OPTIONS,
  GENRE_OPTIONS,
  MOOD_OPTIONS,
  COMPANY_OPTIONS,
} from '@/lib/movieTypes';
import { getRecommendation } from '@/lib/movieEngine';
import { MOVIE_DATABASE } from '@/lib/movieData';
import { getMovieDedupKey, mergeUniqueMovies } from '@/lib/movieIdentity';
import { supabase } from '@/integrations/supabase/client';
import {
  loadCloudLibrary,
  seedCloudLibrary,
  upsertDismissedMovie,
  upsertWatchedMovie,
  upsertWatchlistMovie,
  upsertWatchlistMovies,
} from '@/lib/supabaseMovieStore';
import { requestGlobalRecommendation } from '@/lib/globalRecommendation';

type Tab = 'recommend' | 'history';

const loadLocalArray = <T,>(key: string): T[] => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const Index = () => {
  const [tab, setTab] = useState<Tab>('recommend');
  const [filters, setFilters] = useState<FilterState>({
    type: null,
    timeOfDay: null,
    context: null,
    format: null,
    genre: null,
    mood: null,
    company: null,
  });
  const [recommendation, setRecommendation] = useState<Movie | null>(null);
  const [ratingMovie, setRatingMovie] = useState<Movie | null>(null);
  const [watched, setWatched] = useState<WatchedMovie[]>(() => loadLocalArray<WatchedMovie>('cinema-watched'));
  const [customMovies, setCustomMovies] = useState<Movie[]>(() => loadLocalArray<Movie>('cinema-custom-movies'));
  const [dismissedMovies, setDismissedMovies] = useState<Movie[]>(() => loadLocalArray<Movie>('cinema-dismissed-movies'));
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState('Локальный режим');
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncLibrary = async () => {
      if (!session) {
        setSyncStatus('Локальный режим');
        return;
      }

      setSyncStatus('Синхронизируем с облаком...');

      try {
        const cloudLibrary = await loadCloudLibrary();
        if (cancelled) return;

        const hasCloudData =
          cloudLibrary.watched.length > 0 ||
          cloudLibrary.watchlist.length > 0 ||
          cloudLibrary.dismissed.length > 0;
        if (hasCloudData) {
          setWatched(cloudLibrary.watched);
          setCustomMovies(cloudLibrary.watchlist);
          setDismissedMovies(cloudLibrary.dismissed);
          localStorage.setItem('cinema-watched', JSON.stringify(cloudLibrary.watched));
          localStorage.setItem('cinema-custom-movies', JSON.stringify(cloudLibrary.watchlist));
          localStorage.setItem('cinema-dismissed-movies', JSON.stringify(cloudLibrary.dismissed));
          setSyncStatus('Синхронизировано с Supabase');
          return;
        }

        await seedCloudLibrary(watched, customMovies, dismissedMovies);
        if (cancelled) return;
        setSyncStatus('Локальная база загружена в Supabase');
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setSyncStatus('Ошибка синхронизации, работаем локально');
        toast.error(error instanceof Error ? error.message : 'Не удалось синхронизировать библиотеку');
      }
    };

    void syncLibrary();

    return () => {
      cancelled = true;
    };
  }, [session, watched, customMovies, dismissedMovies]);

  const updateFilter = (key: keyof FilterState) => (value: string | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMoviesLoaded = async (result: ParseResult) => {
    let nextWatched = watched;
    let nextWatchlist = customMovies;

    if (result.watched.length > 0) {
      nextWatched = mergeUniqueMovies(watched, result.watched);
      setWatched(nextWatched);
      localStorage.setItem('cinema-watched', JSON.stringify(nextWatched));
    }

    if (result.toWatch.length > 0) {
      nextWatchlist = mergeUniqueMovies(customMovies, result.toWatch);
      setCustomMovies(nextWatchlist);
      localStorage.setItem('cinema-custom-movies', JSON.stringify(nextWatchlist));
    }

    if (session) {
      try {
        await Promise.all([
          result.watched.length > 0 ? Promise.all(result.watched.map(movie => upsertWatchedMovie(movie))) : Promise.resolve(),
          result.toWatch.length > 0 ? upsertWatchlistMovies(result.toWatch) : Promise.resolve(),
        ]);
        setSyncStatus('Импорт синхронизирован с Supabase');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Не удалось синхронизировать импорт');
      }
    }
  };

  const getMovie = useCallback(async () => {
    setLoadingRecommendation(true);

    try {
      if (session) {
        const aiMovie = await requestGlobalRecommendation(filters, watched, customMovies, dismissedMovies);
        setRecommendation(aiMovie);
        return;
      }

      const localMovie = getRecommendation(filters, watched, customMovies, dismissedMovies);
      setRecommendation(localMovie);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Не удалось получить рекомендацию');

      const fallbackMovie = getRecommendation(filters, watched, customMovies, dismissedMovies);
      setRecommendation(fallbackMovie);
    } finally {
      setLoadingRecommendation(false);
    }
  }, [session, filters, watched, customMovies, dismissedMovies]);

  const handleRate = async (rating: number, notes: string) => {
    if (!ratingMovie) return;

    const entry: WatchedMovie = {
      ...ratingMovie,
      rating,
      notes,
      watchedAt: new Date().toISOString(),
    };

    const entryKey = getMovieDedupKey(entry);
    const updatedWatched = [entry, ...watched.filter(movie => getMovieDedupKey(movie) !== entryKey)];
    const updatedWatchlist = customMovies.filter(movie => getMovieDedupKey(movie) !== entryKey);
    const updatedDismissed = dismissedMovies.filter(movie => getMovieDedupKey(movie) !== entryKey);

    setWatched(updatedWatched);
    setCustomMovies(updatedWatchlist);
    setDismissedMovies(updatedDismissed);
    localStorage.setItem('cinema-watched', JSON.stringify(updatedWatched));
    localStorage.setItem('cinema-custom-movies', JSON.stringify(updatedWatchlist));
    localStorage.setItem('cinema-dismissed-movies', JSON.stringify(updatedDismissed));
    setRatingMovie(null);
    setRecommendation(null);

    if (session) {
      try {
        await upsertWatchedMovie(entry);
        setSyncStatus('Оценка сохранена в Supabase');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Не удалось сохранить оценку в облако');
      }
    }
  };

  const handleAddToWatchlist = async (movie: Movie) => {
    const movieKey = getMovieDedupKey(movie);
    const nextWatchlist = mergeUniqueMovies(
      [movie],
      customMovies.filter(item => getMovieDedupKey(item) !== movieKey)
    );
    const nextDismissed = dismissedMovies.filter(item => getMovieDedupKey(item) !== movieKey);

    setCustomMovies(nextWatchlist);
    setDismissedMovies(nextDismissed);
    localStorage.setItem('cinema-custom-movies', JSON.stringify(nextWatchlist));
    localStorage.setItem('cinema-dismissed-movies', JSON.stringify(nextDismissed));

    if (session) {
      try {
        await upsertWatchlistMovie({ ...movie, source: movie.source ?? 'ai-chat' });
        setSyncStatus('Watchlist синхронизирован с Supabase');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Не удалось сохранить watchlist');
      }
    }
  };

  const handleDismissMovie = async (movie: Movie) => {
    const movieKey = getMovieDedupKey(movie);
    const nextDismissed = mergeUniqueMovies(
      [movie],
      dismissedMovies.filter(item => getMovieDedupKey(item) !== movieKey)
    );
    const nextWatchlist = customMovies.filter(item => getMovieDedupKey(item) !== movieKey);

    setDismissedMovies(nextDismissed);
    setCustomMovies(nextWatchlist);
    localStorage.setItem('cinema-dismissed-movies', JSON.stringify(nextDismissed));
    localStorage.setItem('cinema-custom-movies', JSON.stringify(nextWatchlist));

    if (session) {
      try {
        await upsertDismissedMovie({ ...movie, source: movie.source ?? 'ai-chat' });
        setSyncStatus('Фильм исключен из будущих подборов');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Не удалось сохранить отказ');
      }
    }
  };

  const handleSendMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Письмо со ссылкой для входа отправлено');
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }

    setSyncStatus('Локальный режим');
    toast.success('Вы вышли из облачного аккаунта');
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 glass-surface border-b border-border">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Clapperboard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl text-foreground tracking-wide">КИНО</h1>
              <p className="text-[10px] text-muted-foreground">
                {session ? 'Глобальный AI-подбор + cloud sync' : 'Локальный режим, войди для cloud sync'}
              </p>
            </div>
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
        <AuthPanel
          session={session}
          syncStatus={syncStatus}
          onSendLink={handleSendMagicLink}
          onSignOut={handleSignOut}
        />

        <AnimatePresence mode="wait">
          {tab === 'recommend' ? (
            <motion.div
              key="recommend"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-5"
            >
                           <FilterSection title="Тип" options={TYPE_OPTIONS} selected={filters.type} onSelect={updateFilter('type')} />
              <FilterSection title="Время дня" options={TIME_OPTIONS} selected={filters.timeOfDay} onSelect={updateFilter('timeOfDay')} />
              <FilterSection title="Контекст" options={CONTEXT_OPTIONS} selected={filters.context} onSelect={updateFilter('context')} />
              <FilterSection title="Формат" options={FORMAT_OPTIONS} selected={filters.format} onSelect={updateFilter('format')} />
              <FilterSection title="Жанр" options={GENRE_OPTIONS} selected={filters.genre} onSelect={updateFilter('genre')} />
              <FilterSection title="Настроение" options={MOOD_OPTIONS} selected={filters.mood} onSelect={updateFilter('mood')} />
              <FilterSection title="Компания" options={COMPANY_OPTIONS} selected={filters.company} onSelect={updateFilter('company')} />

              <FileUpload onMoviesLoaded={result => void handleMoviesLoaded(result)} />

              <div className="text-xs text-muted-foreground text-center space-y-0.5">
                <p>Буду смотреть: {customMovies.length}</p>
                <p>Просмотрено и оценено: {watched.length}</p>
                <p>Исключено из подборов: {dismissedMovies.length}</p>
                {session && <p>Рекомендация идет по всему каталогу, а список к просмотру и оценки используются как персональный сигнал.</p>}
                {!session && <p>Без подключения используется встроенная база из {MOVIE_DATABASE.length} фильмов.</p>}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => void getMovie()}
                disabled={loadingRecommendation}
                className={`w-full py-4 rounded-2xl font-display text-xl tracking-wider transition-all ${
                  hasFilters || session
                    ? 'bg-primary text-primary-foreground cinema-glow'
                    : 'bg-secondary text-muted-foreground'
                } disabled:opacity-60`}
              >
                {loadingRecommendation
                  ? 'ИЩУ ФИЛЬМ...'
                  : session
                  ? 'ПОДОБРАТЬ ФИЛЬМ'
                  : 'ПОДОБРАТЬ ФИЛЬМ'}
              </motion.button>

              <AnimatePresence mode="wait">
                {recommendation && (
                  <MovieCard
                    key={recommendation.id}
                    movie={recommendation}
                    onRate={setRatingMovie}
                    onSkip={() => void getMovie()}
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
            onSubmit={(rating, notes) => void handleRate(rating, notes)}
            onClose={() => setRatingMovie(null)}
          />
        )}
      </AnimatePresence>

      <AiAdvisor
        session={session}
        watchedMovies={watched}
        watchlistMovies={customMovies}
        dismissedMovies={dismissedMovies}
        filters={filters}
        onAddToWatchlist={movie => void handleAddToWatchlist(movie)}
        onRateMovie={movie => setRatingMovie(movie)}
        onDismissMovie={movie => void handleDismissMovie(movie)}
      />
    </div>
  );
};

export default Index;
