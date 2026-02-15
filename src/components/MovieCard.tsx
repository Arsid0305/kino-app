import { motion } from 'framer-motion';
import { Movie } from '@/lib/movieTypes';
import { Star, Clock, User, Film } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onRate: (movie: Movie) => void;
  onSkip: () => void;
}

export const MovieCard = ({ movie, onRate, onSkip }: MovieCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.95 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="bg-card border border-border rounded-2xl overflow-hidden cinema-glow"
  >
    <div className="bg-gradient-to-br from-primary/20 via-cinema-surface to-cinema-highlight p-6 flex items-center justify-center min-h-[140px]">
      <Film className="w-16 h-16 text-primary/60" />
    </div>

    <div className="p-5 space-y-3">
      <div>
        <h2 className="font-display text-2xl text-foreground leading-tight">{movie.titleRu}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{movie.title} · {movie.year}</p>
      </div>

      <p className="text-sm text-secondary-foreground leading-relaxed">{movie.description}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {movie.duration} мин
        </span>
        <span className="flex items-center gap-1">
          <User className="w-3.5 h-3.5" /> {movie.director}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {movie.genre.map(g => (
          <span key={g} className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-secondary text-secondary-foreground">
            {g}
          </span>
        ))}
        {movie.mood.map(m => (
          <span key={m} className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-primary/10 text-primary">
            {m}
          </span>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onRate(movie)}
          className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Star className="w-4 h-4" /> Смотрю!
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSkip}
          className="px-5 py-3 rounded-xl border border-border text-muted-foreground text-sm font-medium"
        >
          Другой
        </motion.button>
      </div>
    </div>
  </motion.div>
);
