#!/usr/bin/env node
// Phase 3 icon migration: replace inline SVGs with lucide-react components
// Run: node scripts/icon-migrate.cjs

const fs = require("fs");
const path = require("path");

const fp = path.resolve(__dirname, "../src/WinnowAI.tsx");
let src = fs.readFileSync(fp, "utf8");
const log = [];

function r(oldStr, newStr, note) {
  if (!src.includes(oldStr)) return;
  const count = (src.match(new RegExp(escapeRegex(oldStr), "g")) || []).length;
  src = src.replaceAll(oldStr, newStr);
  log.push({ note, count });
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ──────────────────────────────────────────────
// Single-line SVGs: full tag replacement
// ──────────────────────────────────────────────

// Search (line 1240)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke={C.text4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>`,
  `<Search size={13} color={C.text4} />`,
  "Search (agent store)"
);

// Compound search (line 2464)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}><path d="M229.66,218.34l-50.06-50.07a88.21,88.21,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.31-11.31ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" /></svg>`,
  `<Search size={14} color={C.text4} style={{ flexShrink: 0 }} />`,
  "Search (compound selector)"
);

// Close/X buttons (exact match each)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>`,
  `<X size={20} />`,
  "X close (agent comms log) 18->20"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>`,
  `<X size={20} />`,
  "X close (artifact panel) 16->20"
);

r(
  `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="15" y1="5" x2="5" y2="15"></line><line x1="5" y1="5" x2="15" y2="15"></line></svg>`,
  `<X size={20} />`,
  "X close (export modal)"
);

r(
  `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="15" y1="5" x2="5" y2="15"></line><line x1="5" y1="5" x2="15" y2="15"></line></svg>`,
  `<X size={20} />`,
  "X close (sidebar modal)"
);

// Remove file X (tiny)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 12 12" fill="none" stroke={C.text4} strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" /></svg>`,
  `<X size={12} color={C.text4} strokeWidth={2.5} />`,
  "X remove file (tiny -> 12)"
);

// Arrow-right / send buttons
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`,
  `<ArrowRight size={13} />`,
  "ArrowRight (chat with agent)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`,
  `<ArrowRight size={13} color="white" />`,
  "ArrowRight (run analysis)"
);

r(
  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`,
  `<ArrowRight size={14} color="white" />`,
  "ArrowRight (confirm)"
);

// Send button (chat send)
r(
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>`,
  `<ArrowRight size={16} color="white" />`,
  "ArrowRight (chat send)"
);

// Pen/edit icons
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text4, flexShrink: 0 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>`,
  `<Pen size={16} color={C.text4} style={{ flexShrink: 0 }} />`,
  "Pen (new session)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text3 }}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>`,
  `<Pen size={18} color={C.text3} />`,
  "Pen (new session collapsed)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  `<Pen size={14} />`,
  "Pen (e-sign report)"
);

// Clock icons
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text4, flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>`,
  `<Clock size={16} color={C.text4} style={{ flexShrink: 0 }} />`,
  "Clock (schedule tasks)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text3 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>`,
  `<Clock size={18} color={C.text3} />`,
  "Clock (schedule tasks collapsed)"
);

// Stop / square
r(
  `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1.5" /></svg>`,
  `<Square size={10} fill="currentColor" />`,
  "Stop (agent row)"
);

r(
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" fill="white" /></svg>`,
  `<Square size={16} fill="white" />`,
  "Stop (chat input)"
);

// Mic
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="white"><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V240a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z" /></svg>`,
  `<Mic size={16} color="white" />`,
  "Mic (voice input)"
);

// Paperclip
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z" /></svg>`,
  `<Paperclip size={16} />`,
  "Paperclip (attach file) x2"
);

// Calendar
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 256 256"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208ZM136,120a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h24V88a8,8,0,0,1,16,0Z" /></svg>`,
  `<Calendar size={13} />`,
  "Calendar (period pill)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill={C.text4} viewBox="0 0 256 256"><path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208ZM136,120a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h24V88a8,8,0,0,1,16,0Z" /></svg>`,
  `<Calendar size={14} color={C.text4} />`,
  "Calendar (custom period)"
);

