// AuthPanel.jsx — Kino UI Kit
// Recreated from src/components/AuthPanel.tsx

const AuthPanel = ({ session, syncStatus, onSignOut, onSendCode }) => {
  const [email, setEmail] = React.useState('');
  const [step, setStep] = React.useState('email');
  const [code, setCode] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    setSending(true);
    await onSendCode(email.trim());
    setStep('code');
    setSending(false);
  };

  const S = {
    panel: { background: 'hsl(220 15% 16% / 0.4)', border: '1px solid hsl(220 15% 18%)', borderRadius: 16, padding: 14 },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    headerLeft: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, color: '#ece9e0' },
    desc: { fontSize: 11, color: '#787e8a', marginBottom: 10, lineHeight: 1.45 },
    googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 12, border: '1px solid hsl(220 15% 18%)', background: 'hsl(220 20% 6%)', padding: '9px 16px', fontSize: 13, fontWeight: 500, color: '#ece9e0', cursor: 'pointer', marginBottom: 10 },
    divRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
    divLine: { flex: 1, height: 1, background: 'hsl(220 15% 18%)' },
    divText: { fontSize: 10, color: '#787e8a', whiteSpace: 'nowrap' },
    inputRow: { display: 'flex', gap: 7 },
    input: { flex: 1, background: 'hsl(220 20% 6%)', border: '1px solid hsl(220 15% 18%)', borderRadius: 12, padding: '9px 12px', fontSize: 13, color: '#ece9e0', outline: 'none', fontFamily: 'Inter, sans-serif' },
    btnSend: { padding: '9px 14px', borderRadius: 12, background: 'hsl(38 90% 55%)', color: '#0d1117', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' },
    hint: { fontSize: 10, color: '#787e8a', marginTop: 8, lineHeight: 1.4 },
    signoutBtn: { fontSize: 11, color: '#787e8a', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 },
  };

  if (session) {
    return (
      <div style={S.panel}>
        <div style={S.header}>
          <div style={S.headerLeft}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
            Облачная синхронизация включена
          </div>
          <button style={S.signoutBtn} onClick={onSignOut}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Выйти
          </button>
        </div>
        <div style={{ fontSize: 13, color: '#d6d0c4' }}>{session.email}</div>
        <div style={{ fontSize: 11, color: '#787e8a', marginTop: 3 }}>{syncStatus}</div>
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <div style={S.headerLeft}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(38 90% 55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
          Войдите, чтобы синхронизировать базу
        </div>
      </div>

      {step === 'email' ? (
        <>
          <div style={S.desc}>История оценок и watchlist будут храниться в Supabase и подтягиваться на любом устройстве после входа.</div>
          <button style={S.googleBtn}>
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Войти через Google
          </button>
          <div style={S.divRow}><div style={S.divLine}></div><span style={S.divText}>или по коду на email</span><div style={S.divLine}></div></div>
          <div style={S.inputRow}>
            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="you@example.com" type="email" style={S.input} />
            <button onClick={handleSend} disabled={sending || !email.trim()} style={{ ...S.btnSend, opacity: (sending || !email.trim()) ? 0.5 : 1 }}>Войти</button>
          </div>
          <div style={S.hint}>Пришлём код на email — вводишь его здесь, никаких браузеров.</div>
        </>
      ) : (
        <>
          <div style={{ borderRadius: 10, background: 'hsl(38 90% 55% / 0.08)', border: '1px solid hsl(38 90% 55% / 0.2)', padding: '9px 11px', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'hsl(38 90% 55%)' }}>Письмо отправлено на {email || 'вашу почту'}</div>
            <div style={{ fontSize: 10, color: '#787e8a', marginTop: 3, lineHeight: 1.4 }}>Открой письмо и найди <strong style={{ color: '#ece9e0' }}>8-значный код</strong> — он написан цифрами.</div>
          </div>
          <div style={S.inputRow}>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="12345678" inputMode="numeric" maxLength={8}
              style={{ ...S.input, textAlign: 'center', letterSpacing: '0.15em' }} />
            <button disabled={code.length < 6} style={{ ...S.btnSend, opacity: code.length < 6 ? 0.5 : 1 }}>Войти</button>
          </div>
          <button onClick={() => { setStep('email'); setCode(''); }} style={{ ...S.hint, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 8 }}>← Изменить email</button>
        </>
      )}
    </div>
  );
};

Object.assign(window, { AuthPanel });
