import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud, LogOut, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthPanelProps {
  session: Session | null;
  syncStatus: string;
  onSendCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, code: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const AuthPanel = ({ session, syncStatus, onSendCode, onVerifyCode, onSignOut }: AuthPanelProps) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [sentEmail, setSentEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      await onSendCode(email.trim());
      setSentEmail(email.trim());
      setEmail('');
      setStep('code');
    } catch {
      // Error toast shown by caller
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (code.trim().length < 6 || code.trim().length > 8) return;
    setSubmitting(true);
    try {
      await onVerifyCode(sentEmail, code.trim());
      setCode('');
      setStep('email');
    } catch {
      // Error toast shown by caller
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-secondary/40 border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Cloud className="w-4 h-4 text-primary" />
          <span className="font-medium">
            {session ? 'Облачная синхронизация включена' : 'Войдите, чтобы синхронизировать базу'}
          </span>
        </div>
        {session && (
          <button
            onClick={onSignOut}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Выйти
          </button>
        )}
      </div>

      {session ? (
        <div className="space-y-1">
          <p className="text-sm text-secondary-foreground">{session.user.email ?? 'anonymous user'}</p>
          <p className="text-xs text-muted-foreground">{syncStatus}</p>
        </div>
      ) : step === 'email' ? (
        <>
          <p className="text-xs text-muted-foreground">
            История оценок и watchlist будут храниться в Supabase и подтягиваться на любом устройстве после входа.
          </p>
          <button
            onClick={() => void handleGoogleSignIn()}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Войти через Google
          </button>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground">или по коду на email</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleSend(); }}
                placeholder="you@example.com"
                type="email"
                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={() => void handleSend()}
              disabled={submitting || !email.trim()}
              className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Войти
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Пришлём код на email — вводишь его здесь, никаких браузеров.
          </p>
        </>
      ) : (
        <>
          <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 space-y-0.5">
            <p className="text-xs font-semibold text-primary">Письмо отправлено на {sentEmail}</p>
            <p className="text-[11px] text-muted-foreground">
              Открой письмо и найди <span className="font-semibold text-foreground">8-значный код</span> — он написан цифрами.
              Не нажимай на кнопку-ссылку в письме, она не нужна.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              onKeyDown={e => { if (e.key === 'Enter') void handleVerify(); }}
              placeholder="12345678"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary tracking-widest text-center"
            />
            <button
              onClick={() => void handleVerify()}
              disabled={submitting || code.trim().length < 6 || code.trim().length > 8}
              className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Войти
            </button>
          </div>
          <div className="flex items-center justify-between">
            <a
              href="googlegmail://"
              className="text-xs text-primary underline underline-offset-2"
            >
              Открыть Gmail →
            </a>
            <button
              onClick={() => { setStep('email'); setCode(''); }}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Изменить email
            </button>
          </div>
        </>
      )}
    </div>
  );
};