// Check / checkmark icons
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.brand }}><path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z" /></svg>`,
  `<Check size={12} color={C.brand} />`,
  "Check (custom select)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" /></svg>`,
  `<Check size={11} />`,
  "Check (PHI cleared)"
);

r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={C.brandText} viewBox="0 0 256 256"><path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" /></svg>`,
  `<Check size={16} color={C.brandText} />`,
  "Check (copied state)"
);

// Checkmark in export modal (fill-based radio check)
r(
  `<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M15.188 5.11a.5.5 0 0 1 .752.626l-.056.084-7.5 9a.5.5 0 0 1-.738.033l-3.5-3.5-.064-.078a.501.501 0 0 1 .693-.693l.078.064 3.113 3.113 7.15-8.58z"></path></svg>`,
  `<Check size={20} fill="currentColor" />`,
  "Check (export radio) x3"
);

// Check mark in pre-analysis (line 5478)
r(
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>`,
  `<Check size={15} color="#059669" strokeWidth={2.6} />`,
  "Check (config locked)"
);

// Table / grid (agent comms log header)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>`,
  `<Table size={18} color={C.brand} strokeWidth={2.2} />`,
  "Table (agent comms log)"
);

// Copy button
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}><path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z" /></svg>`,
  `<Copy size={14} color={C.text4} />`,
  "Copy (query copy)"
);

// Shield (integrity banner)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>`,
  `<Shield size={16} color="#16a34a" strokeWidth={2.5} style={{ flexShrink: 0 }} />`,
  "Shield (integrity banner)"
);

// Logout
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256"><path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z" /></svg>`,
  `<LogOut size={14} />`,
  "LogOut"
);

// LayoutGrid (agents menu)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 16 16" style={{ color: C.text3 }}><rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" /><rect x="10" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" /><rect x="1" y="10" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" /><rect x="10" y="10" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" /></svg>`,
  `<LayoutGrid size={14} color={C.text3} />`,
  "LayoutGrid (Agents menu)"
);

// Settings gear (menu item)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0-6.08-13.32h-1.16a24,24,0,0,1-20.59-11.81,24,24,0,0,1-2.26-23.35,8,8,0,0,0,3.37-10.26,7.92,7.92,0,0,0-1.81-2.65l-18.68-14.94a8,8,0,0,0-13.15,4.23,23.89,23.89,0,0,1-19.68,17.27,24,24,0,0,1-23.77-12.4,8,8,0,0,0-7.29-4.45H109.5a8,8,0,0,0-7.29,4.45,24,24,0,0,1-23.76,12.4A23.89,23.89,0,0,1,58.77,82.2a8,8,0,0,0-13.15-4.23L26.94,92.91a7.92,7.92,0,0,0-1.81,2.65,8,8,0,0,0,3.37,10.26,24,24,0,0,1-2.26,23.35A24,24,0,0,1,6.65,140.92a8,8,0,0,0-6.08,13.32l14.92,18.64q-.06,2.16,0,4.32L.57,195.84a8,8,0,0,0,6.08,13.32h1.16A24,24,0,0,1,28.4,221a24,24,0,0,1,2.26,23.35,8,8,0,0,0-3.37,10.26,7.92,7.92,0,0,0,1.81,2.65l18.68,14.94a8,8,0,0,0,13.15-4.23,23.89,23.89,0,0,1,19.68-17.27,24,24,0,0,1,23.77,12.4,8,8,0,0,0,7.29,4.45H146.5a8,8,0,0,0,7.29-4.45,24,24,0,0,1,23.76-12.4,23.89,23.89,0,0,1,19.68,17.27,8,8,0,0,0,13.15,4.23l18.68-14.94a7.92,7.92,0,0,0,1.81-2.65,8,8,0,0,0-3.37-10.26,24,24,0,0,1,2.26-23.35A24,24,0,0,1,249.36,176a8,8,0,0,0,6.08-13.32l0,0ZM128,200a56,56,0,1,1,56-56A56.06,56.06,0,0,1,128,200Z" /></svg>`,
  `<Settings size={14} color={C.text3} />`,
  "Settings gear (menu)"
);

