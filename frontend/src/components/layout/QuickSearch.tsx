import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, CornerDownLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { fetchPromos } from '../../services/promoService.js';
import { PromoList } from '../../types/index.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { openPathFor } from '../../utils/promoLinks.js';
import { navItemsFor } from './navigation.js';

interface Result {
  key: string;
  kind: 'page' | 'promo';
  label: string;
  sub: string;
  path: string;
  icon?: React.ReactNode;
  promo?: PromoList;
}

const MAX_PROMOS = 6;

/**
 * Header search: jumps to a page or a promo list (by code or title).
 * Ctrl+K or "/" focuses it from anywhere.
 */
export const QuickSearch: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [promos, setPromos] = useState<PromoList[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Keyboard shortcut to focus the search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close when clicking elsewhere.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Promo lists are fetched once, the first time the search is used, and refreshed on each later focus.
  const loadPromos = async () => {
    if (loading) return;
    setLoading(true);
    try {
      setPromos(await fetchPromos());
    } catch {
      setPromos((prev) => prev ?? []);
    } finally {
      setLoading(false);
    }
  };

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = navItemsFor(user?.role)
      .filter((p) => !q || `${p.name} ${p.description} ${p.keywords ?? ''}`.toLowerCase().includes(q))
      .map((p) => {
        const Icon = p.icon;
        return {
          key: `page:${p.path}`,
          kind: 'page' as const,
          label: p.name,
          sub: p.description,
          path: p.path,
          icon: <Icon className="w-4 h-4" />,
        };
      });

    if (!q) return pages;

    const promoResults: Result[] = (promos ?? [])
      .filter((p) => `${p.promoCode} ${p.title} ${p.department?.name ?? ''}`.toLowerCase().includes(q))
      .slice(0, MAX_PROMOS)
      .map((p) => ({
        key: `promo:${p.id}`,
        kind: 'promo' as const,
        label: p.title,
        sub: p.promoCode,
        path: openPathFor(p, user?.role) ?? '/calendar',
        promo: p,
      }));

    return [...promoResults, ...pages];
  }, [query, promos, user?.role]);

  useEffect(() => setActive(0), [query]);

  const go = (r: Result | undefined) => {
    if (!r) return;
    navigate(r.path);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const promoCount = results.filter((r) => r.kind === 'promo').length;
  const showNoPromoMatch = query.trim() && !loading && promos !== null && promoCount === 0;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          loadPromos();
        }}
        onKeyDown={onKeyDown}
        placeholder="Search promo lists…"
        aria-label="Search promo lists or pages"
        role="combobox"
        aria-expanded={open}
        aria-controls="quick-search-results"
        className="w-full pl-9 pr-16 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 pointer-events-none">
        Ctrl K
      </kbd>

      {open && (
        <div
          id="quick-search-results"
          role="listbox"
          className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50 py-2"
        >
          {loading && query.trim() && promos === null && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up promo lists…
            </div>
          )}
          {showNoPromoMatch && (
            <p className="px-4 py-2 text-xs text-slate-500">
              No promo list matches “{query.trim()}”. Try a promo code like <span className="font-mono">PR-2026</span>.
            </p>
          )}

          {results.map((r, i) => {
            const isFirstOfKind = i === 0 || results[i - 1].kind !== r.kind;
            return (
              <React.Fragment key={r.key}>
                {isFirstOfKind && (
                  <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {r.kind === 'promo' ? 'Promo lists' : query.trim() ? 'Pages' : 'Go to'}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition ${
                    i === active ? 'bg-emerald-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                      r.kind === 'promo' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {r.icon ?? <FileText className="w-4 h-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{r.label}</span>
                    <span
                      className={`block truncate text-xs text-slate-500 ${r.kind === 'promo' ? 'font-mono' : ''}`}
                    >
                      {r.sub}
                    </span>
                  </span>
                  {r.promo && <StatusBadge status={r.promo.status} size="sm" />}
                  {i === active && <CornerDownLeft className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
