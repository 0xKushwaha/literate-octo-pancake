import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../components/primitives';
import Icon from '../components/Icon';
import { joinCommunity } from '../lib/queries/community';
import { isEmail } from '../booking/validate';

/**
 * Email, then the invite.
 *
 * The address is the point: a Discord invite link can be revoked or rotated,
 * and without a way to reach the people who joined, that is the end of the
 * community. So the form records the address first and opens the invite
 * second — but it opens the invite either way, because someone who has just
 * handed over their email and been shown an error has been charged twice.
 *
 * The tab is opened synchronously, before any await. A window.open() that runs
 * after a network round trip has lost its user-gesture context and browsers
 * block it as a popup; opening an empty tab on the click and pointing it at
 * the invite when the request settles is what survives that. If the browser
 * refuses even that, the same-tab navigation at the end is the fallback.
 *
 * That only works if window.open() hands back the tab, so the feature string
 * stays empty — 'noopener' there returns null and costs us the handle.
 */
export default function CommunityJoin({ inviteUrl, content, tone = 'light' }) {
  const deep = tone === 'deep';
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done
  const [message, setMessage] = useState(null);
  const { pathname } = useLocation();
  // Honeypot. Named "company" to match the booking form and to be the sort of
  // field a bot fills in without thinking.
  const honeypot = useRef('');

  const claimTab = () => {
    const win = window.open('', '_blank');
    if (!win) return null; // popup blocked; openInvite falls back to this tab
    try {
      win.opener = null;
    } catch {
      // Cross-origin or a browser that refuses the assignment. The invite is
      // a Discord URL we control the shape of, so this is not worth failing on.
    }
    return win;
  };

  const openInvite = (tab) => {
    if (!inviteUrl) {
      // Nothing to send them to. Close the tab claimed on the click rather
      // than leaving a blank window open.
      if (tab && !tab.closed) tab.close();
      return;
    }
    if (tab && !tab.closed) {
      tab.location.href = inviteUrl;
      return;
    }
    window.location.href = inviteUrl;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (state === 'sending') return;

    const address = email.trim();
    if (!isEmail(address)) {
      setMessage({ tone: 'error', text: content.invalid_email });
      return;
    }

    // Claim the tab while we still have the click.
    //
    // No 'noopener' in the feature string: it makes window.open() return null
    // by spec, which threw away the tab we had just opened and sent the
    // fallback down the same-tab branch — Discord replaced the page and the
    // claimed tab was left stranded on about:blank. Sever the link from the
    // child side instead, which keeps our handle and still denies the invite
    // page a window.opener to reach back through.
    const tab = inviteUrl ? claimTab() : null;

    setState('sending');
    setMessage(null);
    try {
      const { already } = await joinCommunity({
        email: address,
        source: pathname,
        honeypot: honeypot.current,
      });
      setState('done');
      // With no invite link saved yet there is nothing to open, so say what
      // actually happens next rather than claiming Discord is loading.
      setMessage({
        tone: 'ok',
        text: inviteUrl ? (already ? content.already : content.success) : content.pending,
      });
      setEmail('');
      openInvite(tab);
    } catch (err) {
      setState('idle');
      setMessage({ tone: 'error', text: err?.message || 'Something went wrong. Try again in a moment.' });
      // They gave us the address and we lost it; do not also withhold the
      // invite they were promised.
      openInvite(tab);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-xl">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="community-email" className="sr-only">
          {content.email_label}
        </label>
        <input
          id="community-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setMessage(null); }}
          placeholder={content.email_placeholder}
          autoComplete="email"
          required
          disabled={state === 'sending'}
          className={`t-field h-[3.4rem] min-w-0 flex-1 rounded-full px-6 text-[15.5px] text-ink outline-none transition placeholder:text-ink-4 disabled:opacity-60 ${
            deep
              ? 'border border-on-deep/25 bg-surface/95 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50'
              : 'border border-line-2 bg-surface focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'
          }`}
        />

        {/* Hidden from people, irresistible to bots. Not `display:none`: some
            bots skip those. Off-screen, unfocusable, never autofilled. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          onChange={(e) => { honeypot.current = e.target.value; }}
          className="pointer-events-none absolute left-[-9999px] size-px opacity-0"
        />

        <Button
          type="submit"
          variant={deep ? 'accent' : 'primary'}
          size="lg"
          icon={state === 'sending' ? undefined : 'arrow'}
          disabled={state === 'sending'}
          className="shrink-0"
        >
          {state === 'sending' ? '…' : content.cta_label}
        </Button>
      </div>

      {message ? (
        <p
          role="status"
          className={`mt-3.5 flex items-center justify-center gap-2 text-[13px] ${
            message.tone === 'error'
              ? deep ? 'text-amber-500' : 'text-accent-strong'
              : deep ? 'text-on-deep/85' : 'text-ink-3'
          }`}
        >
          <Icon name={message.tone === 'error' ? 'pulse' : 'check'} size={13} />
          {message.text}
        </p>
      ) : (
        content.privacy_note && (
          <p className={`mt-3.5 text-center text-[12.5px] leading-relaxed ${deep ? 'text-on-deep/60' : 'text-ink-4'}`}>
            {content.privacy_note}
          </p>
        )
      )}
    </form>
  );
}
