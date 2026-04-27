import { motion } from 'framer-motion';
import { BookmarkCheck, Star, XCircle, Undo2 } from 'lucide-react';
import { Movie } from '@/lib/movieTypes';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface MovieListSheetProps {
  open: boolean;
  onClose: () => void;
  movies: Movie[];
  mode: 'watchlist' | 'dismissed';
  onRate?: (movie: Movie) => void;
  onRestore?: (movie: Movie) => void;
}

export const MovieListSheet = ({ open, onClose, movies, mode, onRate, onRestore }: MovieListSheetProps) => {
  const title = mode === 'watchlist' ? 'Буду смотреть' : 'Отказалась';
  const Icon = mode === 'watchlist' ? BookmarkCheck : XCircle;
  const iconClass = mode === 'watchlist' ? 'text-primary' : 'text-muted-foreground';

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] flex flex-col rounded-t-2xl">
        <SheetHeader className="shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconClass}`} />
            {title} · {movies.length}
          </SheetTitle>
        </SheetHeader>

        {movies.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Список пуст</p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-2 pr-1 mt-2">
            {movies.map((movie, i) => (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 border border-border"
              >
                <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center shrink-0 text-lg">
                  🎬
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{movie.titleRu}</p>
                  <p className="text-xs text-muted-foreground">
                    {movie.year}{movie.genre?.length ? ` · ${movie.genre.slice(0, 2).join(', ')}` : ''}
                  </p>
                </div>
                {mode === 'watchlist' && onRate && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { onRate(movie); onClose(); }}
                    className="shrink-0 flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 fill-primary" />
                    <span className="text-xs font-medium">Оценить</span>
                  </motion.button>
                )}
                {mode === 'dismissed' && onRestore && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onRestore(movie)}
                    className="shrink-0 flex items-center gap-1 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg px-2 py-1.5 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Вернуть</span>
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
