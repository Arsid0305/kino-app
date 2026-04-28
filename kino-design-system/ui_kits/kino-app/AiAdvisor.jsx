// AiAdvisor.jsx — Kino UI Kit
// Recreated from src/components/AiAdvisor.tsx

const PROVIDERS = [
  { id: 'claude', label: 'Claude', color: '#E8784D' },
  { id: 'gpt4o', label: 'GPT', color: '#10A37F' },
  { id: 'gemini', label: 'Gemini', color: '#4285F4' },
  { id: 'deepseek', label: 'DS', color: '#4D6AFF' },
];

const ProviderDot = ({ color }) => (
  <svg width="11" height="11" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="5" fill={color} />
  </svg>
);

const AiAdvisor = ({ watchedMovies = [], onAddToWatchlist }) => {
  const [open, setOpen] = React.useState(false);
  const [provider, setProvider] = React.useState('claude');
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { id: Date.now(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    // Simulate AI response
    await new Promise(r => setTimeout(r, 900));
    const botMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: 'Попробуй **Dredd** (2012) — 95 минут чистого экшена, очень плотный темп. Или **Локк** — один актёр, один автомобиль, 85 минут, держит мёртвой хваткой.',
    };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  };

  const S = {
    fab: {
      position: 'fixed', bottom: 22, right: 22, zIndex: 50,
      width: 52, height: 52, borderRadius: '50%',
      background: 'hsl(38 90% 55%)', color: '#0d1117',
      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 24px -4px hsl(38 90% 55% / 0.35)',
      transition: 'transform 0.15s',
    },
    panel: {
      position: 'fixed', insetInline: 0, bottom: 0, zIndex: 50,
      maxWidth: 448, margin: '0 auto',
      height: '76vh', display: 'flex', flexDirection: 'column',
      background: 'hsl(220 18% 10%)', border: '1px solid hsl(220 15% 18%)',
      borderRadius: '16px 16px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(40px)',
      transition: 'opacity 0.25s, transform 0.25s', pointerEvents: open ? 'auto' : 'none',
    },
    panelHeader: { borderBottom: '1px solid hsl(220 15% 18%)', background: 'hsl(220 15% 16% / 0.5)' },
    headerTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' },
    title: { display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '0.04em', color: '#ece9e0' },
    tabs: { display: 'flex', background: 'hsl(220 15% 16%)', borderRadius: 12, padding: 4, margin: '0 12px 10px', gap: 2 },
    tab: (active) => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '5px 0', borderRadius: 9, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: active ? 'hsl(220 18% 10%)' : 'transparent', color: active ? '#ece9e0' : '#787e8a', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.3)' : 'none' }),
    messages: { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
    msgUser: { alignSelf: 'flex-end', background: 'hsl(38 90% 55%)', color: '#0d1117', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 13, maxWidth: '75%' },
    msgBot: { alignSelf: 'flex-start', background: 'hsl(220 15% 16%)', color: '#ece9e0', borderRadius: '14px 14px 14px 4px', padding: '8px 12px', fontSize: 13, maxWidth: '82%', lineHeight: 1.45 },
    inputArea: { padding: '10px 12px', borderTop: '1px solid hsl(220 15% 18%)', background: 'hsl(220 15% 16% / 0.3)', display: 'flex', gap: 7 },
    input: { flex: 1, background: 'hsl(220 15% 16%)', border: '1px solid hsl(220 15% 18%)', borderRadius: 12, padding: '8px 12px', fontSize: 13, color: '#ece9e0', outline: 'none', fontFamily: 'Inter, sans-serif' },
    sendBtn: { width: 38, height: 38, borderRadius: 10, background: 'hsl(38 90% 55%)', color: '#0d1117', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!input.trim() || loading) ? 0.4 : 1 },
  };

  const renderContent = (content) => {
    // Simple bold markdown
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  return (
    <>
      {/* FAB */}
      {!open && (
        <button style={S.fab} onClick={() => setOpen(true)}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.88)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect>
            <path d="M2 14h2M20 14h2M15 13v2M9 13v2"></path>
          </svg>
        </button>
      )}

      {/* Panel */}
      <div style={S.panel}>
        <div style={S.panelHeader}>
          <div style={S.headerTop}>
            <div style={S.title}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
              </svg>
              Кино AI
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', padding: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#787e8a', cursor: 'pointer', padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div style={S.tabs}>
            {PROVIDERS.map(p => (
              <button key={p.id} onClick={() => setProvider(p.id)} style={S.tab(provider === p.id)}>
                <ProviderDot color={p.color} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} style={S.messages}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: '#787e8a', fontSize: 13, padding: '24px 0' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 55% / 0.35)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}>
                <path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2M20 14h2M15 13v2M9 13v2"></path>
              </svg>
              <div>Спроси, что посмотреть.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Я отвечаю только про фильмы, сериалы, мультфильмы и похожий видеоконтент.</div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={msg.role === 'user' ? S.msgUser : S.msgBot}
              dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }} />
          ))}
          {loading && (
            <div style={{ ...S.msgBot, display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(38 90% 55%)', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
        </div>

        <div style={S.inputArea}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Например: короткие серии на несколько дней" style={S.input} />
          <button onClick={send} disabled={!input.trim() || loading} style={S.sendBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.85)} 50%{opacity:1;transform:scale(1.1)} }`}</style>
    </>
  );
};

Object.assign(window, { AiAdvisor });
