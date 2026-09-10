import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Button, EASE, Pill } from '../components/primitives';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { buildIcs, downloadIcs } from './calendar';
import { clearDraft, loadDraft, saveDraft } from './draft';
import { LIMITS, isEmail, isPhone, looksAutomated, normalise } from './validate';
import { submitBooking } from '../lib/queries/bookings';
import { concerns, services, therapists } from '../data/site';
import {
  dayKey,
  formatDay,
  formatTime,
  makeReference,
  parseDayKey,
  slotsFor,
  upcomingDays,
} from './slots';

const STEPS = [
  { id: 'about', label: 'About you' },
  { id: 'format', label: 'Format' },
  { id: 'therapist', label: 'Therapist' },
  { id: 'time', label: 'Time' },
  { id: 'details', label: 'Details' },
  { id: 'review', label: 'Review' },
];

const FORMATS = [
  { id: 'video', label: 'Video call', icon: 'video', note: 'Anywhere we are licensed' },
  { id: 'inperson', label: 'In person', icon: 'pin', note: 'Filbert Street, SF' },
  { id: 'phone', label: 'Phone', icon: 'phone', note: 'No camera, no app' },
];

const WHO = [
  { id: 'individual', label: 'Just me' },
  { id: 'couples', label: 'Me and my partner' },
  { id: 'teen', label: 'My teenager' },
  { id: 'psychiatry', label: 'Medication review' },
];

const CADENCE = [
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Every two weeks' },
  { id: 'once', label: 'Just one session for now' },
];

const INSURERS = [
  'Self-pay',
  'Aetna',
  'Cigna',
  'United Healthcare',
  'Blue Shield of California',
  'Other / not sure',
];

const emptyForm = {
  concerns: [],
  who: '',
  format: '',
  cadence: 'weekly',
  therapist: '',
  date: '',
  time: '',
  name: '',
  email: '',
  phone: '',
  insurer: '',
  notes: '',
  consent: false,
  // Bot bait — a real user never sees or fills this.
  company: '',
};

/* ------------------------------------------------------------- primitives */

/**
 * All the choice controls in this flow are Radix ToggleGroups rather than rows
 * of buttons, so each group is one tab stop with arrow-key movement inside it,
 * and Radix owns the aria-pressed / roving-tabindex bookkeeping.
 */
const chipCls =
  'h-auto min-w-0 rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] text-ink-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-2 hover:bg-surface hover:text-ink active:scale-[0.97] data-[state=on]:border-aqua-500 data-[state=on]:bg-aqua-100 data-[state=on]:text-aqua-700 data-[state=on]:shadow-[0_4px_14px_-6px_rgba(13,148,136,0.45)]';

const cardCls =
  'h-auto min-w-0 flex-col items-start justify-start gap-3 rounded-3xl border border-line bg-surface p-5 text-left transition-all duration-300 hover:border-line-2 hover:bg-surface data-[state=on]:border-aqua-500 data-[state=on]:bg-aqua-100';

const fieldCls =
  'h-auto w-full rounded-2xl border-line-2 bg-surface-2 px-4 py-3.5 text-[15px] text-ink shadow-none placeholder:text-ink-4 focus-visible:border-aqua-500 focus-visible:ring-[3px] focus-visible:ring-aqua-500/20 md:text-[15px]';

