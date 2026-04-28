// WatchHistory.jsx — Kino UI Kit
// Recreated from src/components/WatchHistory.tsx

const StarRating = ({ rating }) => (
  <div style={{ display: 'flex', gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <svg key={i} width="11" height="11" viewBox="0 0 24 24"
        fill={i <= rating ? 'hsl(38 90% 55%)' : 'none'}
        stroke="hsl(38 90% 55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    ))}
  </div>
);

const WatchHistory = ({ watched = [], onReRate }) => {
  if (watched.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#787e8a' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l4 2"></path>
        </svg>
        <div style={{ fontSize: 14 }}>Вы ещё ничего не смотрели</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>Оцените первый фильм — он появится здесь</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#787e8a', marginBottom: 2 }}>
        Просмотрено · {watched.length}
      </div>
      {watched.map((movie, idx) => (
        <div key={idx} style={{ background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 15% 18%)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 38, height: 52, borderRadius: 8, background: 'linear-gradient(135deg, hsl(38 90% 55% / 0.15), hsl(220 18% 14%))', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 55% / 0.4)" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, letterSpacing: '0.04em', color: '#ece9e0', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.titleRu}</div>
            <div style={{ fontSize: 10, color: '#787e8a', marginTop: 2 }}>{movie.year} · {movie.duration} мин</div>
            <div style={{ marginTop: 6 }}><StarRating rating={movie.rating || 3} /></div>
            {movie.notes && <div style={{ fontSize: 11, color: '#787e8a', marginTop: 4, lineHeight: 1.4, fontStyle: 'italic' }}>"{movie.notes}"</div>}
          </div>
          <button onClick={() => onReRate && onReRate(movie)}
            style={{ background: 'none', border: '1px solid hsl(220 15% 18%)', borderRadius: 8, padding: '5px 8px', color: '#787e8a', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>
            Изменить
          </button>
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { WatchHistory, StarRating });