// Settings gear (footer, 20px)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0-6.08-13.32h-1.16a24,24,0,0,1-20.59-11.81,24,24,0,0,1-2.26-23.35,8,8,0,0,0,3.37-10.26,7.92,7.92,0,0,0-1.81-2.65l-18.68-14.94a8,8,0,0,0-13.15,4.23,23.89,23.89,0,0,1-19.68,17.27,24,24,0,0,1-23.77-12.4,8,8,0,0,0-7.29-4.45H109.5a8,8,0,0,0-7.29,4.45,24,24,0,0,1-23.76,12.4A23.89,23.89,0,0,1,58.77,82.2a8,8,0,0,0-13.15-4.23L26.94,92.91a7.92,7.92,0,0,0-1.81,2.65,8,8,0,0,0,3.37,10.26,24,24,0,0,1-2.26,23.35A24,24,0,0,1,6.65,140.92a8,8,0,0,0-6.08,13.32l14.92,18.64q-.06,2.16,0,4.32L.57,195.84a8,8,0,0,0,6.08,13.32h1.16A24,24,0,0,1,28.4,221a24,24,0,0,1,2.26,23.35,8,8,0,0,0-3.37,10.26,7.92,7.92,0,0,0,1.81,2.65l18.68,14.94a8,8,0,0,0,13.15-4.23,23.89,23.89,0,0,1,19.68-17.27,24,24,0,0,1,23.77,12.4,8,8,0,0,0,7.29,4.45H146.5a8,8,0,0,0,7.29-4.45,24,24,0,0,1,23.76-12.4,23.89,23.89,0,0,1,19.68,17.27,8,8,0,0,0,13.15,4.23l18.68-14.94a7.92,7.92,0,0,0,1.81-2.65,8,8,0,0,0-3.37-10.26,24,24,0,0,1,2.26-23.35A24,24,0,0,1,249.36,176a8,8,0,0,0,6.08-13.32l0,0ZM128,200a56,56,0,1,1,56-56A56.06,56.06,0,0,1,128,200Z" /></svg>`,
  `<Settings size={20} color={C.text4} style={{ flexShrink: 0 }} />`,
  "Settings gear (footer)"
);

// ── Info circle icons ──

// Info circle (menu item, 14px)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M144,152a8,8,0,1,1,8,8A8,8,0,0,1,144,152Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,104Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,104Zm-56-40a16,16,0,1,0-16-16A16,16,0,0,0,160,64Z" /></svg>`,
  `<Info size={14} color={C.text3} />`,
  "Info (HIPAA menu)"
);

// Info circle (FDA/EMA links, 15px)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>`,
  `<Info size={15} color="#059669" />`,
  "Info (FDA/EMA links) x2"
);

// Lock (HIPAA privacy tab)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  `<Lock size={15} />`,
  "Lock (HIPAA privacy tab)"
);

// Question/help circle (menu)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8h-8v16a8,8,0,0,1-16,0v-16h-8a8,8,0,0,1,0-16h8V128a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16h-8v32h8A8,8,0,0,1,144,176ZM116,84a12,12,0,1,1,12,12A12,12,0,0,1,116,84Z" /></svg>`,
  `<HelpCircle size={14} color={C.text3} />`,
  "HelpCircle (User manual menu)"
);

// Question circle (user manual tab, 15px)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>`,
  `<HelpCircle size={15} />`,
  "HelpCircle (user manual tab)"
);

// Monitor (display icon for audit log tab)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>`,
  `<Monitor size={15} />`,
  "Monitor (audit log tab)"
);

// Folder icon
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>`,
  `<Folder size={15} />`,
  "Folder (reg docs tab)"
);

// Book icon
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>`,
  `<Book size={15} />`,
  "Book (guidelines tab)"
);

// BookOpen (FDA/EMA guidelines menu item)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M232,64H216V32a8,8,0,0,0-16,0V64H152V32a8,8,0,0,0-16,0V64H88V32a8,8,0,0,0-16,0V64H24A16,16,0,0,0,8,80V216a16,16,0,0,0,16,16H232a16,16,0,0,0,16-16V80A16,16,0,0,0,232,64Zm0,152H24V80H232Zm-40-104a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0v-48A8,8,0,0,1,192,112Zm-64,0a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0v-48A8,8,0,0,1,128,112Z" /></svg>`,
  `<BookOpen size={14} color={C.text3} />`,
  "BookOpen (guidelines menu)"
);

