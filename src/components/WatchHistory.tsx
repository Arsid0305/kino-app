import { motion } from 'framer-motion';
import { WatchedMovie } from '@/lib/movieTypes';
import { Star, Clock } from 'lucide-react';

interface WatchHistoryProps {
  watched: WatchedMovie[];
  onReRate?: (movie: WatchedMovie) => void;
}

export const WatchHistory = ({ watched, onReRate }: WatchHistoryProps) => {
  if (watched.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Пока нет просмотренных фильмов</p>
        <p className="text-xs mt-1">Получите рекомендацию и оцените!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {watched.map((movie, i) => (
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 border border-border"
        >
          <div className="w-10 h-10 rounded-lg bg-cinema-surface flex items-center justify-center shrink-0">
            <span className="text-lg">🎬</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{movie.titleRu}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-primary text-primary" /> {movie.rating}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> {movie.duration}м
              </span>
            </div>
            {movie.notes && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{movie.notes}</p>
            )}
          </div>
          {onReRate && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onReRate(movie)}
              className="shrink-0 flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg px-2 py-1.5 transition-colors"
            >
              <Star className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Изменить</span>
            </motion.button>
          )}
        </motion.div>
      ))}
    </div>
  );
};
