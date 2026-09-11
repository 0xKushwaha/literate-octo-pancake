import { useId } from 'react';

/* ── Panel ────────────────────────────────────────────────────────────────
   The white card every list and form sits in. One definition so the border,
   radius and shadow cannot drift page to page. */
export function Panel({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/* ── PageHeader ───────────────────────────────────────────────────────────
   Title, optional count, optional action. Every page had its own arrangement
   of these three things; now they line up. */
export function PageHeader({ title, subtitle, count, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {(subtitle || count != null) && (
          <p className="mt-1 text-sm text-gray-500">
            {count != null && <span>{count} {count === 1 ? 'item' : 'items'}</span>}
            {count != null && subtitle && <span> &middot; </span>}
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

/* ── SearchInput ──────────────────────────────────────────────────────────
   Filters as you type. `/` focuses it from anywhere on the page, which is the
   shortcut people already expect from every list UI they use. */
export function SearchInput({ value, onChange, placeholder = 'Search…', resultCount, total }) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-[16rem] flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          ⌕
        </span>
        <label htmlFor={id} className="sr-only">{placeholder}</label>
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-8 text-sm text-gray-900 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>
      {value && resultCount != null && (
        <p aria-live="polite" className="text-xs text-gray-500">
          {resultCount} of {total} match &ldquo;{value}&rdquo;
        </p>
      )}
    </div>
  );
}

/* ── FilterTabs ───────────────────────────────────────────────────────────
   Radio-group semantics, so arrow keys move between options and a screen
   reader announces which one is selected. */
export function FilterTabs({ options, value, onChange, counts }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 ${
              active
                ? 'bg-gray-900 text-white'
                : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt}
            {counts?.[opt] != null && (
              <span className={active ? 'ml-1.5 text-gray-300' : 'ml-1.5 text-gray-400'}>
                {counts[opt]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Table header cell, sortable ──────────────────────────────────────────
   aria-sort is what makes the sort state audible rather than purely visual. */
export function Th({ children, sortKey, sort, onSort, align = 'left', className = '' }) {
  const sortable = Boolean(sortKey && onSort);
  const active = sortable && sort?.key === sortKey;
  const direction = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <th
      scope="col"
      aria-sort={sortable ? direction : undefined}
      className={`px-5 py-3 text-xs font-medium uppercase tracking-wide text-gray-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
        >
          {children}
          <span aria-hidden="true" className={active ? 'text-gray-900' : 'text-gray-300'}>
            {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

/* ── Loading skeletons ────────────────────────────────────────────────────
   A shape the eye can already read beats the word "Loading…": the layout does
   not jump when the rows arrive. */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="divide-y divide-gray-100" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="flex gap-5 bg-gray-50 px-5 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 flex-1 rounded bg-gray-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex animate-pulse items-center gap-5 px-5 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3.5 flex-1 rounded bg-gray-100"
              style={{ maxWidth: c === 0 ? '18rem' : '8rem' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="h-11 rounded-xl bg-gray-100" />
      <div className="h-20 rounded-xl bg-gray-100" />
      <div className="h-64 rounded-xl bg-gray-100" />
    </div>
  );
}

/* ── Terminal states ──────────────────────────────────────────────────────
   Empty and failed are different situations and used to render the same grey
   sentence. An empty list is a normal state with a next step; a failed load is
   a problem with a cause and a retry. */
export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-gray-400">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <p className="text-sm font-medium text-red-700">Could not load this list</p>
      <p className="max-w-md text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────── */
const buttonBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants = {
  primary: 'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900',
  accent: 'bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-600',
  ghost: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400',
  danger: 'border border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-500',
};

export function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return <button type={type} className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

/* ── DemoBanner ───────────────────────────────────────────────────────────
   One wording, one place. Every page used to phrase this differently, and all
   of them understated it: nothing is saved at all. */
export function DemoBanner() {
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-900">
        <strong>Demo mode — nothing you change here is stored.</strong> Supabase credentials are not
        configured, so edits live in browser memory and disappear on refresh.
      </p>
    </div>
  );
}