// List icon (regulatory docs menu - originally 2 lines)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M76,100h80a8,8,0,0,1,0,16H76a8,8,0,0,1,0-16Zm0,32h80a8,8,0,0,1,0,16H76a8,8,0,0,1,0-16Z" /></svg>`,
  `<List size={18} color={C.text3} />`,  // ENLARGED per spec (was 14x14)
  "List (Regulatory Docs menu) ENLARGED 14->18"
);

// FileText (Compliance Reports menu item)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M220,48H56a12,12,0,0,0-12,12V192a12,12,0,0,0,12,12H220a12,12,0,0,0,12-12V60A12,12,0,0,0,220,48Zm-82,96H60V80h78Zm82-16H140V80h80Z" /></svg>`,
  `<FileText size={14} color={C.text3} />`,
  "FileText (Compliance Reports menu)"
);

// FileText (Audit Logs menu item)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}><path d="M48,32H16A16,16,0,0,0,0,48V208a16,16,0,0,0,16,48H48a16,16,0,0,0,16-16V48A16,16,0,0,0,48,32Zm0,176H16V48H48ZM240,80H80a16,16,0,0,0-16,16v16a16,16,0,0,0,16,16h80v32H80v16h80v32H80v16H240V96A16,16,0,0,0,240,80Zm-32,56a8,8,0,1,1,8-8A8,8,0,0,1,208,136Z" /></svg>`,
  `<FileText size={14} color={C.text3} />`,
  "FileText (Audit Logs menu)"
);

// AlertCircle (chart sources error icon)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>`,
  `<AlertCircle size={15} />`,
  "AlertCircle (chart sources) x4"
);

// External link icons (FDA/EMA link items)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>`,
  `<ExternalLink size={15} />`,
  "ExternalLink (guidelines x2, docs x2) x4"
);

// Link icon (guidance & docs)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>`,
  `<Link size={15} />`,
  "Link (guidance & docs)"
);

// Code / code brackets (artifact tabs)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>`,
  `<Code size={13} />`,
  "Code (source toggle)"
);

// ❌ SKIP: motion.svg / animated chevrons (handled separately)

// File doc icon in workspace (line 9514 - doc with lines)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
  `<FileText size={15} color="#64748b" />`,
  "FileText (user manual doc)"
);

// Doc with checkmark (eCTD package)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>`,
  `<FileCheck size={18} />`,
  "FileCheck (eCTD package)"
);

// Lock (pricing plan)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  `<Lock size={18} />`,
  "Lock (folder) in doc tab"
);

// Upload (signature upload)
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>`,
  `<Upload size={15} />`,
  "Upload (signature) x2"
);

// ── Document icons with FileText (multi-line) ──

// Export as PDF (line 8996)
// Word/eCTD (line 9022)
// These have multi-line SVG content with <path> <polyline> etc.
// Let me match on the full multi-line SVG by using a regex that captures the entire SVG element

// ── Fallback: regex-based replacements for multi-line SVGs ──

// First, handle the common FileText pattern (document with path and polyline)
const docFileRegex = /<svg[^>]*width="18"[^>]*height="18"[^>]*><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"><\/path><polyline points="14 2 14 8 20 8"><\/polyline><line x1="16" y1="13" x2="8" y2="13"><\/line><line x1="16" y1="17" x2="8" y2="17"><\/line><polyline points="10 9 9 9 8 9"><\/polyline><\/svg>/g;
let match;
while ((match = docFileRegex.exec(src)) !== null) {
  log.push({ note: 'FileText (export PDF)', count: 1 });
}
src = src.replace(docFileRegex, '<FileText size={18} />');

// Export eCTD (doc with checkmark)
const docCheckRegex = /<svg[^>]*width="18"[^>]*height="18"[^>]*><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"><\/path><polyline points="14 2 14 8 20 8"><\/polyline><path d="M9 15l2 2 4-4"><\/path><\/svg>/g;
if (docCheckRegex.test(src)) {
  src = src.replace(docCheckRegex, '<FileCheck size={18} />');
  log.push({ note: 'FileCheck (eCTD export)', count: 1 });
}

// Vault export (lock)
const vaultRegex = /<svg[^>]*width="18"[^>]*height="18"[^>]*><rect x="3" y="11" width="18" height="11" rx="2" ry="2"><\/rect><path d="M7 11V7a5 5 0 0 1 10 0v4"><\/path><\/svg>/g;
if (vaultRegex.test(src)) {
  src = src.replace(vaultRegex, '<Lock size={18} />');
  log.push({ note: 'Lock (vault export)', count: 1 });
}

// ── Multi-line document SVGs with background styling ──
// Regulatory doc card icons (line 10309, 10400) - 28px doc with green bg
const regDocCard = /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style=\{\{ background: "#ecfdf5", padding: 6, borderRadius: 6 \}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"><\/path><polyline points="14 2 14 8 20 8"><\/polyline><\/svg>/g;
if (regDocCard.test(src)) {
  src = src.replace(regDocCard, '<FileText size={28} color="#059669" style={{ background: "#ecfdf5", padding: 6, borderRadius: 6 }} />');
  log.push({ note: 'FileText (reg doc card)', count: 2 });
}

// ── Compose/Edit icons (Phosphor pen, line 5538) ──
const editSvg1 = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z" /></svg>`;
r(editSvg1, `<Pen size={13} />`, "Pen (edit pre-analysis)");

