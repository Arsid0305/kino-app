import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Cloud, LogOut, Mail } from 'lucide-react';

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
    if (code.trim().length < 6) return;
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
          <p className="text-xs text-muted-foreground">
            Код отправлен на <span className="text-foreground">{sentEmail}</span>. Введи его ниже.
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') void handleVerify(); }}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary tracking-widest text-center"
            />
            <button
              onClick={() => void handleVerify()}
              disabled={submitting || code.trim().length < 6}
              className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              Войти
            </button>
          </div>
          <a
            href="message://"
            className="block text-center text-xs text-primary underline underline-offset-2 py-0.5"
          >
            Открыть почту
          </a>
          <button
            onClick={() => { setStep('email'); setCode(''); }}
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            Изменить email
          </button>
        </>
      )}
    </div>
  );
};
