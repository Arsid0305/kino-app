// MovieCard.jsx — Kino UI Kit
// Recreated from src/components/MovieCard.tsx

const MovieCard = ({ movie, onRate, onSkip }) => {
  const [entering, setEntering] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setEntering(false), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: 'hsl(220 18% 10%)',
      border: '1px solid hsl(220 15% 18%)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 0 30px -5px hsl(38 90% 55% / 0.18)',
      opacity: entering ? 0 : 1,
      transform: entering ? 'translateY(20px) scale(0.97)' : 'translateY(0) scale(1)',
      transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
    }}>
      {/* Art area */}
      <div style={{
        background: 'linear-gradient(135deg, hsl(38 90% 55% / 0.2), hsl(220 18% 12%), hsl(220 15% 20%))',
        height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 55% / 0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
          <line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line>
          <line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line>
          <line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line>
          <line x1="17" y1="7" x2="22" y2="7"></line>
        </svg>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: '0.04em', color: '#ece9e0', lineHeight: 1.1 }}>{movie.titleRu}</div>
          <div style={{ fontSize: 11, color: '#787e8a', marginTop: 2 }}>{movie.title} · {movie.year}</div>
        </div>

        <div style={{ fontSize: 13, color: '#d6d0c4', lineHeight: 1.5 }}>{movie.description}</div>

        {movie.reasonToWatch && (
          <div style={{ borderRadius: 10, border: '1px solid hsl(38 90% 55% / 0.22)', background: 'hsl(38 90% 55% / 0.06)', padding: '9px 11px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(38 90% 55%)' }}>Почему вам подойдёт</div>
            <div style={{ fontSize: 12, color: '#d6d0c4', marginTop: 4, lineHeight: 1.45 }}>{movie.reasonToWatch}</div>
          </div>
        )}

        {/* Metadata row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#787e8a', flexWrap: 'wrap' }}>
          {movie.duration > 0 && <span>⏱ {movie.duration} мин</span>}
          {movie.director && <span>👤 {movie.director}</span>}
          {movie.kpRating > 0 && <span style={{ color: 'hsl(38 90% 55%)' }}>★ КП {movie.kpRating}</span>}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(movie.genre || []).map(g => (
            <span key={g} style={{ padding: '2px 7px', borderRadius: 5, background: 'hsl(220 15% 16%)', color: '#d6d0c4', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g}</span>
          ))}
          {(movie.mood || []).map(m => (
            <span key={m} style={{ padding: '2px 7px', borderRadius: 5, background: 'hsl(38 90% 55% / 0.1)', color: 'hsl(38 90% 55%)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m}</span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <a href={`https://yandex.ru/search/?text=${encodeURIComponent(movie.titleRu + ' ' + movie.year + ' смотреть')}`}
            target="_blank" rel="noreferrer"
            style={{ padding: '10px 11px', borderRadius: 10, border: '1px solid hsl(220 15% 18%)', color: '#787e8a', fontSize: 11, textAlign: 'center', lineHeight: 1.3, textDecoration: 'none', flexShrink: 0 }}>
            Где<br/>смотреть
          </a>
          <button onClick={() => onRate(movie)}
            style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'hsl(38 90% 55%)', color: '#0d1117', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="hsl(220 20% 6%)" stroke="hsl(220 20% 6%)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Смотрю!
          </button>
          <button onClick={onSkip}
            style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid hsl(220 15% 18%)', background: 'none', color: '#787e8a', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'transform 0.1s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            Другой
          </button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { MovieCard });