// ── Pen in sidebar list ──
// Pen (sidebar list new session, 16px) - already handled above

// ── ChevronRight / motion.svg animated disclosure arrows ──
// These use motion.svg with Phosphor caret-down path. Handled separately.

// ── Spinner/loading spinner ──
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`,
  `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`,
  "Spinner (loading)"
);

// ── Shield check / audit log ──
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>`,
  `<Shield size={15} />`,
  "Shield (audit log tab) x2"
);

// ── CheckCircle (signal status) ──
r(
  `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /></svg>`,
  `<CheckCircle size={12} />`,
  "CheckCircle (signal status)"
);

// ── Download icon (audit log export) ──
r(
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>`,
  `<Download size={15} />`,
  "Download (CSV export)"
);

// ── Plus (add new) ──
r(
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>`,
  `<Plus size={15} />`,
  "Plus (add new, signal detection)"
);

r(
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>`,
  `<Plus size={22} color={C.text3} />`,
  "Plus (add new, large)"
);

// ── CheckCircle (signal status badge in workspace docs) ──
r(
  `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><path d="M16 5 8 15l-4-4" /></svg>`,
  `<Check size={14} color="#d97706" strokeWidth={2.4} style={{ marginTop: 2, flexShrink: 0 }} />`,
  "Check (feature checkmark)"
);

// ── Code2 (code brackets artifact tab) ──
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="#ef4444" viewBox="0 0 256 256"><path d="M232,56V120a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,124.69,29.66,191A8,8,0,0,1,18.34,179.71l72-72a8,8,0,0,1,11.32,0L128,140.69,204.69,64H160a8,8,0,0,1,0-16h64A8,8,0,0,1,232,56Z" /></svg>`,
  `<Code2 size={13} color="#ef4444" />`,
  "Code2 (artifact tab, red)"
);

// ── ChevronRight (artifact card) ──
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" /></svg>`,
  `<ChevronRight size={16} color={C.text4} style={{ flexShrink: 0 }} />`,
  "ChevronRight (artifact card)"
);

// ── User icon for sidebar ──
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z" /></svg>`,
  `<User size={16} />`,
  "User (sidebar avatar)"
);

// ── Download button in settings ──
r(
  `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}><path d="M224,152v56a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V152a8,8,0,0,1,16,0v56H208V152a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,132.69V40a8,8,0,0,0-16,0v92.69L93.66,106.34a8,8,0,0,0-11.32,11.32Z" /></svg>`,
  `<Download size={14} color={C.text4} />`,
  "Download (settings)"
);

// ── FileText (reg doc card header) ──
r(
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`,
  `<FileText size={18} />`,
  "FileText (export PDF row)"
);

// ── Imported icons that need lucide components for direct rendering ──
// The following are handled via separate multi-line SVG blocks below

// Write results
fs.writeFileSync(fp, src);
console.log("Icon migration complete.");
log.forEach(l => console.log(`  ${l.note} (x${l.count})`));
console.log(`\nTotal replacement groups: ${log.length}`);
console.log(`Total individual swaps: ${log.reduce((s, l) => s + l.count, 0)}`);