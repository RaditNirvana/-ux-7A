export default function OwnerIcon({ name, size = 18 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (name) {
    case "dashboard": return <svg {...common}><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>;
    case "report": return <svg {...common}><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/></svg>;
    case "users": return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h1a5.5 5.5 0 0 1 5.5 5.5V20zM16 5.2a3 3 0 0 1 0 5.6M17 13a4.8 4.8 0 0 1 4 4.7V20h-3"/></svg>;
    case "service": return <svg {...common}><path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.4 2.4-3-3z"/></svg>;
    case "stats": return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>;
    case "logout": return <svg {...common}><path d="M10 17l5-5-5-5M15 12H3M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>;
    case "close": return <svg {...common}><path d="m6 6 12 12M18 6 6 18"/></svg>;
    case "search": return <svg {...common}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>;
    case "plus": return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case "check": return <svg {...common}><path d="m5 12 4.2 4.2L19 6.5"/></svg>;
    case "alert": return <svg {...common}><path d="M12 3 2.7 20h18.6L12 3zM12 9v5M12 17.5h.01"/></svg>;
    case "arrow": return <svg {...common}><path d="M4 12h15M13 6l6 6-6 6"/></svg>;
    case "arrow-left": return <svg {...common}><path d="M20 12H5M11 6l-6 6 6 6"/></svg>;
    case "chevron-down": return <svg {...common}><path d="m6 9 6 6 6-6"/></svg>;
    case "download": return <svg {...common}><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14"/></svg>;
    case "save": return <svg {...common}><path d="M5 3h12l4 4v14H3V3h2zM7 3v6h10V3M7 21v-8h10v8"/></svg>;
    case "eye": return <svg {...common}><path d="M2.5 12s3.2-6 9.5-6 9.5 6 9.5 6-3.2 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>;
    case "eye-off": return <svg {...common}><path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.3 0 9.5 6 9.5 6a17 17 0 0 1-3.2 3.8M6.1 6.1C3.8 7.7 2.5 12 2.5 12s3.2 6 9.5 6a10 10 0 0 0 3.2-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>;
    default: return <svg {...common}><circle cx="12" cy="12" r="8"/></svg>;
  }
}
