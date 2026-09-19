const paths = {
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.2 0-7 2.2-7 4.6V21h14v-2.4C19 16.2 16.2 14 12 14Z',
  hearts:
    'M9.5 19.5 4.2 14.4a3.6 3.6 0 0 1 5.1-5.1l.2.2.2-.2a3.6 3.6 0 0 1 5.1 5.1L9.5 19.5Zm8.9-6.4-1.1-1.1 2.3-2.3a2.7 2.7 0 0 0-3.8-3.8l-.3.3-.3-.3a2.7 2.7 0 0 0-2.5-.7l1.4-1.4a4.1 4.1 0 0 1 5.7 5.9l-1.4 3.4Z',
  wave: 'M2 12c2.5 0 2.5-5 5-5s2.5 10 5 10 2.5-5 5-5 2.5 2 5 2',
  pulse: 'M2 12h4l2.5-7 4 14L15.5 12H22',
  sprout:
    'M12 21v-7m0 0c0-3.3-2.7-6-6-6H4v1.5A5.5 5.5 0 0 0 9.5 15H12Zm0-1c0-3.3 2.7-6 6-6h2v1.2a5.8 5.8 0 0 1-5.8 5.8H12Z',
  shield: 'M12 3 4.5 6v6c0 4.4 3.1 8.2 7.5 9 4.4-.8 7.5-4.6 7.5-9V6L12 3Zm-1 12-3-3 1.4-1.4L11 12.2l4.6-4.6L17 9l-6 6Z',
  arrow: 'M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5',
  arrowUpRight: 'M7 17 17 7m0 0H8m9 0v9',
  check: 'M4 12.5 9 17.5 20 6.5',
  plus: 'M12 5v14M5 12h14',
  calendar:
    'M7 3v3m10-3v3M3.5 9h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z',
  clock: 'M12 7v5.2l3.3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  video: 'M3.5 7.5h11a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Zm12 3.5 5-3v9l-5-3',
  phone:
    'M6.2 3.5 8.6 3l2 4-2 1.6a11 11 0 0 0 4.8 4.8L15 11.4l4 2-.5 2.4A2 2 0 0 1 16.4 17 13.4 13.4 0 0 1 7 7.6a2 2 0 0 1 1.7-2.3Z',
  pin: 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  spark: 'M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z',
  lock: 'M7 10V8a5 5 0 0 1 10 0v2m-11 0h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
  shuffle: 'M4 7h4l8 10h4M4 17h4l2.2-2.8M16 7h4m0 0-2.5-2.5M20 7l-2.5 2.5m2.5 7.5-2.5-2.5M20 17l-2.5 2.5',
  message: 'M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8.5L7 20.5V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z',
  chevron: 'm8 10 4 4 4-4',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 8h16M4 16h16',
  play: 'M8 5.5v13l10-6.5-10-6.5Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.4 3.8-5.4 3.8-9S14.5 5.4 12 3m0 18c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3M3.5 12h17',
  coins: 'M14.5 9.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Zm-3.2 5.4A5.5 5.5 0 1 0 15.3 8.5',
  heart: 'M12 20.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 8a4 4 0 0 1 7.5 2.5c0 5.4-7.5 10-7.5 10Z',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  users: 'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm0 2c-3.6 0-6 1.9-6 4.1V20h12v-1.9C15 15.9 12.6 14 9 14Zm7-3a3 3 0 1 0-.1-6M17 14c2.7.3 4 1.9 4 3.9V20h-3',
  smile: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 10h.01M15 10h.01M8.5 14.5a4.5 4.5 0 0 0 7 0',
  chatHeart: 'M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8.5L7 20.5V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm8 8.3-2.6-2.5a1.6 1.6 0 0 1 2.3-2.3l.3.3.3-.3a1.6 1.6 0 0 1 2.3 2.3L12 13.8Z',
  // Frame, horizon and sun in one path. Added for the infographics
  // section; Icon renders nothing at all for an unknown name, so a
  // missing entry here is a silently blank heading rather than an error.
  image: 'M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Zm-1 11 5-4.5 3.5 3L15 12l6 5.5M9 9.6a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z',
  star: 'm12 3.6 2.5 5.4 5.9.7-4.4 4 1.2 5.8L12 16.6l-5.2 2.9L8 13.7l-4.4-4 5.9-.7L12 3.6Z',
};

/** Single stroked icon set — no icon-font dependency, no layout shift. */
export default function Icon({ name, size = 20, className = '', filled = false, ...rest }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}

export const iconNames = Object.keys(paths);
