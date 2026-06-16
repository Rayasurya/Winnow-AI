# WinnowAI UX Refinement Plan — Executable Brief

**File:** `winnow-v8/src/WinnowAI.tsx` (~5100 lines, single-file React 19 + TypeScript + Framer Motion)  
**Dev server:** `http://localhost:5180/` — `cd winnow-v8 && npm run dev`  
**Type check:** `cd winnow-v8 && npx tsc --noEmit`  
**Design tokens:** `C` object at line 31 (`C.brand`, `C.text1–5`, `C.border`, `C.pageBg`, `C.card`, `C.brandSoft`, `C.brandText`, `C.codeBg`)  
**Text scale law:** Only 11 / 12 / 14 / 16 / 20px. Never fractional sizes like 13.5px or 12.5px in new code.  
**Border law:** Symmetric only — `border: "1.5px solid X"`. Never `borderLeft` alone.

---

---

## HAIKU 4.5 TASKS — Contained, surgical, no architecture changes

---

### H1 — Remove compound chip indicator dot
**Line:** 1537–1541  
**What exists now:**
```tsx
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold"
  style={{ background: C.brandSoft, border: "1px solid #86efac", color: C.brandText }}>
  ⬡ {selection}
</div>
```
**What to do:** Remove the `⬡ ` prefix character. Keep everything else exactly the same. Result: `{selection}` renders alone.  
**Do not** touch font size, colors, padding, or border.

---

### H2 — Fix period chip text wrapping
**Lines:** 1626–1637 (the `locked && selection` early return inside `DateRangePills`)  
**What exists now:** Each period chip is `px-3 py-1.5 rounded-full text-[13px]` with no explicit width control — the flex container wraps at narrow widths causing "Q2" / "2024" to split.  
**What to do:** Add `whiteSpace: "nowrap"` to the inline style of every chip `<div>` in that locked return block:
```tsx
style={{
  whiteSpace: "nowrap",
  background: ...,
  border: ...,
  color: ...,
}}
```
Apply to every `periods.map` chip div in that block. Also add `whiteSpace: "nowrap"` to the active `<motion.button>` chips in the non-locked return (line ~1649).  
**Do not** change padding, font size, or border color logic.

---

### H3 — Remove dots from sidebar agent status
**Lines:** 725–766, the `AgentStatus` component.  
**What exists now:** Two places render a pulsing dot before status text:

1. `user-needed` state (lines 745–752): renders `<span className="relative flex h-1.5 w-1.5">` + ping animation + text
2. Normal active state (lines 759–765): same pulsing dot pattern + `{label}{"·".repeat(dotCount)}`

