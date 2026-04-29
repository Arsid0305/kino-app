import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { Movie } from '@/lib/movieTypes';

interface RatingModalProps {
  movie: Movie;
  onSubmit: (rating: number, notes: string) => void;
  onClose: () => void;
}

export const RatingModal = ({ movie, onSubmit, onClose }: RatingModalProps) => {
  const [rating, setRating] = useState(7);
  const [notes, setNotes] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Оценить фильм</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">{movie.titleRu}</p>

        {/* Star rating */}
        <div className="space-y-2">
          <div className="flex justify-center gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 1.2 }}
                onClick={() => setRating(i + 1)}
                className="p-0.5"
              >
                <Star
                  className={`w-6 h-6 transition-colors ${
                    i < rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'
                  }`}
                />
              </motion.button>
            ))}
          </div>
          <p className="text-center text-2xl font-display text-primary">{rating}/10</p>
        </div>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Заметка (необязательно)..."
          className="w-full bg-secondary border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
        />

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSubmit(rating, notes)}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm"
        >
          Сохранить оценку
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
