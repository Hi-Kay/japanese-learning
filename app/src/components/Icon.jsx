export default function Icon({ name, size = 18, className = "" }) {
  const p = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
    cards: <><rect x="3" y="5" width="14" height="14" rx="2" /><path d="M7 5V3h12a2 2 0 0 1 2 2v12h-2" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></>,
    check: <path d="M20 6 9 17l-5-5" />,
    x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    trash: <><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
    volume: <><path d="M11 5 6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a9 9 0 0 1 0 14" /></>,
    brush: <><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" /><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" /></>,
    back: <path d="m15 18-6-6 6-6" />,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    flame: <path d="M12 2c1 3-3 4.5-3 8a3 3 0 0 0 6 0c1.5 1 2 2.5 2 4a5 5 0 0 1-10 0c0-4 3-5.5 3-9 0-1 .5-2.2 2-3z" />,
    hash: <><path d="M4 9h16" /><path d="M4 15h16" /><path d="M10 3 8 21" /><path d="M16 3l-2 18" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
    compass: <><circle cx="12" cy="12" r="10" /><path d="m16 8-2 6-6 2 2-6z" /></>,
    hand: <><path d="M18 11V6a2 2 0 0 0-4 0" /><path d="M14 10V4a2 2 0 0 0-4 0v2" /><path d="M10 10.5V6a2 2 0 0 0-4 0v8" /><path d="M6 14v-1a2 2 0 0 0-4 0v3a8 8 0 0 0 8 8h2a8 8 0 0 0 8-8v-3a2 2 0 0 0-4 0v1" /></>,
    cup: <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /><path d="M6 2v2" /><path d="M10 2v2" /><path d="M14 2v2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {p[name] || null}
    </svg>
  );
}
