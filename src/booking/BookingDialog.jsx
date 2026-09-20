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
  BOOKING_CADENCE, BOOKING_FORMATS, BOOKING_STEPS, BOOKING_WHO, INSURERS as INSURERS_DEFAULT,
} from '../data/contentSchema';
import { useSiteContent } from '../lib/queries/siteContent';
import {
  dayKey,
  formatDay,
  formatTime,
  parseDayKey,
  slotsFor,
  upcomingDays,
} from './slots';


/**
 * The option lists live in the CMS (Admin → Site content → Everywhere →
 * Booking), so the practice can change the formats it offers, who a session
 * can be for, the cadences and the insurer list without a deploy. `useOptions`
 * falls back to the built-in defaults whenever a stored list is empty or
 * malformed, so the form can never end up with no options at all.
 */
function useBookingOptions() {
  const c = useSiteContent('booking');
  const list = (value, fallback) => (Array.isArray(value) && value.length ? value : fallback);
  return {
    copy: c,
    STEPS: list(c.steps, BOOKING_STEPS),
    FORMATS: list(c.formats, BOOKING_FORMATS),
    WHO: list(c.who, BOOKING_WHO),
    CADENCE: list(c.cadence, BOOKING_CADENCE),
    CONCERNS: list(c.concerns, concerns),
    INSURERS: list(c.insurers, INSURERS_DEFAULT),
  };
}

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
// `whitespace-normal` undoes the shadcn toggle variant's `whitespace-nowrap`.
// Every label here is a CMS field, so a long one has to wrap inside the chip
// rather than run out of it.
const chipCls =
  'h-auto min-w-0 max-w-full whitespace-normal break-words rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] text-ink-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-line-2 hover:bg-surface hover:text-ink active:scale-[0.97] data-[state=on]:border-brand-500 data-[state=on]:bg-brand-100 data-[state=on]:text-ink data-[state=on]:shadow-[0_4px_14px_-6px_rgba(255,191,0,0.45)]';

// Same fix as chipCls: without `whitespace-normal` the note under "Video call"
// sets itself on one line and prints straight through the card's edge.
const cardCls =
  'h-auto min-w-0 max-w-full whitespace-normal break-words flex-col items-start justify-start gap-3 rounded-3xl border border-line bg-surface p-5 text-left transition-all duration-300 hover:border-line-2 hover:bg-surface data-[state=on]:border-brand-500 data-[state=on]:bg-brand-100';

const fieldCls =
  'h-auto w-full rounded-2xl border-line-2 bg-surface-2 px-4 py-3.5 text-[15px] text-ink shadow-none placeholder:text-ink-4 focus-visible:border-brand-500 focus-visible:ring-[3px] focus-visible:ring-brand-500/20 md:text-[15px]';