function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-[13px] text-ink-2">
          {label}
        </Label>
        {error ? (
          <span className="text-[12px] text-coral-700">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-ink-4">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function StepHeader({ title, lead }) {
  return (
    <div>
      <h3 className="font-display text-[clamp(1.6rem,3.4vw,2.25rem)] leading-tight tracking-tight text-ink">
        {title}
      </h3>
      {lead && <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-3">{lead}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ steps */

function AboutStep({ form, set }) {
  return (
    <div className="flex flex-col gap-10">
      <StepHeader
        title="What brings you here?"
        lead="Pick anything that fits. This routes you to the right clinician — it is not a diagnosis, and you can change it later."
      />

      <ToggleGroup
        spacing={2}
        type="multiple"
        value={form.concerns}
        onValueChange={(v) => set({ concerns: v })}
        aria-label="What brings you here"
        className="flex w-full flex-wrap justify-start gap-2"
      >
        {concerns.map((c) => (
          <ToggleGroupItem key={c} value={c} className={chipCls}>
            {c}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div>
        <p className="text-[13px] text-ink-2">Who is this for?</p>
        <ToggleGroup
          spacing={2}
          type="single"
          value={form.who}
          onValueChange={(v) => v && set({ who: v, therapist: '' })}
          aria-label="Who is this for"
          className="mt-3 grid w-full gap-2 sm:grid-cols-2"
        >
          {WHO.map((w) => (
            <ToggleGroupItem key={w.id} value={w.id} className={`${chipCls} justify-start`}>
              {w.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

function FormatStep({ form, set }) {
  return (
    <div className="flex flex-col gap-10">
      <StepHeader title="How would you like to meet?" lead="You can switch format any week." />

      <ToggleGroup
        spacing={2}
        type="single"
        value={form.format}
        onValueChange={(v) => v && set({ format: v })}
        aria-label="Session format"
        className="grid w-full gap-3 sm:grid-cols-3"
      >
        {FORMATS.map((f) => (
          <ToggleGroupItem key={f.id} value={f.id} className={cardCls}>
            <span
              className={`grid size-10 place-items-center rounded-2xl border border-line ${
                form.format === f.id ? 'text-aqua-700' : 'text-ink-3'
              }`}
            >
              <Icon name={f.icon} size={19} />
            </span>
            <span className="text-[15px] text-ink">{f.label}</span>
            <span className="text-[12.5px] text-ink-4">{f.note}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div>
        <p className="text-[13px] text-ink-2">How often, to start?</p>
        <ToggleGroup
          spacing={2}
          type="single"
          value={form.cadence}
          onValueChange={(v) => v && set({ cadence: v })}
          aria-label="Session cadence"
          className="mt-3 flex w-full flex-wrap justify-start gap-2"
        >
          {CADENCE.map((c) => (
            <ToggleGroupItem key={c.id} value={c.id} className={chipCls}>
              {c.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}

function TherapistStep({ form, set, matches }) {
  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        title="Choose who you would like to see"
        lead="These are matched to what you told us. Every one offers a free fifteen-minute intro call first."
      />

      <ToggleGroup
        spacing={2}
        type="single"
        value={form.therapist}
        onValueChange={(v) => v && set({ therapist: v, date: '', time: '' })}
        aria-label="Choose a therapist"
        className="flex w-full flex-col gap-3"
      >
        <ToggleGroupItem
          value="any"
          className={`${cardCls} w-full flex-row items-center gap-4`}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-aqua-300 bg-aqua-100 text-aqua-700">
            <Icon name="shuffle" size={20} />
          </span>
          <span>
            <span className="block text-[15px] text-ink">Match me with someone</span>
            <span className="mt-1 block text-[13px] text-ink-3">
              A clinician reads your intake and picks. Usually the fastest route to a session.
            </span>
          </span>
        </ToggleGroupItem>

        <div className="grid gap-3 sm:grid-cols-2">
          {matches.map((t) => (
            <ToggleGroupItem key={t.id} value={t.id} className={`${cardCls} w-full gap-4`}>
              <span className="flex w-full items-start gap-3.5">
                <Avatar name={t.name} hue={t.hue} size="md" />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] text-ink">{t.name}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-3">{t.credentials}</span>
                  <span className="mt-1.5 block text-[12px] text-aqua-700">
                    {t.nextAvailable <= 1 ? 'Free tomorrow' : `Free in ${t.nextAvailable} days`}
                  </span>
                </span>
              </span>
              <span className="flex flex-wrap gap-1.5">
                {t.focus.slice(0, 3).map((f) => (
                  <Pill key={f}>{f}</Pill>
                ))}
              </span>
            </ToggleGroupItem>
          ))}
        </div>
      </ToggleGroup>
    </div>
  );
}

function TimeStep({ form, set }) {
  const days = useMemo(() => upcomingDays(12), []);
  const selectedDate = form.date ? parseDayKey(form.date) : null;
  const slots = useMemo(
    () => (selectedDate ? slotsFor(form.therapist, selectedDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.therapist, form.date],
  );

  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        title="Pick a time"
        lead="These are live openings, not a request queue. All times Pacific."
      />

      <div>
        <p className="text-[13px] text-ink-2">Day</p>
        <ToggleGroup
          spacing={2}
          type="single"
          value={form.date}
          onValueChange={(v) => v && set({ date: v, time: '' })}
          aria-label="Choose a day"
          className="-mx-1 mt-3 flex w-full justify-start gap-2 overflow-x-auto px-1 pb-3 [mask-image:linear-gradient(to_right,#000_0,#000_92%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {days.map((d) => {
            const k = dayKey(d);
            const f = formatDay(d);
            const count = slotsFor(form.therapist, d).length;
            return (
              <ToggleGroupItem
                key={k}
                value={k}
                disabled={count === 0}
                aria-label={`${f.full}, ${count} openings`}
                className="h-auto w-[76px] shrink-0 flex-col gap-1 rounded-2xl border border-line bg-surface py-3 transition-all duration-300 hover:border-line-2 hover:bg-surface disabled:opacity-30 data-[state=on]:border-aqua-500 data-[state=on]:bg-aqua-100"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-4">
                  {f.weekday}
                </span>
                <span
                  className={`font-display text-2xl leading-none ${
                    form.date === k ? 'text-aqua-700' : 'text-ink'
                  }`}
                >
                  {f.day}
                </span>
                <span className="text-[10.5px] text-ink-4">
                  {count > 0 ? `${count} open` : 'full'}
                </span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </div>

      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={form.date}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className="text-[13px] text-ink-2">{formatDay(selectedDate).full}</p>
            <ToggleGroup
              spacing={2}
              type="single"
              value={form.time}
              onValueChange={(v) => v && set({ time: v })}
              aria-label={`Times on ${formatDay(selectedDate).full}`}
              className="mt-3 grid w-full grid-cols-3 gap-2 sm:grid-cols-4"
            >
              {slots.map((t) => (
                <ToggleGroupItem
                  key={t}
                  value={t}
                  className={`${chipCls} justify-center text-center tabular-nums`}
                >
                  {formatTime(t)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailsStep({ form, set, errors }) {
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    email: `${uid}-email`,
    phone: `${uid}-phone`,
    insurer: `${uid}-insurer`,
    notes: `${uid}-notes`,
    company: `${uid}-company`,
    consent: `${uid}-consent`,
  };

  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        title="Where should we reach you?"
        lead="Used to confirm the appointment and nothing else. No newsletter, no partners."
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.name} htmlFor={ids.name}>
          <Input
            id={ids.name}
            className={fieldCls}
            value={form.name}
            autoComplete="name"
            maxLength={LIMITS.name}
            placeholder="Alex Rivera"
            aria-invalid={!!errors.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <Field label="Email" error={errors.email} htmlFor={ids.email}>
          <Input
            id={ids.email}
            type="email"
            className={fieldCls}
            value={form.email}
            autoComplete="email"
            maxLength={LIMITS.email}
            placeholder="alex@example.com"
            aria-invalid={!!errors.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Phone" hint="Optional" error={errors.phone} htmlFor={ids.phone}>
          <Input
            id={ids.phone}
            type="tel"
            className={fieldCls}
            value={form.phone}
            autoComplete="tel"
            maxLength={LIMITS.phone}
            placeholder="(415) 555-0142"
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="Insurance" error={errors.insurer} htmlFor={ids.insurer}>
          <Select value={form.insurer} onValueChange={(v) => set({ insurer: v })}>
            <SelectTrigger
              id={ids.insurer}
              className={`${fieldCls} justify-between [&>svg]:size-[18px] [&>svg]:opacity-60`}
              aria-invalid={!!errors.insurer}
            >
              <SelectValue placeholder="Select one" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="rounded-2xl border-line bg-surface shadow-[var(--shadow-float)]"
            >
              {INSURERS.map((i) => (
                <SelectItem key={i} value={i} className="rounded-xl py-2.5 text-[14.5px]">
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field
        label="Anything you want your therapist to know first?"
        hint="Optional"
        htmlFor={ids.notes}
      >
        <Textarea
          id={ids.notes}
          className={`${fieldCls} min-h-28 resize-y`}
          value={form.notes}
          maxLength={LIMITS.notes}
          autoComplete="off"
          placeholder="Only if you feel like it."
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>

      {/* Hidden from sight, from screen readers and from the tab order — only
          an automated form-filler will ever put anything in it. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={ids.company}>Company (leave blank)</label>
        <input
          id={ids.company}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.company}
          onChange={(e) => set({ company: e.target.value })}
        />
      </div>

      <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface-2 p-4">
        <Checkbox
          id={ids.consent}
          checked={form.consent}
          onCheckedChange={(v) => set({ consent: v === true })}
          aria-invalid={!!errors.consent}
          className="mt-0.5 size-5 rounded-md border-line-2 data-[state=checked]:border-aqua-600 data-[state=checked]:bg-aqua-600 data-[state=checked]:text-white"
        />
        <Label
          htmlFor={ids.consent}
          className="block text-[13.5px] font-normal leading-relaxed text-ink-3"
        >
          <span>
            I consent to telehealth care and agree to the privacy practices. I understand this
            booking can be cancelled free of charge up to 24 hours beforehand.
            {errors.consent && <span className="mt-1 block text-coral-700">{errors.consent}</span>}
          </span>
        </Label>
      </div>
    </div>
  );
}

function ReviewStep({ form, therapist }) {
  const date = form.date ? parseDayKey(form.date) : null;
  const service = services.find((s) => s.id === form.who);
  const rows = [
    { label: 'Care', value: service ? service.name : 'Individual therapy' },
    { label: 'Format', value: FORMATS.find((f) => f.id === form.format)?.label ?? '—' },
    { label: 'Therapist', value: therapist ? therapist.name : 'Matched for you' },
    {
      label: 'When',
      value: date ? `${formatDay(date).full} at ${formatTime(form.time)}` : '—',
    },
    { label: 'Cadence', value: CADENCE.find((c) => c.id === form.cadence)?.label ?? '—' },
    { label: 'Name', value: form.name },
    { label: 'Email', value: form.email },
    { label: 'Insurance', value: form.insurer },
  ];

  const price = service?.price ?? 165;
  const covered = form.insurer && form.insurer !== 'Self-pay' && form.insurer !== 'Other / not sure';
  const due = covered ? 35 : price;

  return (
    <div className="flex flex-col gap-8">
      <StepHeader title="Does this look right?" lead="Nothing is charged today." />

      <dl className="overflow-hidden rounded-3xl border border-line">
        {rows.map((r, i) => (
          <div
            key={r.label}
            className={`flex items-start justify-between gap-6 px-5 py-4 ${
              i % 2 ? 'bg-surface-2' : ''
            }`}
          >
            <dt className="text-[13px] text-ink-4">{r.label}</dt>
            <dd className="max-w-[62%] text-right text-[14.5px] text-ink">{r.value || '—'}</dd>
          </div>
        ))}
      </dl>

      {form.concerns.length > 0 && (
        <div>
          <p className="text-[13px] text-ink-4">Focus areas</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {form.concerns.map((c) => (
              <Pill key={c} tone="aqua">
                {c}
              </Pill>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-aqua-300 bg-aqua-100 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-ink-2">Estimated due at session</span>
          <span className="font-display text-3xl leading-none tracking-tight text-ink">${due}</span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
          {covered
            ? `Estimated copay with ${form.insurer}. We verify benefits before your session and will tell you if this changes — never after the fact.`
            : 'Self-pay rate. Sliding-scale places are available; mention it on your intro call.'}
        </p>
      </div>
    </div>
  );
}

function SuccessStep({ reference, form, therapist, onClose }) {
  const date = form.date ? parseDayKey(form.date) : null;
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative grid size-20 place-items-center"
      >
        <span className="absolute inset-0 rounded-full border border-aqua-400 [animation:pulse-ring_2.4s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-aqua-200 blur-xl" />
        <span className="relative grid size-16 place-items-center rounded-full border border-aqua-400 bg-aqua-100 text-aqua-700">
          <Icon name="check" size={26} />
        </span>
      </motion.div>

      <h3 className="mt-8 font-display text-[clamp(1.9rem,4vw,2.6rem)] leading-tight tracking-tight text-ink">
        You are booked.
      </h3>
      <p className="mt-4 max-w-[44ch] text-[15.5px] leading-relaxed text-ink-3">
        {date
          ? `${formatDay(date).full} at ${formatTime(form.time)}`
          : 'We will confirm your time shortly'}
        {therapist ? ` with ${therapist.name}.` : '.'} A confirmation is on its way to{' '}
        <span className="text-ink-2">{form.email}</span>.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-surface-2 px-6 py-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-4">Reference</p>
        <p className="mt-1.5 font-mono text-xl tracking-[0.14em] text-aqua-700">{reference}</p>
      </div>

      <p className="mt-8 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-4">
        Your information is stored securely and only accessible to our clinical team. We&apos;ll be in
        touch within one business day.
      </p>

      <div data-print-hide className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {form.date && form.time && (
          <Button
            variant="primary"
            size="lg"
            iconLeft="calendar"
            onClick={() =>
              downloadIcs(
                buildIcs({
                  reference,
                  dateKey: form.date,
                  time: form.time,
                  durationMin: services.find((s) => s.id === form.who)?.duration
                    ? parseInt(services.find((s) => s.id === form.who).duration, 10)
                    : 50,
                  therapistName: therapist?.name,
                  format: form.format,
                }),
                reference,
              )
            }
          >
            Add to calendar
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

export default function BookingDialog({ open, onClose, prefill, openerRef }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({ ...emptyForm, ...(loadDraft() ?? {}) }));
  const [errors, setErrors] = useState({});
  const [reference, setReference] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // +1 when advancing, -1 when going back — drives the slide direction
  const [dir, setDir] = useState(1);
  const openedAt = useRef(0);

  useEffect(() => {
    if (open && !openedAt.current) openedAt.current = Date.now();
    if (!open) openedAt.current = 0;
  }, [open]);

  const set = useCallback((patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors({});
  }, []);

  // apply whatever the caller preselected (a service card, a therapist card, a plan)
  useEffect(() => {
    if (!open || !prefill) return;
    const patch = {};
    if (prefill.service) {
      patch.who = ['individual', 'couples', 'teen', 'psychiatry'].includes(prefill.service)
        ? prefill.service
        : 'individual';
    }
    if (prefill.therapist) {
      patch.therapist = prefill.therapist;
      const t = therapists.find((x) => x.id === prefill.therapist);
      if (t && !patch.who) patch.who = t.services[0] === 'psychiatry' ? 'psychiatry' : 'individual';
    }
    if (Object.keys(patch).length) setForm((f) => ({ ...f, ...patch }));
  }, [open, prefill]);

  // Only the non-sensitive selections are written down; see ./draft.js.
  useEffect(() => {
    if (reference) return;
    saveDraft(form);
  }, [form, reference]);

  const matches = useMemo(() => {
    if (!form.who) return therapists;
    const filtered = therapists.filter((t) => t.services.includes(form.who));
    return filtered.length ? filtered : therapists;
  }, [form.who]);

  const therapist = useMemo(
    () => therapists.find((t) => t.id === form.therapist) ?? null,
    [form.therapist],
  );

  const validate = useCallback(
    (i) => {
      const e = {};
      if (i === 0) {
        if (form.concerns.length === 0) e.concerns = 'Pick at least one';
        if (!form.who) e.who = 'Choose one';
      }
      if (i === 1 && !form.format) e.format = 'Choose a format';
      if (i === 2 && !form.therapist) e.therapist = 'Choose a therapist, or ask to be matched';
      if (i === 3) {
        if (!form.date) e.date = 'Pick a day';
        else if (!form.time) e.time = 'Pick a time';
      }
      if (i === 4) {
        if (normalise(form.name, { maxLength: LIMITS.name }).length < 2) e.name = 'Required';
        if (!isEmail(form.email)) e.email = 'Enter a valid email';
        if (!isPhone(form.phone)) e.phone = 'Check this number';
        if (!form.insurer) e.insurer = 'Select one';
        if (!form.consent) e.consent = 'Please confirm to continue.';
      }
      return e;
    },
    [form],
  );

  const stepError = useMemo(() => Object.values(errors)[0] ?? null, [errors]);

  const submit = () => {
    // Client-side only, so not a security boundary — a server must repeat it.
    // It exists to keep stored values predictable and to shed drive-by bots.
    const bot = looksAutomated({ honeypot: form.company, openedAt: openedAt.current });
    if (bot) {
      setErrors({ submit: 'Something looks off with this submission. Please try again.' });
      return;
    }

    setForm((f) => ({
      ...f,
      name: normalise(f.name, { maxLength: LIMITS.name }),
      email: normalise(f.email, { maxLength: LIMITS.email }).toLowerCase(),
      phone: normalise(f.phone, { maxLength: LIMITS.phone }),
      notes: normalise(f.notes, { maxLength: LIMITS.notes, keepNewlines: true }),
    }));

    setSubmitting(true);
    const ref = makeReference();
    submitBooking(normalise(form), ref)
      .then(() => {
        setReference(ref);
        clearDraft();
      })
      .catch(() => {
        setErrors({ submit: 'Something went wrong. Please try again or call us directly.' });
      })
      .finally(() => setSubmitting(false));
  };

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setDir(1);
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  };

  const back = () => {
    setDir(-1);
    setErrors({});
    if (step > 0) setStep(step - 1);
  };

  const close = useCallback(() => {
    onClose();
    // let the exit animation finish before resetting
    setTimeout(() => {
      if (reference) {
        setForm(emptyForm);
        setReference(null);
        setStep(0);
        setDir(1);
      }
    }, 500);
  }, [onClose, reference]);

  const progress = reference ? 1 : (step + 1) / STEPS.length;

  return (
    // Radix owns the focus trap, focus restore, scroll lock, Escape handling
    // and aria-modal wiring — all of which this component used to hand-roll.
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          e.currentTarget?.focus();
        }}
        onCloseAutoFocus={(e) => {
          const opener = openerRef?.current;
          if (opener?.isConnected) {
            e.preventDefault();
            opener.focus();
          }
        }}
      >
        {/* header */}
        <div className="relative shrink-0 border-b border-line px-6 pb-5 pt-6 sm:px-9">
          <DialogDescription className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-4">
            {reference ? 'Confirmed' : `Step ${step + 1} of ${STEPS.length} — ${STEPS[step].label}`}
          </DialogDescription>
          <DialogTitle className="mt-1.5 font-display text-xl font-normal tracking-tight text-ink">
            Book a session
          </DialogTitle>

          <button
            onClick={close}
            data-print-hide
            className="absolute right-5 top-5 grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink sm:right-7"
            aria-label="Close booking"
          >
            <Icon name="close" size={18} />
          </button>

          <div className="mt-5 h-px w-full overflow-hidden bg-line">
            <motion.div
              className="h-full w-full origin-left bg-gradient-to-r from-aqua-500 to-violet-500"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress }}
              transition={{ duration: 0.7, ease: EASE }}
            />
          </div>
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-8 sm:px-9 sm:py-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={reference ? 'success' : step}
              initial={{ opacity: 0, x: dir * 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -26 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {reference ? (
                <SuccessStep
                  reference={reference}
                  form={form}
                  therapist={therapist}
                  onClose={close}
                />
              ) : step === 0 ? (
                <AboutStep form={form} set={set} />
              ) : step === 1 ? (
                <FormatStep form={form} set={set} />
              ) : step === 2 ? (
                <TherapistStep form={form} set={set} matches={matches} />
              ) : step === 3 ? (
                <TimeStep form={form} set={set} />
              ) : step === 4 ? (
                <DetailsStep form={form} set={set} errors={errors} />
              ) : (
                <ReviewStep form={form} therapist={therapist} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* footer */}
        {!reference && (
          <div
            data-print-hide
            className="shrink-0 border-t border-line bg-surface-2 px-6 py-5 sm:px-9"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                {stepError ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="truncate text-[13px] text-coral-700"
                  >
                    {stepError}
                  </motion.p>
                ) : (
                  <p className="truncate text-[13px] text-ink-4">
                    {step === 0
                      ? 'Takes about two minutes.'
                      : step === 3
                        ? 'All times Pacific.'
                        : step === 5
                          ? 'Nothing is charged today.'
                          : 'You can change any of this later.'}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {step > 0 && (
                  <Button variant="quiet" size="md" onClick={back}>
                    Back
                  </Button>
                )}
                <Button
                  variant="glow"
                  size="md"
                  icon={step === STEPS.length - 1 ? undefined : 'arrow'}
                  onClick={next}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Confirming…'
                    : step === STEPS.length - 1
                      ? 'Confirm booking'
                      : 'Continue'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
