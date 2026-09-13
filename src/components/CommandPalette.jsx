import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useCommunity, useFeatures } from '../lib/features';

// `feature` names a switch in Site content → Show & hide. A page that is
// switched off is dropped from the palette rather than offered and then
// redirected — the palette is meant to be faster than the menu, and sending
// someone home is not faster.
const PAGES = [
  { to: '/services', label: 'What we treat', icon: 'pulse' },
  { to: '/resources', label: 'Videos & articles', icon: 'play' },
  { to: '/blog', label: 'Blog', icon: 'message' },
  { to: '/breathe', label: 'Breathing exercises', icon: 'spark' },
  { to: '/how-it-works', label: 'How it works', icon: 'shuffle' },
  { to: '/how-it-works#faq', label: 'Questions', icon: 'smile' },
  { to: '/therapists', label: 'Our therapists', icon: 'person', feature: 'therapists' },
  { to: '/pricing', label: 'Pricing & insurance', icon: 'coins', feature: 'pricing' },
];

/**
 * Cmd/Ctrl-K palette. Beyond feeling like a product rather than a brochure,
 * it is the fastest path to the two things someone in distress actually needs:
 * booking, and a phone number.
 */
export default function CommandPalette({ onBook, initialOpen = false }) {
  const brand = useBrand();
  const ui = useSiteContent('ui');
  const servicesContent = useSiteContent('services');
  const therapistsContent = useSiteContent('therapists');
  const features = useFeatures();
  const community = useCommunity();
  const services = Array.isArray(servicesContent.items) ? servicesContent.items : [];
  const therapists = features.therapists && Array.isArray(therapistsContent.items) ? therapistsContent.items : [];
  const pages = PAGES.filter((p) => !p.feature || features[p.feature]);
  const navigate = useNavigate();
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

  const goTo = (to) => run(() => navigate(to));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={ui.palette_title}
        className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink-4 transition-colors hover:border-line-2 hover:text-ink-2 xl:inline-flex"
      >
        <Icon name="spark" size={13} />
        <span>{ui.palette_title}</span>
        <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
          {isMac ? '⌘' : 'Ctrl'}K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        showCloseButton={false}
        title={ui.palette_title}
        description="Search sections, therapists and services"
        className="sm:mb-auto sm:mt-[12vh] sm:max-w-xl"
      >
        <CommandInput placeholder={ui.palette_placeholder} />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>{ui.palette_empty}</CommandEmpty>

          {features.booking && (
            <CommandGroup heading={ui.palette_group_book}>
              <CommandItem onSelect={() => run(() => onBook())} value="book a session appointment">
                <Icon name="calendar" size={16} />
                <span>{ui.palette_book}</span>
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
          )}

          {community.enabled && (
            <CommandGroup heading={community.eyebrow}>
              <CommandItem
                value="discord community join chat group"
                onSelect={() => run(() => window.open(community.url, '_blank', 'noopener,noreferrer'))}
              >
                <Icon name="message" size={16} />
                <span>{community.palette_label}</span>
                <CommandShortcut>Discord</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandSeparator />

          {therapists.length > 0 && (
          <CommandGroup heading={ui.palette_group_therapists}>
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
          )}

          <CommandSeparator />

          <CommandGroup heading={ui.palette_group_pages}>
            {pages.map((p) => (
              <CommandItem key={p.to} value={p.label} onSelect={() => goTo(p.to)}>
                <Icon name={p.icon} size={16} />
                <span>{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading={ui.palette_group_contact}>
            <CommandItem
              value={`call phone ${brand.phone}`}
              onSelect={() =>
                run(() => {
                  window.location.href = telHref(brand.phone);
                })
              }
            >
              <Icon name="phone" size={16} />
              <span>{ui.palette_call}</span>
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
              <span>{ui.palette_crisis}</span>
              <CommandShortcut>24/7</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
