import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Check, AlertCircle, X, Info } from 'lucide-react';
import { parseMovieFile } from '@/lib/fileParser';
import { Movie } from '@/lib/movieTypes';

interface FileUploadProps {
  onMoviesLoaded: (movies: Movie[]) => void;
}

export const FileUpload = ({ onMoviesLoaded }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setStatus('error');
      setMessage('Файл слишком большой (макс. 5 МБ)');
      return;
    }

    try {
      const text = await file.text();
      const movies = parseMovieFile(text, file.name);
      if (movies.length === 0) {
        setStatus('error');
        setMessage('Не удалось найти фильмы в файле');
        return;
      }
      onMoviesLoaded(movies);
      setStatus('success');
      setMessage(`Загружено ${movies.length} фильмов`);
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 3000);
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Ошибка чтения файла');
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Загрузить данные
        </h3>
        <button
          onClick={() => setShowFormat(!showFormat)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {showFormat && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-secondary/50 border border-border rounded-xl p-3 text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-secondary-foreground">Формат JSON:</p>
              <pre className="bg-background/50 rounded-lg p-2 overflow-x-auto text-[10px]">
{`[{
  "titleRu": "Название",
  "title": "Title",
  "year": 2024,
  "genre": ["drama"],
  "duration": 120,
  "mood": ["calm"],
  "director": "Режиссёр",
  "description": "Описание"
}]`}
              </pre>
              <p className="font-medium text-secondary-foreground">Формат CSV:</p>
              <pre className="bg-background/50 rounded-lg p-2 overflow-x-auto text-[10px]">
{`titleRu,title,year,genre,duration,mood,director
Название,Title,2024,"drama,comedy",120,"calm",Режиссёр`}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        whileTap={{ scale: 0.98 }}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary bg-primary/5'
            : status === 'success'
            ? 'border-green-500/50 bg-green-500/5'
            : status === 'error'
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-border hover:border-muted-foreground/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,.csv"
          onChange={onFileSelect}
          className="hidden"
        />

        {status === 'idle' && (
          <div className="space-y-2">
            <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragging ? 'Отпустите файл' : 'JSON или CSV файл'}
            </p>
            <p className="text-[10px] text-muted-foreground/60">Нажмите или перетащите</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-1">
            <Check className="w-6 h-6 mx-auto text-green-500" />
            <p className="text-sm text-green-500">{message}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-1">
            <AlertCircle className="w-6 h-6 mx-auto text-destructive" />
            <p className="text-sm text-destructive">{message}</p>
            <button
              onClick={e => { e.stopPropagation(); setStatus('idle'); setMessage(''); }}
              className="text-xs text-muted-foreground underline"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
