import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { getRoleTheme } from '../../utils/roleTheme.js';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
}) => {
  const { user } = useAuth();
  const roleTheme = getRoleTheme(user?.role);

  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#041a10] via-[#00381e] to-[#02140b] text-white shadow-xl shadow-emerald-950/15 border border-emerald-950/50">
      {/* Subtle Ambient Lighting matching Login */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-emerald-500/20 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-[#E31B23]/15 blur-[95px]" />

      {/* Architectural Grid Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative z-10 p-5 sm:px-7 sm:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          {/* Top Brand Stripe + Breadcrumbs + Role Badge */}
          <div className="flex flex-wrap items-center gap-2.5 mb-1">
            <div className="flex items-center gap-1 mr-1">
              <span className="h-1 w-6 rounded-full bg-[#E31B23]" />
              <span className="h-1 w-10 rounded-full bg-[#007D32]" />
            </div>

            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200/75">
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={b.label}>
                    {i > 0 && <span className="text-white/30">/</span>}
                    <span className={i === breadcrumbs.length - 1 ? 'text-white' : ''}>
                      {b.label}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200/85">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {roleTheme.workspaceLabel}
              </span>
            )}

            {user && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${roleTheme.darkBadgeClass}`}
              >
                {roleTheme.badge}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-[26px] font-black text-white tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center rounded-2xl bg-white/95 backdrop-blur-md p-2 shadow-lg shadow-black/25 border border-white/25">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};
