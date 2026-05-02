const REASON_RU: Record<string, string> = {
  'high kp rating': 'Высокий рейтинг на Кинопоиске',
  'high kp rating;': 'Высокий рейтинг на Кинопоиске',
  'standard interest': 'Соответствует вашим предпочтениям',
  'good rating': 'Высокая оценка зрителей',
  'popular': 'Популярный фильм',
  'highly rated': 'Высоко оценён критиками',
  'critically acclaimed': 'Признан критиками',
  'classic': 'Классика кино',
  'award winning': 'Лауреат премий',
  'award-winning': 'Лауреат премий',
};

export function localizeReason(s: string): string {
  const key = s.toLowerCase().trim();
  if (REASON_RU[key]) return REASON_RU[key];
  if (/[а-яёА-ЯЁ]/.test(s)) return s;
  return '';
}