function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor} className="text-[13px] text-ink-2">
          {label}
        </Label>
        {error ? (
          <span className="text-[12px] text-ink">{error}</span>
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
      <h3 className="t-dialog-title font-display text-[clamp(1.6rem,3.4vw,2.25rem)] leading-tight tracking-tight text-ink">
        {title}
      </h3>
      {lead && <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-3">{lead}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ steps */

function AboutStep({ form, set }) {
  const { CONCERNS, WHO, copy, STEPS } = useBookingOptions();
  const step = STEPS[0] ?? {};
  return (
    <div className="flex flex-col gap-10">
      <StepHeader
        title={step.title}
        lead={step.lead}
      />

      <ToggleGroup
        spacing={2}
        type="multiple"
        value={form.concerns}
        onValueChange={(v) => set({ concerns: v })}
        aria-label="What brings you here"
        className="flex w-full flex-wrap justify-start gap-2"
      >
        {CONCERNS.map((c) => (
          <ToggleGroupItem key={c} value={c} className={chipCls}>
            {c}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div>
        <p className="text-[13px] text-ink-2">{copy.who_question}</p>
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
  const { FORMATS, CADENCE, copy, STEPS } = useBookingOptions();
  const step = STEPS[1] ?? {};
  return (
    <div className="flex flex-col gap-10">
      <StepHeader title={step.title} lead={step.lead} />

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
                form.format === f.id ? 'text-ink' : 'text-ink-3'
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
        <p className="text-[13px] text-ink-2">{copy.cadence_question}</p>
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
  const { copy, STEPS } = useBookingOptions();
  const step = STEPS[2] ?? {};
  return (
    <div className="flex flex-col gap-8">
      <StepHeader
        title={step.title}
        lead={step.lead}
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
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-brand-300 bg-brand-100 text-ink">
            <Icon name="shuffle" size={20} />
          </span>
          <span>
            <span className="block text-[15px] text-ink">{copy.match_me}</span>
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
                  <span className="mt-1.5 block text-[12px] text-ink">
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
  const { STEPS } = useBookingOptions();
  const step = STEPS[3] ?? {};
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
        title={step.title}
        lead={step.lead}
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
                className="h-auto w-[76px] shrink-0 flex-col gap-1 rounded-2xl border border-line bg-surface py-3 transition-all duration-300 hover:border-line-2 hover:bg-surface disabled:opacity-30 data-[state=on]:border-brand-500 data-[state=on]:bg-brand-100"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-4">
                  {f.weekday}
                </span>
                <span
                  className={`font-display text-2xl leading-none ${
                    form.date === k ? 'text-ink' : 'text-ink'
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
  const { INSURERS, copy, STEPS } = useBookingOptions();
  const step = STEPS[4] ?? {};
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
        title={step.title}
        lead={step.lead}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={copy.field_name} error={errors.name} htmlFor={ids.name}>
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
        <Field label={copy.field_email} error={errors.email} htmlFor={ids.email}>
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
        <Field label={copy.field_phone} hint={copy.optional} error={errors.phone} htmlFor={ids.phone}>
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
        <Field label={copy.field_insurer} error={errors.insurer} htmlFor={ids.insurer}>
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
        label={copy.field_note}
        hint={copy.optional}
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
          className="mt-0.5 size-5 rounded-md border-line-2 data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500 data-[state=checked]:text-on-brand"
        />
        <Label
          htmlFor={ids.consent}
          className="block text-[13.5px] font-normal leading-relaxed text-ink-3"
        >
          <span>
            I consent to telehealth care and agree to the privacy practices. I understand this
            booking can be cancelled free of charge up to 24 hours beforehand.
            {errors.consent && <span className="mt-1 block text-ink">{errors.consent}</span>}
          </span>
        </Label>
      </div>
    </div>
  );
}

function ReviewStep({ form, therapist }) {
  const { FORMATS, CADENCE, copy, STEPS } = useBookingOptions();
  const step = STEPS[5] ?? {};
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
      <StepHeader title={step.title} lead={step.lead} />

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
          <p className="text-[13px] text-ink-4">{copy.focus_label}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {form.concerns.map((c) => (
              <Pill key={c} tone="rose">
                {c}
              </Pill>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-brand-300 bg-brand-100 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[14px] text-ink-2">{copy.estimate_label}</span>
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
  const { copy: bookingCopy } = useBookingOptions();
  const ui = useSiteContent('ui');
  const copy = { ...bookingCopy, close_label: ui.close };
  const date = form.date ? parseDayKey(form.date) : null;
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative grid size-20 place-items-center"
      >
        <span className="absolute inset-0 rounded-full border border-brand-300 [animation:pulse-ring_2.4s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-brand-200 blur-xl" />
        <span className="relative grid size-16 place-items-center rounded-full border border-brand-300 bg-brand-100 text-ink">
          <Icon name="check" size={26} />
        </span>
      </motion.div>

      <h3 className="t-dialog-title mt-8 font-display text-[clamp(1.9rem,4vw,2.6rem)] leading-tight tracking-tight text-ink">
        {copy.success_title}
      </h3>
      <p className="mt-4 max-w-[44ch] text-[15.5px] leading-relaxed text-ink-3">
        {date
          ? `${formatDay(date).full} at ${formatTime(form.time)}`
          : 'We will confirm your time shortly'}
        {therapist ? ` with ${therapist.name}.` : '.'} A confirmation is on its way to{' '}
        <span className="text-ink-2">{form.email}</span>.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-surface-2 px-6 py-4">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-4">{copy.reference_label}</p>
        <p className="mt-1.5 font-mono text-xl tracking-[0.14em] text-ink">{reference}</p>
      </div>

      <p className="mt-8 max-w-[46ch] text-[13.5px] leading-relaxed text-ink-4">
        {copy.success_privacy}
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
            {copy.add_to_calendar}
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onClose}>
          {copy.close_label}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

export default function BookingDialog({ open, onClose, prefill, openerRef }) {
  const { copy, STEPS } = useBookingOptions();
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
    setErrors({});

    // The reference comes back from the server — it is issued there so a client
    // cannot choose its own or collide with an existing booking.
    submitBooking(form, { elapsedMs: openedAt.current ? Date.now() - openedAt.current : null })
      .then((ref) => {
        setReference(ref);
        clearDraft();
      })
      .catch((err) => {
        // Field-level messages from the server land on the right inputs; the
        // rest surfaces as one message above the button.
        setErrors({
          ...(err?.fields ?? {}),
          submit: err?.message ?? 'Something went wrong. Please try again or call us directly.',
        });
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
        // The shadcn shell is a `grid` with no height cap, so a tall step (the
        // therapist list, the time grid) grew the dialog past the bottom of the
        // screen and took the Continue button with it — there was nothing to
        // scroll, because the body's `flex-1 overflow-y-auto` never applied
        // inside a grid. Flex column + a viewport cap puts the header and the
        // footer back on screen and gives the scrolling to the middle.
        // `dvh`, not `vh`: mobile browser chrome eats the difference.
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
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
            {copy.dialog_title}
          </DialogTitle>

          <button
            onClick={close}
            data-print-hide
            className="absolute right-5 top-5 grid size-10 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink sm:right-7"
            aria-label="Close booking"
          >
            <Icon name="close" size={18} />
          </button>

          {/* Was a two-colour bar; it is one solid brand colour now, and two
              pixels rather than one so the step you are on is visible from a
              phone at arm's length. */}
          <div className="mt-5 h-0.5 w-full overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full w-full origin-left rounded-full bg-brand-500"
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
                    className="truncate text-[13px] text-ink"
                  >
                    {stepError}
                  </motion.p>
                ) : (
                  <p className="truncate text-[13px] text-ink-4">
                    {step === 0
                      ? copy.step_note
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
                    {copy.back}
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
                      ? copy.submit
                      : copy.continue}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