**What to do:**
- In the `user-needed` branch (lines 744–752): remove the entire `<span className="relative flex h-1.5 w-1.5">...</span>` block. Keep only the text `User Needed{"·".repeat(dotCount)}`.
- In the normal active branch (lines 758–765): remove the entire `<span className="relative flex h-1.5 w-1.5">...</span>` block. Keep only `{label}{"·".repeat(dotCount)}`.
- Keep `gap-1` on the flex span (or remove gap since there's nothing to gap anymore).
- Keep the text color + fontWeight exactly as-is.
- **Do not touch** main chat `AgentBubble` (line ~4490), `TypingDots`, or any other component.

---

### H4 — Risk matrix: replace cell label with dot + tooltip
**Lines:** 3766–3776 inside `RiskMatrix`, specifically the two `isSignal` branches:

**What exists now:**
```tsx
{isSignal && signal.highlight && (
  <>
    <circle cx={x + cellW/2} cy={y + cellH/2 - 9} r={6} fill="#ef4444" />
    <text x={x + cellW/2} y={y + cellH/2 + 8} textAnchor="middle"
      style={{ fontSize: 11, fill: "#991b1b", fontWeight: 700 }}>{signal.label}</text>
  </>
)}
{isSignal && !signal.highlight && (
  <text x={x + cellW/2} y={y + cellH/2 + 5} textAnchor="middle"
    style={{ fontSize: 11, fill: C.text1, fontWeight: 700 }}>{signal.label}</text>
)}
```

**What to do:**  
Replace BOTH branches with a single unified signal marker — a dot in the cell center + a `<title>` SVG tooltip showing severity on hover:
```tsx
{isSignal && (
  <g>
    <circle
      cx={x + cellW/2} cy={y + cellH/2} r={7}
      fill={signal.highlight ? "#ef4444" : C.text2}
      stroke="#fff" strokeWidth={1.5}
    />
    <title>{`${RISK_SEVERITY[signal.sevIdx]}`}</title>
  </g>
)}
```
The `<title>` element is native SVG — it shows on hover in all browsers without extra state.  
**Do not** touch the cell rect, RISK_COLORS, RISK_SEVERITY headers, column headers, or ChartTooltip logic.

---

## SONNET 4.6 TASKS — Architectural / multi-site changes

---

### S1 — Chat input consolidation + PHI toggle removal

**Current `ChatInputBar` signature (line 1367–1368):**
```tsx
function ChatInputBar({ onSend, placeholder = "Ask a follow-up question...", compact = false, beaming = false, agentMode = false }: {
  onSend: (t: string) => void; placeholder?: string; compact?: boolean; beaming?: boolean; agentMode?: boolean;
})
```

**Step A — Remove `agentMode`, add `stripped?: boolean`:**  
Replace `agentMode = false` with `stripped = false` in both the signature and destructuring. Update all 3 call sites (lines 4632, 4941) — they currently don't pass `agentMode` so no change needed there. AgentsChatPanel will pass `stripped`.

**Step B — Remove PHI toggle entirely:**  
In the toolbar section of `ChatInputBar` (lines 1448–1479), inside the `!agentMode` block:
- Delete the entire `<InputOption>` block for PHI (lines 1472–1476):
```tsx
// DELETE THIS ENTIRE BLOCK:
<InputOption active={phi === "reviewed"}
  title={phi === "reviewed" ? "PHI screened..." : "PHI review off..."}
  onClick={() => setPhi(p => p === "reviewed" ? "notReviewed" : "reviewed")}
  label={phi === "reviewed" ? "PHI reviewed" : "PHI not reviewed"}
  iconPath={<path d="M208,40H48A16,16,0,0,0,32,56v58.78..." />} />
```
- Remove `const [phi, setPhi] = useState<PhiReview>("reviewed");` (line 1374) and the `PhiReview` type if it's unused elsewhere.

**Step C — Rename `agentMode` guard to `stripped`:**  
Lines 1448 and 1479: change `!agentMode` → `!stripped`, `agentMode && <div />` → `stripped && <div />`.  
When `stripped === true`: show only the voice + send button section (right side). No file upload, no improve, no quick/detailed.

**Step D — Update AgentsChatPanel input section (lines 4037–4052):**  
Replace the custom `<input>` + Send `<button>` block entirely with:
```tsx
<ChatInputBar
  onSend={sendMessage}
  placeholder={`Ask ${activeAgent.name}…`}
  stripped
  compact
/>
```
Remove: `const [input, setInput] = useState("");` from AgentsChatPanel state.  
Remove the `value={input}` input + Send button JSX (lines 4043–4051).  
Update `sendMessage` to receive `text: string` as parameter instead of reading from `input` state:
```tsx
const sendMessage = (text: string) => {
  if (!text.trim() || typing) return;
  setHistories(prev => ({ ...prev, [activeAgentId]: [...(prev[activeAgentId] ?? []), { role: "user", text }] }));
  setTyping(true);
  setTimeout(() => {
    const reply = generateAgentPanelReply(activeAgentId, text);
    setHistories(prev => ({ ...prev, [activeAgentId]: [...(prev[activeAgentId] ?? []), { role: "agent", text: reply }] }));
    setTyping(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, 900 + Math.random() * 500);
};
```

---

### S2 — Agent panel typing loader (tab chip + message area)

**Context:** `AgentsChatPanel` is at lines 3944–4055. The agent tab chips render at lines 3989–4007. The `typing` state already exists at line 3954. `TypingDots` component exists at line 4517.

**Step A — Loader on active agent tab chip:**  
In the agent selector chips map (lines 3990–4006), add a small spinning SVG on the active chip when `typing === true`:
```tsx
// Inside the <button> for the active chip (isActive && typing):
{isActive && typing && (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)}
```
The `spin` keyframe already exists in `shimmerStyleEl` at line 16: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`.

**Step B — Typing indicator in message area:**  
This already exists at lines 4026–4033. Verify it's using `TypingDots` with `activeAgent.color`:
```tsx
{typing && (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <AgentIcon sides={activeAgent.sides} color={activeAgent.color} size={20} />
    <div style={{ padding: "10px 14px", borderRadius: "4px 16px 16px 16px", background: `${activeAgent.color}12`, border: `1.5px solid ${activeAgent.color}35` }}>
      <TypingDots color={activeAgent.color} />
    </div>
  </div>
)}
```
If this block is already there (it was added in F5), confirm it matches. If the `div` wrapper still uses `borderLeft` anywhere, fix to symmetric: `border: \`1.5px solid ${activeAgent.color}35\``.

**Step C — Verify message bubbles use symmetric borders:**  
Lines 4015–4023 in the messages map. The current style should be:
```tsx
background: m.role === "user" ? C.brandSoft : `${activeAgent.color}12`,
border: `1.5px solid ${m.role === "user" ? "#86efac" : `${activeAgent.color}35`}`,
```
If there is any `borderLeft` in that block, remove it and confirm only `border` (full symmetric) remains.

---

### S3 — Agent Store → full page navigation

**Current state:** `AgentStoreModal` (line 799) is a fixed-position modal. `UserMenu` (line 950) has `showAgentStore` state and renders `<AgentStoreModal onClose={...} />` inline (line 987).

**Step A — Add `view` state to root `WinnowAI` component:**  
In `WinnowAI()` (line 4959), add:
```tsx
const [view, setView] = useState<"chat" | "agent-store">("chat");
```

**Step B — Convert `AgentStoreModal` to `AgentStorePage`:**  
Rename the function from `AgentStoreModal` to `AgentStorePage`. Remove the fixed-overlay wrapper div (the `position: fixed, inset: 0, zIndex: 60` div and the `motion.div` inside it). The component should now return a full-height page layout:
```tsx
function AgentStorePage({ onClose }: { onClose: () => void }) {
  // ... existing state (search, customizing, etc.) ...
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.pageBg, fontFamily: "Manrope, sans-serif" }}>
      {/* header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        {/* grid icon + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          {/* keep existing SVG grid icon */}
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>Winnow Agent Store</p>
          <p style={{ fontSize: 12, color: C.text4 }}>Provision specialized clinical surveillance nodes</p>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text4, padding: 4, borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
          ← Back to chat
        </button>
      </div>
      {/* body — same content as existing modal body, but wider max-width and centered */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px", maxWidth: 800, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ... same customizing / browse content as currently in modal body ... */}
      </div>
    </div>
  );
}
```

**Text scale fix while doing this:** Change all `fontSize: 13.5` → `14`, `fontSize: 12.5` → `12`, `fontSize: 10.5` → `11` inside `AgentStorePage`. Keep `11 / 12 / 14` only.

**Step C — Wire routing in `WinnowAI` root:**
```tsx
// In WinnowAI() return:
if (view === "agent-store") {
  return <AgentStorePage onClose={() => setView("chat")} />;
}
// else render normal chat layout
```

**Step D — Update `UserMenu` to call routing instead of local modal:**  
`UserMenu` currently has its own `showAgentStore` state (line 952) and renders `<AgentStoreModal>` itself (line 987). This needs to navigate up to root.  
Pass `onOpenAgentStore: () => void` as a prop to `UserMenu`. Update the "Agents" item `onClick` to call `onOpenAgentStore()` instead of `setShowAgentStore(true)`.  
Remove `showAgentStore` state and `<AgentStoreModal>` render from `UserMenu`.  
In `WinnowAI` root, wire: `<UserMenu onOpenAgentStore={() => setView("agent-store")} onClose={...} />`.  
Find all call sites of `<UserMenu>` (search `<UserMenu`) and add the `onOpenAgentStore` prop.

**Step E — Agent configuration modal (Configure button):**  
In `AgentStorePage`, the "Configure" button currently shows an inline warning banner. Upgrade it: clicking "Configure" should open a small modal overlay ON TOP of the page. Add `const [configuringAgent, setConfiguringAgent] = useState<string | null>(null)`. Render a centered modal when set:
```tsx
{configuringAgent && (
  <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }} onClick={() => setConfiguringAgent(null)}>
    <div style={{ background: C.card, borderRadius: 14, padding: 24, maxWidth: 420, width: "90vw", border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
      <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 8 }}>Configure {AGENTS.find(a => a.id === configuringAgent)?.name}</p>
      <p style={{ fontSize: 12, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", padding: "8px 12px", borderRadius: 8, marginBottom: 16 }}>
        ⚠️ This is a system agent. Editing the system prompt may affect pipeline behavior.
      </p>
      <button onClick={() => setConfiguringAgent(null)} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: C.brand, color: "#fff", cursor: "pointer" }}>Close</button>
    </div>
  </div>
)}
```

---

## Verification Checklist

After all tasks complete:
- [ ] `npx tsc --noEmit` — zero errors
- [ ] Compound chip: text only, no ⬡ prefix
- [ ] Period chips: "Q2 2024" on single line, no wrapping
- [ ] Sidebar agent status: text only, no pulsing dot before text
- [ ] Risk matrix highlighted cell: white dot centered, no text label; hover shows `<title>` tooltip
- [ ] Main chat input: improve + quick/detailed + file upload + send (no PHI toggle)
- [ ] Agent panel input: send + attach only, same button styling as main chat
- [ ] Agent panel messages: symmetric `border: 1.5px solid ${color}35`, no `borderLeft` anywhere in project
- [ ] Typing indicators: spinner on active agent tab chip + TypingDots in message area
- [ ] Agent Store: full page (not modal), text scale 11/12/14px, Configure opens modal overlay
- [ ] User menu "Agents" navigates to Agent Store page, not modal

