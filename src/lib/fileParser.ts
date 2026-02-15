import { Movie } from './movieTypes';

/**
 * Parse uploaded file (CSV or JSON) into Movie objects.
 * 
 * Expected CSV columns:
 * title,titleRu,year,genre,duration,mood,description,director,forCompany,timeOfDay,format
 * (genre, mood, timeOfDay — comma-separated within quotes)
 * 
 * Expected JSON: array of Movie-like objects
 */

export function parseMovieFile(content: string, filename: string): Movie[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return parseJSON(content);
  if (ext === 'csv') return parseCSV(content);
  throw new Error('Поддерживаются только файлы .json и .csv');
}

function parseJSON(content: string): Movie[] {
  const data = JSON.parse(content);
  const arr = Array.isArray(data) ? data : data.movies ?? data.films ?? [];
  return arr.map(normalizeMovie).filter(Boolean) as Movie[];
}

function parseCSV(content: string): Movie[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV файл пуст или не содержит данных');

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const movies: Movie[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = values[idx]?.trim() ?? ''; });

    const movie = normalizeMovie(obj);
    if (movie) movies.push(movie);
  }

  return movies;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += char;
  }
  result.push(current);
  return result;
}

function splitField(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function normalizeMovie(raw: Record<string, any>): Movie | null {
  const title = raw.title || raw.name || '';
  const titleRu = raw.titleRu || raw.title_ru || raw['название'] || raw['titleru'] || title;
  if (!titleRu && !title) return null;

  const duration = Number(raw.duration || raw['длительность'] || raw.runtime || 100);
  let format: 'short' | 'medium' | 'long' = 'medium';
  if (raw.format) {
    format = raw.format;
  } else {
    format = duration < 90 ? 'short' : duration > 120 ? 'long' : 'medium';
  }

  return {
    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || titleRu,
    titleRu: titleRu || title,
    year: Number(raw.year || raw['год'] || 2020),
    genre: splitField(raw.genre || raw['жанр']),
    duration,
    mood: splitField(raw.mood || raw['настроение']),
    description: raw.description || raw['описание'] || '',
    director: raw.director || raw['режиссёр'] || raw['режиссер'] || '',
    forCompany: (raw.forCompany || raw.company || raw['компания'] || 'any') as Movie['forCompany'],
    timeOfDay: splitField(raw.timeOfDay || raw.time_of_day || raw['время'] || 'evening') as Movie['timeOfDay'],
    format,
    rating: raw.rating ? Number(raw.rating) : undefined,
  };
}
