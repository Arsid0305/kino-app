import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, BookmarkPlus, Check, EyeOff, Loader2, Send, Sparkles, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { FilterState, Movie, WatchedMovie } from '@/lib/movieTypes';
import { buildFilterSummary, buildTasteProfileSummary, toMovieContext } from '@/lib/tasteProfile';
import { loadChatMessages, saveChatMessage, StoredChatMessage } from '@/lib/chatStore';
import { getMovieDedupKey } from '@/lib/movieIdentity';

type AdvisorMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions: Movie[];
  createdAt?: string;
};

interface AiAdvisorProps {
  session: Session | null;
  watchedMovies: WatchedMovie[];
  watchlistMovies: Movie[];
  dismissedMovies: Movie[];
  filters: FilterState;
  onAddToWatchlist: (movie: Movie) => void;
  onRateMovie: (movie: Movie) => void;
  onDismissMovie: (movie: Movie) => void;
}

interface ChatResponse {
  message?: string;
  suggestions?: Movie[];
  error?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-chat`;
const MAX_MOVIES_IN_CONTEXT = 30;

type Provider = 'claude' | 'gpt4o' | 'perplexity' | 'deepseek';

const PROVIDERS: { id: Provider; label: string; dot: string }[] = [
  { id: 'claude',     label: 'Claude', dot: '#E8784D' },
  { id: 'gpt4o',      label: 'GPT',    dot: '#10A37F' },
  { id: 'perplexity', label: 'Pplx',   dot: '#20B2AA' },
  { id: 'deepseek',   label: 'DS',     dot: '#4D6AFF' },
];

async function getAccessToken(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) return sessionData.session.access_token;

  const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
  if (anonError || !anonData.session?.access_token) {
    throw new Error('Не удалось открыть анонимную сессию Supabase');
  }
  return anonData.session.access_token;
}

function normalizeSuggestions(movies: Movie[] | undefined): Movie[] {
  return (movies ?? []).map((movie, index) => ({
    ...movie,
    id: movie.id || `chat:${crypto.randomUUID()}:${index}`,
    title: movie.title || movie.titleRu || 'Untitled',
    titleRu: movie.titleRu || movie.title || 'Untitled',
    genre: movie.genre ?? [],
    mood: movie.mood ?? [],
    timeOfDay: movie.timeOfDay ?? ['evening'],
    format: movie.format ?? 'medium',
    forCompany: movie.forCompany ?? 'any',
    description: movie.description ?? '',
    director: movie.director ?? '',
    duration: Number(movie.duration ?? 0),
    year: Number(movie.year ?? 0),
    source: 'ai-chat',
  }));
}

function fromStoredMessage(message: StoredChatMessage): AdvisorMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    suggestions: normalizeSuggestions(message.suggestions),
    createdAt: message.createdAt,
  };
}

export const AiAdvisor = ({
  session,
  watchedMovies,
  watchlistMovies,
  dismissedMovies,
  filters,
  onAddToWatchlist,
  onRateMovie,
  onDismissMovie,
}: AiAdvisorProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [provider, setProvider] = useState<Provider>(() => {
    const saved = localStorage.getItem('kino-ai-provider');
    return (PROVIDERS.some(p => p.id === saved) ? saved : 'deepseek') as Provider;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSetProvider = (p: Provider) => {
    setProvider(p);
    localStorage.setItem('kino-ai-provider', p);
  };

  const cloudHistoryEnabled = Boolean(session && !session.user.is_anonymous);

  const clearChat = async () => {
    setMessages([]);
    if (cloudHistoryEnabled) {
      try {
        await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch (e) {
        console.error('Failed to clear chat:', e);
      }
    }
  };

  const watchedKeys = useMemo(
    () => new Set(watchedMovies.map(movie => getMovieDedupKey(movie))),
    [watchedMovies]
  );
  const watchlistKeys = useMemo(
    () => new Set(watchlistMovies.map(movie => getMovieDedupKey(movie))),
    [watchlistMovies]
  );
  const dismissedKeys = useMemo(
    () => new Set(dismissedMovies.map(movie => getMovieDedupKey(movie))),
    [dismissedMovies]
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    setHistoryLoaded(false);
    if (!cloudHistoryEnabled) {
      setMessages([]);
    }
  }, [cloudHistoryEnabled, session?.user.id]);

  useEffect(() => {
    if (!open || !cloudHistoryEnabled || historyLoaded) return;

    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const storedMessages = await loadChatMessages();
        if (cancelled) return;
        setMessages(storedMessages.map(fromStoredMessage));
      } catch (error) {
        if (cancelled) return;
        console.error(error);
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
          setHistoryLoaded(true);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [open, cloudHistoryEnabled, historyLoaded]);

  const getSuggestionStatus = (movie: Movie) => {
    const key = getMovieDedupKey(movie);
    if (watchedKeys.has(key)) return 'watched';
    if (watchlistKeys.has(key)) return 'watchlist';
    if (dismissedKeys.has(key)) return 'dismissed';
    return 'new';
  };

  const persistMessage = async (message: AdvisorMessage) => {
    if (!cloudHistoryEnabled) return;
    await saveChatMessage(message.role, message.content, message.suggestions);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: AdvisorMessage = {
      id: `local-user:${crypto.randomUUID()}`,
      role: 'user',
      content: text,
      suggestions: [],
    };

    const nextConversation = [...messages, userMessage];

    setMessages(nextConversation);
    setInput('');
    setLoading(true);

    try {
      const accessToken = await getAccessToken();
      await persistMessage(userMessage).catch(error => {
        console.error('Failed to persist user chat message:', error);
      });

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          provider,
          messages: nextConversation.map(message => ({
            role: message.role,
            content: message.content,
          })),
          filters: buildFilterSummary(filters),
          tasteProfile: buildTasteProfileSummary(watchedMovies, watchlistMovies),
          watchedMovies: watchedMovies.slice(0, MAX_MOVIES_IN_CONTEXT).map(toMovieContext),
          watchlistMovies: watchlistMovies.slice(0, MAX_MOVIES_IN_CONTEXT).map(toMovieContext),
          dismissedMovies: dismissedMovies.slice(0, MAX_MOVIES_IN_CONTEXT).map(toMovieContext),
        }),
      });

      const payload = await resp.json().catch(() => ({ error: 'Ошибка сервера' } as ChatResponse));
      if (!resp.ok) {
        throw new Error(payload.error || 'Ошибка чата');
      }

      const assistantMessage: AdvisorMessage = {
        id: `local-assistant:${crypto.randomUUID()}`,
        role: 'assistant',
        content: payload.message?.trim() || 'Не удалось получить ответ.',
        suggestions: normalizeSuggestions(payload.suggestions),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await persistMessage(assistantMessage).catch(error => {
        console.error('Failed to persist assistant chat message:', error);
      });
    } catch (error) {
      const fallbackMessage: AdvisorMessage = {
        id: `local-error:${crypto.randomUUID()}`,
        role: 'assistant',
        content: `❌ ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        suggestions: [],
      };

      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg cinema-glow flex items-center justify-center"
      >
        <Bot className="w-6 h-6" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed inset-x-0 bottom-0 z-50 max-w-md mx-auto h-[78vh] flex flex-col bg-card border border-border rounded-t-2xl shadow-2xl overflow-hidden"
          >
            <div className="border-b border-border bg-secondary/50">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-display text-lg text-foreground">Кино AI</span>
                </div>
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <button
                      onClick={() => void clearChat()}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Очистить чат"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="px-3 pb-2.5">
                <div className="flex bg-secondary rounded-xl p-1">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSetProvider(p.id)}
                      className={`flex flex-1 items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        provider === p.id
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {historyLoading && (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}

              {!historyLoading && messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-8">
                  <Bot className="w-10 h-10 mx-auto mb-3 text-primary/40" />
                  <p>Спроси, что посмотреть.</p>
                  <p className="text-xs mt-1">
                    Я отвечаю только про фильмы, сериалы, мультфильмы и похожий видеоконтент.
                  </p>
                </div>
              )}

              {messages.map(message => (
                <div key={message.id} className={`space-y-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-secondary text-foreground rounded-bl-md'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>

                  {message.role === 'assistant' && message.suggestions.length > 0 && (
                    <div className="space-y-2">
                      {message.suggestions.map(movie => {
                        const status = getSuggestionStatus(movie);

                        return (
                          <div key={getMovieDedupKey(movie)} className="rounded-2xl border border-border bg-secondary/40 p-3 space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{movie.titleRu}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {movie.year > 0 ? `${movie.year} • ` : ''}
                                    {movie.type === 'series' ? 'Сериал' : 'Фильм'}
                                  </p>
                                </div>
                              </div>

                              {movie.reasonToWatch && (
                                <p className="text-xs text-foreground/90">{movie.reasonToWatch}</p>
                              )}

                              {movie.description && (
                                <p className="text-xs text-muted-foreground line-clamp-3">{movie.description}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => onAddToWatchlist(movie)}
                                disabled={status === 'watchlist'}
                                className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-1.5 text-[11px] leading-none ${
                                  status === 'watchlist'
                                    ? 'border-primary/30 bg-primary/15 text-primary'
                                    : 'border-border bg-background text-foreground'
                                }`}
                              >
                                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Буду смотреть</span>
                              </button>

                              <button
                                onClick={() => onRateMovie(movie)}
                                className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-1.5 text-[11px] leading-none ${
                                  status === 'watched'
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-background text-foreground'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Просмотрено</span>
                              </button>

                              <button
                                onClick={() => onDismissMovie(movie)}
                                disabled={status === 'dismissed'}
                                className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-1.5 text-[11px] leading-none ${
                                  status === 'dismissed'
                                    ? 'border-destructive/30 bg-destructive/15 text-destructive'
                                    : 'border-border bg-background text-muted-foreground'
                                }`}
                              >
                                <EyeOff className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">Не буду смотреть</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-secondary/30">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Например: короткие серии на несколько дней"
                  className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => void send()}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};