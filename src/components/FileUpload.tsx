import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, AlertCircle, Info } from 'lucide-react';
import { parseMovieFile, ParseResult } from '@/lib/fileParser';
import * as XLSX from 'xlsx';

function downloadTemplate() {
  const watched = [
    {
      'Название': 'Интерстеллар',
      'Моя оценка': 9,
      'Год (необязательно)': 2014,
      'Жанр (необязательно)': 'фантастика',
      'Тип (необязательно)': 'film',
    },
    {
      'Название': 'Паразиты',
      'Моя оценка': 8,
      'Год (необязательно)': 2019,
      'Жанр (необязательно)': 'драма',
      'Тип (необязательно)': 'film',
    },
  ];
  const toWatch = [
    {
      'Название': 'Дюна',
      'Год (необязательно)': 2021,
      'Жанр (необязательно)': 'фантастика',
      'Тип (необязательно)': 'film',
    },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(watched), 'Просмотрено');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toWatch), 'Буду смотреть');
  XLSX.writeFile(wb, 'Фильмография_шаблон.xlsx');
}

interface FileUploadProps {
  onMoviesLoaded: (result: ParseResult) => void;
}

export const FileUpload = ({ onMoviesLoaded }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showFormat, setShowFormat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setStatus('error');
      setMessage('Файл слишком большой (макс. 20 МБ)');
      return;
    }

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let content: string | ArrayBuffer;
      if (ext === 'xlsx' || ext === 'xls') {
        content = await file.arrayBuffer();
      } else {
        content = await file.text();
      }

      const result = parseMovieFile(content, file.name);
      const total = result.watched.length + result.toWatch.length;
      if (total === 0) {
        setStatus('error');
        setMessage('Не удалось найти фильмы в файле');
        return;
      }
      onMoviesLoaded(result);
      setStatus('success');
      const parts: string[] = [];
      if (result.watched.length) parts.push(`${result.watched.length} просмотренных`);
      if (result.toWatch.length) parts.push(`${result.toWatch.length} к просмотру`);
      setMessage(`Загружено: ${parts.join(', ')}`);
      setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
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
              <p className="font-medium text-secondary-foreground">Поддерживаемые форматы:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>.xlsx</strong> — Excel (Фильмография.xlsx)</li>
                <li><strong>.json</strong> — массив объектов с полями titleRu, genre, year...</li>
                <li><strong>.csv</strong> — таблица с заголовками</li>
              </ul>
              <p className="text-[10px]">Excel: листы «Просмотрено» и «Буду смотреть» импортируются автоматически</p>
              <button
                onClick={downloadTemplate}
                className="mt-1 w-full py-2 rounded-lg border border-primary/40 text-primary font-medium text-[11px] hover:bg-primary/10 transition-colors"
              >
                Скачать шаблон Excel
              </button>
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
            ? 'border-primary/50 bg-primary/5'
            : status === 'error'
            ? 'border-destructive/50 bg-destructive/5'
            : 'border-border hover:border-muted-foreground/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,.csv,.xlsx,.xls"
          onChange={onFileSelect}
          className="hidden"
        />

        {status === 'idle' && (
          <div className="space-y-2">
            <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragging ? 'Отпустите файл' : 'Excel, JSON или CSV'}
            </p>
            <p className="text-[10px] text-muted-foreground/60">Нажмите или перетащите</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-1">
            <Check className="w-6 h-6 mx-auto text-primary" />
            <p className="text-sm text-primary">{message}</p>
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
