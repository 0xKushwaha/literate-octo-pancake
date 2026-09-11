import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import Icon from './Icon';
import Avatar from './Avatar';
import { telHref, useBrand, useSiteContent } from '../lib/queries/siteContent';

const SECTIONS = [
  { id: 'services', label: 'What we treat', icon: 'pulse' },
  { id: 'approach', label: 'How it works', icon: 'shuffle' },
  { id: 'therapists', label: 'Our therapists', icon: 'person' },
  { id: 'breathing', label: 'Breathing exercises', icon: 'spark' },
  { id: 'resources', label: 'Videos & articles', icon: 'play' },
  { id: 'pricing', label: 'Pricing & insurance', icon: 'shield' },
  { id: 'faq', label: 'Questions', icon: 'message' },
];

/**
 * Cmd/Ctrl-K palette. Beyond feeling like a product rather than a brochure,
 * it is the fastest path to the two things someone in distress actually needs:
 * booking, and a phone number.
 */
export default function CommandPalette({ onBook, initialOpen = false }) {
  const brand = useBrand();
  const servicesContent = useSiteContent('services');
  const therapistsContent = useSiteContent('therapists');
  const services = Array.isArray(servicesContent.items) ? servicesContent.items : [];
  const therapists = Array.isArray(therapistsContent.items) ? therapistsContent.items : [];
  const [open, setOpen] = useState(initialOpen);
  const [isMac] = useState(() => /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key?.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run = (fn) => {
    setOpen(false);
    // let the dialog finish closing so focus lands where the action expects
    setTimeout(fn, 120);
  };

  const goTo = (id) =>
    run(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open command menu"
        className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-4 transition-colors hover:border-line-2 hover:text-ink-2 xl:inline-flex"
      >
        <Icon name="spark" size={13} />
        <span>Quick actions</span>
        <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        showCloseButton={false}
        title="Quick actions"
        description="Search sections, therapists and services"
        className="sm:mb-auto sm:mt-[12vh] sm:max-w-xl"
      >
        <CommandInput placeholder="Search or jump to…" />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>Nothing matches that.</CommandEmpty>

          <CommandGroup heading="Book">
            <CommandItem onSelect={() => run(() => onBook())} value="book a session appointment">
              <Icon name="calendar" size={16} />
              <span>Book a session</span>
              <CommandShortcut>Enter</CommandShortcut>
            </CommandItem>
            {services.map((s) => (
              <CommandItem
                key={s.id}
                value={`book ${s.name} ${(s.modalities ?? []).join(' ')}`}
                onSelect={() => run(() => onBook({ service: s.id }))}
              >
                <Icon name={s.icon} size={16} />
                <span>{s.name}</span>
                <CommandShortcut>${s.price}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Therapists">
            {therapists.map((t) => (
              <CommandItem
                key={t.id}
                value={`${t.name} ${t.credentials} ${(t.focus ?? []).join(' ')}`}
                onSelect={() => run(() => onBook({ therapist: t.id }))}
              >
                <Avatar name={t.name} hue={t.hue} size="sm" className="!size-6 !text-[9px]" />
                <span>{t.name}</span>
                <CommandShortcut>{t.focus?.[0]}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Go to">
            {SECTIONS.map((s) => (
              <CommandItem key={s.id} value={s.label} onSelect={() => goTo(s.id)}>
                <Icon name={s.icon} size={16} />
                <span>{s.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Contact">
            <CommandItem
              value={`call phone ${brand.phone}`}
              onSelect={() =>
                run(() => {
                  window.location.href = telHref(brand.phone);
                })
              }
            >
              <Icon name="phone" size={16} />
              <span>Call the practice</span>
              <CommandShortcut>{brand.phone}</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="crisis emergency 988 suicide help urgent"
              onSelect={() => {
                setOpen(false);
                setTimeout(() => {
                  window.location.href = 'tel:988';
                }, 120);
              }}
              className="data-[selected=true]:bg-amber-500 data-[selected=true]:text-ink"
            >
              <Icon name="pulse" size={16} />
              <span>Crisis line — call or text 988</span>
              <CommandShortcut>24/7</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
