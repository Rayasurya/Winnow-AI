import type { TemporalMode, AdvancedParams, AnalysisState, StepStatus, EvidenceStrength, SignalRow, Reference, InlineSeg, AnswerBlock, DrugSection, DrugInfo, ResultData, FlowComponent, ToolArg, ThoughtStep, AgentThought, ChatMessage, AgentConversation, FlowScriptStep, SynthesisStep, AgentActivity, RespLength, SegUnit, ForestRow, TrendPoint, QuarterlyCount, OnsetBucket, KMPoint, RiskCell, DemoFeature, ArtifactTab, ResultTab, WordTok, SubAgent } from "./WinnowData";
import { C, DEFAULT_ADVANCED, AGENTS, FLOWS, MOCK_HISTORY, GREETINGS, WELCOME_PHRASES, SIGNAL_ROWS, ARTIFACT_QUERY, MOCK_CONVERSATIONS, REFERENCES, ANSWER_BLOCKS, DRUGS, SUGGESTED, SAFETY_STEPS, PLANNER_THOUGHT, DATA_THOUGHT, MEDICAL_THOUGHT, PHI_THOUGHT, TRACE_AGENTS, SYNTHESIS_SEQUENCE, STORE_TEMPLATES, COMMS_LOG, MAX_FILES, BEAM_MS, MONTHS, YEARS, DRUG_TAB_ORDER, SIGNAL_COLOR, CHART_SOURCES, FOREST_ROWS, TREND_DATA, QUARTERLY_COUNTS, ONSET_BUCKETS, KM_CURVE, RISK_SEVERITY, RISK_SIGNAL, RISK_COLORS, RISK_SIGNALS, CASE_DEMOGRAPHICS, MULTI_SIGNAL_ROWS, AGENT_PANEL_INTROS, PROMPT_CHIPS, RETRIEVAL_SOURCES, VALIDATION_METHODS, PRIVACY_OPS } from "./WinnowData";
import * as React from "react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { MetalFx } from "metal-fx";
import { Modal } from "./components/ui/modal";

// ─── Fonts ────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Instrument+Serif:ital@1&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

// Shimmer sweep used by "thinking" status text (text-clip gradient animation).
const shimmerStyleEl = document.createElement("style");
shimmerStyleEl.textContent = `
@keyframes gradientSweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes streamBlink { 0%, 50% { opacity: 1; } 50.01%, 100% { opacity: 0; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@property --beam-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes beamSweep { from { --beam-angle: 0deg; } to { --beam-angle: 360deg; } }
.beam-host::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 2px;
  background: conic-gradient(from var(--beam-angle), transparent 0deg, transparent 285deg, #6ee7b7 320deg, #059669 342deg, #0d9488 352deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
  opacity: 0; pointer-events: none;
}
.beam-host[data-beam="true"]::before { opacity: 1; animation: beamSweep 0.85s linear 1; }

@property --ring-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
@keyframes spin-ring { to { --ring-angle: 360deg; } }
.upgrade-ring { padding: 1.5px; border-radius: 13px; background: conic-gradient(from var(--ring-angle), #f59e0b, #fcd34d, #e0f2fe, #a5f3fc, #818cf8, #f472b6, #f59e0b); animation: spin-ring 3s linear infinite; }
`;
document.head.appendChild(shimmerStyleEl);

// ─── Design tokens ────────────────────────────────────────────────
// ─── Types ────────────────────────────────────────────────────────
// Typed inline/answer content model — avoids pulling in a markdown lib while
// still supporting evidence-strength-coloured inline citation chips.
// ─── Transparent reasoning model (tool calls + interleaved reasoning) ──
// ─── Constants ────────────────────────────────────────────────────
// ─── Flow Data ────────────────────────────────────────────────────
// ─── Mock Conversation Data ────────────────────────────────────────
// ─── Narrative answer report (Ibuprofen FAERS) ───────────────────
// ─── Drug Information cards ───────────────────────────────────────
// ─── Suggested follow-up questions ────────────────────────────────

function buildResultData(s: AnalysisState): ResultData {
  return {
    answer: ANSWER_BLOCKS, drugs: DRUGS, signals: SIGNAL_ROWS, refs: REFERENCES, suggested: SUGGESTED, params: { ...s },
    artifactTitle: `${s.compound || "Ibuprofen"} — disproportionality signals (FAERS ${s.period || "Q3 2024"})`,
    artifactQuery: ARTIFACT_QUERY,
  };
}

// The Planner's transparent reasoning for the planning phase — query
// interpretation + the tool calls it makes to scope the run. Grounded in the
// openFDA / science-skills tooling.
// The per-agent reasoning stream shown while the pipeline runs. Agents work
// CONCURRENTLY: the Planner dispatches each downstream agent partway through its
// own plan (staggered `startMs`), so several reason in parallel and finish at
// their own pace. The Planner then consolidates the final report.
// After the per-agent reasoning stream, the Planner emits the single
// consolidated report (carrying the result tabs + artifact).
// ─── Export helpers (no deps — browser-native Blob / print / clipboard) ──
function segsToPlain(segs: InlineSeg[]): string {
  return segs.map(s => s.t === "cite" ? `[${s.ref}]` : s.v).join("");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function buildSignalCSV(data: ResultData): string {
  const lines = [["Adverse Event", "PRR", "95% CI", "n", "Signal"].join(",")];
  for (const r of data.signals) {
    lines.push([r.event, r.prr, r.ci, String(r.n), r.level].map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function segsToHTML(segs: InlineSeg[]): string {
  return segs.map(s => {
    if (s.t === "bold") return `<strong>${escHtml(s.v)}</strong>`;
    if (s.t === "em") return `<em>${escHtml(s.v)}</em>`;
    if (s.t === "cite") {
      const c = C.evidence[s.strength];
      return `<sup style="background:${c.surface};color:${c.text};padding:1px 5px;border-radius:6px;font-size:10px;font-weight:600;">${s.ref}</sup>`;
    }
    return escHtml(s.v);
  }).join("");
}

function buildReportHTML(data: ResultData, params: AnalysisState): string {
  const compound = params.compound || "Compound";
  const period = params.period || "Q3 2024";
  const body = data.answer.map(b => {
    switch (b.kind) {
      case "heading": return `<h2 style="font-size:16px;margin:22px 0 8px;color:#222831;">${escHtml(b.text)}</h2>`;
      case "paragraph": return `<p style="margin:8px 0;line-height:1.7;color:#364152;">${segsToHTML(b.segs)}</p>`;
      case "bullets": return `<ul style="margin:8px 0;padding-left:20px;color:#364152;line-height:1.7;">${b.items.map(it => `<li>${segsToHTML(it)}</li>`).join("")}</ul>`;
      case "divider": return `<hr style="border:none;border-top:1px solid #E4EAF2;margin:18px 0;">`;
      case "callout": return `<blockquote style="margin:14px 0;padding:10px 16px;border-left:3px solid #059669;background:#e6f4ee;color:#364152;line-height:1.7;">${segsToHTML(b.segs)}</blockquote>`;
      case "signal-table": {
        const rows = data.signals.map(r => `<tr><td style="padding:6px 10px;border:1px solid #E4EAF2;">${escHtml(r.event)}</td><td style="padding:6px 10px;border:1px solid #E4EAF2;">${escHtml(r.prr)}</td><td style="padding:6px 10px;border:1px solid #E4EAF2;">${escHtml(r.ci)}</td><td style="padding:6px 10px;border:1px solid #E4EAF2;">${r.n}</td><td style="padding:6px 10px;border:1px solid #E4EAF2;text-transform:capitalize;">${escHtml(r.level)}</td></tr>`).join("");
        return `<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;"><thead><tr>${["Adverse Event","PRR","95% CI","n","Signal"].map(h => `<th style="padding:6px 10px;border:1px solid #E4EAF2;background:#F7FAFC;text-align:left;">${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
      }
      case "table": {
        const head = `<tr>${b.headers.map(h => `<th style="padding:6px 10px;border:1px solid #E4EAF2;background:#F7FAFC;text-align:left;">${escHtml(h)}</th>`).join("")}</tr>`;
        const rows = b.rows.map(row => `<tr>${row.map(cell => `<td style="padding:6px 10px;border:1px solid #E4EAF2;">${segsToHTML(cell)}</td>`).join("")}</tr>`).join("");
        return `<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:13px;"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
      }
    }
  }).join("");

  const refs = data.refs.map(r => `<li style="margin:6px 0;color:#364152;"><strong>[${r.n}]</strong> ${escHtml(r.title)}. <em>${escHtml(r.journal)}</em>, ${escHtml(r.authors)} (${r.year}). <span style="color:${C.evidence[r.evidenceStrength].text};font-weight:600;">${C.evidence[r.evidenceStrength].label} evidence · ${escHtml(r.studyType)}</span></li>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Winnow AI — ${escHtml(compound)} Safety Report</title></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;max-width:780px;margin:32px auto;padding:0 24px;color:#222831;">
<div style="border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:8px;">
<h1 style="font-size:22px;margin:0;color:#059669;">Winnow AI — Safety Signal Report</h1>
<p style="margin:6px 0 0;color:#8090A6;font-size:13px;">${escHtml(compound)} · FAERS disproportionality analysis · ${escHtml(period)}</p>
</div>
${body}
<h2 style="font-size:16px;margin:22px 0 8px;color:#222831;">References</h2>
<ol style="padding-left:20px;font-size:13px;">${refs}</ol>
<p style="margin-top:28px;color:#b6c1d2;font-size:11px;">Generated by Winnow AI. This is AI-assisted analysis — verify before clinical or regulatory use.</p>
</body></html>`;
}

function openPrintWindow(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Allow layout/fonts to settle before invoking the print dialog.
  setTimeout(() => { w.focus(); w.print(); }, 300);
}

function buildPlainSummary(data: ResultData, params: AnalysisState): string {
  const lines: string[] = [];
  lines.push(`WINNOW AI — SAFETY SIGNAL REPORT`);
  lines.push(`${params.compound || "Compound"} · FAERS · ${params.period || "Q3 2024"}`);
  lines.push("");
  for (const b of data.answer) {
    switch (b.kind) {
      case "heading": lines.push(b.text.toUpperCase()); break;
      case "paragraph": lines.push(segsToPlain(b.segs)); lines.push(""); break;
      case "bullets": b.items.forEach(it => lines.push(`  • ${segsToPlain(it)}`)); lines.push(""); break;
      case "callout": lines.push(`> ${segsToPlain(b.segs)}`); lines.push(""); break;
      case "divider": break;
      case "signal-table":
        data.signals.forEach(r => lines.push(`  ${r.event}: PRR ${r.prr} (CI ${r.ci}), n=${r.n} [${r.level}]`));
        lines.push("");
        break;
      case "table":
        b.rows.forEach(row => lines.push(`  - ${row.map(segsToPlain).join("  |  ")}`));
        lines.push("");
        break;
    }
  }
  lines.push("REFERENCES");
  data.refs.forEach(r => lines.push(`  [${r.n}] ${r.title}. ${r.journal}, ${r.authors} (${r.year}).`));
  return lines.join("\n");
}

// ─── Agent Status ─────────────────────────────────────────────────

function AgentStatus({ agentId, state, thinkingLabel, generatingLabel, agentColor }: {
  agentId?: string;
  state?: AgentActivity;
  thinkingLabel?: string;
  generatingLabel?: string;
  agentColor?: string;
}) {
  const [dotCount, setDotCount] = useState(1);
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    if (!state) return;
    const dotTimer = setInterval(() => setDotCount(d => (d % 3) + 1), 420);
    return () => clearInterval(dotTimer);
  }, [state]);

  useEffect(() => {
    setAttempt(1);
  }, [agentId, state]);

  if (!state) {
    return <span className="text-[11px]" style={{ color: C.text5 }}>idle</span>;
  }

  if (state === "user-needed") {
    return (
      <span className="text-[11px] font-medium" style={{ color: "#d97706" }}>
        User Needed{"·".repeat(dotCount)}
      </span>
    );
  }

  const label = state === "generating" ? (generatingLabel ?? "generating") : (thinkingLabel ?? "working");
  const color = agentColor ?? C.brand;

  return (
    <span className="text-[11px] font-medium" style={{ color }}>
      {label}{"·".repeat(dotCount)}
    </span>
  );
}

// ─── Agent Icon ───────────────────────────────────────────────────
function AgentIcon({ sides, color, size = 28, pulse = false }: {
  sides: number; color: string; size?: number; pulse?: boolean;
}) {
  const r = size / 2 - 2;
  const cx = size / 2, cy = size / 2;
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {pulse && <div className="absolute inset-[20%] rounded-full animate-ping opacity-30" style={{ backgroundColor: color }} />}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polygon points={pts} fill={color} opacity="0.12" />
        <polygon points={pts} fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
        <circle cx={cx} cy={cy} r={r * 0.3} fill={color} opacity="0.9" />
      </svg>
    </div>
  );
}

// ─── Agent Store Modal ────────────────────────────────────────────

function ConfigureAgentModal({ ag, onClose, onSave, previewRole }: { ag: any; onClose: () => void; onSave: (name: string, settings: any) => void; previewRole: "scientist" | "admin" }) {
  const isSystem = ["planner", "data", "medical", "phi"].includes(ag.id);
  const readOnly = previewRole === "scientist";
  
  // Planner state
  const [orchestration, setOrchestration] = useState("staggered");
  const [maxDepth, setMaxDepth] = useState(3);
  const [strictEvans, setStrictEvans] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);

  // Data Compiler state
  const [sources, setSources] = useState<string[]>(["faers", "eudra", "pubmed", "clinicaltrials", "europepmc", "biorxiv", "openalex"]);
  const [timeout, setTimeoutVal] = useState(30);
  const [dedup, setDedup] = useState("fuzzy");

  // Medical Reviewer state
  const [causality, setCausality] = useState("who");
  const [prrThreshold, setPrrThreshold] = useState(2.0);
  const [chiThreshold, setChiThreshold] = useState(4.0);
  const [evidenceWeight, setEvidenceWeight] = useState("equal");

  // PHI Guard state
  const [deidStandard, setDeidStandard] = useState("safeharbor");
  const [kAnonymity, setKAnonymity] = useState(5);
  const [auditLevel, setAuditLevel] = useState("full");

  // Custom Agent state
  const [sensitivity, setSensitivity] = useState(75);
  const [prrCutoff, setPrrCutoff] = useState(2.0);
  const [deepScan, setDeepScan] = useState(true);

  const handleSave = () => {
    if (readOnly) return;
    if (ag.id === "planner" && (maxDepth < 1 || maxDepth > 5)) {
      alert("Max recursion depth must be between 1 and 5");
      return;
    }
    if (ag.id === "data" && (timeout < 5 || timeout > 120)) {
      alert("Timeout must be between 5s and 120s");
      return;
    }
    onSave(ag.name, {
      orchestration, maxDepth, strictEvans, autoRetry,
      sources, timeout, dedup,
      causality, prrThreshold, chiThreshold, evidenceWeight,
      deidStandard, kAnonymity, auditLevel,
      sensitivity, prrCutoff, deepScan
    });
  };

  const toggleSource = (src: string) => {
    if (readOnly) return;
    setSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.40)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div style={{ background: C.card, borderRadius: 20, padding: 24, maxWidth: 460, width: "90vw", border: `1px solid ${C.border}`, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: ag.color }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text1, margin: 0 }}>Configure {ag.name}</h3>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 20, color: "#64748b", cursor: "pointer" }}>&times;</button>
        </div>

        {readOnly ? (
          <p style={{ fontSize: 11.5, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", padding: "8px 12px", borderRadius: 8, marginBottom: 16, lineHeight: 1.4 }}>
            ⚠️ governed configuration — contact your admin to request changes.
          </p>
        ) : (
          isSystem && (
            <p style={{ fontSize: 11.5, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", padding: "8px 12px", borderRadius: 8, marginBottom: 16, lineHeight: 1.4 }}>
              ⚠️ This is a core system agent. Modifying these rules changes the automated pharmacovigilance pipeline behavior.
            </p>
          )
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          {ag.id === "planner" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Orchestration Strategy</label>
                <select value={orchestration} onChange={e => setOrchestration(e.target.value)} disabled={readOnly}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }}>
                  <option value="staggered">Dynamic Staggered DAG (Recommended)</option>
                  <option value="sequential">Sequential Pipeline</option>
                  <option value="hierarchical">Hierarchical Critic Loop</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Max Depth</label>
                  <input type="number" min="1" max="5" value={maxDepth} onChange={e => setMaxDepth(parseInt(e.target.value) || 3)} disabled={readOnly}
                    style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text2, cursor: "pointer" }}>
                    <input type="checkbox" checked={strictEvans} onChange={e => setStrictEvans(e.target.checked)} disabled={readOnly} />
                    Strict Evans Gating
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text2, cursor: "pointer" }}>
                    <input type="checkbox" checked={autoRetry} onChange={e => setAutoRetry(e.target.checked)} disabled={readOnly} />
                    Auto-retry timeouts
                  </label>
                </div>
              </div>
            </>
          )}

          {ag.id === "data" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Source Selection</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {["faers", "eudra", "vigiaccess", "pubmed", "clinicaltrials", "europepmc", "biorxiv", "openalex"].map(src => {
                    const checked = sources.includes(src);
                    const labelMap: any = {
                      faers: "FAERS (openFDA)",
                      eudra: "EudraVigilance",
                      vigiaccess: "VigiBase",
                      pubmed: "PubMed Search",
                      clinicaltrials: "Clinical Trials",
                      europepmc: "Europe PMC",
                      biorxiv: "bioRxiv Search",
                      openalex: "OpenAlex Search"
                    };
                    return (
                      <button key={src} onClick={() => toggleSource(src)} disabled={readOnly}
                        style={{
                          padding: "5px 10px", borderRadius: 6, border: `1px solid ${checked ? ag.color : C.border}`,
                          background: checked ? `${ag.color}15` : "transparent", color: checked ? ag.color : C.text3,
                          fontSize: 12, fontWeight: 600, cursor: readOnly ? "not-allowed" : "pointer"
                        }}>
                        {labelMap[src] || src}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>Query Timeout</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{timeout}s</span>
                </div>
                <input type="range" min="5" max="120" value={timeout} onChange={e => setTimeoutVal(parseInt(e.target.value))} disabled={readOnly} style={{ width: "100%", accentColor: ag.color }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Deduplication Strategy</label>
                <select value={dedup} onChange={e => setDedup(e.target.value)} disabled={readOnly}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }}>
                  <option value="exact">Exact match on Age/Sex/Event</option>
                  <option value="fuzzy">Fuzzy record deduplication (Recommended)</option>
                  <option value="none">Suppress duplicates completely</option>
                </select>
              </div>
            </>
          )}

          {ag.id === "medical" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Causality Algorithm</label>
                <select value={causality} onChange={e => setCausality(e.target.value)} disabled={readOnly}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }}>
                  <option value="who">WHO-UMC Causality Algorithm</option>
                  <option value="bradford">Bradford-Hill Criteria</option>
                  <option value="naranjo">Naranjo Score Card</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>PRR Threshold</label>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{prrThreshold.toFixed(1)}</span>
                  </div>
                  <input type="range" min="1" max="5" step="0.1" value={prrThreshold} onChange={e => setPrrThreshold(parseFloat(e.target.value))} disabled={readOnly} style={{ width: "100%", accentColor: ag.color }} />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>Chi-Square</label>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{chiThreshold.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="10" step="0.5" value={chiThreshold} onChange={e => setChiThreshold(parseFloat(e.target.value))} disabled={readOnly} style={{ width: "100%", accentColor: ag.color }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Evidence Weighting</label>
                <select value={evidenceWeight} onChange={e => setEvidenceWeight(e.target.value)} disabled={readOnly}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }}>
                  <option value="spontaneous">Spontaneous reports weighted (FAERS/EudraVigilance)</option>
                  <option value="clinical">Clinical trial weighted (FDA Label/PMR)</option>
                  <option value="equal">Equal Weighting (Standard)</option>
                </select>
              </div>
            </>
          )}

          {ag.id === "phi" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>De-identification Standard</label>
                <select value={deidStandard} onChange={e => setDeidStandard(e.target.value)} disabled={readOnly}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }}>
                  <option value="safeharbor">HIPAA Safe Harbor (18 Identifiers)</option>
                  <option value="gdpr">GDPR Anonymization Standard</option>
                  <option value="custom">Custom De-identification Rules</option>
                </select>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>k-Anonymity Target</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>k ≥ {kAnonymity}</span>
                </div>
                <input type="range" min="2" max="20" value={kAnonymity} onChange={e => setKAnonymity(parseInt(e.target.value))} disabled={readOnly} style={{ width: "100%", accentColor: ag.color }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase", marginBottom: 6 }}>Audit Logging Level</label>
                <select value={auditLevel} onChange={e => setAuditLevel(e.target.value)} disabled={readOnly}
                  style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.pageBg, color: C.text1, fontSize: 13, outline: "none" }}>
                  <option value="full">Full compliance audit logging (Recommended)</option>
                  <option value="alerts">Privacy alerts only</option>
                  <option value="none">None (Internal diagnostics only)</option>
                </select>
              </div>
            </>
          )}

          {!isSystem && (
            <>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>Sensitivity Threshold</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{sensitivity}%</span>
                </div>
                <input type="range" min="0" max="100" value={sensitivity} onChange={e => setSensitivity(parseInt(e.target.value))} disabled={readOnly} style={{ width: "100%", accentColor: ag.color }} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>Disproportionality Cutoff (PRR)</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>PRR ≥ {prrCutoff.toFixed(1)}</span>
                </div>
                <input type="range" min="1" max="5" step="0.1" value={prrCutoff} onChange={e => setPrrCutoff(parseFloat(e.target.value))} disabled={readOnly} style={{ width: "100%", accentColor: ag.color }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: C.text2 }}>Enable Deep Narrative Scan</span>
                <input type="checkbox" checked={deepScan} onChange={e => setDeepScan(e.target.checked)} style={{ width: 16, height: 16, accentColor: ag.color }} disabled={readOnly} />
              </div>
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text3, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={readOnly}
            style={{ flex: 1, padding: "9px 16px", fontSize: 13.5, fontWeight: 600, borderRadius: 8, border: "none", background: readOnly ? C.border : ag.color, color: "#fff", cursor: readOnly ? "not-allowed" : "pointer" }}>
            {readOnly ? "Read-Only" : "Submit for change control"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentEditor({
  mode,
  subAgent,
  template,
  previewRole,
  onClose,
  onSave,
  onDelete,
  onStatusTransition
}: {
  mode: "create" | "edit" | "view" | "store-preview";
  subAgent?: any;
  template?: any;
  previewRole: "scientist" | "admin";
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string, parentId: string) => void;
  onStatusTransition?: (id: string, parentId: string, transition: "request_validation" | "approve" | "return") => void;
}) {
  const isCreate = mode === "create";
  const isStorePreview = mode === "store-preview";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [name, setName] = useState(subAgent?.name || template?.name || "");
  const [parentId, setParentId] = useState<"data" | "medical" | "phi">(
    subAgent?.parentId || template?.parent || "data"
  );
  
  const getCapabilitiesForParent = (pId: string) => {
    if (pId === "data") return RETRIEVAL_SOURCES;
    if (pId === "medical") return VALIDATION_METHODS;
    if (pId === "phi") return PRIVACY_OPS;
    return [];
  };

  const capabilities = getCapabilitiesForParent(parentId);
  const [capability, setCapability] = useState(
    subAgent?.capability || template?.capability || (capabilities[0]?.id || "")
  );

  useEffect(() => {
    const caps = getCapabilitiesForParent(parentId);
    if (!caps.some(c => c.id === capability)) {
      setCapability(caps[0]?.id || "");
    }
  }, [parentId]);

  const [desc, setDesc] = useState(subAgent?.desc || template?.desc || "");
  const [instructions, setInstructions] = useState(subAgent?.instructions || "");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(subAgent?.knowledge || []);
  const [newFileName, setNewFileName] = useState("");

  const handleAddFile = () => {
    if (newFileName.trim()) {
      setUploadedFiles(prev => [...prev, newFileName.trim()]);
      setNewFileName("");
    }
  };

  const handleRemoveFile = (f: string) => {
    setUploadedFiles(prev => prev.filter(file => file !== f));
  };

  const parentColor = parentId === "data" ? "#0891b2" : parentId === "medical" ? "#7c3aed" : "#d97706";
  const parentName = parentId === "data" ? "Data Compiler" : parentId === "medical" ? "Medical Reviewer" : "PHI Guard";
  const isPhiLock = parentId === "phi" && previewRole === "scientist";

  const handleSaveClick = () => {
    if (!name.trim()) return;
    const subAgentId = subAgent?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    onSave({
      id: subAgentId,
      name,
      parentId,
      capability,
      desc,
      instructions,
      knowledge: uploadedFiles,
      origin: subAgent?.origin || (isStorePreview ? "store" : "custom"),
      status: subAgent?.status || (previewRole === "admin" ? "validated" : "sandbox"),
      scope: subAgent?.scope || "org"
    });
  };

  const capabilityName = capabilities.find(c => c.id === capability)?.name || capability;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.pageBg, fontFamily: "Manrope, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${C.border}`, background: C.card, minHeight: 70 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text3, padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
          ← Back to store
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text1, margin: 0 }}>
            {isCreate ? "Create Sub-Agent" : isStorePreview ? `Template Preview: ${name}` : `Sub-Agent: ${name}`}
          </h1>
          <p style={{ fontSize: 12, color: C.text4, margin: 0 }}>
            {isStorePreview ? "Review template details and provision node" : "Configure sub-agent execution parameters"}
          </p>
        </div>
        <div style={{ width: 100 }} />
      </div>

      {/* Editor Body: Two-Pane */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Left Pane: Editor Form */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 24 }}>
          {isPhiLock && (isCreate || isStorePreview) && (
            <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#991b1b", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔒</span>
              <strong>admin required</strong> to configure PHI Guard compliance sub-agents.
            </div>
          )}

          {subAgent?.status === "review" && (
            <div style={{ padding: "12px 16px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, color: "#1d4ed8", fontSize: 13 }}>
              ℹ️ This sub-agent is <strong>In Review</strong>. Configuration changes are locked while pending.
            </div>
          )}

          {/* Name */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.05em" }}>Agent Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              disabled={isView || isStorePreview || subAgent?.status === "review"}
              placeholder="e.g. Pediatric Safety Lead"
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text1, fontSize: 14, outline: "none" }}
            />
          </div>

          {/* Reports to (Parent) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.05em" }}>Reports to (Parent Agent)</label>
            <select 
              value={parentId} 
              onChange={e => setParentId(e.target.value as any)}
              disabled={!isCreate || subAgent?.status === "review"}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text1, fontSize: 14, outline: "none" }}
            >
              <option value="data">Data Compiler (Evidence Retrieval)</option>
              <option value="medical">Medical Reviewer (Clinical Validation)</option>
              {previewRole === "admin" && <option value="phi">PHI Guard (Compliance & Privacy)</option>}
              {previewRole === "scientist" && <option value="phi" disabled>PHI Guard (Admin only)</option>}
            </select>
          </div>

          {/* Capability */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.05em" }}>Capability Axis Tool</label>
            <select 
              value={capability} 
              onChange={e => setCapability(e.target.value)}
              disabled={isView || isStorePreview || subAgent?.status === "review"}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text1, fontSize: 14, outline: "none" }}
            >
              {capabilities.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.desc}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.05em" }}>Description</label>
            <textarea 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
              disabled={isView || isStorePreview || subAgent?.status === "review"}
              placeholder="e.g. Scans clinical trials and safety registries for maternal-fetal hazard markers."
              rows={3}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text1, fontSize: 14, outline: "none", resize: "vertical" }}
            />
          </div>

          {/* Instructions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.05em" }}>Instructions & Prompt Guidelines</label>
            <textarea 
              value={instructions} 
              onChange={e => setInstructions(e.target.value)} 
              disabled={isView || isStorePreview || subAgent?.status === "review"}
              placeholder="e.g. Focus on high-dose pediatric anomalies. Tag disproportionality metrics above 2.5."
              rows={4}
              style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.card, color: C.text1, fontSize: 14, outline: "none", resize: "vertical" }}
            />
          </div>

          {/* Knowledge */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.05em" }}>Knowledge Source Files</label>
            {!(isView || isStorePreview || subAgent?.status === "review") && (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input 
                  value={newFileName} 
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="e.g. pediatric-dosage-guidelines-2025.pdf"
                  style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.card, color: C.text1, fontSize: 13, outline: "none" }}
                />
                <button 
                  onClick={handleAddFile}
                  style={{ padding: "8px 16px", background: C.brand, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Add File
                </button>
              </div>
            )}
            <div style={{ border: `1px dashed ${C.border}`, padding: "14px", borderRadius: 8, background: C.card, display: "flex", flexDirection: "column", gap: 6 }}>
              {uploadedFiles.length === 0 ? (
                <p style={{ fontSize: 12, color: C.text5, margin: 0, textAlign: "center" }}>No knowledge files attached.</p>
              ) : (
                uploadedFiles.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.pageBg, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12.5, color: C.text1, fontFamily: "monospace" }}>📄 {f}</span>
                    {!(isView || isStorePreview || subAgent?.status === "review") && (
                      <button 
                        onClick={() => handleRemoveFile(f)}
                        style={{ background: "transparent", border: "none", color: "#dc2626", fontSize: 14, cursor: "pointer" }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            {isStorePreview ? (
              <button 
                onClick={handleSaveClick}
                disabled={isPhiLock}
                style={{ 
                  flex: 1, 
                  padding: "12px 20px", 
                  fontSize: 14, 
                  fontWeight: 600, 
                  borderRadius: 8, 
                  border: "none", 
                  background: isPhiLock ? C.border : C.brand, 
                  color: isPhiLock ? C.text4 : "#fff", 
                  cursor: isPhiLock ? "not-allowed" : "pointer" 
                }}
              >
                {isPhiLock ? "admin required" : `+ Provision sub-agent (${previewRole === "admin" ? "Validated" : "Sandbox"})`}
              </button>
            ) : isView && subAgent?.status === "review" && previewRole === "admin" ? (
              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                <button 
                  onClick={() => onStatusTransition?.(subAgent.id, parentId, "approve")}
                  style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: "#10b981", color: "#fff", cursor: "pointer" }}
                >
                  Approve
                </button>
                <button 
                  onClick={() => onStatusTransition?.(subAgent.id, parentId, "return")}
                  style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: `1px solid #f59e0b`, background: "transparent", color: "#d97706", cursor: "pointer" }}
                >
                  Return
                </button>
              </div>
            ) : isView && subAgent?.status === "sandbox" && previewRole === "scientist" ? (
              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                <button 
                  onClick={() => onStatusTransition?.(subAgent.id, parentId, "request_validation")}
                  style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", cursor: "pointer" }}
                >
                  Request validation
                </button>
                <button 
                  onClick={() => onClose()}
                  style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer" }}
                >
                  Close
                </button>
              </div>
            ) : isView ? (
              <button 
                onClick={onClose}
                style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text1, cursor: "pointer" }}
              >
                Close
              </button>
            ) : (
              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                {previewRole === "admin" ? (
                  <>
                    <button 
                      onClick={handleSaveClick}
                      style={{ flex: 2, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: C.brand, color: "#fff", cursor: "pointer" }}
                    >
                      Save & publish
                    </button>
                    <button 
                      onClick={() => {
                        if (!name.trim()) return;
                        const subAgentId = subAgent?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                        onSave({
                          id: subAgentId,
                          name,
                          parentId,
                          capability,
                          desc,
                          instructions,
                          knowledge: uploadedFiles,
                          origin: subAgent?.origin || "custom",
                          status: "sandbox",
                          scope: "personal"
                        });
                      }}
                      style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer" }}
                    >
                      Save as draft
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleSaveClick}
                    style={{ flex: 1, padding: "12px 20px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "none", background: C.brand, color: "#fff", cursor: "pointer" }}
                  >
                    Save to my sandbox
                  </button>
                )}
                {isEdit && onDelete && subAgent && (subAgent.origin !== "builtin") && (
                  <button 
                    onClick={() => onDelete(subAgent.id, parentId)}
                    style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600, borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Trace Preview */}
        <div style={{ flex: 1, background: C.pageBg, padding: 32, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
          <div>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: C.text4, letterSpacing: "0.08em", marginBottom: 12 }}>
              Live Trace Preview
            </h3>
            
            <div style={{ 
              border: `1px solid ${C.border}`, 
              borderRadius: 14, 
              padding: 20, 
              background: C.card, 
              position: "relative",
              boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: 12
            }}>
              <div style={{ position: "absolute", top: 16, right: 16 }}>
                {(() => {
                  const status = subAgent?.status || (isStorePreview ? (previewRole === "admin" ? "validated" : "sandbox") : isCreate ? (previewRole === "admin" ? "validated" : "sandbox") : "sandbox");
                  if (status === "validated") {
                    return <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0", padding: "3px 8px", borderRadius: 20 }}>Validated</span>;
                  }
                  if (status === "review") {
                    return <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "3px 8px", borderRadius: 20 }}>In Review</span>;
                  }
                  return <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", background: "#fef3c7", color: "#d97706", border: "1px solid #fcd34d", padding: "3px 8px", borderRadius: 20 }}>Sandbox · Personal</span>;
                })()}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: parentColor }} />
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: C.text1, margin: 0 }}>{name || "Untitled Sub-Agent"}</h4>
                  <p style={{ fontSize: 11, color: C.text4, margin: 0 }}>↳ Reports to {parentName}</p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, color: C.text3, fontWeight: 600 }}>
                  Origin: {subAgent?.origin || (isStorePreview ? "store" : "custom")}
                </span>
                <span style={{ fontSize: 10, background: `${parentColor}10`, padding: "2px 6px", borderRadius: 4, color: parentColor, fontWeight: 600 }}>
                  Tool: {capabilityName}
                </span>
              </div>

              <p style={{ fontSize: 12.5, color: C.text3, margin: 0, lineHeight: 1.4 }}>{desc || "No description provided."}</p>
            </div>
          </div>

          <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, background: "#f8fafc", display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.text4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Active Pipeline Deployment
            </span>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "monospace", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#059669", fontWeight: 700 }}>[Planner]</span>
                <span style={{ color: C.text4 }}>────&gt;</span>
                <span style={{ color: parentColor, fontWeight: 700 }}>[{parentName}]</span>
              </div>
              <div style={{ paddingLeft: 24, borderLeft: `2.5px dashed ${parentColor}40`, marginLeft: 30, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: parentColor }}>↳</span>
                  <span style={{ color: C.text1, fontWeight: 600 }}>[{name || "Untitled Sub-Agent"}]</span>
                  <span style={{ color: C.text5, fontSize: 10 }}>(active)</span>
                </div>
                <div style={{ background: "#fff", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.text3 }}>
                  <span style={{ color: parentColor, fontWeight: 600 }}>run_tool: </span>
                  {capability}({parentId === "data" ? "query='ibuprofen adverse events'" : parentId === "medical" ? "signal_id='sig_465'" : "target='report_attestation'"})
                  <br />
                  <span style={{ color: "#059669", fontWeight: 600 }}>status: </span>
                  completed successfully (0ms)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentStorePage({
  onClose,
  onProvisionAgent,
  agentsList = AGENTS,
  previewRole,
  setPreviewRole
}: {
  onClose: () => void;
  onProvisionAgent: (template: any) => void;
  agentsList: any[];
  previewRole: "scientist" | "admin";
  setPreviewRole: (role: "scientist" | "admin") => void;
}) {
  const [search, setSearch] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [configuringAgent, setConfiguringAgent] = useState<string | null>(null);

  const [subAgentsExpanded, setSubAgentsExpanded] = useState(false);
  const [discoverExpanded, setDiscoverExpanded] = useState(false);

  const [editorMode, setEditorMode] = useState<"create" | "edit" | "view" | "store-preview" | null>(null);
  const [selectedSubAgent, setSelectedSubAgent] = useState<any | null>(null);
  const [editorTemplate, setEditorTemplate] = useState<any | null>(null);

  const [selectedParentFilter, setSelectedParentFilter] = useState<string | null>(null);
  const [selectedOriginFilter, setSelectedOriginFilter] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (search.trim() !== "") {
      setSubAgentsExpanded(true);
      setDiscoverExpanded(true);
    }
  }, [search]);

  const allSubAgents = useMemo(() => {
    return agentsList.flatMap(parent => 
      (parent.subAgents || []).map((sa: any) => ({
        ...sa,
        parentName: parent.name,
        parentColor: parent.color,
      }))
    );
  }, [agentsList]);

  const filteredSubAgents = useMemo(() => {
    return allSubAgents.filter(sa => {
      const searchMatch = sa.name.toLowerCase().includes(search.toLowerCase()) || 
                          sa.desc.toLowerCase().includes(search.toLowerCase()) ||
                          sa.parentName.toLowerCase().includes(search.toLowerCase());
      if (!searchMatch) return false;

      if (selectedParentFilter && sa.parentId !== selectedParentFilter) return false;
      if (selectedOriginFilter && sa.origin !== selectedOriginFilter) return false;
      if (selectedStatusFilter && sa.status !== selectedStatusFilter) return false;

      return true;
    });
  }, [allSubAgents, search, selectedParentFilter, selectedOriginFilter, selectedStatusFilter]);

  const displaySubAgents = subAgentsExpanded ? filteredSubAgents : filteredSubAgents.slice(0, 3);

  const filteredTemplates = useMemo(() => {
    return STORE_TEMPLATES.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const displayTemplates = discoverExpanded ? filteredTemplates : filteredTemplates.slice(0, 3);

  const handleToggleParentFilter = (val: string) => {
    setSelectedParentFilter(prev => prev === val ? null : val);
    setSubAgentsExpanded(true);
  };
  const handleToggleOriginFilter = (val: string) => {
    setSelectedOriginFilter(prev => prev === val ? null : val);
    setSubAgentsExpanded(true);
  };
  const handleToggleStatusFilter = (val: string) => {
    setSelectedStatusFilter(prev => prev === val ? null : val);
    setSubAgentsExpanded(true);
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveSubAgent = (subAgentData: any) => {
    onProvisionAgent(subAgentData);
    setEditorMode(null);
    setSelectedSubAgent(null);
    setEditorTemplate(null);
  };

  const handleDeleteSubAgent = (id: string, parentId: string) => {
    agentsList.forEach(parent => {
      if (parent.id === parentId) {
        parent.subAgents = (parent.subAgents || []).filter((sa: any) => sa.id !== id);
      }
    });
    setEditorMode(null);
    setSelectedSubAgent(null);
    setEditorTemplate(null);
    showToast(`Deleted sub-agent: ${id}`);
  };

  const handleStatusTransition = (id: string, parentId: string, transition: "request_validation" | "approve" | "return") => {
    agentsList.forEach(parent => {
      if (parent.id === parentId) {
        parent.subAgents = (parent.subAgents || []).map((sa: any) => {
          if (sa.id === id) {
            let nextStatus = sa.status;
            if (transition === "request_validation") nextStatus = "review";
            else if (transition === "approve") nextStatus = "validated";
            else if (transition === "return") nextStatus = "sandbox";
            return { ...sa, status: nextStatus };
          }
          return sa;
        });
      }
    });
    setEditorMode(null);
    setSelectedSubAgent(null);
    setEditorTemplate(null);
    showToast(`Sub-agent transitioned via: ${transition}`);
  };

  if (editorMode) {
    return (
      <AgentEditor 
        mode={editorMode}
        subAgent={selectedSubAgent}
        template={editorTemplate}
        previewRole={previewRole}
        onClose={() => {
          setEditorMode(null);
          setSelectedSubAgent(null);
          setEditorTemplate(null);
        }}
        onSave={handleSaveSubAgent}
        onDelete={handleDeleteSubAgent}
        onStatusTransition={handleStatusTransition}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.pageBg, fontFamily: "Manrope, sans-serif" }}>
      {/* toast notifications */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 100, background: "#1f2937", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13.5, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between", 
        padding: "16px 32px", 
        borderBottom: `1px solid ${C.border}`, 
        background: C.card, 
        position: "sticky", 
        top: 0, 
        zIndex: 40, 
        minHeight: 70 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text3, padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600 }}>
            ← Back to chat
          </button>
          <div style={{ width: 1, height: 24, background: C.border }} />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: C.text1, margin: 0 }}>Agent Store</h1>
            <p style={{ fontSize: 12, color: C.text4, margin: 0 }}>Extend your pipeline with governed sub-agents</p>
          </div>
        </div>

        {/* Preview as toggle */}
        <div style={{ position: "relative" }}>
          <button 
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6, 
              padding: "6px 12px", 
              borderRadius: 20, 
              border: `1.5px dashed ${C.brand}`, 
              background: "transparent", 
              color: C.text1, 
              fontSize: 12, 
              fontWeight: 600, 
              cursor: "pointer" 
            }}
          >
            <span style={{ color: C.brand }}>⊙</span> Preview as: {previewRole === "scientist" ? "Clinical Scientist" : "Workspace Admin"} ▾
          </button>
          {showRoleDropdown && (
            <div style={{ 
              position: "absolute", 
              right: 0, 
              top: "100%", 
              marginTop: 6, 
              background: C.card, 
              border: `1px solid ${C.border}`, 
              borderRadius: 8, 
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)", 
              zIndex: 50, 
              width: 180,
              display: "flex",
              flexDirection: "column",
              padding: 4
            }}>
              <button 
                onClick={() => { setPreviewRole("scientist"); setShowRoleDropdown(false); }}
                style={{ 
                  padding: "8px 12px", 
                  textAlign: "left", 
                  background: previewRole === "scientist" ? C.border : "transparent", 
                  border: "none", 
                  color: C.text1, 
                  fontSize: 12, 
                  borderRadius: 6, 
                  cursor: "pointer",
                  fontWeight: previewRole === "scientist" ? 600 : 400
                }}
              >
                Clinical Scientist
              </button>
              <button 
                onClick={() => { setPreviewRole("admin"); setShowRoleDropdown(false); }}
                style={{ 
                  padding: "8px 12px", 
                  textAlign: "left", 
                  background: previewRole === "admin" ? C.border : "transparent", 
                  border: "none", 
                  color: C.text1, 
                  fontSize: 12, 
                  borderRadius: 6, 
                  cursor: "pointer",
                  fontWeight: previewRole === "admin" ? 600 : 400
                }}
              >
                Workspace Admin
              </button>
              <div style={{ borderTop: `1px solid ${C.border}`, margin: "4px 0" }} />
              <div style={{ fontSize: 10, color: C.text5, padding: "4px 8px", lineHeight: 1.3 }}>
                Demo control — role is normally assigned by your organization.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "32px 40px", 
        maxWidth: 1200, 
        margin: "0 auto", 
        width: "100%", 
        display: "flex", 
        flexDirection: "column", 
        gap: 40 
      }}>
        {/* SECTION 1: My Agents */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.text4, margin: 0 }}>My Agents</h2>
            <span style={{ fontSize: 11, color: C.text5 }}>Core Pipeline Architecture (4+1)</span>
          </div>
        </section>

        <div style={{ height: 1, background: C.border }} />

        {/* SECTION 2: My Sub-Agents */}
        <section style={{ position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.text4, margin: 0 }}>
                My Sub-Agents ({filteredSubAgents.length})
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 9, background: C.card }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke={C.text4} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search sub-agents by name, parent, or capability..."
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13.5, color: C.text1 }} 
                />
              </div>

              {/* Filter Chips Bar */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.text4 }}>Filter / Legend:</span>
                
                {["data", "medical", "phi"].map(p => {
                  const label = p === "data" ? "↳ Data Compiler" : p === "medical" ? "↳ Medical Reviewer" : "↳ PHI Guard";
                  const color = p === "data" ? "#0891b2" : p === "medical" ? "#7c3aed" : "#d97706";
                  const active = selectedParentFilter === p;
                  return (
                    <button 
                      key={p}
                      onClick={() => handleToggleParentFilter(p)}
                      style={{ 
                        fontSize: 10.5, 
                        fontWeight: 600, 
                        padding: "3px 8px", 
                        borderRadius: 6, 
                        border: `1.5px solid ${active ? color : C.border}`, 
                        background: active ? `${color}15` : C.card, 
                        color: active ? color : C.text3,
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}

                <div style={{ width: 1, height: 16, background: C.border }} />

                {["builtin", "store", "custom"].map(o => {
                  const label = o === "builtin" ? "Built-in" : o === "store" ? "From Store" : "Custom";
                  const active = selectedOriginFilter === o;
                  return (
                    <button 
                      key={o}
                      onClick={() => handleToggleOriginFilter(o)}
                      style={{ 
                        fontSize: 10.5, 
                        fontWeight: 600, 
                        padding: "3px 8px", 
                        borderRadius: 6, 
                        border: `1.5px solid ${active ? C.brand : C.border}`, 
                        background: active ? `${C.brand}15` : C.card, 
                        color: active ? C.brand : C.text3,
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}

                <div style={{ width: 1, height: 16, background: C.border }} />

                {["sandbox", "review", "validated"].map(s => {
                  const label = s === "sandbox" ? "Sandbox" : s === "review" ? "In Review" : "Validated";
                  const color = s === "sandbox" ? "#d97706" : s === "review" ? "#2563eb" : "#10b981";
                  const active = selectedStatusFilter === s;
                  return (
                    <button 
                      key={s}
                      onClick={() => handleToggleStatusFilter(s)}
                      style={{ 
                        fontSize: 10.5, 
                        fontWeight: 600, 
                        padding: "3px 8px", 
                        borderRadius: 6, 
                        border: `1.5px solid ${active ? color : C.border}`, 
                        background: active ? `${color}15` : C.card, 
                        color: active ? color : C.text3,
                        cursor: "pointer"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
              gap: 16,
              paddingBottom: (!subAgentsExpanded && filteredSubAgents.length > 3) ? 20 : 0
            }}>
              {displaySubAgents.map(sa => (
                <div 
                  key={sa.id}
                  onClick={() => {
                    setSelectedSubAgent(sa);
                    if (sa.status === "review") {
                      setEditorMode("view");
                    } else if (sa.origin === "builtin") {
                      setEditorMode(previewRole === "admin" ? "edit" : "view");
                    } else {
                      setEditorMode(previewRole === "admin" || sa.status === "sandbox" ? "edit" : "view");
                    }
                  }}
                  style={{ 
                    border: `1.5px solid ${C.border}`, 
                    borderRadius: 14, 
                    padding: 16, 
                    background: C.card, 
                    cursor: "pointer", 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: 10,
                    position: "relative",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = sa.parentColor; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}
                >
                  <div style={{ position: "absolute", top: 12, right: 12 }}>
                    {sa.status === "validated" && sa.origin === "builtin" && (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "2px 6px", borderRadius: 4 }}>
                        Built-in
                      </span>
                    )}
                    {sa.status === "validated" && sa.origin !== "builtin" && (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#d1fae5", color: "#065f46", border: "1px solid #a7f3d0", padding: "2px 6px", borderRadius: 4 }}>
                        Validated
                      </span>
                    )}
                    {sa.status === "review" && (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#dbeafe", color: "#1d4ed8", border: "1px solid #bfdbfe", padding: "2px 6px", borderRadius: 4 }}>
                        In Review
                      </span>
                    )}
                    {sa.status === "sandbox" && (
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", background: "#fef3c7", color: "#d97706", border: "1px solid #fcd34d", padding: "2px 6px", borderRadius: 4 }}>
                        Sandbox
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: sa.parentColor }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text1 }}>{sa.name}</span>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9.5, color: C.text4, fontWeight: 600 }}>↳ {sa.parentName}</span>
                    <span style={{ fontSize: 9.5, background: "#f1f5f9", padding: "1px 4px", borderRadius: 3, color: C.text3, fontWeight: 500 }}>{sa.origin}</span>
                  </div>

                  <p style={{ fontSize: 12, color: C.text4, margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {sa.desc}
                  </p>
                </div>
              ))}
            </div>

            {!subAgentsExpanded && filteredSubAgents.length > 3 && (
              <div style={{ 
                position: "absolute", 
                bottom: 0, 
                left: 0, 
                right: 0, 
                height: 50, 
                background: `linear-gradient(to top, ${C.pageBg}, transparent)`, 
                pointerEvents: "none" 
              }} />
            )}
          </div>

          {filteredSubAgents.length > 3 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button 
                onClick={() => setSubAgentsExpanded(!subAgentsExpanded)}
                style={{ 
                  background: "transparent", 
                  border: `1.5px solid ${C.border}`, 
                  borderRadius: 18, 
                  padding: "6px 16px", 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: C.text2, 
                  cursor: "pointer"
                }}
              >
                {subAgentsExpanded ? "Show less" : `Show all (${filteredSubAgents.length})`}
              </button>
            </div>
          )}
        </section>

        <div style={{ height: 1, background: C.border }} />

        {/* SECTION 3: Discover / Store */}
        <section style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: C.text4, margin: 0 }}>Discover / Store</h2>
            <span style={{ fontSize: 11, color: C.text5 }}>Premade regulatory templates</span>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
              gap: 16,
              paddingBottom: (!discoverExpanded && filteredTemplates.length > 2) ? 20 : 0
            }}>
              {/* "+ New Agent" card */}
              <div 
                onClick={() => {
                  setEditorMode("create");
                  setSelectedSubAgent(null);
                  setEditorTemplate(null);
                }}
                style={{
                  border: `1.5px dashed ${C.brand}`,
                  borderRadius: 14,
                  padding: 16,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  minHeight: 140,
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${C.brand}05`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 24, color: C.brand }}>+</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text1 }}>New Agent</span>
                <span style={{ fontSize: 11, color: C.text4, textAlign: "center" }}>Create a custom governed node</span>
              </div>

              {displayTemplates.map((t, i) => {
                const parentColor = t.parent === "data" ? "#0891b2" : t.parent === "medical" ? "#7c3aed" : "#d97706";
                const isLocked = t.parent === "phi" && previewRole === "scientist";
                return (
                  <div 
                    key={i}
                    onClick={() => {
                      setEditorTemplate(t);
                      setEditorMode("store-preview");
                      setSelectedSubAgent(null);
                    }}
                    style={{ 
                      border: `1.5px solid ${C.border}`, 
                      borderRadius: 14, 
                      padding: 16, 
                      background: C.card, 
                      cursor: "pointer", 
                      display: "flex", 
                      flexDirection: "column", 
                      justifyContent: "space-between", 
                      gap: 12,
                      position: "relative",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = parentColor; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}
                  >
                    {isLocked && (
                      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fca5a5", padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                        🔒 admin required
                      </div>
                    )}

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: parentColor }} />
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text1 }}>{t.name}</span>
                      </div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: parentColor, marginBottom: 8 }}>↳ {t.role}</p>
                      <p style={{ fontSize: 12, color: C.text4, margin: 0, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {t.desc}
                      </p>
                    </div>

                    <button 
                      style={{ 
                        marginTop: 4,
                        alignSelf: "flex-start",
                        padding: "4px 10px", 
                        fontSize: 11.5, 
                        fontWeight: 600, 
                        borderRadius: 6, 
                        border: `1px solid ${C.border}`, 
                        background: "transparent", 
                        color: C.text3, 
                        cursor: "pointer" 
                      }}
                    >
                      View Template
                    </button>
                  </div>
                );
              })}
            </div>

            {!discoverExpanded && filteredTemplates.length > 2 && (
              <div style={{ 
                position: "absolute", 
                bottom: 0, 
                left: 0, 
                right: 0, 
                height: 50, 
                background: `linear-gradient(to top, ${C.pageBg}, transparent)`, 
                pointerEvents: "none" 
              }} />
            )}
          </div>

          {filteredTemplates.length > 2 && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <button 
                onClick={() => setDiscoverExpanded(!discoverExpanded)}
                style={{ 
                  background: "transparent", 
                  border: `1.5px solid ${C.border}`, 
                  borderRadius: 18, 
                  padding: "6px 16px", 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: C.text2, 
                  cursor: "pointer"
                }}
              >
                {discoverExpanded ? "Show less" : `Show all (${filteredTemplates.length})`}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Configure modal overlay */}
      {configuringAgent && (() => {
        const ag = agentsList.find(a => a.id === configuringAgent);
        if (!ag) return null;
        return (
          <ConfigureAgentModal
            ag={ag}
            onClose={() => setConfiguringAgent(null)}
            onSave={(name) => {
              setConfiguringAgent(null);
              showToast(`Applied configuration for ${name}`);
            }}
            previewRole={previewRole}
          />
        );
      })()}
    </div>
  );
}

// ─── User Menu Dropdown ───────────────────────────────────────────
function UserMenu({ onClose, onOpenAgentStore, onOpenModal, onLogout }: {
  onClose: () => void; onOpenAgentStore: () => void;
  onOpenModal?: (m: "upgrade" | "account" | "schedule" | "workspace", tab?: string) => void; onLogout?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    {
      group: "main",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 16 16" style={{ color: C.text3 }}>
          <rect x="1" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" />
          <rect x="10" y="1" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" />
          <rect x="1" y="10" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" />
          <rect x="10" y="10" width="5" height="5" rx="1.2" fill="currentColor" opacity=".9" />
        </svg>
      ),
      label: "Agents",
      onClick: () => { onClose(); onOpenAgentStore(); },
    },
    {
      group: "main",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
        </svg>
      ),
      label: "Account",
      onClick: () => { onClose(); onOpenModal?.("account"); },
    },
    {
      group: "records",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M220,48H56a12,12,0,0,0-12,12V192a12,12,0,0,0,12,12H220a12,12,0,0,0,12-12V60A12,12,0,0,0,220,48Zm-82,96H60V80h78Zm82-16H140V80h80Z" />
        </svg>
      ),
      label: "Compliance Reports",
      onClick: () => { onClose(); onOpenModal?.("workspace", "compliance"); },
    },
    {
      group: "records",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M48,32H16A16,16,0,0,0,0,48V208a16,16,0,0,0,16,48H48a16,16,0,0,0,16-16V48A16,16,0,0,0,48,32Zm0,176H16V48H48ZM240,80H80a16,16,0,0,0-16,16v16a16,16,0,0,0,16,16h80v32H80a16,16,0,0,0-16,16v16a16,16,0,0,0,16,16h80v32a16,16,0,0,0,16,16h32a16,16,0,0,0,16-16V96A16,16,0,0,0,240,80Z" />
        </svg>
      ),
      label: "Audit Logs",
      onClick: () => { onClose(); onOpenModal?.("workspace", "audit"); },
    },
    {
      group: "records",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M212,32H44A20,20,0,0,0,24,52V204a20,20,0,0,0,20,20H212a20,20,0,0,0,20-20V52A20,20,0,0,0,212,32Zm-4,168H48V56H208ZM76,100h80a8,8,0,0,1,0,16H76a8,8,0,0,1,0-16Zm0,32h80a8,8,0,0,1,0,16H76a8,8,0,0,1,0-16Z" />
        </svg>
      ),
      label: "Signature History",
      onClick: () => { onClose(); onOpenModal?.("workspace", "signatures"); },
    },
    {
      group: "knowledge",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M232,64H216V32a8,8,0,0,0-16,0V64H152V32a8,8,0,0,0-16,0V64H88V32a8,8,0,0,0-16,0V64H24A16,16,0,0,0,8,80V216a16,16,0,0,0,16,16H232a16,16,0,0,0,16-16V80A16,16,0,0,0,232,64Zm0,152H24V80H232Zm-40-104a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0v-48A8,8,0,0,1,192,112Zm-64,0a8,8,0,0,1,8,8v48a8,8,0,0,1-16,0v-48A8,8,0,0,1,128,112Z" />
        </svg>
      ),
      label: "FDA/EMA Guidelines",
      onClick: () => { onClose(); onOpenModal?.("workspace", "guidelines"); },
    },
    {
      group: "knowledge",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M144,152a8,8,0,1,1,8,8A8,8,0,0,1,144,152Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,104Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,104Zm-56-40a16,16,0,1,0-16-16A16,16,0,0,0,160,64Z" />
        </svg>
      ),
      label: "HIPAA & Privacy",
      onClick: () => { onClose(); onOpenModal?.("workspace", "hipaa"); },
    },
    {
      group: "knowledge",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M128,24A104,104,0,1,0,232,128,104.12,104.12,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8h-8v16a8,8,0,0,1-16,0v-16h-8a8,8,0,0,1,0-16h8V128a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16h-8v32h8A8,8,0,0,1,144,176ZM116,84a12,12,0,1,1,12,12A12,12,0,0,1,116,84Z" />
        </svg>
      ),
      label: "User Manual",
      onClick: () => { onClose(); onOpenModal?.("workspace", "manual"); },
    },
    {
      group: "knowledge",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text3 }}>
          <path d="M76,100h80a8,8,0,0,1,0,16H76a8,8,0,0,1,0-16Zm0,32h80a8,8,0,0,1,0,16H76a8,8,0,0,1,0-16Z" />
        </svg>
      ),
      label: "Regulatory Docs",
      onClick: () => { onClose(); onOpenModal?.("workspace", "regdocs"); },
    },
  ];

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 mb-2 w-[232px] rounded-xl overflow-hidden"
        style={{ border: `1px solid ${C.border}`, background: C.card, boxShadow: C.shadowMd, zIndex: 50 }}>
        <div className="px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <p className="text-[12px] truncate" style={{ color: C.text4 }}>rayasurya292001@gmail.com</p>
        </div>
        <div className="py-1">
          {items.map((item, idx) => {
            const prevItem = idx > 0 ? items[idx - 1] : null;
            const showDivider = prevItem && prevItem.group !== item.group;
            return (
              <React.Fragment key={item.label}>
                {showDivider && <div style={{ borderTop: `1px solid ${C.border}`, margin: "4px 0" }} />}
                <button type="button" onClick={item.onClick}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-gray-50"
                  style={{ color: C.text2 }}>
                  {item.icon}
                  {item.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => { onClose(); onLogout?.(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-red-50"
            style={{ color: "#dc2626" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
              <path d="M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z" />
            </svg>
            Log Out
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Agent Comms Log Modal ────────────────────────────────────────
// ARCHIVED: AgentCommsLogModal preserved as case-study reference.
function AgentCommsLogModal({ onClose }: { onClose: () => void }) {
  const LANE_ORDER = ["planner", "data", "medical", "phi"];
  const LANE_W = 160;
  const LANE_GAP = 56;
  const HEADER_H = 72;
  const ROW_H = 64;
  const TIMESTAMP_W = 52;
  const SVG_W = LANE_ORDER.length * LANE_W + (LANE_ORDER.length - 1) * LANE_GAP;
  const SVG_H = HEADER_H + COMMS_LOG.length * ROW_H + 32;
  const laneX = (id: string) => {
    const idx = LANE_ORDER.indexOf(id);
    return idx * (LANE_W + LANE_GAP) + LANE_W / 2;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ width: "min(94vw, 820px)", maxHeight: "82vh", borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 32px 100px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke={C.brand} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M9 21V9" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text1, fontFamily: "Manrope, sans-serif", letterSpacing: "-0.01em" }}>Agent Communication Log</span>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.text4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, padding: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>
        {/* sequence diagram */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "24px 28px", scrollbarWidth: "thin", background: "#fafbfc" }}>
          <svg width={SVG_W + TIMESTAMP_W + 16} height={SVG_H} style={{ minWidth: SVG_W + TIMESTAMP_W + 16, fontFamily: "Manrope, sans-serif" }}>
            {/* timestamps */}
            {COMMS_LOG.map((ev, i) => (
              <text key={`t-${i}`} x={4} y={HEADER_H + i * ROW_H + ROW_H / 2 + 5}
                fontSize={12} fontWeight={600} fill={C.text4} fontFamily="ui-monospace, monospace">{ev.t}</text>
            ))}
            <g transform={`translate(${TIMESTAMP_W}, 0)`}>
              {/* lane headers */}
              {LANE_ORDER.map(id => {
                const ag = AGENTS.find(a => a.id === id)!;
                const x = laneX(id);
                return (
                  <g key={id}>
                    <rect x={x - 68} y={6} width={136} height={40} rx={8} fill={`${ag.color}14`} stroke={`${ag.color}50`} strokeWidth={1.5} />
                    <text x={x} y={32} textAnchor="middle" fontSize={13} fontWeight={800} fill={ag.color}>{ag.name}</text>
                    {/* dashed vertical lifeline */}
                    <line x1={x} y1={48} x2={x} y2={SVG_H - 12} stroke={`${ag.color}35`} strokeWidth={2} strokeDasharray="5 5" />
                  </g>
                );
              })}
              {/* message arrows */}
              {COMMS_LOG.map((ev, i) => {
                const fromAg = AGENTS.find(a => a.id === ev.from)!;
                const x1 = laneX(ev.from);
                const x2 = laneX(ev.to);
                const y = HEADER_H + i * ROW_H + ROW_H / 2;
                const dir = x2 > x1 ? 1 : -1;
                const arrowX = x2 - dir * 14;
                const midX = (x1 + x2) / 2;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y} x2={arrowX} y2={y} stroke={fromAg.color} strokeWidth={2.5} strokeLinecap="round" />
                    <polygon points={`${x2},${y} ${arrowX},${y - 6} ${arrowX},${y + 6}`} fill={fromAg.color} />
                    <text x={midX} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.text2}>{ev.label}</text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

function AgentRow({ a, activity, onStopAgent }: { a: typeof AGENTS[0]; activity?: AgentActivity; onStopAgent?: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg transition-colors"
      style={{ background: activity ? `${a.color}0d` : "transparent" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <AgentIcon sides={a.sides} color={a.color} size={20} pulse={!!activity} />
      <p className="text-[13px] font-semibold flex-1 truncate" style={{ color: activity ? C.text1 : C.text2 }}>{a.name}</p>
      {activity && hovered ? (
        <button onClick={() => onStopAgent?.(a.id)} title="Stop agent"
          style={{ width: 20, height: 20, background: "#fee2e2", border: "none", cursor: "pointer", color: "#dc2626", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect x="1" y="1" width="8" height="8" rx="1.5" /></svg>
        </button>
      ) : (
        <AgentStatus agentId={a.id} state={activity} thinkingLabel={a.thinkingLabel} generatingLabel={a.generatingLabel} agentColor={a.color} />
      )}
    </div>
  );
}

function SubAgentRow({ s, parentAgent, parentActivity }: { s: any; parentAgent: any; parentActivity: AgentActivity }) {
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!parentActivity) return;
    const t = setInterval(() => setDotCount(d => (d % 3) + 1), 420);
    return () => clearInterval(t);
  }, [parentActivity]);

  const label = parentActivity === "generating" ? (parentAgent.generatingLabel ?? "generating") : (parentAgent.thinkingLabel ?? "working");
  const isExcluded = s.status !== "validated";

  return (
    <div className="flex items-center gap-1.5 py-0.5 min-w-0 w-full">
      <span className="text-[11px] truncate flex-1" style={{ color: isExcluded ? C.text5 : C.text4 }}>
        {s.name}
        {isExcluded && (
          <span style={{ color: "#d97706", fontSize: 9, marginLeft: 4, fontWeight: 600 }}>
            (Excluded from regulatory outputs)
          </span>
        )}
      </span>
      <span className="text-[10px] font-semibold" style={{ color: parentAgent.color, opacity: 0.9 }}>
        {label}{"·".repeat(dotCount)}
      </span>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────
function Sidebar({
  screen,
  setScreen,
  collapsed,
  setCollapsed,
  activeAgents = {},
  onStopAgent,
  onOpenAgentStore,
  onOpenModal,
  onLogout,
  onSelectHistory,
  agentsList = AGENTS,
  chatHistory = [],
  setChatHistory
}: any) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCommsLog, setShowCommsLog] = useState(false);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 56 : 260 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="h-full flex flex-col relative z-20 overflow-hidden flex-shrink-0"
      style={{ background: C.sidebar, borderRight: `1px solid ${C.border}`, boxShadow: "1px 0 0 rgba(228,234,242,0.5)" }}>
      <div className="flex items-center gap-2.5 flex-shrink-0" style={{ height: 60, borderBottom: `1px solid ${C.border}`, justifyContent: collapsed ? "center" : "flex-start", paddingLeft: collapsed ? 0 : 16, paddingRight: collapsed ? 0 : 16 }}>
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2.5">
          <MetalFx variant="circle" preset="chromatic" theme="light" strength={0.8}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}>
              <span className="text-[13px] font-bold text-white">W</span>
            </div>
          </MetalFx>
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}
                className="text-[15px] font-bold" style={{ color: C.text1, fontFamily: "Manrope, sans-serif" }}>
                Winnow AI
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {!collapsed ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
          className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: "none" }}>
          <div className="mb-4">
            <button onClick={() => setScreen("welcome")}
              onMouseEnter={() => setHovered("new")} onMouseLeave={() => setHovered(null)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-150"
              style={{ background: hovered === "new" ? C.cardHover : "transparent" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text4, flexShrink: 0 }}>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span className="text-[13.5px] font-medium" style={{ color: C.text2 }}>New session</span>
            </button>
            <button onClick={() => onOpenModal?.("schedule")}
              onMouseEnter={() => setHovered("schedule")} onMouseLeave={() => setHovered(null)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-150"
              style={{ background: hovered === "schedule" ? C.cardHover : "transparent" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text4, flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-[13.5px] font-medium" style={{ color: C.text2 }}>Schedule tasks</span>
            </button>
          </div>

          {showCommsLog && <AgentCommsLogModal onClose={() => setShowCommsLog(false)} />}
          <div className="px-3 mb-5">
            <div className="flex items-center justify-between px-1 mb-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: C.text4 }}>Agents</p>
            </div>
            <div className="space-y-0.5">
              {agentsList.map((a: any) => {
                const activity = activeAgents[a.id];
                const subAgents = a.subAgents ?? [];
                const showSubs = !!activity && subAgents.length > 0;
                return (
                  <div key={a.id}>
                    <AgentRow a={a} activity={activity} onStopAgent={onStopAgent} />
                    <AnimatePresence initial={false}>
                      {showSubs && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
                          <div className="ml-7 mb-1 space-y-0.5" style={{ borderLeft: `1.5px solid ${a.color}40`, paddingLeft: 8 }}>
                            {subAgents.map((s: any, si: number) => (
                              <motion.div key={s.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: si * 0.12 }}
                                className="w-full">
                                <SubAgentRow s={s} parentAgent={a} parentActivity={activity} />
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-1 mb-2" style={{ color: C.text4 }}>Recent</p>
            <div className="space-y-0.5">
              {chatHistory.map(h => {
                const isHovered = hovered === `h-${h.id}`;
                return (
                  <button key={h.id}
                    onClick={() => onSelectHistory?.(h.title)}
                    onMouseEnter={() => setHovered(`h-${h.id}`)} onMouseLeave={() => setHovered(null)}
                    className="w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150 relative"
                    style={{ background: isHovered ? C.cardHover : "transparent" }}>
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-[13px] font-medium truncate flex-1" style={{ color: C.text3 }}>{h.title}</p>
                      {h.isSurveillance && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded ml-1 flex-shrink-0 animate-fadeIn"
                          style={{
                            background: h.cadence === "Weekly" ? "#ecfdf5" : "#f1f5f9",
                            color: h.cadence === "Weekly" ? "#047857" : "#475569",
                            border: h.cadence === "Weekly" ? "1px solid #a7f3d0" : "1px solid #cbd5e1"
                          }}>
                          {h.cadence}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[11px]" style={{ color: C.text5 }}>{h.date}</p>
                      {h.isSurveillance && h.isUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        /* Collapsed icon view */
        <div className="flex-1 flex flex-col items-center py-4 gap-2" style={{ overflow: "auto", scrollbarWidth: "none" }}>
          <button onClick={() => setScreen("welcome")}
            onMouseEnter={() => setHovered("new")} onMouseLeave={() => setHovered(null)}
            title="New session"
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
            style={{ background: hovered === "new" ? C.cardHover : "transparent" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text3 }}>
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>

          <button onClick={() => onOpenModal?.("schedule")}
            onMouseEnter={() => setHovered("schedule")} onMouseLeave={() => setHovered(null)}
            title="Schedule tasks"
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
            style={{ background: hovered === "schedule" ? C.cardHover : "transparent" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.text3 }}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </button>

          <div style={{ width: 24, height: "1px", background: C.border, margin: "4px 0" }} />

          {agentsList.slice(0, 2).map((a: any) => (
            <button key={a.id} title={a.name}
              className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
              style={{ background: activeAgents[a.id] ? `${a.color}20` : "transparent", color: a.color }}>
              <AgentIcon sides={a.sides} color={a.color} size={16} />
            </button>
          ))}
        </div>
      )}

      {!collapsed ? (
        <div className="px-3 pb-3 pt-2 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="upgrade-ring w-full">
            <button onClick={() => onOpenModal?.("upgrade")} className="w-full flex items-center justify-center px-3 py-2 rounded-xl text-[12.5px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)" }}>
              View plans
            </button>
          </div>
          <div className="relative">
            <AnimatePresence>
              {menuOpen && (
                <UserMenu
                  onClose={() => setMenuOpen(false)}
                  onOpenAgentStore={onOpenAgentStore ?? (() => {})}
                  onOpenModal={onOpenModal}
                  onLogout={onLogout}
                />
              )}
            </AnimatePresence>
            <button onClick={() => setMenuOpen(o => !o)}
              className="w-full flex items-center gap-2.5 px-1 py-1 rounded-xl transition-colors hover:bg-gray-50">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{ background: C.cardHover, color: C.text3 }}>R</div>
              <span className="text-[12.5px] font-medium flex-1 truncate text-left" style={{ color: C.text4 }}>Raya Surya</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}>
                <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"/>
          </svg>
        </button>
      </div>
    </div>
  ) : (
    /* Collapsed footer */
    <div className="flex flex-col gap-2 px-2 pb-3 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
      <button onClick={() => onOpenModal?.("upgrade")} title="View plans"
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
        style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 256 256">
          <path d="M240,120v96a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V120a16,16,0,0,1,16-16h8V88a8,8,0,0,1,16,0v16H192V88a8,8,0,0,1,16,0v16h8A16,16,0,0,1,240,120Zm-32,96V136H48v80ZM80,168a12,12,0,1,0,12,12A12,12,0,0,0,80,168Zm80,0a12,12,0,1,0,12,12A12,12,0,0,0,160,168Z" />
        </svg>
      </button>
      <button onClick={() => setMenuOpen(o => !o)} title="Account"
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors relative"
        style={{ background: C.cardHover }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: C.border, color: C.text3 }}>R</div>
        <AnimatePresence>
          {menuOpen && (
            <UserMenu
              onClose={() => setMenuOpen(false)}
              onOpenAgentStore={onOpenAgentStore ?? (() => {})}
              onOpenModal={onOpenModal}
              onLogout={onLogout}
            />
          )}
        </AnimatePresence>
      </button>
    </div>
  )}
</motion.aside>
  );
}

// ─── File Preview Tile ────────────────────────────────────────────
function FileTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setImgSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
  const label = file.type === "application/pdf" ? "PDF" : file.name.endsWith(".md") ? ".MD" : ext;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }} whileHover="hovered"
      className="relative h-16 w-16 flex-shrink-0 rounded-lg border"
      style={{ borderColor: C.border, background: C.pageBg }}>
      {imgSrc ? (
        <img src={imgSrc} alt={file.name} className="h-full w-full rounded-lg object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg">
          <span className="text-[11px] font-bold" style={{ color: C.text3 }}>{label}</span>
        </div>
      )}
      <motion.button onClick={(e) => { e.stopPropagation(); onRemove(); }}
        aria-label="Remove file"
        variants={{ hovered: { opacity: 1, scale: 1 } }}
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.12 }}
        style={{
          position: "absolute", top: -5, right: -5, width: 16, height: 16,
          borderRadius: "50%", background: "#ffffff", border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.10)",
        }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="7" height="7" viewBox="0 0 12 12" fill="none" stroke={C.text4} strokeWidth="2.5" strokeLinecap="round">
          <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
        </svg>
      </motion.button>
    </motion.div>
  );
}

// ─── Chat Input ───────────────────────────────────────────────────
// Refine a free-text query into a more specific clinical instruction.
function improvePrompt(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return t;
  const core = t.replace(/[.?!]+$/, "");
  const lead = core.charAt(0).toUpperCase() + core.slice(1);
  if (/PRR|95%\s*CI|evidence|cite|disproportionalit/i.test(t)) return lead + ".";
  return `${lead}. Report disproportionality metrics (PRR with 95% CI), grade the evidence strength of each finding, and cite the supporting FAERS and peer-reviewed sources.`;
}

// Compact pill in the input toolbar — an action button or a two-state mode toggle.
function InputOption({ iconPath, label, onClick, active = false, accent = false, disabled = false, title }: {
  iconPath: React.ReactNode; label: string; onClick?: () => void;
  active?: boolean; accent?: boolean; disabled?: boolean; title?: string;
}) {
  const tinted = accent || active;
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0 disabled:opacity-40"
      style={{
        background: tinted ? C.brandSoft : "transparent",
        color: tinted ? C.brandText : C.text3,
        border: `1px solid ${tinted ? "#bbf7d0" : C.border}`,
      }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">{iconPath}</svg>
      {label}
    </button>
  );
}

function ChatInputBar({ onSend, placeholder = "Ask a follow-up question...", compact = false, beaming = false, stripped = false, typing = false, onStop }: {
  onSend: (t: string) => void; placeholder?: string; compact?: boolean; beaming?: boolean; stripped?: boolean; typing?: boolean; onStop?: () => void;
}) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [improving, setImproving] = useState(false);
  const [length, setLength] = useState<RespLength>("quick");
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (beaming) return; // ignore submits mid-sweep
    if (!value.trim() && files.length === 0) return;
    onSend(value.trim());
    setValue("");
    setFiles([]);
  };

  const handleImprove = () => {
    if (!value.trim() || improving) return;
    setImproving(true);
    setTimeout(() => {
      setValue(v => improvePrompt(v));
      setImproving(false);
      ref.current?.focus();
    }, 650);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles(prev => [...prev, ...Array.from(incoming)].slice(0, MAX_FILES));
  };

  return (
    <div className="beam-host relative flex w-full flex-col items-start gap-3 p-4 transition-all duration-300 ease-in-out border rounded-[20px]"
      data-beam={beaming ? "true" : "false"}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      style={{
        borderColor: isDragging ? "#059669" : "#E4EAF2",
        borderStyle: isDragging ? "dashed" : "solid",
        borderWidth: isDragging ? "2px" : "1px",
        background: "#FFFFFF",
        boxShadow: "0px 4px 8px rgba(34,38,49,0.08)"
      }}>
      {isRecording && (
        <div className="absolute inset-0 bg-white/95 rounded-[20px] flex items-center justify-center gap-1.5 z-20">
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: scaleY(0.3); }
              50% { transform: scaleY(1); }
            }
            .waveform-bar {
              width: 4px;
              height: 24px;
              background-color: #059669;
              border-radius: 2px;
              animation: bounce 0.8s ease-in-out infinite;
            }
          `}</style>
          <div className="waveform-bar" style={{ animationDelay: "0s" }} />
          <div className="waveform-bar" style={{ animationDelay: "0.15s" }} />
          <div className="waveform-bar" style={{ animationDelay: "0.3s" }} />
          <div className="waveform-bar" style={{ animationDelay: "0.45s" }} />
          <div className="waveform-bar" style={{ animationDelay: "0.6s" }} />
          <span className="text-sm font-semibold text-emerald-700 ml-2">Listening...</span>
        </div>
      )}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "visible" }} className="flex flex-wrap gap-2 w-full pt-1 px-1">
            {files.map((f, i) => (
              <FileTile key={`${f.name}-${i}`} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
            ))}
            {files.length < MAX_FILES && (
              <button onClick={() => addMoreRef.current?.click()}
                className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-2xl font-light transition-colors hover:bg-gray-50"
                style={{ borderColor: C.border, color: C.text5 }}>+</button>
            )}
            <input ref={addMoreRef} multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.md"
              className="hidden" type="file" onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full flex-1">
        <AnimatePresence mode="wait">
          {!value && (
            <motion.span key={placeholder} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="pointer-events-none absolute left-0 top-0 select-none"
              style={{ color: "#9ca3af", fontFamily: "Manrope, sans-serif", fontSize: compact ? 14 : 15, lineHeight: "1.5" }}>
              {placeholder}
            </motion.span>
          )}
        </AnimatePresence>
        <textarea ref={ref} value={value} onChange={e => setValue(e.target.value)} onKeyDown={handleKey}
          rows={1} className="w-full resize-none border-none bg-transparent p-0 focus:outline-none text-black"
          style={{ minHeight: "1.5rem", maxHeight: compact ? "5rem" : "15rem", overflowY: "auto", lineHeight: "1.5",
            fontFamily: "Manrope, sans-serif", fontSize: compact ? 14 : 15,
            // @ts-ignore
            fieldSizing: "content" }} />
      </div>

      <div className="flex w-full items-center justify-between gap-2">
        {!stripped && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button aria-label="Upload files" onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100 flex-shrink-0"
              style={{ color: C.text3 }} type="button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z" />
              </svg>
            </button>
            <input ref={fileInputRef} multiple accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.md"
              className="hidden" type="file" onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />

            <InputOption accent disabled={!value.trim() || improving}
              title="Refine your prompt into a more specific clinical query"
              onClick={handleImprove}
              label={improving ? "Improving…" : "Improve prompt"}
              iconPath={<path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144Z" />} />

            <InputOption active={length === "quick"}
              title={length === "quick" ? "Quick response — click for a detailed report" : "Detailed report — click for a quick answer"}
              onClick={() => setLength(l => l === "quick" ? "detailed" : "quick")}
              label={length === "quick" ? "Quick" : "Detailed"}
              iconPath={<path d="M40,64a8,8,0,0,1,8-8H208a8,8,0,0,1,0,16H48A8,8,0,0,1,40,64Zm8,40H160a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16Zm160,24H48a8,8,0,0,0,0,16H208a8,8,0,0,0,0-16Zm-48,40H48a8,8,0,0,0,0,16H160a8,8,0,0,0,0-16Z" />} />
          </div>
        )}
        {stripped && (
          <button aria-label="Attach file" onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100 flex-shrink-0"
            style={{ color: C.text3 }} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M209.66,122.34a8,8,0,0,1,0,11.32l-82.05,82a56,56,0,0,1-79.2-79.21L147.67,35.73a40,40,0,1,1,56.61,56.55L105,193A24,24,0,1,1,71,159L154.3,74.38A8,8,0,1,1,165.7,85.6L82.39,170.31a8,8,0,1,0,11.27,11.36L192.93,81A24,24,0,1,0,159,47L59.76,147.68a40,40,0,1,0,56.53,56.62l82.06-82A8,8,0,0,1,209.66,122.34Z" />
            </svg>
          </button>
        )}
        <motion.div layout className="flex items-center gap-2">
          <AnimatePresence mode="wait" initial={false}>
            {typing && onStop ? (
              <motion.button
                key="stop"
                aria-label="Stop"
                whileTap={{ scale: 0.92 }}
                onClick={onStop}
                variants={{
                  enter: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 24 } },
                  exit:  { opacity: 0, scale: 0.6, transition: { duration: 0.18, ease: "easeIn" } },
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate="enter"
                exit="exit"
                className="inline-flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" fill="white" />
                </svg>
              </motion.button>
            ) : (value.trim() || files.length > 0) ? (
              <motion.button
                key="send"
                aria-label="Send"
                whileTap={{ scale: 0.92 }}
                onClick={handleSend}
                variants={{
                  enter: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 24 } },
                  exit:  { opacity: 0, scale: 0.6, transition: { duration: 0.18, ease: "easeIn" } },
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate="enter"
                exit="exit"
                className="inline-flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </motion.button>
            ) : (
              <motion.button
                key="voice"
                aria-label="Start voice input"
                onClick={() => {
                  setIsRecording(true);
                  setTimeout(() => {
                    setIsRecording(false);
                    setValue("Are there any new hepatotoxicity signals for Metformin in Q3 2024?");
                  }, 2000);
                }}
                variants={{
                  enter: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 24 } },
                  exit:  { opacity: 0, scale: 0.6, transition: { duration: 0.18, ease: "easeIn" } },
                }}
                initial={{ opacity: 0, scale: 0.6 }}
                animate="enter"
                exit="exit"
                className="inline-flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #059669, #0d9488)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="white">
                  <path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V240a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Flow Components ──────────────────────────────────────────────

function CompoundSelector({ onSelect, locked, selection }: {
  onSelect: (c: string) => void; locked?: boolean; selection?: string;
}) {
  const [query, setQuery] = useState("");

  const compounds = [
    { name: "Ibuprofen",     class: "NSAID" },
    { name: "Pembrolizumab", class: "PD-1 inhibitor" },
    { name: "Metformin",     class: "Biguanide" },
    { name: "Rivaroxaban",   class: "Factor Xa inh." },
    { name: "Atorvastatin",  class: "HMG-CoA reductase inh." },
    { name: "Adalimumab",    class: "TNF-α inhibitor" },
  ];

  const filtered = query
    ? compounds.filter(c => c.name.toLowerCase().includes(query.toLowerCase()) || c.class.toLowerCase().includes(query.toLowerCase()))
    : compounds;

  if (locked && selection) {
    return (
      <motion.div initial={{ opacity: 1 }} className="mt-1">
        <span style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.brandSoft, border: "1px solid #86efac", color: C.brandText, whiteSpace: "nowrap" }}>
          {selection}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="mt-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.card, boxShadow: C.shadowSm }}>
      <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${C.border}` }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}>
          <path d="M229.66,218.34l-50.06-50.07a88.21,88.21,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.31-11.31ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
        </svg>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && filtered[0]) onSelect(filtered[0].name); }}
          placeholder="Search compound..." autoFocus
          className="flex-1 bg-transparent border-none outline-none text-[13.5px]"
          style={{ color: C.text1, fontFamily: "Manrope, sans-serif" }} />
      </div>
      <div className="py-1">
        {filtered.slice(0, 5).map(c => (
          <button key={c.name} onClick={() => onSelect(c.name)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-gray-50">
            <span className="text-[13.5px] font-medium" style={{ color: C.text2 }}>{c.name}</span>
            <span className="text-[12px]" style={{ color: C.text4 }}>{c.class}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function MonthYearPicker({ label, value, onChange }: {
  label: string;
  value: { m: number; y: number } | null;
  onChange: (v: { m: number; y: number }) => void;
}) {
  const mOpts = MONTHS.map((name, i) => ({ label: name, value: i + 1 }));
  const yOpts = YEARS.map(y => ({ label: String(y), value: y }));
  return (
    <div>
      <label className="text-[11.5px] font-medium mb-1.5 block" style={{ color: C.text4 }}>{label}</label>
      <div className="flex gap-1.5">
        <div style={{ flex: 1 }}>
          <CustomSelect
            value={value?.m ?? ""}
            options={[{ label: "Month", value: "" }, ...mOpts]}
            onChange={v => onChange({ m: Number(v), y: value?.y ?? new Date().getFullYear() })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <CustomSelect
            value={value?.y ?? ""}
            options={[{ label: "Year", value: "" }, ...yOpts]}
            onChange={v => onChange({ m: value?.m ?? 1, y: Number(v) })}
          />
        </div>
      </div>
      {value?.m && value?.y && (
        <p className="text-[11px] mt-1 font-medium" style={{ color: C.brand }}>
          {MONTHS[value.m - 1]} {value.y}
        </p>
      )}
    </div>
  );
}

function DateRangePills({ onSelect, locked, selection }: {
  onSelect: (p: string) => void; locked?: boolean; selection?: string;
}) {
  const periods = ["Q3 2024", "Q2 2024", "Full 2024", "Last 2 Years", "Custom"];
  const [showCustom, setShowCustom] = useState(false);
  const [from, setFrom] = useState<{ m: number; y: number } | null>(null);
  const [to, setTo]     = useState<{ m: number; y: number } | null>(null);

  const canApply = !!(from?.m && from?.y && to?.m && to?.y);

  const applyCustom = () => {
    if (!canApply) return;
    const fmt = (v: { m: number; y: number }) => `${MONTHS[v.m - 1]} ${v.y}`;
    onSelect(`${fmt(from!)} – ${fmt(to!)}`);
    setShowCustom(false);
  };

  if (locked && selection) {
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {periods.map(p => (
          <span key={p} style={{
            display: "inline-flex", alignItems: "center",
            padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            whiteSpace: "nowrap",
            background: p === selection || (p === "Custom" && !periods.includes(selection!)) ? C.brandSoft : "transparent",
            border: `1px solid ${p === selection || (p === "Custom" && !periods.includes(selection!)) ? "#86efac" : C.border}`,
            color: p === selection || (p === "Custom" && !periods.includes(selection!)) ? C.brandText : C.text4,
          }}>{p === "Custom" && !periods.slice(0, -1).includes(selection!) ? selection : p}</span>
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
      <div className="flex flex-wrap gap-2">
        {periods.map((p, i) => (
          <motion.button key={p}
            onClick={() => p === "Custom" ? setShowCustom(s => !s) : onSelect(p)}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all flex items-center gap-1.5"
            style={{
              whiteSpace: "nowrap",
              background: (p === "Custom" && showCustom) ? C.pageBg : C.card,
              border: `1px solid ${(p === "Custom" && showCustom) ? C.borderMid : C.border}`,
              color: (p === "Custom" && showCustom) ? C.text1 : C.text2,
            }}
            whileHover={{ borderColor: C.brand, color: C.brand, scale: 1.02 }}>
            {p === "Custom" && (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 256 256">
                <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208ZM136,120a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h24V88a8,8,0,0,1,16,0Z"/>
              </svg>
            )}
            {p}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {showCustom && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="mt-3 rounded-xl" style={{
              background: C.pageBg,
              padding: "16px 18px",
            }}>
              <div className="flex items-center gap-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill={C.text4} viewBox="0 0 256 256">
                  <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32Zm0,176H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V208ZM136,120a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h24V88a8,8,0,0,1,16,0Z"/>
                </svg>
                <span className="text-[13px] font-semibold" style={{ color: C.text1 }}>Custom reporting period</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <MonthYearPicker label="From" value={from} onChange={setFrom} />
                <MonthYearPicker label="To"   value={to}   onChange={setTo}   />
              </div>
              <div className="flex gap-2">
                <motion.button onClick={applyCustom} disabled={!canApply}
                  whileHover={canApply ? { scale: 1.02 } : {}}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: C.brand, color: "#fff" }}>
                  Apply range
                </motion.button>
                <button onClick={() => setShowCustom(false)}
                  className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
                  style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.text3 }}>
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Custom Select (replaces native <select>) ────────────────────
function CustomSelect({ value, options, onChange }: {
  value: string | number;
  options: { label: string; value: string | number }[];
  onChange: (v: string | number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropRect, setDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(o => !o);
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="w-full flex items-center justify-between gap-2 transition-colors"
        style={{
          border: `1px solid ${open ? C.borderMid : C.border}`,
          borderRadius: 8, padding: "5px 10px",
          fontSize: 12, color: C.text1, background: "#fff",
          fontFamily: "Manrope, sans-serif",
        }}>
        <span>{selected?.label ?? "—"}</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}
          xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor"
          viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}>
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
        </motion.svg>
      </button>
      <AnimatePresence>
        {open && dropRect && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: "fixed",
              top: dropRect.top, left: dropRect.left, width: dropRect.width,
              zIndex: 9999,
              background: "#fff", border: `1px solid ${C.border}`,
              borderRadius: 10, overflow: "hidden",
              boxShadow: "0 8px 24px rgba(34,40,49,0.12)",
            }}>
            {options.map((opt, i) => (
              <button key={String(opt.value)} type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                style={{
                  fontSize: 12, fontFamily: "Manrope, sans-serif",
                  color: opt.value === value ? C.brandText : C.text2,
                  background: opt.value === value ? C.brandSoft : "transparent",
                  borderBottom: i < options.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                {opt.label}
                {opt.value === value && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.brand }}>
                    <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z"/>
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PillToggleProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function PillToggle({ label, active, onClick }: PillToggleProps): React.ReactElement {
  return (
    <button onClick={onClick} className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-all"
      style={{ background: active ? C.brandSoft : C.card, border: `1px solid ${active ? "#86efac" : C.border}`, color: active ? C.brandText : C.text3 }}>
      {label}
    </button>
  );
}


function getAnalysisTypeDefaults(type: "signal" | "cohort" | "genomics" | "benefit-risk" | "literature"): Partial<AnalysisState> {
  switch (type) {
    case "signal":
      return {
        analysisType: "signal",
        science: { sources: ["faers", "eudravigilance"] },
        categories: ["Hepatobiliary / Hepatotoxicity"]
      };
    case "cohort":
      return {
        analysisType: "cohort",
        science: { sources: ["faers"] },
        categories: []
      };
    case "genomics":
      return {
        analysisType: "genomics",
        science: { sources: ["clinvar", "gnomad", "ensembl"], gene: "CYP2D6" },
        categories: []
      };
    case "benefit-risk":
      return {
        analysisType: "benefit-risk",
        science: { sources: ["faers", "clinicaltrials", "pubmed", "europepmc", "chembl"] },
        categories: []
      };
    case "literature":
      return {
        analysisType: "literature",
        science: { sources: ["europepmc", "pubmed", "biorxiv", "openalex"] },
        categories: []
      };
  }
}

function CategoryPills({ onSelect, locked, selection }: {
  onSelect: (
    cats: string[],
    text: string,
    advanced?: AdvancedParams,
    analysisType?: "signal" | "cohort" | "genomics" | "benefit-risk" | "literature",
    scienceUpdate?: AnalysisState["science"]
  ) => void;
  locked?: boolean;
  selection?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pillsGlow, setPillsGlow] = useState(false);
  const cats = [
    "Signal Detection",
    "Cohort Builder",
    "Genomics Audit",
    "Benefit-Risk Assessment",
    "Literature Review"
  ];

  const typeMap: Record<string, "signal" | "cohort" | "genomics" | "benefit-risk" | "literature"> = {
    "Signal Detection": "signal",
    "Cohort Builder": "cohort",
    "Genomics Audit": "genomics",
    "Benefit-Risk Assessment": "benefit-risk",
    "Literature Review": "literature"
  };

  const toggle = (cat: string) => {
    setSelected([cat]);
  };

  const handleAdvancedClick = () => {
    const catName = selected.length > 0 ? selected[0] : "Signal Detection";
    const type = typeMap[catName];
    const defaults = getAnalysisTypeDefaults(type);
    onSelect(defaults.categories || [], catName, { ...DEFAULT_ADVANCED }, type, defaults.science);
  };

  if (locked && selection) {
    const selCats = selection.split(", ");
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {cats.map(c => {
          const active = selCats.includes(c);
          return (
            <div key={c} className="px-3 py-1.5 rounded-full text-[13px] font-medium"
              style={{
                background: active ? C.brandSoft : "transparent",
                border: `1px solid ${active ? "#86efac" : C.border}`,
                color: active ? C.brandText : C.text4,
              }}>{c}</div>
          );
        })}
      </div>
    );
  }

  const handleRun = () => {
    if (selected.length === 0) return;
    const catName = selected[0];
    const type = typeMap[catName];
    const defaults = getAnalysisTypeDefaults(type);
    onSelect(defaults.categories || [], catName, { ...DEFAULT_ADVANCED }, type, defaults.science);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1">
      <motion.div
        className="flex flex-wrap gap-2 mb-3 rounded-xl p-1 -m-1"
        animate={pillsGlow
          ? { boxShadow: ["0 0 0 0px rgba(5,150,105,0)", "0 0 0 3px rgba(5,150,105,0.35)", "0 0 0 6px rgba(5,150,105,0.15)", "0 0 0 0px rgba(5,150,105,0)"] }
          : { boxShadow: "0 0 0 0px rgba(5,150,105,0)" }}
        transition={{ duration: 0.9, ease: "easeOut" }}>
        {cats.map((cat, i) => {
          const active = selected.includes(cat);
          return (
            <motion.button key={cat} onClick={() => toggle(cat)}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: active ? C.brandSoft : C.card,
                border: `1px solid ${active ? "#86efac" : C.border}`,
                color: active ? C.brandText : C.text2,
              }}>
              {cat}
            </motion.button>
          );
        })}
      </motion.div>
      <div className="flex items-center gap-3">
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.button onClick={handleRun}
              initial={{ opacity: 0, scale: 0.95, y: 4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13.5px] font-semibold text-white transition-all animate-fadeIn"
              style={{ background: "linear-gradient(135deg, #059669, #0d9488)", boxShadow: "0 2px 8px rgba(5,150,105,0.25)" }}>
              Confirm
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
        <button onClick={handleAdvancedClick}
          className="flex items-center gap-1.5 text-[12px] font-medium transition-colors"
          style={{ color: C.text4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 256 256" >
            <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"/>
          </svg>
          Advanced parameters
        </button>
      </div>
    </motion.div>
  );
}

export function estimateRecords(params: AnalysisState): { min: number; max: number } {
  const bases: Record<string, number> = {
    faers: 3000,
    eudravigilance: 2100,
    vigibase: 4500,
    clinicaltrials: 400,
    pubmed: 1200,
    europepmc: 1800,
    biorxiv: 150,
    openalex: 2500,
    clinvar: 600,
    gnomad: 800,
    ensembl: 300,
    chembl: 250,
    opentargets: 200,
    reactome: 180,
    pubchem: 220,
    uniprot: 160,
    string: 140,
    hpa: 120,
    ols: 0
  };

  const science = params.science || {};
  const sources = science.sources || ["faers", "eudravigilance"];
  
  let baseSum = 0;
  sources.forEach((src: string) => {
    baseSum += bases[src.toLowerCase()] || 0;
  });

  if (baseSum === 0) {
    baseSum = bases.faers + bases.eudravigilance;
  }

  let factor = 1.0;
  if (params.advanced) {
    const a = params.advanced;
    if (a.caseDetails?.seriousness?.length) {
      factor *= 0.4;
    }
    if (a.demographics?.ageMin != null || a.demographics?.ageMax != null) {
      factor *= 0.6;
    }
    if (a.demographics?.sex && a.demographics.sex !== "all") {
      factor *= 0.5;
    }
    if (a.geographic?.regions?.length) {
      factor *= 0.5;
    }
    if (a.drugDetails?.routes?.length) {
      factor *= 0.7;
    }
    if (a.caseDetails?.reporterTypes?.length) {
      factor *= 0.7;
    }
  }

  if (science) {
    if (science.gene) factor *= 0.2;
    if (science.clinicalSignificance) factor *= 0.5;
    if (science.peerReviewedOnly) factor *= 0.7;
    if (science.dateFrom || science.dateTo) factor *= 0.6;
  }

  const est = Math.round(baseSum * factor);
  const min = Math.max(1, Math.round(est * 0.85));
  const max = Math.max(1, Math.round(est * 1.15));
  return { min, max };
}

const SOURCE_LABELS: Record<string, string> = {
  faers: "FAERS",
  eudravigilance: "EudraVigilance",
  vigibase: "VigiBase (Locked)",
  clinicaltrials: "ClinicalTrials.gov",
  pubmed: "PubMed",
  europepmc: "Europe PMC",
  biorxiv: "bioRxiv",
  openalex: "OpenAlex",
  clinvar: "ClinVar",
  gnomad: "gnomAD",
  ensembl: "Ensembl",
  chembl: "ChEMBL",
  opentargets: "OpenTargets",
  reactome: "Reactome",
  pubchem: "PubChem",
  uniprot: "UniProt",
  string: "STRING",
  hpa: "Human Protein Atlas",
  ols: "OLS"
};

const DRUGS_LIST = ["Ibuprofen", "Metformin", "Pembrolizumab", "Dupixent", "Rivaroxaban", "Atorvastatin", "Adalimumab", "Codeine"];
const GENES_LIST = ["CYP2D6", "CYP2C19", "CYP3A4", "CYP2C9", "HLA-B", "HLA-A", "SLCO1B1", "TPMT", "DPYD", "UGT1A1"];
const MEDDRA_LIST = [
  "Hepatobiliary / Hepatotoxicity",
  "Cardiac",
  "Renal & urinary",
  "Gastrointestinal / GI haemorrhage",
  "Skin / Facial dermatitis",
  "Immune / irAE",
  "Nervous system",
  "Respiratory / Pneumonitis",
  "Metabolism / Lactic acidosis",
  "Eye / Conjunctivitis",
  "Vascular",
  "Blood & lymphatic"
];

// Canonical per-analysis-type config (title, subtitle suffix, default sources).
// Single source of truth — SOURCES_BY_TYPE and the card title/subtitle derive from this.
const ANALYSIS_TYPES: Record<string, { title: string; subtitleSuffix: string; sources: SourceId[] }> = {
  signal:         { title: "Safety Signal Detection", subtitleSuffix: "FAERS disproportionality analysis", sources: ["faers", "eudravigilance", "vigibase"] },
  cohort:         { title: "Cohort Builder",           subtitleSuffix: "Patient cohort builder",            sources: ["faers", "eudravigilance", "vigibase"] },
  genomics:       { title: "Genomics Audit",           subtitleSuffix: "PGx genomics audit",                sources: ["clinvar", "gnomad", "ensembl", "opentargets", "reactome", "pubchem", "uniprot", "string", "hpa", "chembl", "ols"] },
  "benefit-risk": { title: "Benefit-Risk Profile",     subtitleSuffix: "Benefit-risk assessment",           sources: ["faers", "clinicaltrials", "pubmed", "europepmc", "chembl", "reactome", "opentargets"] },
  literature:     { title: "Literature Review",        subtitleSuffix: "Literature citation search",        sources: ["europepmc", "pubmed", "biorxiv", "openalex"] },
};

const SOURCES_BY_TYPE: Record<string, SourceId[]> = Object.fromEntries(
  Object.entries(ANALYSIS_TYPES).map(([k, v]) => [k, v.sources] as [string, SourceId[]])
);

function TokenPopover({
  isOpen,
  onClose,
  children,
  align = "left"
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; right: number } | null>(null);

  // Measure the anchor (the token wrapper) and reposition on scroll/resize.
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const anchor = sentinelRef.current?.parentElement;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, right: r.right });
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const anchor = sentinelRef.current?.parentElement;
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        anchor && !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen, onClose]);

  // A hidden sentinel keeps us anchored to the token; the popover itself is
  // portaled to <body> so no ancestor's overflow:hidden can clip it.
  const POP_W = 256;
  let left = 0;
  if (rect) {
    const raw = align === "left" ? rect.left : rect.right - POP_W;
    left = Math.min(Math.max(8, raw), window.innerWidth - POP_W - 8);
  }

  return (
    <span ref={sentinelRef} style={{ display: "none" }} aria-hidden="true">
      {isOpen && rect && createPortal(
        <div
          ref={popRef}
          className="bg-white border rounded-lg shadow-xl p-3 text-left"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: rect.top,
            left,
            width: POP_W,
            borderColor: C.border,
            color: C.text1,
            fontFamily: "Manrope, sans-serif"
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </span>
  );
}

function SentenceToken({
  label,
  placeholder,
  isUnset,
  onClick,
  children,
  isOpen,
  onClose,
  disabled
}: {
  label: string | React.ReactNode;
  placeholder: string;
  isUnset: boolean;
  onClick: () => void;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-block mx-0.5 my-0.5">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`px-1.5 py-0.5 rounded font-bold transition-all text-[13.5px] border ${
          disabled ? "opacity-90" : ""
        } ${
          isUnset
            ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100/70"
            : "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70"
        }`}
        style={{
          color: isUnset ? "#b45309" : "#047857",
          borderColor: isUnset ? "#fcd34d" : "#86efac",
          backgroundColor: isUnset ? "#fffbeb" : "#f0fdf4",
          cursor: disabled ? "default" : "pointer"
        }}
      >
        {isUnset ? placeholder : label}
      </button>
      {!disabled && (
        <TokenPopover isOpen={isOpen} onClose={onClose}>
          {children}
        </TokenPopover>
      )}
    </div>
  );
}

function ComboboxPicker({
  value,
  options,
  onChange,
  placeholder = "Search..."
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase())
  );
  
  return (
    <div className="space-y-2">
      <input
        type="text"
        className="w-full px-2 py-1.5 border rounded text-[12.5px] outline-none"
        style={{ borderColor: C.border, color: C.text1 }}
        placeholder={placeholder}
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      <div className="max-h-40 overflow-y-auto space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {filtered.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange(opt);
              setQuery("");
            }}
            className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100 transition-colors"
            style={{
              fontWeight: value === opt ? "bold" : "normal",
              color: value === opt ? C.brandText : C.text2,
              background: value === opt ? C.brandSoft : "transparent"
            }}
          >
            {opt}
          </button>
        ))}
        {query && !filtered.includes(query) && (
          <button
            type="button"
            onClick={() => {
              onChange(query);
              setQuery("");
            }}
            className="w-full text-left px-2 py-1.5 rounded text-[12px] text-emerald-700 hover:bg-emerald-50 font-medium border border-dashed border-emerald-300 mt-1"
          >
            + Add "{query}"
          </button>
        )}
      </div>
    </div>
  );
}

function SourcesPicker({
  selected,
  onChange,
  available
}: {
  selected: SourceId[];
  onChange: (s: SourceId[]) => void;
  available: SourceId[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data Sources</div>
      {available.map(src => {
        const isSelected = selected.includes(src);
        const label = SOURCE_LABELS[src] || src;
        const isVigibase = src === "vigibase";
        
        return (
          <div
            key={src}
            onClick={() => {
              if (isVigibase) {
                window.dispatchEvent(new CustomEvent("winnow_open_modal", { detail: "upgrade" }));
                return;
              }
              if (isSelected) {
                if (selected.length > 1) {
                  onChange(selected.filter(s => s !== src));
                }
              } else {
                onChange([...selected, src]);
              }
            }}
            className="flex items-center justify-between p-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
          >
            <span className={`font-medium flex items-center gap-1.5 ${isVigibase ? "text-gray-400" : "text-gray-700"}`}>
              <input
                type="checkbox"
                checked={isSelected && !isVigibase}
                disabled={isVigibase}
                onChange={() => {}}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              {label}
            </span>
            {isVigibase && (
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Upgrade
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MedDRAPicker({
  value,
  onChange
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = MEDDRA_LIST.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase())
  );
  
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">MedDRA Events</div>
      <input
        type="text"
        className="w-full px-2 py-1.5 border rounded text-[12.5px] outline-none"
        style={{ borderColor: C.border, color: C.text1 }}
        placeholder="Search event..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      <div className="max-h-40 overflow-y-auto space-y-1" style={{ scrollbarWidth: "none" }}>
        {filtered.map(opt => {
          const isSelected = value.includes(opt);
          return (
            <div
              key={opt}
              onClick={() => {
                if (isSelected) {
                  onChange(value.filter(v => v !== opt));
                } else {
                  onChange([...value, opt]);
                }
              }}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span style={{ color: C.text2 }}>{opt}</span>
            </div>
          );
        })}
        {query && !filtered.includes(query) && (
          <button
            type="button"
            onClick={() => {
              if (!value.includes(query)) {
                onChange([...value, query]);
              }
              setQuery("");
            }}
            className="w-full text-left px-2 py-1.5 rounded text-[12px] text-emerald-700 hover:bg-emerald-50 font-medium border border-dashed border-emerald-300 mt-1"
          >
            + Add "{query}"
          </button>
        )}
      </div>
    </div>
  );
}

function SeriousnessMultiPicker({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  const list = ["Death", "Hospitalisation", "Life-threatening", "Disability", "Other serious"];
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Seriousness Criteria</div>
      {list.map(s => {
        const active = selected.includes(s);
        return (
          <div
            key={s}
            onClick={() => {
              if (active) {
                onChange(selected.filter(x => x !== s));
              } else {
                onChange([...selected, s]);
              }
            }}
            className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => {}}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-gray-700">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function SeriousnessPicker({
  value,
  onChange
}: {
  value: string[];
  onChange: (seriousness: string[]) => void;
}) {
  const isSerious = value.includes("Serious");
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onChange(["Serious"])}
        className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
        style={{
          fontWeight: isSerious ? "bold" : "normal",
          color: isSerious ? C.brandText : C.text2,
          background: isSerious ? C.brandSoft : "transparent"
        }}
      >
        Serious cases only
      </button>
      <button
        type="button"
        onClick={() => onChange([])}
        className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
        style={{
          fontWeight: !isSerious ? "bold" : "normal",
          color: !isSerious ? C.brandText : C.text2,
          background: !isSerious ? C.brandSoft : "transparent"
        }}
      >
        All severity levels
      </button>
    </div>
  );
}

function PeriodPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const presets = ["Full 2024", "Q3 2024", "2020–2024", "All-time"];
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Analysis Period</div>
      <div className="space-y-0.5">
        {presets.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
            style={{
              fontWeight: value === p ? "bold" : "normal",
              color: value === p ? C.brandText : C.text2,
              background: value === p ? C.brandSoft : "transparent"
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="border-t pt-2 mt-1">
        <div className="text-[10px] font-bold text-gray-400 mb-1">Custom Period</div>
        <input
          type="text"
          className="w-full px-2 py-1 border rounded text-[12px] outline-none"
          style={{ borderColor: C.border }}
          placeholder="e.g. Q1 2023"
          value={presets.includes(value) ? "" : value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function MethodThresholdPicker({
  method,
  threshold,
  onMethodChange,
  onThresholdChange
}: {
  method: "PRR" | "ROR" | "BCPNN" | "IC";
  threshold: number;
  onMethodChange: (m: "PRR" | "ROR" | "BCPNN" | "IC") => void;
  onThresholdChange: (t: number) => void;
}) {
  const methods: ("PRR" | "ROR" | "BCPNN" | "IC")[] = ["PRR", "ROR", "BCPNN", "IC"];
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Method</div>
        <div className="grid grid-cols-2 gap-1">
          {methods.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onMethodChange(m)}
              className="px-2 py-1 rounded text-[12px] border text-center transition-colors font-semibold"
              style={{
                borderColor: method === m ? C.brand : C.border,
                color: method === m ? C.brandText : C.text2,
                background: method === m ? C.brandSoft : "transparent"
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Threshold</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onThresholdChange(Math.max(0, Math.round((threshold - 0.5) * 10) / 10))}
            className="w-8 h-8 rounded border flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50"
            style={{ borderColor: C.border }}
          >
            -
          </button>
          <span className="text-[13px] font-bold text-center w-12">{threshold.toFixed(1)}</span>
          <button
            type="button"
            onClick={() => onThresholdChange(Math.round((threshold + 0.5) * 10) / 10)}
            className="w-8 h-8 rounded border flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50"
            style={{ borderColor: C.border }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

function DemographicsPicker({
  sex,
  ageMin,
  ageMax,
  onChange
}: {
  sex: "all" | "male" | "female";
  ageMin?: number;
  ageMax?: number;
  onChange: (p: { sex: "all" | "male" | "female"; ageMin?: number; ageMax?: number }) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sex</div>
        <div className="grid grid-cols-3 gap-1">
          {(["all", "male", "female"] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ sex: s, ageMin, ageMax })}
              className="px-2 py-1 rounded text-[11px] border text-center transition-colors font-semibold"
              style={{
                borderColor: sex === s ? C.brand : C.border,
                color: sex === s ? C.brandText : C.text2,
                background: sex === s ? C.brandSoft : "transparent"
              }}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Age Range</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={ageMin ?? ""}
            onChange={e => onChange({ sex, ageMin: e.target.value ? parseInt(e.target.value) : undefined, ageMax })}
            className="w-16 px-2 py-1 border rounded text-[12px]"
            style={{ borderColor: C.border }}
          />
          <span className="text-gray-400 text-[12px]">to</span>
          <input
            type="number"
            placeholder="Max"
            value={ageMax ?? ""}
            onChange={e => onChange({ sex, ageMin, ageMax: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-16 px-2 py-1 border rounded text-[12px]"
            style={{ borderColor: C.border }}
          />
        </div>
      </div>
    </div>
  );
}

function formatDemographicsLabel(sex: "all" | "male" | "female", ageMin?: number, ageMax?: number) {
  if (sex === "all" && ageMin == null && ageMax == null) return "all patient demographics";
  let sexStr = sex === "all" ? "patients" : sex === "female" ? "women" : "men";
  let ageStr = "";
  if (ageMin != null && ageMax != null) {
    ageStr = `${ageMin}–${ageMax}`;
  } else if (ageMin != null) {
    ageStr = `${ageMin}+`;
  } else if (ageMax != null) {
    ageStr = `under ${ageMax}`;
  }
  return ageStr ? `${sexStr} ${ageStr}` : sexStr;
}

function RoutesPicker({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (r: string[]) => void;
}) {
  const list = ["Oral", "IV", "SC", "Topical", "Inhalation", "Unknown"];
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Administration Route</div>
      {list.map(r => {
        const active = selected.includes(r);
        return (
          <div
            key={r}
            onClick={() => {
              if (active) {
                onChange(selected.filter(x => x !== r));
              } else {
                onChange([...selected, r]);
              }
            }}
            className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => {}}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-gray-700">{r}</span>
          </div>
        );
      })}
    </div>
  );
}

function ConcomitantPicker({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (c: string[]) => void;
}) {
  const options = ["no concomitant drugs", "NSAIDs", "beta-blockers", "statins", "aspirin", "gabapentin"];
  const [query, setQuery] = useState("");
  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Concomitant Drugs</div>
      <input
        type="text"
        className="w-full px-2 py-1.5 border rounded text-[12.5px] outline-none"
        style={{ borderColor: C.border, color: C.text1 }}
        placeholder="Search drug..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="max-h-40 overflow-y-auto space-y-1" style={{ scrollbarWidth: "none" }}>
        {filtered.map(opt => {
          const isSelected = selected.includes(opt);
          return (
            <div
              key={opt}
              onClick={() => {
                if (isSelected) {
                  onChange(selected.filter(v => v !== opt));
                } else {
                  onChange([...selected, opt]);
                }
              }}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700">{opt}</span>
            </div>
          );
        })}
        {query && !filtered.includes(query) && (
          <button
            type="button"
            onClick={() => {
              if (!selected.includes(query)) {
                onChange([...selected, query]);
              }
              setQuery("");
            }}
            className="w-full text-left px-2 py-1.5 rounded text-[12px] text-emerald-700 hover:bg-emerald-50 font-medium border border-dashed border-emerald-300 mt-1"
          >
            + Add "{query}"
          </button>
        )}
      </div>
    </div>
  );
}

function ClinSigPicker({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (s: string[]) => void;
}) {
  const list = ["pathogenic", "likely-pathogenic", "benign", "VUS"];
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Clinical Significance</div>
      {list.map(s => {
        const active = selected.includes(s);
        return (
          <div
            key={s}
            onClick={() => {
              if (active) {
                onChange(selected.filter(x => x !== s));
              } else {
                onChange([...selected, s]);
              }
            }}
            className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => {}}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-gray-700">{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function PopulationPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const list = ["all populations", "East Asian", "European", "African", "Latino", "South Asian"];
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Population Ancestry</div>
      {list.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
          style={{
            fontWeight: value === p ? "bold" : "normal",
            color: value === p ? C.brandText : C.text2,
            background: value === p ? C.brandSoft : "transparent"
          }}
        >
          {p === "all populations" ? "All Populations" : p}
        </button>
      ))}
    </div>
  );
}

function PeerReviewedPicker({
  value,
  onChange
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Peer Review Filter</div>
      <button
        type="button"
        onClick={() => onChange(true)}
        className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
        style={{
          fontWeight: value ? "bold" : "normal",
          color: value ? C.brandText : C.text2,
          background: value ? C.brandSoft : "transparent"
        }}
      >
        Peer-reviewed only
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
        style={{
          fontWeight: !value ? "bold" : "normal",
          color: !value ? C.brandText : C.text2,
          background: !value ? C.brandSoft : "transparent"
        }}
      >
        Include preprints
      </button>
    </div>
  );
}

function EditableSentence({
  params,
  onPatchState,
  locked
}: {
  params: AnalysisState;
  onPatchState?: (patch: Partial<AnalysisState>) => void;
  locked?: boolean;
}) {
  const [activeToken, setActiveToken] = useState<string | null>(null);
  
  const type = params.analysisType || "signal";
  const science = params.science || { sources: ["faers", "eudravigilance"] };
  const a = params.advanced || DEFAULT_ADVANCED;
  
  const hasDemographics = a.demographics.sex !== "all" || a.demographics.ageMin != null || a.demographics.ageMax != null;
  const hasReporter = a.caseDetails.reporterTypes.length > 0;
  const hasRoute = a.drugDetails.routes.length > 0;
  const hasRegion = a.geographic.regions.length > 0;
  const hasMinN = a.signalDetection.minN !== 3;
  const hasCI = a.signalDetection.ciLevel !== 0.95;

  const sourcesList = science.sources || [];

  const availableFilters: { id: string; label: string; activate: () => void }[] = [];
  
  if (type === "signal") {
    if (!hasDemographics) {
      availableFilters.push({
        id: "demographics",
        label: "Demographics",
        activate: () => onPatchState?.({ advanced: { ...a, demographics: { sex: "all", ageMin: 65 } } })
      });
    }
    if (!hasReporter) {
      availableFilters.push({
        id: "reporter",
        label: "Reporter Type",
        activate: () => onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, reporterTypes: ["HCP"] } } })
      });
    }
    if (!hasRoute) {
      availableFilters.push({
        id: "route",
        label: "Route of Administration",
        activate: () => onPatchState?.({ advanced: { ...a, drugDetails: { ...a.drugDetails, routes: ["Oral"] } } })
      });
    }
    if (!hasRegion) {
      availableFilters.push({
        id: "region",
        label: "Geographic Region",
        activate: () => onPatchState?.({ advanced: { ...a, geographic: { regions: ["North America"] } } })
      });
    }
    if (!hasMinN) {
      availableFilters.push({
        id: "min-n",
        label: "Minimum Cases (Min N)",
        activate: () => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, minN: 5 } } })
      });
    }
    if (!hasCI) {
      availableFilters.push({
        id: "ci",
        label: "Confidence Interval Level",
        activate: () => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, ciLevel: 0.90 } } })
      });
    }
  } else if (type === "cohort") {
    const hasSeriousness = a.caseDetails.seriousness.length > 0;
    const hasPeriod = !!params.period;
    const hasRegion2 = a.geographic.regions.length > 0;
    if (!hasSeriousness) {
      availableFilters.push({
        id: "seriousness",
        label: "Seriousness Criteria",
        activate: () => onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, seriousness: ["Serious"] } } })
      });
    }
    if (!hasPeriod) {
      availableFilters.push({
        id: "period",
        label: "Analysis Period",
        activate: () => onPatchState?.({ period: "Q3 2024" })
      });
    }
    if (!hasRegion2) {
      availableFilters.push({
        id: "region",
        label: "Geographic Region",
        activate: () => onPatchState?.({ advanced: { ...a, geographic: { regions: ["North America"] } } })
      });
    }
  } else if (type === "genomics") {
    const hasPeriod = !!params.period;
    const hasSources = sourcesList.length > 0;
    if (!hasPeriod) {
      availableFilters.push({
        id: "period",
        label: "Analysis Period",
        activate: () => onPatchState?.({ period: "All-time" })
      });
    }
    if (!hasSources) {
      availableFilters.push({
        id: "sources",
        label: "Genomic Sources",
        activate: () => onPatchState?.({ science: { ...science, sources: ["clinvar", "gnomad"] } })
      });
    }
  } else if (type === "benefit-risk") {
    const hasPeriod = !!params.period;
    const hasRegion3 = a.geographic.regions.length > 0;
    if (!hasPeriod) {
      availableFilters.push({
        id: "period",
        label: "Analysis Period",
        activate: () => onPatchState?.({ period: "2020–2024" })
      });
    }
    if (!hasRegion3) {
      availableFilters.push({
        id: "region",
        label: "Geographic Region",
        activate: () => onPatchState?.({ advanced: { ...a, geographic: { regions: ["North America"] } } })
      });
    }
  } else if (type === "literature") {
    if (!hasDemographics) {
      availableFilters.push({
        id: "demographics",
        label: "Demographics Scope",
        activate: () => onPatchState?.({ advanced: { ...a, demographics: { sex: "all", ageMin: 18 } } })
      });
    }
    if (!hasRegion) {
      availableFilters.push({
        id: "region",
        label: "Geographic Region",
        activate: () => onPatchState?.({ advanced: { ...a, geographic: { regions: ["North America"] } } })
      });
    }
  }

  if (type === "signal") {
    const isSerious = a.caseDetails.seriousness.includes("Serious");
    const seriousText = isSerious ? "serious" : "all severity";
    const categoryText = params.categories.join(" + ");
    
    return (
      <div className="text-[14.5px] leading-[1.8] text-gray-700 font-medium my-2 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
        Analyze{" "}
        <SentenceToken
          label={seriousText}
          placeholder="[choose severity]"
          isUnset={false}
          isOpen={activeToken === "seriousness"}
          onClick={() => setActiveToken("seriousness")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <SeriousnessPicker
            value={a.caseDetails.seriousness}
            onChange={(ser) => onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, seriousness: ser } } })}
          />
        </SentenceToken>{" "}
        <SentenceToken
          label={categoryText}
          placeholder="[choose MedDRA events]"
          isUnset={params.categories.length === 0}
          isOpen={activeToken === "category"}
          onClick={() => setActiveToken("category")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <MedDRAPicker
            value={params.categories}
            onChange={(cats) => onPatchState?.({ categories: cats })}
          />
        </SentenceToken>{" "}
        events in{" "}
        <SentenceToken
          label={params.compound}
          placeholder="[choose compound]"
          isUnset={!params.compound}
          isOpen={activeToken === "compound"}
          onClick={() => setActiveToken("compound")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ComboboxPicker
            value={params.compound}
            options={DRUGS_LIST}
            onChange={(c) => onPatchState?.({ compound: c })}
            placeholder="Search compound..."
          />
        </SentenceToken>{" "}
        across{" "}
        <SentenceToken
          label={sourcesList.map(s => SOURCE_LABELS[s] || s).join(" + ") || "[choose sources]"}
          placeholder="[choose sources]"
          isUnset={sourcesList.length === 0}
          isOpen={activeToken === "sources"}
          onClick={() => setActiveToken("sources")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <SourcesPicker
            selected={sourcesList}
            available={SOURCES_BY_TYPE.signal}
            onChange={(s) => onPatchState?.({ science: { ...science, sources: s } })}
          />
        </SentenceToken>
        , during{" "}
        <SentenceToken
          label={params.period || "[choose period]"}
          placeholder="[choose period]"
          isUnset={!params.period}
          isOpen={activeToken === "period"}
          onClick={() => setActiveToken("period")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <PeriodPicker
            value={params.period}
            onChange={(p) => onPatchState?.({ period: p })}
          />
        </SentenceToken>
        , flagged via{" "}
        <SentenceToken
          label={`${a.signalDetection.method} ≥ ${a.signalDetection.prrThreshold.toFixed(1)}`}
          placeholder="[choose method]"
          isUnset={false}
          isOpen={activeToken === "method"}
          onClick={() => setActiveToken("method")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <MethodThresholdPicker
            method={a.signalDetection.method}
            threshold={a.signalDetection.prrThreshold}
            onMethodChange={(m) => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, method: m } } })}
            onThresholdChange={(t) => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, prrThreshold: t } } })}
          />
        </SentenceToken>
        
        {hasDemographics && (
          <>
            , restricted to{" "}
            <SentenceToken
              label={formatDemographicsLabel(a.demographics.sex, a.demographics.ageMin, a.demographics.ageMax)}
              placeholder="[demographics]"
              isUnset={false}
              isOpen={activeToken === "opt-demographics"}
              onClick={() => setActiveToken("opt-demographics")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <DemographicsPicker
                  sex={a.demographics.sex}
                  ageMin={a.demographics.ageMin}
                  ageMax={a.demographics.ageMax}
                  onChange={(d) => onPatchState?.({ advanced: { ...a, demographics: d } })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, demographics: { sex: "all" } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 mt-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}
        
        {hasReporter && (
          <>
            , reported by{" "}
            <SentenceToken
              label={a.caseDetails.reporterTypes.join(" / ")}
              placeholder="[reporter types]"
              isUnset={false}
              isOpen={activeToken === "opt-reporter"}
              onClick={() => setActiveToken("opt-reporter")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reporter Type</div>
                  {["HCP", "Consumer", "Manufacturer", "Other"].map(r => {
                    const active = a.caseDetails.reporterTypes.includes(r);
                    return (
                      <div
                        key={r}
                        onClick={() => {
                          const nextRep = active ? a.caseDetails.reporterTypes.filter(x => x !== r) : [...a.caseDetails.reporterTypes, r];
                          onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, reporterTypes: nextRep } } });
                        }}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-gray-700">{r}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, reporterTypes: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasRoute && (
          <>
            , administered via{" "}
            <SentenceToken
              label={a.drugDetails.routes.join(" / ")}
              placeholder="[routes]"
              isUnset={false}
              isOpen={activeToken === "opt-routes"}
              onClick={() => setActiveToken("opt-routes")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <RoutesPicker
                  selected={a.drugDetails.routes}
                  onChange={(r) => onPatchState?.({ advanced: { ...a, drugDetails: { ...a.drugDetails, routes: r } } })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, drugDetails: { ...a.drugDetails, routes: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasRegion && (
          <>
            , in region{" "}
            <SentenceToken
              label={a.geographic.regions.join(" / ")}
              placeholder="[regions]"
              isUnset={false}
              isOpen={activeToken === "opt-regions"}
              onClick={() => setActiveToken("opt-regions")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geographic Region</div>
                  {["North America", "Europe", "Asia-Pacific", "Japan", "Rest of World"].map(r => {
                    const active = a.geographic.regions.includes(r);
                    return (
                      <div
                        key={r}
                        onClick={() => {
                          const nextReg = active ? a.geographic.regions.filter(x => x !== r) : [...a.geographic.regions, r];
                          onPatchState?.({ advanced: { ...a, geographic: { regions: nextReg } } });
                        }}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-gray-700">{r}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, geographic: { regions: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasMinN && (
          <>
            , with at least{" "}
            <SentenceToken
              label={`${a.signalDetection.minN} cases`}
              placeholder="[min N]"
              isUnset={false}
              isOpen={activeToken === "opt-minN"}
              onClick={() => setActiveToken("opt-minN")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Minimum Cases (N)</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, minN: Math.max(1, a.signalDetection.minN - 1) } } })}
                      className="w-8 h-8 rounded border flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50"
                      style={{ borderColor: C.border }}
                    >
                      -
                    </button>
                    <span className="text-[13px] font-bold text-center w-12">{a.signalDetection.minN}</span>
                    <button
                      type="button"
                      onClick={() => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, minN: a.signalDetection.minN + 1 } } })}
                      className="w-8 h-8 rounded border flex items-center justify-center font-bold text-gray-600 hover:bg-gray-50"
                      style={{ borderColor: C.border }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, minN: 3 } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasCI && (
          <>
            , at{" "}
            <SentenceToken
              label={`${Math.round(a.signalDetection.ciLevel * 100)}% CI`}
              placeholder="[confidence level]"
              isUnset={false}
              isOpen={activeToken === "opt-ci"}
              onClick={() => setActiveToken("opt-ci")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Confidence Level</div>
                  {[0.90, 0.95, 0.99].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, ciLevel: val } } })}
                      className="w-full text-left px-2 py-1.5 rounded text-[12px] hover:bg-gray-100"
                      style={{
                        fontWeight: a.signalDetection.ciLevel === val ? "bold" : "normal",
                        color: a.signalDetection.ciLevel === val ? C.brandText : C.text2,
                        background: a.signalDetection.ciLevel === val ? C.brandSoft : "transparent"
                      }}
                    >
                      {Math.round(val * 100)}% Confidence Interval
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, signalDetection: { ...a.signalDetection, ciLevel: 0.95 } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        .
        
        {!locked && availableFilters.length > 0 && (
          <div className="relative inline-block mx-1">
            <button
              type="button"
              onClick={() => setActiveToken("add-filter")}
              className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              + add filter
            </button>
            <TokenPopover isOpen={activeToken === "add-filter"} onClose={() => setActiveToken(null)} align="right">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add Filter</div>
                {availableFilters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      f.activate();
                      setActiveToken(null);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </TokenPopover>
          </div>
        )}
      </div>
    );
  }
  
  if (type === "cohort") {
    const demLabel = formatDemographicsLabel(a.demographics.sex, a.demographics.ageMin, a.demographics.ageMax);
    const routesText = a.drugDetails.routes.join(" / ") || "oral route";
    const concomitantText = a.drugDetails.concomitantDrugs.length
      ? `concomitant ${a.drugDetails.concomitantDrugs.join(" + ")}`
      : "no concomitant drugs";
    
    const hasSeriousness = a.caseDetails.seriousness.length > 0;
    const hasPeriod = !!params.period;
    const hasRegion2 = a.geographic.regions.length > 0;

    return (
      <div className="text-[14.5px] leading-[1.8] text-gray-700 font-medium my-2 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
        Build a cohort of{" "}
        <SentenceToken
          label={demLabel}
          placeholder="[choose demographics]"
          isUnset={false}
          isOpen={activeToken === "cohort-demographics"}
          onClick={() => setActiveToken("cohort-demographics")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <DemographicsPicker
            sex={a.demographics.sex}
            ageMin={a.demographics.ageMin}
            ageMax={a.demographics.ageMax}
            onChange={(d) => onPatchState?.({ advanced: { ...a, demographics: d } })}
          />
        </SentenceToken>{" "}
        on{" "}
        <SentenceToken
          label={params.compound}
          placeholder="[choose compound]"
          isUnset={!params.compound}
          isOpen={activeToken === "cohort-compound"}
          onClick={() => setActiveToken("cohort-compound")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ComboboxPicker
            value={params.compound}
            options={DRUGS_LIST}
            onChange={(c) => onPatchState?.({ compound: c })}
            placeholder="Search compound..."
          />
        </SentenceToken>{" "}
        with{" "}
        <SentenceToken
          label={routesText}
          placeholder="[choose routes]"
          isUnset={false}
          isOpen={activeToken === "cohort-routes"}
          onClick={() => setActiveToken("cohort-routes")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <RoutesPicker
            selected={a.drugDetails.routes}
            onChange={(r) => onPatchState?.({ advanced: { ...a, drugDetails: { ...a.drugDetails, routes: r } } })}
          />
        </SentenceToken>
        , and{" "}
        <SentenceToken
          label={concomitantText}
          placeholder="[concomitant drugs]"
          isUnset={false}
          isOpen={activeToken === "cohort-concomitant"}
          onClick={() => setActiveToken("cohort-concomitant")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ConcomitantPicker
            selected={a.drugDetails.concomitantDrugs}
            onChange={(c) => onPatchState?.({ advanced: { ...a, drugDetails: { ...a.drugDetails, concomitantDrugs: c } } })}
          />
        </SentenceToken>

        {hasSeriousness && (
          <>
            , restricted to{" "}
            <SentenceToken
              label={a.caseDetails.seriousness.join(" / ")}
              placeholder="[seriousness]"
              isUnset={false}
              isOpen={activeToken === "opt-seriousness"}
              onClick={() => setActiveToken("opt-seriousness")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <SeriousnessMultiPicker
                  selected={a.caseDetails.seriousness}
                  onChange={(s) => onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, seriousness: s } } })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, caseDetails: { ...a.caseDetails, seriousness: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>{" "}
            events
          </>
        )}

        {hasPeriod && (
          <>
            , during{" "}
            <SentenceToken
              label={params.period}
              placeholder="[period]"
              isUnset={false}
              isOpen={activeToken === "opt-period"}
              onClick={() => setActiveToken("opt-period")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <PeriodPicker
                  value={params.period}
                  onChange={(p) => onPatchState?.({ period: p })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ period: "" });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasRegion2 && (
          <>
            , in region{" "}
            <SentenceToken
              label={a.geographic.regions.join(" / ")}
              placeholder="[regions]"
              isUnset={false}
              isOpen={activeToken === "opt-regions"}
              onClick={() => setActiveToken("opt-regions")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geographic Region</div>
                  {["North America", "Europe", "Asia-Pacific", "Japan", "Rest of World"].map(r => {
                    const active = a.geographic.regions.includes(r);
                    return (
                      <div
                        key={r}
                        onClick={() => {
                          const nextReg = active ? a.geographic.regions.filter(x => x !== r) : [...a.geographic.regions, r];
                          onPatchState?.({ advanced: { ...a, geographic: { regions: nextReg } } });
                        }}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-gray-700">{r}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, geographic: { regions: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        .

        {!locked && availableFilters.length > 0 && (
          <div className="relative inline-block mx-1">
            <button
              type="button"
              onClick={() => setActiveToken("add-filter")}
              className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              + add filter
            </button>
            <TokenPopover isOpen={activeToken === "add-filter"} onClose={() => setActiveToken(null)} align="right">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add Filter</div>
                {availableFilters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      f.activate();
                      setActiveToken(null);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </TokenPopover>
          </div>
        )}
      </div>
    );
  }

  if (type === "genomics") {
    const geneLabel = science.gene || "";
    const popLabel = science.population || "all populations";
    const clinSigLabel = science.clinicalSignificance?.join(" + ") || "pathogenic + likely-pathogenic";
    const hasPeriod = !!params.period;
    const hasSources = sourcesList.length > 0;

    return (
      <div className="text-[14.5px] leading-[1.8] text-gray-700 font-medium my-2 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
        Audit{" "}
        <SentenceToken
          label={geneLabel}
          placeholder="[choose gene]"
          isUnset={!geneLabel}
          isOpen={activeToken === "genomics-gene"}
          onClick={() => setActiveToken("genomics-gene")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ComboboxPicker
            value={geneLabel}
            options={GENES_LIST}
            onChange={(g) => onPatchState?.({ science: { ...science, gene: g } })}
            placeholder="Search gene..."
          />
        </SentenceToken>{" "}
        variants for{" "}
        <SentenceToken
          label={params.compound}
          placeholder="[choose compound]"
          isUnset={!params.compound}
          isOpen={activeToken === "genomics-compound"}
          onClick={() => setActiveToken("genomics-compound")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ComboboxPicker
            value={params.compound}
            options={DRUGS_LIST}
            onChange={(c) => onPatchState?.({ compound: c })}
            placeholder="Search compound..."
          />
        </SentenceToken>{" "}
        across{" "}
        <SentenceToken
          label={popLabel}
          placeholder="[choose population]"
          isUnset={false}
          isOpen={activeToken === "genomics-population"}
          onClick={() => setActiveToken("genomics-population")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <PopulationPicker
            value={popLabel}
            onChange={(p) => onPatchState?.({ science: { ...science, population: p } })}
          />
        </SentenceToken>
        , filtered by{" "}
        <SentenceToken
          label={clinSigLabel}
          placeholder="[clinical significance]"
          isUnset={false}
          isOpen={activeToken === "genomics-clinsig"}
          onClick={() => setActiveToken("genomics-clinsig")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ClinSigPicker
            selected={science.clinicalSignificance || ["pathogenic", "likely-pathogenic"]}
            onChange={(s) => onPatchState?.({ science: { ...science, clinicalSignificance: s } })}
          />
        </SentenceToken>

        {hasPeriod && (
          <>
            , during{" "}
            <SentenceToken
              label={params.period}
              placeholder="[period]"
              isUnset={false}
              isOpen={activeToken === "opt-period"}
              onClick={() => setActiveToken("opt-period")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <PeriodPicker
                  value={params.period}
                  onChange={(p) => onPatchState?.({ period: p })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ period: "" });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasSources && (
          <>
            , using databases{" "}
            <SentenceToken
              label={sourcesList.map(s => SOURCE_LABELS[s] || s).join(" + ")}
              placeholder="[choose sources]"
              isUnset={false}
              isOpen={activeToken === "opt-sources"}
              onClick={() => setActiveToken("opt-sources")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <SourcesPicker
                  selected={sourcesList}
                  available={SOURCES_BY_TYPE.genomics}
                  onChange={(s) => onPatchState?.({ science: { ...science, sources: s } })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ science: { ...science, sources: [] } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        .

        {!locked && availableFilters.length > 0 && (
          <div className="relative inline-block mx-1">
            <button
              type="button"
              onClick={() => setActiveToken("add-filter")}
              className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              + add filter
            </button>
            <TokenPopover isOpen={activeToken === "add-filter"} onClose={() => setActiveToken(null)} align="right">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add Filter</div>
                {availableFilters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      f.activate();
                      setActiveToken(null);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </TokenPopover>
          </div>
        )}
      </div>
    );
  }

  if (type === "benefit-risk") {
    const indLabel = science.indication || "Melanoma";
    const hasPeriod = !!params.period;
    const hasRegion3 = a.geographic.regions.length > 0;

    return (
      <div className="text-[14.5px] leading-[1.8] text-gray-700 font-medium my-2 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
        Compile a benefit-risk profile for{" "}
        <SentenceToken
          label={params.compound}
          placeholder="[choose compound]"
          isUnset={!params.compound}
          isOpen={activeToken === "br-compound"}
          onClick={() => setActiveToken("br-compound")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ComboboxPicker
            value={params.compound}
            options={DRUGS_LIST}
            onChange={(c) => onPatchState?.({ compound: c })}
            placeholder="Search compound..."
          />
        </SentenceToken>{" "}
        in{" "}
        <SentenceToken
          label={indLabel}
          placeholder="[choose indication]"
          isUnset={!science.indication}
          isOpen={activeToken === "br-indication"}
          onClick={() => setActiveToken("br-indication")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <ComboboxPicker
            value={indLabel}
            options={["Melanoma", "Atopic dermatitis", "Rheumatoid arthritis", "Type 2 Diabetes", "Plaque psoriasis", "Hypertension", "Pain"]}
            onChange={(ind) => onPatchState?.({ science: { ...science, indication: ind } })}
            placeholder="Search indication..."
          />
        </SentenceToken>
        , using databases{" "}
        <SentenceToken
          label={sourcesList.map(s => SOURCE_LABELS[s] || s).join(" + ") || "[choose sources]"}
          placeholder="[choose sources]"
          isUnset={sourcesList.length === 0}
          isOpen={activeToken === "br-sources"}
          onClick={() => setActiveToken("br-sources")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <SourcesPicker
            selected={sourcesList}
            available={SOURCES_BY_TYPE["benefit-risk"]}
            onChange={(s) => onPatchState?.({ science: { ...science, sources: s } })}
          />
        </SentenceToken>

        {hasPeriod && (
          <>
            , covering{" "}
            <SentenceToken
              label={params.period}
              placeholder="[period]"
              isUnset={false}
              isOpen={activeToken === "opt-period"}
              onClick={() => setActiveToken("opt-period")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <PeriodPicker
                  value={params.period}
                  onChange={(p) => onPatchState?.({ period: p })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ period: "" });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasRegion3 && (
          <>
            , in region{" "}
            <SentenceToken
              label={a.geographic.regions.join(" / ")}
              placeholder="[regions]"
              isUnset={false}
              isOpen={activeToken === "opt-regions"}
              onClick={() => setActiveToken("opt-regions")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geographic Region</div>
                  {["North America", "Europe", "Asia-Pacific", "Japan", "Rest of World"].map(r => {
                    const active = a.geographic.regions.includes(r);
                    return (
                      <div
                        key={r}
                        onClick={() => {
                          const nextReg = active ? a.geographic.regions.filter(x => x !== r) : [...a.geographic.regions, r];
                          onPatchState?.({ advanced: { ...a, geographic: { regions: nextReg } } });
                        }}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-gray-700">{r}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, geographic: { regions: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        .

        {!locked && availableFilters.length > 0 && (
          <div className="relative inline-block mx-1">
            <button
              type="button"
              onClick={() => setActiveToken("add-filter")}
              className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              + add filter
            </button>
            <TokenPopover isOpen={activeToken === "add-filter"} onClose={() => setActiveToken(null)} align="right">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add Filter</div>
                {availableFilters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      f.activate();
                      setActiveToken(null);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </TokenPopover>
          </div>
        )}
      </div>
    );
  }

  if (type === "literature") {
    const topicLabel = params.compound + (params.categories.length ? ` + ${params.categories.join(" + ")}` : "");
    const peerReviewedText = science.peerReviewedOnly ? "peer-reviewed only" : "include preprints";

    return (
      <div className="text-[14.5px] leading-[1.8] text-gray-700 font-medium my-2 bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
        Review literature on{" "}
        <SentenceToken
          label={topicLabel}
          placeholder="[choose topic]"
          isUnset={!params.compound}
          isOpen={activeToken === "lit-topic"}
          onClick={() => setActiveToken("lit-topic")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <div className="space-y-3">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Compound</div>
              <ComboboxPicker
                value={params.compound}
                options={DRUGS_LIST}
                onChange={(c) => onPatchState?.({ compound: c })}
                placeholder="Search compound..."
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Adverse Events</div>
              <MedDRAPicker
                value={params.categories}
                onChange={(cats) => onPatchState?.({ categories: cats })}
              />
            </div>
          </div>
        </SentenceToken>{" "}
        from{" "}
        <SentenceToken
          label={sourcesList.map(s => SOURCE_LABELS[s] || s).join(" + ") || "[choose sources]"}
          placeholder="[choose sources]"
          isUnset={sourcesList.length === 0}
          isOpen={activeToken === "lit-sources"}
          onClick={() => setActiveToken("lit-sources")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <SourcesPicker
            selected={sourcesList}
            available={SOURCES_BY_TYPE.literature}
            onChange={(s) => onPatchState?.({ science: { ...science, sources: s } })}
          />
        </SentenceToken>
        , during{" "}
        <SentenceToken
          label={params.period || "[choose period]"}
          placeholder="[choose period]"
          isUnset={!params.period}
          isOpen={activeToken === "lit-period"}
          onClick={() => setActiveToken("lit-period")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <PeriodPicker
            value={params.period}
            onChange={(p) => onPatchState?.({ period: p })}
          />
        </SentenceToken>
        , with{" "}
        <SentenceToken
          label={peerReviewedText}
          placeholder="[peer review]"
          isUnset={false}
          isOpen={activeToken === "lit-peer"}
          onClick={() => setActiveToken("lit-peer")}
          onClose={() => setActiveToken(null)}
          disabled={locked}
        >
          <PeerReviewedPicker
            value={!!science.peerReviewedOnly}
            onChange={(v) => onPatchState?.({ science: { ...science, peerReviewedOnly: v } })}
          />
        </SentenceToken>

        {hasDemographics && (
          <>
            , restricted to{" "}
            <SentenceToken
              label={formatDemographicsLabel(a.demographics.sex, a.demographics.ageMin, a.demographics.ageMax)}
              placeholder="[demographics]"
              isUnset={false}
              isOpen={activeToken === "opt-demographics"}
              onClick={() => setActiveToken("opt-demographics")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <DemographicsPicker
                  sex={a.demographics.sex}
                  ageMin={a.demographics.ageMin}
                  ageMax={a.demographics.ageMax}
                  onChange={(d) => onPatchState?.({ advanced: { ...a, demographics: d } })}
                />
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, demographics: { sex: "all" } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 mt-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        {hasRegion && (
          <>
            , in region{" "}
            <SentenceToken
              label={a.geographic.regions.join(" / ")}
              placeholder="[regions]"
              isUnset={false}
              isOpen={activeToken === "opt-regions"}
              onClick={() => setActiveToken("opt-regions")}
              onClose={() => setActiveToken(null)}
              disabled={locked}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Geographic Region</div>
                  {["North America", "Europe", "Asia-Pacific", "Japan", "Rest of World"].map(r => {
                    const active = a.geographic.regions.includes(r);
                    return (
                      <div
                        key={r}
                        onClick={() => {
                          const nextReg = active ? a.geographic.regions.filter(x => x !== r) : [...a.geographic.regions, r];
                          onPatchState?.({ advanced: { ...a, geographic: { regions: nextReg } } });
                        }}
                        className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 cursor-pointer text-[12px]"
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-gray-700">{r}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPatchState?.({ advanced: { ...a, geographic: { regions: [] } } });
                    setActiveToken(null);
                  }}
                  className="w-full text-center py-1 border border-dashed rounded text-[11px] font-bold text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove filter
                </button>
              </div>
            </SentenceToken>
          </>
        )}

        .

        {!locked && availableFilters.length > 0 && (
          <div className="relative inline-block mx-1">
            <button
              type="button"
              onClick={() => setActiveToken("add-filter")}
              className="text-[12px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              + add filter
            </button>
            <TokenPopover isOpen={activeToken === "add-filter"} onClose={() => setActiveToken(null)} align="right">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Add Filter</div>
                {availableFilters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      f.activate();
                      setActiveToken(null);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded text-[12.5px] hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </TokenPopover>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function EditBoard({
  params,
  onPatchState
}: {
  params: AnalysisState;
  onPatchState: (patch: Partial<AnalysisState>) => void;
}) {
  const type = params.analysisType || "signal";
  const science = params.science || { sources: ["faers", "eudravigilance"] };
  const a = params.advanced || DEFAULT_ADVANCED;
  const sourcesList = science.sources || [];

  return (
    <div className="mt-3 p-4 rounded-xl border space-y-4 text-left" style={{ borderColor: C.border, background: C.pageBg }}>
      <div className="text-[12.5px] font-bold text-gray-700 border-b pb-1.5" style={{ borderColor: C.border }}>
        Configure All Parameters
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {type !== "genomics" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Compound / Topic</label>
            <select
              value={params.compound}
              onChange={e => onPatchState({ compound: e.target.value })}
              className="w-full px-2.5 py-1.5 border rounded-lg text-[12.5px] outline-none"
              style={{ borderColor: C.border, background: "#fff" }}
            >
              <option value="">-- Choose Compound --</option>
              {DRUGS_LIST.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
        
        {type === "genomics" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Gene of Interest</label>
            <select
              value={science.gene || ""}
              onChange={e => onPatchState({ science: { ...science, gene: e.target.value } })}
              className="w-full px-2.5 py-1.5 border rounded-lg text-[12.5px] outline-none"
              style={{ borderColor: C.border, background: "#fff" }}
            >
              <option value="">-- Choose Gene --</option>
              {GENES_LIST.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Period</label>
          <input
            type="text"
            value={params.period}
            onChange={e => onPatchState({ period: e.target.value })}
            className="w-full px-2.5 py-1.5 border rounded-lg text-[12.5px] outline-none"
            style={{ borderColor: C.border, background: "#fff" }}
            placeholder="e.g. Q3 2024"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Data Sources</label>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES_BY_TYPE[type]?.map(src => {
            const isSelected = sourcesList.includes(src);
            const label = SOURCE_LABELS[src] || src;
            const isVigibase = src === "vigibase";
            return (
              <PillToggle
                key={src}
                label={label + (isVigibase ? " 🔒" : "")}
                active={isSelected && !isVigibase}
                onClick={() => {
                  if (isVigibase) {
                    window.dispatchEvent(new CustomEvent("winnow_open_modal", { detail: "upgrade" }));
                    return;
                  }
                  if (isSelected) {
                    if (sourcesList.length > 1) {
                      onPatchState({ science: { ...science, sources: sourcesList.filter(s => s !== src) } });
                    }
                  } else {
                    onPatchState({ science: { ...science, sources: [...sourcesList, src] } });
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {(type === "signal" || type === "literature") && (
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Adverse Events / Focus</label>
          <div className="flex flex-wrap gap-1.5">
            {MEDDRA_LIST.map(cat => {
              const active = params.categories.includes(cat);
              return (
                <PillToggle
                  key={cat}
                  label={cat}
                  active={active}
                  onClick={() => {
                    const nextCats = active ? params.categories.filter(c => c !== cat) : [...params.categories, cat];
                    onPatchState({ categories: nextCats });
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3" style={{ borderColor: C.border }}>
        {type === "signal" && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Signal Detection Stats</label>
              <div className="flex items-center gap-3">
                <select
                  value={a.signalDetection.method}
                  onChange={e => onPatchState({ advanced: { ...a, signalDetection: { ...a.signalDetection, method: e.target.value as any } } })}
                  className="px-2 py-1.5 border rounded text-[12.5px] outline-none"
                  style={{ borderColor: C.border }}
                >
                  <option value="PRR">PRR</option>
                  <option value="ROR">ROR</option>
                  <option value="BCPNN">BCPNN</option>
                  <option value="IC">IC</option>
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-[12px] text-gray-500">Threshold:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={a.signalDetection.prrThreshold}
                    onChange={e => onPatchState({ advanced: { ...a, signalDetection: { ...a.signalDetection, prrThreshold: parseFloat(e.target.value) || 2.0 } } })}
                    className="w-14 px-1.5 py-1 border rounded text-[12.5px]"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Seriousness Scope</label>
              <div className="flex gap-1.5">
                {["Serious", "All"].map(s => {
                  const active = s === "Serious" ? a.caseDetails.seriousness.includes("Serious") : a.caseDetails.seriousness.length === 0;
                  return (
                    <PillToggle
                      key={s}
                      label={s === "Serious" ? "Serious cases only" : "All severities"}
                      active={active}
                      onClick={() => onPatchState({ advanced: { ...a, caseDetails: { ...a.caseDetails, seriousness: s === "Serious" ? ["Serious"] : [] } } })}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}

        {type === "genomics" && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Clinical Significance</label>
              <div className="flex flex-wrap gap-1.5">
                {["pathogenic", "likely-pathogenic", "benign", "VUS"].map(sig => {
                  const active = (science.clinicalSignificance || []).includes(sig);
                  return (
                    <PillToggle
                      key={sig}
                      label={sig}
                      active={active}
                      onClick={() => {
                        const prevSig = science.clinicalSignificance || [];
                        const nextSig = active ? prevSig.filter(x => x !== sig) : [...prevSig, sig];
                        onPatchState({ science: { ...science, clinicalSignificance: nextSig } });
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Population Ancestry</label>
              <select
                value={science.population || "all populations"}
                onChange={e => onPatchState({ science: { ...science, population: e.target.value } })}
                className="w-full px-2.5 py-1.5 border rounded-lg text-[12.5px] outline-none"
                style={{ borderColor: C.border }}
              >
                {["all populations", "East Asian", "European", "African", "Latino", "South Asian"].map(p => (
                  <option key={p} value={p}>{p === "all populations" ? "All Populations" : p}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {type === "benefit-risk" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Indication</label>
            <select
              value={science.indication || "Melanoma"}
              onChange={e => onPatchState({ science: { ...science, indication: e.target.value } })}
              className="w-full px-2.5 py-1.5 border rounded-lg text-[12.5px] outline-none"
              style={{ borderColor: C.border }}
            >
              {["Melanoma", "Atopic dermatitis", "Rheumatoid arthritis", "Type 2 Diabetes", "Plaque psoriasis", "Hypertension", "Pain"].map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        )}

        {type === "literature" && (
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Peer Review</label>
            <div className="flex gap-1.5">
              <PillToggle
                label="Peer-reviewed only"
                active={!!science.peerReviewedOnly}
                onClick={() => onPatchState({ science: { ...science, peerReviewedOnly: true } })}
              />
              <PillToggle
                label="Include preprints"
                active={!science.peerReviewedOnly}
                onClick={() => onPatchState({ science: { ...science, peerReviewedOnly: false } })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3" style={{ borderColor: C.border }}>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Geographic Region Scope</label>
          <div className="flex flex-wrap gap-1.5">
            {["North America", "Europe", "Asia-Pacific", "Japan", "Rest of World"].map(r => {
              const active = a.geographic.regions.includes(r);
              return (
                <PillToggle
                  key={r}
                  label={r}
                  active={active}
                  onClick={() => {
                    const nextReg = active ? a.geographic.regions.filter(x => x !== r) : [...a.geographic.regions, r];
                    onPatchState({ advanced: { ...a, geographic: { regions: nextReg } } });
                  }}
                />
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Demographics Filter</label>
          <div className="space-y-2">
            <div className="flex gap-1">
              {["all", "male", "female"].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPatchState({ advanced: { ...a, demographics: { ...a.demographics, sex: s as any } } })}
                  className="px-2 py-0.5 rounded text-[11px] border font-semibold"
                  style={{
                    borderColor: a.demographics.sex === s ? C.brand : C.border,
                    color: a.demographics.sex === s ? C.brandText : C.text2,
                    background: a.demographics.sex === s ? C.brandSoft : "#fff"
                  }}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Age Min"
                value={a.demographics.ageMin ?? ""}
                onChange={e => onPatchState({ advanced: { ...a, demographics: { ...a.demographics, ageMin: e.target.value ? parseInt(e.target.value) : undefined } } })}
                className="w-16 px-1.5 py-0.5 border rounded text-[11px]"
              />
              <span className="text-gray-400 text-[11px]">-</span>
              <input
                type="number"
                placeholder="Age Max"
                value={a.demographics.ageMax ?? ""}
                onChange={e => onPatchState({ advanced: { ...a, demographics: { ...a.demographics, ageMax: e.target.value ? parseInt(e.target.value) : undefined } } })}
                className="w-16 px-1.5 py-0.5 border rounded text-[11px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreAnalysisCard({ params, onRun, onEdit, locked, onPatchState }: {
  params: AnalysisState; onRun: () => void; onEdit?: () => void; locked?: boolean;
  onPatchState?: (patch: Partial<AnalysisState>) => void;
}) {
  const [showEditBoard, setShowEditBoard] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const est = estimateRecords(params);
  const science = params.science || { sources: ["faers", "eudravigilance"] };
  const sourcesList = science.sources || [];
  const type = params.analysisType || "signal";

  const compound = params.compound || "—";
  const title = ANALYSIS_TYPES[type]?.title || "Safety Signal Detection";
  const subtitle = `${compound} · ${ANALYSIS_TYPES[type]?.subtitleSuffix || "FAERS disproportionality analysis"}`;

  const missing: string[] = [];
  if (type === "genomics") {
    if (!science.gene) missing.push("Gene of Interest");
  } else {
    if (!params.compound) missing.push("Compound/Topic");
  }
  if (!sourcesList.length) missing.push("At least one Data Source");

  const handleConfirm = () => {
    if (missing.length > 0) {
      setShowConfirmDialog(true);
    } else {
      onRun();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="mt-1 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.card, boxShadow: C.shadowCard }}>
      <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.border}`, background: C.pageBg }}>
        <p className="text-[13px] font-bold" style={{ color: C.text1 }}>{title}</p>
        <p className="text-[11.5px]" style={{ color: C.text4 }}>{subtitle}</p>
      </div>
      <div className="px-4 py-3 space-y-3">
        {locked ? (
          <div className="flex items-center gap-2 text-[12.5px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            <span className="font-semibold" style={{ color: "#047857" }}>Configuration locked</span>
            <span style={{ color: C.text4 }}>· ~{est.min.toLocaleString()}–{est.max.toLocaleString()} est. records</span>
          </div>
        ) : (
          <>
            <EditableSentence params={params} onPatchState={onPatchState} locked={locked} />

            <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 pt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Est. records: ~{est.min.toLocaleString()} – {est.max.toLocaleString()} (estimated)</span>
            </div>
          </>
        )}

        {showEditBoard && onPatchState && (
          <EditBoard params={params} onPatchState={onPatchState} />
        )}

        {!locked && showConfirmDialog && missing.length > 0 && (
          <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 text-left space-y-2.5 mt-2 animate-fadeIn">
            <p className="text-[13px] font-semibold text-amber-900">
              ⚠️ Some details are missing ({missing.join(", ")}). Continue adding, or start analysis anyway?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white border border-amber-300 text-amber-800 hover:bg-amber-100/30 transition-colors"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDialog(false);
                  onRun();
                }}
                className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                Run anyway
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 pb-4 flex items-center gap-2">
        {!locked && (
          <>
            <motion.button onClick={handleConfirm} whileHover={{ scale: 1.02 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #059669, #0d9488)", boxShadow: "0 2px 8px rgba(5,150,105,0.22)" }}>
              Run Analysis
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.button>
            <button onClick={() => setShowEditBoard(b => !b)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{ border: `1px solid ${C.border}`, color: C.text3, background: "transparent" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 256 256">
                <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/>
              </svg>
              {showEditBoard ? "Collapse" : "Edit"}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Shimmer "thinking" text ─────────────────────────────────────
function ShimmerText({ children, size = 13 }: { children: React.ReactNode; size?: number }) {
  return (
    <span style={{
      display: "inline-block", fontSize: size, fontWeight: 600,
      fontFamily: "Manrope, sans-serif",
      background: "linear-gradient(90deg, #222831 0%, #222831 25%, #8090a6 40%, #e8edf5 50%, #8090a6 60%, #222831 75%, #222831 100%)",
      backgroundSize: "200% 100%",
      WebkitBackgroundClip: "text", backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animation: "gradientSweep 1.5s linear infinite",
    }}>
      {children}
    </span>
  );
}

// ─── Transparent tool-call reasoning ─────────────────────────────
function ToolCallList({ steps }: { steps: ThoughtStep[] }) {
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) =>
        s.kind === "reason" ? (
          <p key={i} className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>{s.text}</p>
        ) : (
          <div key={i}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11.5px] font-medium" style={{ color: C.text4 }}>Calling tool</span>
              <code className="px-2 py-0.5 rounded-md text-[12px]"
                style={{ background: C.codeBg, color: "#e8edf5", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {s.name}
              </code>
            </div>
            {s.args && s.args.length > 0 && (
              <div className="mt-1.5 ml-3 pl-3 space-y-0.5" style={{ borderLeft: `1px solid ${C.border}` }}>
                {s.args.map(a => (
                  <div key={a.label} className="text-[12px] leading-snug" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    <span style={{ color: C.text4 }}>{a.label}:</span>{" "}
                    <span style={{ color: C.text2 }}>{a.value}</span>
                  </div>
                ))}
              </div>
            )}
            {s.result && (
              <div className="mt-1.5 ml-3 flex items-start gap-1.5 text-[12px]" style={{ color: C.brandText }}>
                <span style={{ flexShrink: 0 }}>→</span>
                <span>{s.result}</span>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function ThoughtProcess({ thought }: { thought: AgentThought }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: C.text4 }}>Tool call sequence</p>
        <ToolCallList steps={thought.steps} />
      </div>
    </div>
  );
}

// A single tool call that "runs" then advances (used inside StreamingThought).
function ToolStep({ step, animate, onDone, onTick }: {
  step: Extract<ThoughtStep, { kind: "tool" }>; animate: boolean; onDone?: () => void; onTick?: () => void;
}) {
  const onDoneRef = useRef(onDone); const onTickRef = useRef(onTick);
  useEffect(() => { onDoneRef.current = onDone; onTickRef.current = onTick; });
  useEffect(() => {
    onTickRef.current?.();
    if (!animate) return;
    const id = setTimeout(() => onDoneRef.current?.(), 620);
    return () => clearTimeout(id);
  }, [animate]);
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11.5px] font-medium" style={{ color: C.text4 }}>Calling tool</span>
        <code className="px-2 py-0.5 rounded-md text-[12px]" style={{ background: C.codeBg, color: "#e8edf5", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{step.name}</code>
      </div>
      {step.args && step.args.length > 0 && (
        <div className="mt-1.5 ml-3 pl-3 space-y-0.5" style={{ borderLeft: `1px solid ${C.border}` }}>
          {step.args.map(a => (
            <div key={a.label} className="text-[12px] leading-snug" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              <span style={{ color: C.text4 }}>{a.label}:</span> <span style={{ color: C.text2 }}>{a.value}</span>
            </div>
          ))}
        </div>
      )}
      {step.result && (
        <div className="mt-1.5 ml-3 flex items-start gap-1.5 text-[12px]" style={{ color: C.brandText }}>
          <span style={{ flexShrink: 0 }}>→</span><span>{step.result}</span>
        </div>
      )}
    </div>
  );
}

// Streams one agent's reasoning + tool calls in sequence (animated), then onDone.
function StreamingThought({ thought, animate, onTick, onDone, msPerToken = 85, renderStep }: {
  thought: AgentThought; animate: boolean; onTick?: () => void; onDone?: () => void; msPerToken?: number;
  renderStep?: (node: React.ReactNode, idx: number, isCurrent: boolean, isDone: boolean, step: ThoughtStep) => React.ReactNode;
}) {
  const hasInterp = !!thought.interpretation;
  const total = thought.steps.length + (hasInterp ? 1 : 0);
  const [cur, setCur] = useState(animate ? 0 : total);
  const onDoneRef = useRef(onDone); useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => { if (!animate || cur >= total) onDoneRef.current?.(); }, [cur, total, animate]);
  const advance = () => setCur(c => c + 1);
  const shown = animate ? Math.min(cur + 1, total) : total;
  const stepAt = (i: number) => thought.steps[hasInterp ? i - 1 : i];

  const wrap = (node: React.ReactNode, idx: number, isCur: boolean, s: ThoughtStep) => {
    if (!renderStep) return node;
    const isDoneStep = !animate || idx < cur;
    return renderStep(node, idx, isCur, isDoneStep, s);
  };

  return (
    <div className={renderStep ? "" : "space-y-2"}>
      {Array.from({ length: shown }).map((_, i) => {
        const isCur = animate && i === cur;
        if (hasInterp && i === 0) {
          const interpStep: ThoughtStep = { kind: "reason", text: thought.interpretation! };
          const node = (
            <p key="interp" className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>
              <StreamingResponse text={thought.interpretation!} animate={isCur} msPerToken={msPerToken} onTick={onTick} onDone={isCur ? advance : undefined} />
            </p>
          );
          return wrap(node, i, isCur, interpStep);
        }
        const s = stepAt(i);
        if (s.kind === "reason") {
          const node = (
            <p key={i} className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>
              <StreamingResponse text={s.text} animate={isCur} msPerToken={msPerToken} onTick={onTick} onDone={isCur ? advance : undefined} />
            </p>
          );
          return wrap(node, i, isCur, s);
        }
        const node = <ToolStep key={i} step={s} animate={isCur} onTick={onTick} onDone={isCur ? advance : undefined} />;
        return wrap(node, i, isCur, s);
      })}
    </div>
  );
}

// Compact, expandable "Thought process · N tools" disclosure shown under an
// agent's reply so the user can inspect exactly what it ran.
function ThoughtDisclosure({ thought }: { thought: AgentThought }) {
  const [open, setOpen] = useState(false);
  const toolCount = thought.steps.filter(s => s.kind === "tool").length;
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 py-1 text-left">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}>
          <path d="M176,116a12,12,0,1,1-12-12A12,12,0,0,1,176,116ZM92,104a12,12,0,1,0,12,12A12,12,0,0,0,92,104Zm140,24A104,104,0,0,1,79.12,219.82L45.07,231.17a16,16,0,0,1-20.24-20.24l11.35-34.05A104,104,0,1,1,232,128Zm-16,0A88,88,0,1,0,51.81,172.06a8,8,0,0,1,.66,6.54L40,216,77.4,203.53a8,8,0,0,1,6.54.66A88,88,0,0,0,216,128Z" />
        </svg>
        <span className="text-[12px] font-medium" style={{ color: C.text3 }}>Thought process · {toolCount} tool{toolCount === 1 ? "" : "s"}</span>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}>
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ overflow: "hidden" }}>
            <div className="mt-2 rounded-xl p-3.5" style={{ background: C.pageBg, border: `1px solid ${C.border}` }}>
              <ToolCallList steps={thought.steps} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step Icon (for PlanningTrace) ───────────────────────────────
function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") {
    return (
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 28 }}
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "#059669" }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1.5,6 4.5,9 10.5,3" />
        </svg>
      </motion.div>
    );
  }
  if (status === "active") {
    return (
      <div className="relative w-5 h-5 flex-shrink-0">
        <motion.div className="absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "#059669" }} />
        <div className="relative w-5 h-5 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: "#059669", background: "white" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#059669" }} />
        </div>
      </div>
    );
  }
  return <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 opacity-40" style={{ borderColor: C.borderMid }} />;
}

// ─── Planning Trace (per-agent streamed reasoning + tool calls) ───
// Each agent "thinks" in turn — its reasoning and the tools it calls stream in
// under its own icon. Open while reasoning so you can watch it; auto-collapses
// to a one-line summary when finished. Reports the active agent to the sidebar.
function TimelineTrace({ agents, started, doneArr, readOnly, onTick, onMarkDone }: {
  agents: typeof TRACE_AGENTS;
  started: boolean[]; doneArr: boolean[];
  readOnly: boolean; onTick: () => void; onMarkDone: (i: number) => void;
}) {
  // All agents start collapsed; auto-uncollapse when active, auto-collapse when done.
  const [agentCollapsed, setAgentCollapsed] = useState<boolean[]>(() => agents.map(() => true));
  const toggleAgent = (i: number) => setAgentCollapsed(s => { const n = [...s]; n[i] = !n[i]; return n; });
  // Every agent gets the 100px peek view; "See more" expands fully.
  const [peeking, setPeeking] = useState<boolean[]>(() => agents.map(() => true));
  const togglePeek = (i: number) => setPeeking(s => { const n = [...s]; n[i] = !n[i]; return n; });

  // Auto-uncollapse when an agent becomes active.
  const prevStarted = useRef<boolean[]>(agents.map(() => false));
  useEffect(() => {
    agents.forEach((_, i) => {
      if (started[i] && !prevStarted.current[i]) {
        setAgentCollapsed(s => { const n = [...s]; n[i] = false; return n; });
      }
    });
    prevStarted.current = [...started];
  }, [started]);

  // Auto-collapse to header when an agent finishes.
  const prevDone = useRef<boolean[]>(agents.map(() => false));
  useEffect(() => {
    agents.forEach((_, i) => {
      if (doneArr[i] && !prevDone.current[i]) {
        setTimeout(() => setAgentCollapsed(s => { const n = [...s]; n[i] = true; return n; }), 800);
      }
    });
    prevDone.current = [...doneArr];
  }, [doneArr]);

  return (
    <div className="pt-2 pb-1">
      {agents.map((ta, i) => {
        const agent = AGENTS.find(a => a.id === ta.agentId)!;
        const isStarted = started[i];
        const isDone = doneArr[i];
        const isActive = isStarted && !isDone && !readOnly;
        const isCollapsed = agentCollapsed[i];
        const stepCount = ta.thought.steps.length + (ta.thought.interpretation ? 1 : 0);
        const isLast = i === agents.length - 1;

        return (
          <div key={ta.agentId} className="flex gap-2.5">
            {/* ── Left column: icon node + connector line ── */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ width: 22 }}>
              {/* Agent icon as the timeline node */}
              {!isStarted ? (
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5"
                  style={{ borderColor: C.border, background: C.pageBg }} />
              ) : isDone ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className="flex-shrink-0 mt-0.5">
                  <AgentIcon sides={agent.sides} color={agent.color} size={20} />
                </motion.div>
              ) : (
                <div className="flex-shrink-0 mt-0.5">
                  <AgentIcon sides={agent.sides} color={agent.color} size={20} pulse={true} />
                </div>
              )}
              {/* Connector line to next agent */}
              {!isLast && (
                <div className="flex-1 w-0.5 mt-1 mb-0" style={{
                  background: isStarted ? `${agent.color}40` : C.border,
                  minHeight: 12,
                }} />
              )}
            </div>

            {/* ── Right column: header + content ── */}
            <div className="flex-1 min-w-0 pb-4">
              {!isStarted ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[12px] font-medium" style={{ color: C.text5 }}>{agent.name}</span>
                  <span className="text-[11px]" style={{ color: C.text5 }}>· waiting</span>
                </div>
              ) : (
                <>
                  {/* Header — click to collapse */}
                  <button onClick={() => toggleAgent(i)}
                    className="w-full flex items-center gap-1.5 py-0.5 text-left group">
                    <span className="text-[13px] font-bold" style={{ color: agent.color }}>{agent.name}</span>
                    <span className="text-[11px]" style={{ color: C.text4 }}>{agent.role}</span>
                    {isActive && (
                      <ShimmerText size={10}>working…</ShimmerText>
                    )}
                    {isDone && (
                      <span className="text-[11px] font-medium ml-0.5" style={{ color: C.text5 }}>
                        · {stepCount} steps
                      </span>
                    )}
                    <motion.svg animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.15 }}
                      className="ml-auto opacity-40 group-hover:opacity-70 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor"
                      viewBox="0 0 256 256" style={{ color: C.text3 }}>
                      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
                    </motion.svg>
                  </button>

                  {/* Steps — always mounted for background generation, CSS collapses */}
                  <div style={{
                    maxHeight: isCollapsed ? 0 : 4000,
                    overflow: "hidden",
                    opacity: isCollapsed ? 0 : 1,
                    transition: "max-height 0.3s ease-out, opacity 0.2s",
                  }}>
                    {/* Mini-rail for steps */}
                    <div className="relative mt-1.5" style={{ paddingLeft: 16 }}>
                      <div className="absolute top-0 bottom-0" style={{ left: 4, width: 1, background: `${agent.color}25` }} />
                      {/* Peek / full wrapper — same for every agent */}
                      <div style={{ position: "relative" }}>
                        <div style={{
                          maxHeight: peeking[i] ? 100 : "none",
                          overflow: peeking[i] ? "hidden" : "visible",
                          display: peeking[i] ? "flex" : "block",
                          flexDirection: "column",
                          justifyContent: peeking[i] ? "flex-end" : "unset",
                        }}>
                          <StreamingThought thought={ta.thought} animate={isActive} msPerToken={85}
                            onTick={onTick} onDone={() => onMarkDone(i)}
                            renderStep={(step, idx, isCurrent, isDoneStep, rawStep) => {
                              const subAgent = rawStep.subAgent;
                              const isSub = !!subAgent;
                              return (
                                <div key={idx} className="relative flex flex-col mb-2.5" style={{ paddingLeft: isSub ? 16 : 0 }}>
                                  {/* Step checkpoint dot */}
                                  <div className="absolute flex-shrink-0 flex items-center justify-center"
                                    style={{ left: isSub ? 0 : -16, top: isSub ? 6 : 4, width: 10, height: 10 }}>
                                    {isDoneStep ? (
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: agent.color, opacity: 0.75 }} />
                                    ) : isCurrent ? (
                                      <svg width="10" height="10" viewBox="0 0 24 24"
                                        style={{ animation: "spin 0.9s linear infinite", display: "block" }}>
                                        <circle cx="12" cy="12" r="9" fill="none"
                                          stroke={`${agent.color}30`} strokeWidth="3" />
                                        <circle cx="12" cy="12" r="9" fill="none"
                                          stroke={agent.color} strokeWidth="3"
                                          strokeDasharray="18 39" strokeLinecap="round"
                                          strokeDashoffset="0" />
                                      </svg>
                                    ) : (
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.border }} />
                                    )}
                                  </div>
                                  {isSub && (
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                        style={{ background: `${agent.color}18`, color: agent.color, border: `1px solid ${agent.color}30` }}>
                                        {subAgent.name}
                                      </span>
                                      <span className="text-[10px]" style={{ color: C.text5 }}>
                                        {isDoneStep ? "completed" : "running..."}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex-1">{step}</div>
                                </div>
                              );
                            }}
                          />
                        </div>
                        {peeking[i] && (
                          <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 36,
                            background: "linear-gradient(to top, transparent, #fff)",
                            pointerEvents: "none",
                          }} />
                        )}
                      </div>
                      <button onClick={() => togglePeek(i)}
                        className="flex items-center gap-1 mt-2 text-[11.5px] font-medium transition-colors"
                        style={{ color: peeking[i] ? C.brand : C.text4 }}>
                        {peeking[i] ? "See more" : "Collapse"}
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 256 256"
                          style={{ transform: peeking[i] ? "none" : "rotate(180deg)", transition: "transform 0.15s" }}>
                          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanningTrace({ onComplete, onActiveAgents, onTick, readOnly = false }: {
  onComplete?: () => void; onActiveAgents?: (ids: string[]) => void; onTick?: () => void; readOnly?: boolean;
}) {
  const N = TRACE_AGENTS.length;
  const [started, setStarted] = useState<boolean[]>(() => TRACE_AGENTS.map(() => readOnly));
  const [doneArr, setDoneArr] = useState<boolean[]>(() => TRACE_AGENTS.map(() => readOnly));
  const [collapsed, setCollapsed] = useState(readOnly);
  const [elapsedSec, setElapsedSec] = useState<number | null>(readOnly ? 94.7 : null);

  const onCompleteRef = useRef(onComplete);
  const onActiveRef = useRef(onActiveAgents);
  const onTickRef = useRef(onTick);
  const startTimeRef = useRef<number>(Date.now());
  useEffect(() => { onCompleteRef.current = onComplete; onActiveRef.current = onActiveAgents; onTickRef.current = onTick; });

  // Stagger each agent's start so several reason in parallel.
  useEffect(() => {
    if (readOnly) return;
    startTimeRef.current = Date.now();
    const timers = TRACE_AGENTS.map((ta, i) =>
      setTimeout(() => setStarted(prev => { const n = [...prev]; n[i] = true; return n; }), ta.startMs)
    );
    return () => timers.forEach(clearTimeout);
  }, [readOnly]);

  // Report the SET of agents currently reasoning (started & not done).
  useEffect(() => {
    if (readOnly) return;
    const active = TRACE_AGENTS.filter((_, i) => started[i] && !doneArr[i]).map(t => t.agentId);
    onActiveRef.current?.(active);
  }, [started, doneArr, readOnly]);

  // Fire onComplete exactly once when every agent has finished reasoning.
  const firedRef = useRef(false);
  const allDone = started.every(Boolean) && doneArr.every(Boolean);
  useEffect(() => {
    if (readOnly || firedRef.current || !allDone) return;
    firedRef.current = true;
    setElapsedSec(parseFloat(((Date.now() - startTimeRef.current) / 1000).toFixed(1)));
    onActiveRef.current?.([]);
    const t1 = setTimeout(() => onCompleteRef.current?.(), 500);
    const t2 = setTimeout(() => setCollapsed(true), 1500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [allDone, readOnly]);

  const markDone = (i: number) => setDoneArr(prev => { if (prev[i]) return prev; const n = [...prev]; n[i] = true; return n; });

  const toolCount = TRACE_AGENTS.reduce((a, t) => a + t.thought.steps.filter(s => s.kind === "tool").length, 0);
  const finished = !readOnly && allDone;
  const phiCleared = finished || readOnly;
  const activeNames = TRACE_AGENTS.filter((_, i) => started[i] && !doneArr[i]).map(t => AGENTS.find(a => a.id === t.agentId)?.name).filter(Boolean);
  const headerLabel = activeNames.length === 0 ? "" : activeNames.length === 1 ? `${activeNames[0]} is reasoning…` : `${activeNames.length} agents reasoning…`;

  return (
    <div className="mt-2">
      {/* Collapsible header — shimmers while one or more agents reason. */}
      <button onClick={() => setCollapsed(c => !c)} className="flex w-full items-center gap-2 py-1.5 text-left">
        {!finished && headerLabel
          ? <ShimmerText>{headerLabel}</ShimmerText>
          : (
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold" style={{ color: C.text2 }}>
                Reasoned across {N} agents · {toolCount} tool calls{elapsedSec != null ? ` · ${elapsedSec}s` : ""}
              </span>
              {phiCleared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: "#dcfce7", color: "#15803d" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" />
                  </svg>
                  PHI cleared
                </span>
              )}
            </span>
          )}
        <motion.div className="flex h-5 w-5 flex-shrink-0 items-center justify-center" animate={{ rotate: collapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
          <div className="h-1.5 w-1.5 border-b-2 border-r-2" style={{ borderColor: C.text4, transform: "rotate(45deg)" }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }} style={{ overflow: "hidden" }}>
            <TimelineTrace agents={TRACE_AGENTS} started={started} doneArr={doneArr}
              readOnly={readOnly} onTick={() => onTickRef.current?.()} onMarkDone={markDone} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Signal Table ─────────────────────────────────────────────────
function SignalTableRow({ row, i, isLast }: { row: SignalRow; i: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const levelCfg = {
    strong:   { color: "#dc2626", label: "Strong" },
    moderate: { color: "#d97706", label: "Moderate" },
    weak:     { color: "#94a3b8", label: "Weak" },
  };

  // Derive three-component scores based on signal properties
  const scores = {
    strong: { completeness: 88, statistical: 94, biological: 85 },
    moderate: { completeness: 74, statistical: 68, biological: 72 },
    weak: { completeness: 48, statistical: 42, biological: 38 },
  }[row.level] || { completeness: 50, statistical: 50, biological: 50 };

  return (
    <div style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.1, duration: 0.25 }}
        onClick={() => setExpanded(!expanded)}
        className="grid px-4 py-3 items-center hover:bg-slate-50 cursor-pointer select-none transition-colors duration-150"
        style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1.5fr" }}
      >
        <span className="text-[13.5px] font-semibold flex items-center gap-1.5" style={{ color: C.text2 }}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            fill="currentColor"
            viewBox="0 0 256 256"
            style={{
              color: C.text4,
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 0.15s",
              flexShrink: 0
            }}
          >
            <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
          </svg>
          {row.event}
        </span>
        <span className="text-[13.5px] font-bold" style={{ color: C.text1 }}>{row.prr}</span>
        <span className="text-[12.5px]" style={{ color: C.text4 }}>{row.ci}</span>
        <span className="text-[13.5px]" style={{ color: C.text2 }}>{row.n.toLocaleString()}</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: levelCfg[row.level].color }} />
          <span className="text-[12.5px] font-medium" style={{ color: levelCfg[row.level].color }}>
            {levelCfg[row.level].label}
          </span>
        </div>
      </motion.div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden", background: "#f8fafc" }}
          >
            <div className="px-6 py-4 flex flex-col gap-3.5" style={{ borderTop: `1px solid ${C.border}` }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Statistical Indices</h4>
                  <div className="text-[12px] text-slate-600 space-y-1">
                    <div>Proportional Reporting Ratio (PRR): <strong>{row.prr}</strong></div>
                    <div>Reporting Odds Ratio (ROR): <strong>{row.ror || "N/A"}</strong></div>
                    <div>Yates Chi-Square (χ²): <strong>{row.chi2 || "N/A"}</strong></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Signal Confidence</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10.5px] font-medium text-slate-600 mb-0.5">
                        <span>Source Completeness</span>
                        <span>{scores.completeness}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${scores.completeness}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10.5px] font-medium text-slate-600 mb-0.5">
                        <span>Statistical Strength</span>
                        <span>{scores.statistical}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-cyan-600 h-full rounded-full" style={{ width: `${scores.statistical}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10.5px] font-medium text-slate-600 mb-0.5">
                        <span>Biological Plausibility</span>
                        <span>{scores.biological}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                        <div className="bg-violet-600 h-full rounded-full" style={{ width: `${scores.biological}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SignalTable({ rows }: { rows: SignalRow[] }) {
  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${C.border}` }}>
      <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1.5fr", background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
        {["Adverse Event", "PRR", "95% CI", "n", "Signal"].map(h => (
          <span key={h} className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <SignalTableRow key={row.event} row={row} i={i} isLast={i === rows.length - 1} />
      ))}
    </div>
  );
}

// ─── Export Actions ───────────────────────────────────────────────
// ─── Reference Item ───────────────────────────────────────────────
function ReferenceItem({ item, isLast, highlight, refEl }: {
  item: Reference; isLast: boolean; highlight?: boolean;
  refEl?: (el: HTMLDivElement | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = C.evidence[item.evidenceStrength];

  const scores = {
    "very-high": { completeness: 95, statistical: 98, biological: 90 },
    "high":      { completeness: 85, statistical: 88, biological: 80 },
    "moderate":  { completeness: 70, statistical: 72, biological: 75 },
    "low":       { completeness: 45, statistical: 48, biological: 40 },
  }[item.evidenceStrength] || { completeness: 50, statistical: 50, biological: 50 };

  return (
    <motion.div ref={refEl} className="py-3.5 -mx-2 px-2 rounded-lg"
      animate={{ backgroundColor: highlight ? cfg.surface : "rgba(0,0,0,0)" }}
      transition={{ duration: 0.35 }}
      style={{ borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <div className="flex items-start gap-3">
        <span className="text-[13px] font-bold flex-shrink-0 w-5 text-right mt-0.5" style={{ color: C.text4 }}>{item.n}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-medium leading-snug mb-1.5" style={{ color: "#0369a1" }}>
            {item.title}
          </p>
          <p className="text-[12px] mb-2" style={{ color: C.text4 }}>
            <em>{item.journal}</em> · {item.authors} · {item.year}
          </p>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
              <span className="text-[11.5px] font-semibold" style={{ color: cfg.text }}>{cfg.label}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded font-medium"
              style={{ background: C.pageBg, border: `1px solid ${C.border}`, color: C.text3 }}>
              {item.studyType}
            </span>
          </div>
          {item.evidenceSnapshot && (
            <>
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 mt-2.5 text-[12px] font-medium transition-colors"
                style={{ color: C.text3 }}>
                <motion.svg animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}
                  xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                </motion.svg>
                Evidence breakdown
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mt-2 rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${C.border}`, background: C.pageBg }}>
                    <div className="p-3.5">
                      <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: C.text2 }}>
                        {item.evidenceSnapshot.summary}
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: "Study Design", value: item.evidenceSnapshot.studyDesign },
                          { label: "Population",   value: item.evidenceSnapshot.population },
                        ].map(row => (
                          <div key={row.label} className="flex gap-3">
                            <span className="text-[11.5px] font-semibold w-24 flex-shrink-0 mt-0.5" style={{ color: C.text4 }}>{row.label}</span>
                            <span className="text-[12px]" style={{ color: C.text2 }}>{row.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Confidence Scores progress bars */}
                      <div className="mt-3.5 pt-3 border-t border-gray-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Confidence Scores</span>
                        <div className="space-y-2 max-w-[280px]">
                          <div>
                            <div className="flex justify-between text-[10.5px] font-medium text-slate-600 mb-0.5">
                              <span>Source Completeness</span>
                              <span>{scores.completeness}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${scores.completeness}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10.5px] font-medium text-slate-600 mb-0.5">
                              <span>Statistical Strength</span>
                              <span>{scores.statistical}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                              <div className="bg-cyan-600 h-full rounded-full" style={{ width: `${scores.statistical}%` }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10.5px] font-medium text-slate-600 mb-0.5">
                              <span>Biological Plausibility</span>
                              <span>{scores.biological}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                              <div className="bg-violet-600 h-full rounded-full" style={{ width: `${scores.biological}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Citation chip + inline segment renderer ─────────────────────
function CitationChip({ n, strength, onClick }: {
  n: number; strength: EvidenceStrength; onClick?: () => void;
}) {
  const c = C.evidence[strength];
  return (
    <button onClick={onClick} type="button"
      className="inline-flex items-center justify-center align-top mx-px transition-transform hover:scale-110"
      style={{
        background: c.surface, color: c.text, fontFamily: "Manrope, sans-serif",
        fontSize: 10.5, fontWeight: 600, lineHeight: 1, padding: "2px 5px",
        borderRadius: 6, minWidth: 16, verticalAlign: "super",
      }}>
      {n}
    </button>
  );
}

function InlineSegments({ segs, onCite }: { segs: InlineSeg[]; onCite?: (n: number) => void }) {
  return (
    <>
      {segs.map((s, i) => {
        if (s.t === "bold") return <strong key={i} style={{ color: C.text1, fontWeight: 700 }}>{s.v}</strong>;
        if (s.t === "em") return <em key={i}>{s.v}</em>;
        if (s.t === "cite") return <CitationChip key={i} n={s.ref} strength={s.strength} onClick={() => onCite?.(s.ref)} />;
        return <span key={i}>{s.v}</span>;
      })}
    </>
  );
}

// ─── Streaming report primitives ─────────────────────────────────
// Reveal InlineSeg[] word-by-word (citation chips are atomic), preserving bold/em.

function segUnits(segs: InlineSeg[]): SegUnit[] {
  const units: SegUnit[] = [];
  for (const s of segs) {
    if (s.t === "cite") { units.push({ kind: "cite", ref: s.ref, strength: s.strength }); continue; }
    const style = s.t === "bold" ? "bold" : s.t === "em" ? "em" : "text";
    for (const chunk of s.v.match(/\S+\s*|\s+/g) ?? []) units.push({ kind: "word", word: chunk, style });
  }
  return units;
}

function StreamingInline({ segs, onCite, animate, onDone, onTick, msPerToken = 30 }: {
  segs: InlineSeg[]; onCite?: (n: number) => void; animate: boolean;
  onDone?: () => void; onTick?: () => void; msPerToken?: number;
}) {
  const units = useMemo(() => segUnits(segs), [segs]);
  const [shown, setShown] = useState(animate ? 0 : units.length);
  const onDoneRef = useRef(onDone); const onTickRef = useRef(onTick);
  useEffect(() => { onDoneRef.current = onDone; onTickRef.current = onTick; });
  useEffect(() => {
    if (!animate) { onDoneRef.current?.(); return; }
    if (shown >= units.length) { onDoneRef.current?.(); return; }
    const id = setTimeout(() => { setShown(s => s + 1); onTickRef.current?.(); }, msPerToken);
    return () => clearTimeout(id);
  }, [shown, units.length, animate, msPerToken]);
  return (
    <>
      {units.slice(0, shown).map((u, i) =>
        u.kind === "cite"
          ? <CitationChip key={i} n={u.ref} strength={u.strength} onClick={() => onCite?.(u.ref)} />
          : u.style === "bold" ? <strong key={i} style={{ color: C.text1, fontWeight: 700 }}>{u.word}</strong>
          : u.style === "em" ? <em key={i}>{u.word}</em>
          : <span key={i}>{u.word}</span>
      )}
    </>
  );
}

function StreamBullets({ items, onCite, animate, onComplete, onTick }: {
  items: InlineSeg[][]; onCite?: (n: number) => void; animate: boolean;
  onComplete?: () => void; onTick?: () => void;
}) {
  const [cur, setCur] = useState(animate ? 0 : items.length);
  const onCompleteRef = useRef(onComplete); useEffect(() => { onCompleteRef.current = onComplete; });
  useEffect(() => { if (!animate || cur >= items.length) onCompleteRef.current?.(); }, [cur, items.length, animate]);
  const shown = animate ? Math.min(cur + 1, items.length) : items.length;
  return (
    <ul className="mb-3 space-y-1.5">
      {items.slice(0, shown).map((it, j) => (
        <li key={j} className="flex gap-2.5 text-[14px] leading-relaxed" style={{ color: C.text2 }}>
          <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: C.brand }} />
          <span className="flex-1">
            <StreamingInline segs={it} onCite={onCite} animate={animate && j === cur}
              onDone={animate && j === cur ? () => setCur(c => c + 1) : undefined} onTick={onTick} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function StreamDivider({ animate, onComplete }: { animate: boolean; onComplete?: () => void }) {
  const onCompleteRef = useRef(onComplete); useEffect(() => { onCompleteRef.current = onComplete; });
  useEffect(() => { const id = setTimeout(() => onCompleteRef.current?.(), animate ? 150 : 0); return () => clearTimeout(id); }, [animate]);
  return <hr className="my-4" style={{ border: "none", borderTop: `1px solid ${C.border}` }} />;
}

function StreamSignalTable({ rows, animate, onComplete, onTick }: {
  rows: SignalRow[]; animate: boolean; onComplete?: () => void; onTick?: () => void;
}) {
  const [shown, setShown] = useState(animate ? 0 : rows.length);
  const onCompleteRef = useRef(onComplete); const onTickRef = useRef(onTick);
  useEffect(() => { onCompleteRef.current = onComplete; onTickRef.current = onTick; });
  useEffect(() => {
    if (!animate) { onCompleteRef.current?.(); return; }
    if (shown >= rows.length) { onCompleteRef.current?.(); return; }
    const id = setTimeout(() => { setShown(s => s + 1); onTickRef.current?.(); }, 260);
    return () => clearTimeout(id);
  }, [shown, rows.length, animate]);
  return <div className="my-3"><SignalTable rows={animate ? rows.slice(0, shown) : rows} /></div>;
}

function StreamTable({ headers, rows, onCite, animate, onComplete, onTick }: {
  headers: string[]; rows: InlineSeg[][][]; onCite?: (n: number) => void;
  animate: boolean; onComplete?: () => void; onTick?: () => void;
}) {
  const [shown, setShown] = useState(animate ? 0 : rows.length);
  const onCompleteRef = useRef(onComplete); const onTickRef = useRef(onTick);
  useEffect(() => { onCompleteRef.current = onComplete; onTickRef.current = onTick; });
  useEffect(() => {
    if (!animate) { onCompleteRef.current?.(); return; }
    if (shown >= rows.length) { onCompleteRef.current?.(); return; }
    const id = setTimeout(() => { setShown(s => s + 1); onTickRef.current?.(); }, 300);
    return () => clearTimeout(id);
  }, [shown, rows.length, animate]);
  const vis = animate ? rows.slice(0, shown) : rows;
  return (
    <div className="rounded-xl overflow-hidden my-3" style={{ border: `1px solid ${C.border}` }}>
      <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)`, background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
        {headers.map(h => (
          <span key={h} className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>{h}</span>
        ))}
      </div>
      {vis.map((row, ri) => (
        <motion.div key={ri} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="grid px-4 py-3 items-start"
          style={{ gridTemplateColumns: `repeat(${headers.length}, 1fr)`, borderBottom: ri < vis.length - 1 ? `1px solid ${C.border}` : "none" }}>
          {row.map((cell, ci) => (
            <span key={ci} className="text-[13px] leading-snug pr-3" style={{ color: C.text2 }}>
              <InlineSegments segs={cell} onCite={onCite} />
            </span>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

// One report block; when `animate` it types/reveals itself then calls onComplete.
function StreamBlock({ block, signals, onCite, animate, onComplete, onTick }: {
  block: AnswerBlock; signals: SignalRow[]; onCite?: (n: number) => void;
  animate: boolean; onComplete?: () => void; onTick?: () => void;
}) {
  switch (block.kind) {
    case "heading":
      return (
        <h3 className="text-[14.5px] font-bold mt-5 mb-2 first:mt-0" style={{ color: C.text1 }}>
          <StreamingInline segs={[{ t: "text", v: block.text }]} animate={animate} onDone={onComplete} onTick={onTick} />
        </h3>
      );
    case "paragraph":
      return (
        <p className="text-[14px] leading-relaxed mb-3" style={{ color: C.text2 }}>
          <StreamingInline segs={block.segs} onCite={onCite} animate={animate} onDone={onComplete} onTick={onTick} />
        </p>
      );
    case "callout":
      return (
        <blockquote className="mb-3 pl-4 pr-4 py-3 rounded-r-lg text-[14px] leading-relaxed"
          style={{ borderLeft: `3px solid ${C.brand}`, background: C.evidence["very-high"].surface, color: C.text2 }}>
          <StreamingInline segs={block.segs} onCite={onCite} animate={animate} onDone={onComplete} onTick={onTick} />
        </blockquote>
      );
    case "bullets":
      return <StreamBullets items={block.items} onCite={onCite} animate={animate} onComplete={onComplete} onTick={onTick} />;
    case "divider":
      return <StreamDivider animate={animate} onComplete={onComplete} />;
    case "signal-table":
      return <StreamSignalTable rows={signals} animate={animate} onComplete={onComplete} onTick={onTick} />;
    case "table":
      return <StreamTable headers={block.headers} rows={block.rows} onCite={onCite} animate={animate} onComplete={onComplete} onTick={onTick} />;
  }
}

// ─── Answer Report (rich narrative — streams block-by-block when animate) ──
function AnswerReport({ blocks, signals, onCite, animate = false, onTick, onDone }: {
  blocks: AnswerBlock[]; signals: SignalRow[]; onCite?: (n: number) => void;
  animate?: boolean; onTick?: () => void; onDone?: () => void;
}) {
  // Index of the block currently typing; earlier blocks are fully shown.
  const [current, setCurrent] = useState(animate ? 0 : blocks.length);
  const onDoneRef = useRef(onDone); useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => { if (!animate || current >= blocks.length) onDoneRef.current?.(); }, [current, blocks.length, animate]);

  const shownCount = animate ? Math.min(current + 1, blocks.length) : blocks.length;
  return (
    <div>
      {blocks.slice(0, shownCount).map((b, i) => (
        <StreamBlock key={i} block={b} signals={signals} onCite={onCite} onTick={onTick}
          animate={animate && i === current}
          onComplete={animate && i === current ? () => setCurrent(c => c + 1) : undefined} />
      ))}
    </div>
  );
}

// ─── Drug Information Card ────────────────────────────────────────

function DrugInfoCard({ drug, refs }: { drug: DrugInfo; refs: Reference[] }) {
  const [open, setOpen] = useState(true);
  const available = DRUG_TAB_ORDER.filter(t => drug.tabs[t]?.length);
  const hasRefs = (drug.refIndices?.length ?? 0) > 0;
  const subTabs: string[] = [...available, ...(hasRefs ? ["References"] : [])];
  const [sub, setSub] = useState<string>(available[0] ?? "References");

  const drugRefs = refs.filter(r => drug.refIndices?.includes(r.n));

  return (
    <div className="rounded-xl overflow-hidden mb-3" style={{ border: `1px solid ${C.border}`, background: C.card, boxShadow: C.shadowSm }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
        style={{ borderBottom: open ? `1px solid ${C.border}` : "none", background: C.pageBg }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: C.brandSoft }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill={C.brandText} viewBox="0 0 256 256">
            <path d="M188.69,67.32a52,52,0,0,0-73.54,0L67.32,115.15a52,52,0,1,0,73.54,73.54l47.83-47.83a52,52,0,0,0,0-73.54ZM78.63,177.37a36,36,0,0,1,0-50.92L100,105.09,150.91,156l-21.37,21.37a36,36,0,0,1-50.91,0ZM177.37,128.45,162.22,143.6,111.31,92.69,126.46,77.54a36,36,0,1,1,50.91,50.91Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold" style={{ color: C.text1 }}>{drug.name}</p>
          <p className="text-[12px]" style={{ color: C.text4 }}>{drug.className}</p>
        </div>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}>
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22, ease: "easeOut" }}>
            <div className="flex gap-4 px-4 pt-3" style={{ borderBottom: `1px solid ${C.border}` }}>
              {subTabs.map(t => (
                <button key={t} onClick={() => setSub(t)}
                  className="text-[12.5px] font-medium pb-2.5 transition-colors"
                  style={{
                    color: sub === t ? C.text1 : C.text4,
                    borderBottom: sub === t ? `2px solid ${C.brand}` : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  {t === "References" ? `References (${drugRefs.length})` : t}
                </button>
              ))}
            </div>
            <div className="p-4">
              {sub === "References" ? (
                drugRefs.map((r, i) => <ReferenceItem key={r.n} item={r} isLast={i === drugRefs.length - 1} />)
              ) : (
                <div className="space-y-3">
                  {(drug.tabs[sub as keyof DrugInfo["tabs"]] ?? []).map(sec => (
                    <div key={sec.label} className="rounded-lg p-3" style={{ background: C.pageBg, border: `1px solid ${C.border}` }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.text4 }}>{sec.label}</p>
                      <p className="text-[12.5px] leading-relaxed" style={{ color: C.text2, whiteSpace: "pre-line" }}>{sec.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Feedback bar ─────────────────────────────────────────────────
function FeedbackBar({
  onCopy,
  onExportCSV,
  onExportWord,
  onExportPDF,
  onShare,
  isSurveillance = false,
  isSigned = false,
  onSign
}: {
  onCopy: () => void;
  onExportCSV: () => void;
  onExportWord: () => void;
  onExportPDF: () => void;
  onShare?: () => void;
  isSurveillance?: boolean;
  isSigned?: boolean;
  onSign?: () => void;
}) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const iconBtn = "w-8 h-8 rounded-lg flex items-center justify-center transition-all";
  return (
    <div className="flex items-center gap-3 flex-wrap mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
      {isSurveillance && (
        isSigned ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            E-Signed (21 CFR Part 11)
          </div>
        ) : (
          <button 
            onClick={onSign} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-bold cursor-pointer transition-all hover:opacity-90 border-none text-white"
            style={{ background: C.brand }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            E-Sign Report
          </button>
        )
      )}
      
      <div onClick={onShare} className="flex items-center gap-2 px-3.5 py-2 rounded-full text-[12.5px] font-medium cursor-pointer transition-all hover:opacity-80"
        style={{ background: C.brandSoft, color: C.brandText }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
          <path d="M176,156a27.76,27.76,0,0,0-16.42,5.32L99.79,126.49a28,28,0,0,0,0-13L159.58,78.7a28,28,0,1,0-8-13.84L91.79,99.69a28,28,0,1,0,0,56.62l59.79,34.84A28,28,0,1,0,176,156Z" />
        </svg>
        Was this helpful? Share it with colleagues
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <button aria-label="Helpful" onClick={() => setVote(v => v === "up" ? null : "up")}
          className={iconBtn} style={{ background: vote === "up" ? C.brandSoft : "transparent", color: vote === "up" ? C.brandText : C.text4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" viewBox="0 0 256 256">
            <path d="M234,80.12A24,24,0,0,0,216,72H160V56a40,40,0,0,0-40-40,8,8,0,0,0-7.16,4.42L75.06,96H32a16,16,0,0,0-16,16v88a16,16,0,0,0,16,16H204a24,24,0,0,0,23.82-21l12-96A24,24,0,0,0,234,80.12ZM32,112H72v88H32ZM223.94,97l-12,96a8,8,0,0,1-7.94,7H88V105.89l36.71-73.43A24,24,0,0,1,144,56V80a8,8,0,0,0,8,8h64a8,8,0,0,1,7.94,9Z" />
          </svg>
        </button>
        <button aria-label="Not helpful" onClick={() => setVote(v => v === "down" ? null : "down")}
          className={iconBtn} style={{ background: vote === "down" ? "#fee2e2" : "transparent", color: vote === "down" ? "#dc2626" : C.text4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" viewBox="0 0 256 256" style={{ transform: "rotate(180deg)" }}>
            <path d="M234,80.12A24,24,0,0,0,216,72H160V56a40,40,0,0,0-40-40,8,8,0,0,0-7.16,4.42L75.06,96H32a16,16,0,0,0-16,16v88a16,16,0,0,0,16,16H204a24,24,0,0,0,23.82-21l12-96A24,24,0,0,0,234,80.12ZM32,112H72v88H32ZM223.94,97l-12,96a8,8,0,0,1-7.94,7H88V105.89l36.71-73.43A24,24,0,0,1,144,56V80a8,8,0,0,0,8,8h64a8,8,0,0,1,7.94,9Z" />
          </svg>
        </button>
        <button aria-label="Copy" onClick={handleCopy}
          className={iconBtn} style={{ background: copied ? C.brandSoft : "transparent", color: copied ? C.brandText : C.text4 }}>
          {copied ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
              <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
            </svg>
          )}
        </button>
        <button aria-label="Download CSV" onClick={onExportCSV}
          className={iconBtn} style={{ background: "transparent", color: C.text4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
            <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216ZM160,152a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16h48A8,8,0,0,1,160,152Zm0,32a8,8,0,0,1-8,8H104a8,8,0,0,1,0-16h48A8,8,0,0,1,160,184Z" />
          </svg>
        </button>
        <button aria-label="Download PDF" onClick={onExportPDF}
          className={iconBtn} style={{ background: "transparent", color: C.text4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
            <path d="M224,152a8,8,0,0,1-8,8H168v48a8,8,0,0,1-16,0V160H104a8,8,0,0,1,0-16h48V96a8,8,0,0,1,16,0v48h48A8,8,0,0,1,224,152ZM40,80H80V56a8,8,0,0,1,16,0V80h40a8,8,0,0,1,0,16H96v24a8,8,0,0,1-16,0V96H40a8,8,0,0,1,0-16Z" />
          </svg>
        </button>
        <button aria-label="Export to Word" onClick={onExportWord}
          className={iconBtn} style={{ background: "transparent", color: C.text4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
            <path d="M48,180c0,11,7.18,20,16,20s16-9,16-20-7.18-20-16-20S48,169,48,180ZM216,88V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V152a4,4,0,0,1,4-4H60a4,4,0,0,1,4,4v52a4,4,0,0,0,4,4H188a4,4,0,0,0,4-4V96H152a8,8,0,0,1-8-8V48H68a4,4,0,0,0-4,4v52a4,4,0,0,1-4,4H44a4,4,0,0,1-4-4V40A16,16,0,0,1,56,24h96Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Suggested Questions ──────────────────────────────────────────
function SuggestedQuestions({ questions, onAsk }: { questions: string[]; onAsk?: (q: string) => void }) {
  if (!questions.length) return null;
  return (
    <div className="mt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] mb-2" style={{ color: C.text4 }}>Suggested Questions</p>
      <div style={{ borderTop: `1px solid ${C.border}` }}>
        {questions.map(q => (
          <button key={q} onClick={() => onAsk?.(q)}
            className="w-full flex items-center gap-3 py-3 text-left transition-colors hover:bg-gray-50 -mx-2 px-2 rounded-lg"
            style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className="text-[13.5px] flex-1" style={{ color: C.text2 }}>{q}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.brand, flexShrink: 0 }}>
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm40,112H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32a8,8,0,0,1,0,16Z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Artifact: signal forest plot ────────────────────────────────
// Classic pharmacovigilance visual — PRR point estimate (diamond) + 95% CI
// whisker per MedDRA PT on a log x-axis, with reference lines at PRR=1
// ("No signal") and PRR=2 ("ICH E2E threshold"). Native SVG, no chart dep.
// ─── Shared HTML chart tooltip (escapes SVG clipping) ────────────
function ChartTooltip({ lines, x, y, visible }: {
  lines: { label: string; value: string; color?: string }[];
  x: number; y: number; visible: boolean;
}) {
  if (!visible) return null;
  return (
    <div style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      pointerEvents: "none", zIndex: 20,
      background: "#fff",
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 4px 20px rgba(34,40,49,0.13)",
      minWidth: 160,
      fontFamily: "Manrope, sans-serif",
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: i === 0 ? 0 : 4 }}>
          {l.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, flexShrink: 0, display: "inline-block", marginTop: 2 }} />}
          <span style={{ fontSize: i === 0 ? 13 : 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? C.text1 : C.text3, lineHeight: 1.4 }}>{l.label}</span>
          {l.value && <span style={{ fontSize: 12, color: C.text2, marginLeft: "auto", fontWeight: 600, paddingLeft: 8 }}>{l.value}</span>}
        </div>
      ))}
    </div>
  );
}

const tierColor = (s: ForestRow["signal"]) => SIGNAL_COLOR[s.toLowerCase() as "strong" | "moderate" | "weak"];

function SignalForestPlot({ rows = FOREST_ROWS, onOpenAgentThread }: { rows?: ForestRow[]; onOpenAgentThread?: (chartId: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 540, rowH = 50, padL = 158, padR = 60, padT = 28, padB = 42;
  const H = padT + rows.length * rowH + padB;
  const plotW = W - padL - padR;
  const xMin = 0.5, xMax = 6;
  const lx = (v: number) => Math.log(Math.min(xMax, Math.max(xMin, v)));
  const x = (v: number) => padL + ((lx(v) - lx(xMin)) / (lx(xMax) - lx(xMin))) * plotW;
  const ticks = [0.5, 1, 2, 3, 5];

  const tipRow = hover !== null ? rows[hover] : null;
  const tipX = hover !== null ? Math.min(x(rows[hover].prr) / W * 100 + 2, 55) : 0;
  const tipY = hover !== null ? Math.max(0, (padT + hover * rowH - 10) / H * 100 - 22) : 0;

  return (
    <div style={{ position: "relative", maxWidth: 520 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: "Manrope, sans-serif", overflow: "visible" }}>
        <line x1={x(1)} y1={padT} x2={x(1)} y2={H - padB} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 4" />
        <text x={x(1)} y={padT - 8} textAnchor="middle" style={{ fontSize: 10.5, fill: "#94a3b8" }}>No signal</text>
        <line x1={x(2)} y1={padT} x2={x(2)} y2={H - padB} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
        <text x={x(2)} y={padT - 8} textAnchor="middle" style={{ fontSize: 10.5, fill: "#6366f1", fontWeight: 600 }}>ICH E2E ≥ 2.0</text>
        {ticks.map(t => (
          <text key={t} x={x(t)} y={H - padB + 17} textAnchor="middle" style={{ fontSize: 10.5, fill: C.text4 }}>{t}</text>
        ))}
        <text x={padL + plotW / 2} y={H - 4} textAnchor="middle" style={{ fontSize: 11, fill: C.text3 }}>Proportional Reporting Ratio (PRR, log scale)</text>
        {rows.map((r, i) => {
          const cy = padT + i * rowH + rowH / 2;
          const col = tierColor(r.signal);
          const s = 6; const cx = x(r.prr);
          return (
            <g key={r.pt} opacity={hover !== null && hover !== i ? 0.3 : 1} style={{ transition: "opacity 0.15s" }}>
              <text x={padL - 12} y={cy + 4} textAnchor="end" style={{ fontSize: 11, fill: C.text2, fontWeight: 600 }}>{r.pt}</text>
              <line x1={x(r.ci_lo)} y1={cy} x2={x(r.ci_hi)} y2={cy} stroke={col} strokeWidth="2" opacity="0.6" />
              <line x1={x(r.ci_lo)} y1={cy - 5} x2={x(r.ci_lo)} y2={cy + 5} stroke={col} strokeWidth="2" opacity="0.6" />
              <line x1={x(r.ci_hi)} y1={cy - 5} x2={x(r.ci_hi)} y2={cy + 5} stroke={col} strokeWidth="2" opacity="0.6" />
              <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`} fill={col} stroke="#fff" strokeWidth="1.5" />
              <text x={W - 8} y={cy + 4} textAnchor="end" style={{ fontSize: 10.5, fill: C.text4 }}>n={r.n.toLocaleString()}</text>
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="transparent"
                onClick={() => onOpenAgentThread?.("forest")}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
            </g>
          );
        })}
      </svg>
      {tipRow && (
        <ChartTooltip visible x={tipX} y={tipY} lines={[
          { label: tipRow.pt, value: "" },
          { label: `PRR ${tipRow.prr.toFixed(1)}`, value: `95% CI ${tipRow.ci_lo}–${tipRow.ci_hi}` },
          { label: `ROR ${tipRow.ror}  ·  n=${tipRow.n.toLocaleString()}`, value: tipRow.signal, color: tierColor(tipRow.signal) },
        ]} />
      )}
    </div>
  );
}

// ─── Artifact: PRR trend chart (longitudinal "is this getting worse?") ──
// Top-signal PRR over the last 8 quarters with a shaded 95% CI band and the
// ICH E2E threshold line. Native SVG, no chart dependency.

function PRRTrendChart({ data = TREND_DATA, onOpenAgentThread }: { data?: TrendPoint[]; onOpenAgentThread?: (chartId: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 540, H = 230, padL = 34, padR = 16, padT = 16, padB = 40;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const yMax = 5;
  const x = (i: number) => padL + (data.length === 1 ? 0 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => padT + (1 - v / yMax) * plotH;
  const yTicks = [0, 1, 2, 3, 4, 5];
  const RED = "#ef4444", THRESH = "#6366f1";

  const hiPts = data.map((d, i) => `${x(i)},${y(d.ci_hi)}`);
  const loPts = data.map((d, i) => `${x(i)},${y(d.ci_lo)}`).reverse();
  const bandPath = `M ${hiPts.join(" L ")} L ${loPts.join(" L ")} Z`;
  const linePath = `M ${data.map((d, i) => `${x(i)},${y(d.prr)}`).join(" L ")}`;

  return (
    <div style={{ position: "relative", maxWidth: 520 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: "Manrope, sans-serif" }}>
      {/* y gridlines + ticks */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" style={{ fontSize: 10, fill: C.text4 }}>{t}</text>
        </g>
      ))}
      {/* CI band */}
      <path d={bandPath} fill="rgba(239,68,68,0.12)" stroke="none" />
      {/* ICH E2E threshold */}
      <line x1={padL} y1={y(2)} x2={W - padR} y2={y(2)} stroke={THRESH} strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - padR} y={y(2) - 5} textAnchor="end" style={{ fontSize: 9.5, fill: THRESH, fontWeight: 600 }}>ICH E2E ≥ 2.0</text>
      {/* PRR line */}
      <path d={linePath} fill="none" stroke={RED} strokeWidth="2" strokeLinejoin="round" />
      {/* points + x labels + hit areas */}
      {data.map((d, i) => (
        <g key={d.quarter}>
          <circle cx={x(i)} cy={y(d.prr)} r={hover === i ? 5.5 : 4} fill={RED} stroke="#fff" strokeWidth="1.5" />
          <text x={x(i)} y={H - padB + 16} textAnchor="middle" style={{ fontSize: 11, fill: C.text4 }}>{d.quarter.replace(" ", " '").replace("'20", "'")}</text>
          <rect x={x(i) - plotW / (data.length * 2)} y={padT} width={plotW / data.length} height={plotH} fill="transparent"
            onClick={() => onOpenAgentThread?.("prr")}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
        </g>
      ))}
    </svg>
    {hover !== null && (() => { const d = data[hover]; return (
      <ChartTooltip visible x={Math.min(x(hover) / W * 100, 60)} y={Math.max(0, y(d.ci_hi) / H * 100 - 28)} lines={[
        { label: d.quarter, value: "" },
        { label: "PRR", value: `${d.prr.toFixed(1)} (95% CI ${d.ci_lo}–${d.ci_hi})` },
      ]} />
    ); })()}
  </div>
  );
}

function StatsTable({ rows }: { rows: SignalRow[] }) {
  const cols = ["Adverse Event", "PRR", "95% CI", "χ²", "ROR (95% CI)", "n", "Signal"];
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
      <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: "1.6fr .6fr 1fr .6fr 1.4fr .6fr .9fr", background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
        {cols.map(c => <span key={c} className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>{c}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={r.event} className="grid px-4 py-2.5 items-center"
          style={{ gridTemplateColumns: "1.6fr .6fr 1fr .6fr 1.4fr .6fr .9fr", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <span className="text-[12.5px] font-medium" style={{ color: C.text2 }}>{r.event}</span>
          <span className="text-[12.5px] font-bold" style={{ color: C.text1 }}>{r.prr}</span>
          <span className="text-[12px]" style={{ color: C.text4 }}>{r.ci}</span>
          <span className="text-[12px]" style={{ color: C.text3 }}>{r.chi2 ?? "—"}</span>
          <span className="text-[12px]" style={{ color: C.text3 }}>{r.ror ?? "—"}</span>
          <span className="text-[12px]" style={{ color: C.text2 }}>{r.n.toLocaleString()}</span>
          <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: SIGNAL_COLOR[r.level] }}>
            <span className="w-2 h-2 rounded-full" style={{ background: SIGNAL_COLOR[r.level] }} />
            {r.level === "strong" ? "Strong" : r.level === "moderate" ? "Moderate" : "Weak"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── New charts: Quarterly case count, time-to-onset, Kaplan-Meier ──

function QuarterlyCaseChart({ onOpenAgentThread }: { onOpenAgentThread?: (chartId: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 540, H = 210, padL = 44, padR = 16, padT = 16, padB = 44;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxN = Math.max(...QUARTERLY_COUNTS.map(d => Math.max(d.drug, d.bg)));
  const y = (v: number) => padT + (1 - v / (maxN * 1.1)) * plotH;
  const yTicks = [0, 50, 100, 150, 200, 250, 300, 350].filter(t => t <= maxN * 1.12);
  const bw = (plotW / QUARTERLY_COUNTS.length) * 0.32; // bar half-width
  const cx = (i: number) => padL + (i + 0.5) * (plotW / QUARTERLY_COUNTS.length);

  return (
    <div style={{ width: "100%", maxWidth: 520 }}>
      <div className="flex items-center gap-4 mb-2 px-1">
        <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: C.text4 }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.brand }} /> Ibuprofen
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: C.text4 }}>
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#94a3b8" }} /> Background reference
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: "Manrope, sans-serif" }}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#f1f5f9" strokeWidth="1" />
            <text x={padL - 6} y={y(t) + 3.5} textAnchor="end" style={{ fontSize: 10, fill: C.text4 }}>{t}</text>
          </g>
        ))}
        {QUARTERLY_COUNTS.map((d, i) => {
          const dim = hover !== null && hover !== i;
          return (
            <g key={d.quarter} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 0.15s" }}>
              {/* background bar */}
              <rect x={cx(i) - bw * 2.2} y={y(d.bg)} width={bw * 1.8} height={Math.max(0, y(0) - y(d.bg))}
                rx={2} fill="#94a3b8" opacity="0.55" />
              {/* drug bar */}
              <rect x={cx(i) + bw * 0.4} y={y(d.drug)} width={bw * 1.8} height={Math.max(0, y(0) - y(d.drug))}
                rx={2} fill={C.brand} opacity="0.85" />
              <text x={cx(i)} y={H - padB + 15} textAnchor="middle" style={{ fontSize: 10, fill: C.text4 }}>{d.quarter}</text>
              <rect x={cx(i) - plotW / QUARTERLY_COUNTS.length / 2} y={padT} width={plotW / QUARTERLY_COUNTS.length} height={plotH}
                fill="transparent"
                onClick={() => onOpenAgentThread?.("quarterly")}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
            </g>
          );
        })}
        <text x={padL + plotW / 2} y={H - 8} textAnchor="middle" style={{ fontSize: 10.5, fill: C.text3 }}>Reporting quarter</text>
      </svg>
      {hover !== null && (() => { const d = QUARTERLY_COUNTS[hover]; return (
        <ChartTooltip visible x={Math.min(cx(hover)/W*100, 60)} y={Math.max(0, y(Math.max(d.drug,d.bg))/H*100 - 30)} lines={[
          { label: d.quarter, value: "" },
          { label: "Ibuprofen", value: `${d.drug} cases`, color: C.brand },
          { label: "Background", value: `${d.bg} cases`, color: "#94a3b8" },
        ]} />
      ); })()}
    </div>
  );
}

function TimeToOnsetChart({ onOpenAgentThread }: { onOpenAgentThread?: (chartId: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 540, H = 210, padL = 92, padR = 50, padT = 16, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const maxN = Math.max(...ONSET_BUCKETS.map(d => d.n));
  const bh = (plotH / ONSET_BUCKETS.length) * 0.55;
  const cy = (i: number) => padT + (i + 0.5) * (plotH / ONSET_BUCKETS.length);
  const barW = (v: number) => (v / maxN) * plotW;
  const xTicks = [0, 50, 100, 150];
  // Colour ramp: deeper green for the highest bar
  const barColor = (n: number) => {
    const t = n / maxN;
    return `rgba(5,${Math.round(100 + 50 * (1 - t))},${Math.round(105 - 60 * t)},${0.55 + 0.35 * t})`;
  };

  return (
    <div style={{ position: "relative", maxWidth: 520 }}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: "Manrope, sans-serif" }}>
      {xTicks.map(t => (
        <g key={t}>
          <line x1={padL + (t / maxN) * plotW} y1={padT} x2={padL + (t / maxN) * plotW} y2={H - padB} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padL + (t / maxN) * plotW} y={H - padB + 14} textAnchor="middle" style={{ fontSize: 10, fill: C.text4 }}>{t}</text>
        </g>
      ))}
      {ONSET_BUCKETS.map((d, i) => {
        const dim = hover !== null && hover !== i;
        return (
          <g key={d.label} opacity={dim ? 0.35 : 1} style={{ transition: "opacity 0.15s" }}>
            <text x={padL - 8} y={cy(i) + 4} textAnchor="end" style={{ fontSize: 11.5, fill: C.text2 }}>{d.label}</text>
            <rect x={padL} y={cy(i) - bh / 2} width={barW(d.n)} height={bh} rx={3} fill={barColor(d.n)} />
            <text x={padL + barW(d.n) + 6} y={cy(i) + 4} style={{ fontSize: 10.5, fill: C.text3, fontWeight: 600 }}>{d.n}</text>
            <rect x={0} y={cy(i) - plotH / ONSET_BUCKETS.length / 2} width={W} height={plotH / ONSET_BUCKETS.length}
              fill="transparent"
              onClick={() => onOpenAgentThread?.("onset")}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }} />
          </g>
        );
      })}
      <text x={padL + plotW / 2} y={H - 6} textAnchor="middle" style={{ fontSize: 10.5, fill: C.text3 }}>Number of cases</text>
    </svg>
    {hover !== null && (() => { const d = ONSET_BUCKETS[hover]; const total = ONSET_BUCKETS.reduce((a,b)=>a+b.n,0); return (
      <ChartTooltip visible x={Math.min((padL+barW(d.n))/W*100+2, 55)} y={Math.max(0, cy(hover)/H*100 - 25)} lines={[
        { label: d.label, value: "" },
        { label: "Cases", value: `${d.n}  (${(d.n/total*100).toFixed(1)}%)` },
      ]} />
    ); })()}
  </div>
  );
}

function KaplanMeierChart({ onOpenAgentThread }: { onOpenAgentThread?: (topic: string) => void } = {}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 540, H = 250, padL = 50, padR = 32, padT = 16, padB = 52;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const yMin = 0.88, yMax = 1.002;
  const xMax = 730;
  const px = (d: number) => padL + (d / xMax) * plotW;
  const py = (s: number) => padT + ((yMax - s) / (yMax - yMin)) * plotH;
  const xTicks = [0, 90, 180, 365, 548, 730];
  const yTicks = [0.88, 0.90, 0.92, 0.94, 0.96, 0.98, 1.00];
  const GREEN = C.brand, SLATE = "#64748b";

  // Build step-function paths
  const pts = KM_CURVE;
  const drugPath = pts.map((p, i) => {
    if (i === 0) return `M ${px(p.day)},${py(p.drug)}`;
    return `H ${px(p.day)} V ${py(p.drug)}`;
  }).join(" ");

  const bgPath = pts.map((p, i) => {
    if (i === 0) return `M ${px(p.day)},${py(p.bg)}`;
    return `H ${px(p.day)} V ${py(p.bg)}`;
  }).join(" ");

  const ciBandTop = pts.map(p => `${px(p.day)},${py(p.drug_hi)}`).join(" L ");
  const ciBandBot = [...pts].reverse().map(p => `${px(p.day)},${py(p.drug_lo)}`).join(" L ");
  const ciBandPath = `M ${ciBandTop} L ${ciBandBot} Z`;

  // At-risk row numbers
  const atRiskDrug = [412, 389, 361, 338, 312, 287, 241];
  const atRiskBg   = [8420, 8394, 8372, 8318, 8277, 8241, 8102];

  return (
    <div style={{ position: "relative", maxWidth: 520 }}>
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: "Manrope, sans-serif" }}>
      {/* grid */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={padL} y1={py(t)} x2={W - padR} y2={py(t)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padL - 7} y={py(t) + 3.5} textAnchor="end" style={{ fontSize: 10, fill: C.text4 }}>{(t * 100).toFixed(0)}%</text>
        </g>
      ))}
      {/* CI band for drug */}
      <path d={ciBandPath} fill={`rgba(5,150,105,0.10)`} />
      {/* background survival curve */}
      <path d={bgPath} fill="none" stroke={SLATE} strokeWidth="1.5" strokeDasharray="5 3" />
      {/* drug survival curve */}
      <path d={drugPath} fill="none" stroke={GREEN} strokeWidth="2.2" />
      {/* x ticks */}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={px(t)} y1={H - padB} x2={px(t)} y2={H - padB + 4} stroke={C.border} strokeWidth="1" />
          <text x={px(t)} y={H - padB + 15} textAnchor="middle" style={{ fontSize: 9.5, fill: C.text4 }}>{t}d</text>
        </g>
      ))}
      {/* x axis label */}
      <text x={padL + plotW / 2} y={H - padB + 28} textAnchor="middle" style={{ fontSize: 10.5, fill: C.text3 }}>Days from first exposure</text>
      {/* at-risk row */}
      <text x={padL - 8} y={H - 11} textAnchor="end" style={{ fontSize: 9, fill: GREEN, fontWeight: 700 }}>IBU</text>
      <text x={padL - 8} y={H - 2} textAnchor="end" style={{ fontSize: 9, fill: SLATE }}>BG</text>
      {xTicks.map((t, i) => (
        <g key={t}>
          <text x={px(t)} y={H - 11} textAnchor="middle" style={{ fontSize: 9, fill: GREEN }}>{atRiskDrug[i]}</text>
          <text x={px(t)} y={H - 2} textAnchor="middle" style={{ fontSize: 9, fill: SLATE }}>{(atRiskBg[i] / 1000).toFixed(1)}k</text>
        </g>
      ))}
      {/* log-rank p annotation */}
      <text x={W - padR - 4} y={padT + 14} textAnchor="end" style={{ fontSize: 10, fill: C.text3 }}>Log-rank p &lt; 0.001</text>
      {/* legend */}
      <line x1={padL + 8} y1={padT + 14} x2={padL + 28} y2={padT + 14} stroke={GREEN} strokeWidth="2.2" />
      <text x={padL + 32} y={padT + 18} style={{ fontSize: 10.5, fill: C.text2 }}>Ibuprofen (N=412)</text>
      <line x1={padL + 8} y1={padT + 28} x2={padL + 28} y2={padT + 28} stroke={SLATE} strokeWidth="1.5" strokeDasharray="5 3" />
      <text x={padL + 32} y={padT + 32} style={{ fontSize: 10.5, fill: C.text2 }}>Unexposed reference (N=8,420)</text>
      {/* hover hit areas + dots */}
      {pts.map((p, i) => (
        <g key={p.day}>
          <circle cx={px(p.day)} cy={py(p.drug)} r={hover === i ? 5 : 0} fill={GREEN} stroke="#fff" strokeWidth="1.5" />
          <rect x={px(p.day) - (i === 0 ? 0 : (px(p.day) - px(pts[i-1].day)) / 2)} y={padT}
            width={i === pts.length - 1 ? plotW - (px(p.day) - padL) : (px(pts[i+1]?.day ?? p.day) - px(p.day)) / 2 + (i === 0 ? 0 : (px(p.day) - px(pts[i-1].day)) / 2)}
            height={plotH} fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            onClick={() => onOpenAgentThread?.("km")}
            style={{ cursor: "pointer" }} />
        </g>
      ))}
    </svg>
    {hover !== null && (() => { const p = pts[hover]; return (
      <ChartTooltip visible x={Math.min(px(p.day)/W*100, 55)} y={Math.max(5, py(p.drug)/H*100 - 28)} lines={[
        { label: `Day ${p.day}`, value: "" },
        { label: "Drug-free", value: `${(p.drug*100).toFixed(1)}%  (CI ${(p.drug_lo*100).toFixed(1)}–${(p.drug_hi*100).toFixed(1)})`, color: C.brand },
        { label: "Background", value: `${(p.bg*100).toFixed(1)}%`, color: "#64748b" },
      ]} />
    ); })()}
  </div>
  );
}

// ─── Risk Matrix ─────────────────────────────────────────────────
// One entry per signal — each renders its own clean matrix with a single highlighted cell.

function RiskMatrix({ signal, showAxes = true }: { signal: RiskCell; showAxes?: boolean }) {
  const [hovCell, setHovCell] = useState<[number,number]|null>(null);
  const cellW = 88, cellH = 50, padL = 110, padT = 50;
  const W = padL + cellW * 3 + 2, H = padT + cellH * 5 + (showAxes ? 20 : 6);

  return (
    <div style={{ width: "100%", maxWidth: 500, overflowX: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: "Manrope, sans-serif" }}>
        {/* Column headers */}
        {RISK_SIGNAL.map((label, si) => (
          <text key={si} x={padL + si * cellW + cellW / 2} y={padT - 12} textAnchor="middle"
            style={{ fontSize: 11, fill: C.text3, fontWeight: 600 }}>
            {label.split("\n").map((line, li) => (
              <tspan key={li} x={padL + si * cellW + cellW / 2} dy={li === 0 ? -10 : 14}>{line}</tspan>
            ))}
          </text>
        ))}
        {/* Row headers + cells */}
        {RISK_SEVERITY.map((sev, ri) => (
          <g key={sev}>
            <text x={padL - 10} y={padT + ri * cellH + cellH / 2 + 4} textAnchor="end"
              style={{ fontSize: 12, fill: C.text2, fontWeight: ri < 2 ? 700 : 400 }}>{sev}</text>
            {RISK_SIGNAL.map((_, si) => {
              const isHov = hovCell?.[0] === si && hovCell?.[1] === ri;
              const isSignal = signal.sigIdx === si && signal.sevIdx === ri;
              const x = padL + si * cellW, y = padT + ri * cellH;
              return (
                <g key={si} onMouseEnter={() => setHovCell([si, ri])} onMouseLeave={() => setHovCell(null)}
                  style={{ cursor: isSignal ? "pointer" : "default" }}>
                  <rect x={x+1} y={y+1} width={cellW-2} height={cellH-2} rx={7}
                    fill={RISK_COLORS[ri][si]}
                    stroke={isSignal ? (signal.highlight ? "#ef4444" : C.borderMid) : isHov ? C.borderMid : "transparent"}
                    strokeWidth={isSignal ? 2.5 : 1}
                    opacity={hovCell && !isHov ? 0.65 : 1}
                    style={{ transition: "opacity 0.15s" }} />
                  {isSignal && (
                    <g>
                      <circle cx={x + cellW/2} cy={y + cellH/2} r={7}
                        fill={signal.highlight ? "#ef4444" : C.text2}
                        stroke="#fff" strokeWidth={1.5} />
                      <title>{RISK_SEVERITY[signal.sevIdx]}</title>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        ))}
        {showAxes && (
          <>
            <text x={padL + (cellW * 3) / 2} y={H - 3} textAnchor="middle"
              style={{ fontSize: 11, fill: C.text4 }}>← Signal strength →</text>
            <text transform={`translate(10, ${padT + (cellH * 5) / 2}) rotate(-90)`} textAnchor="middle"
              style={{ fontSize: 11, fill: C.text4 }}>← Severity →</text>
          </>
        )}
      </svg>
      {hovCell && hovCell[0] === signal.sigIdx && hovCell[1] === signal.sevIdx && (
        <ChartTooltip visible
          x={Math.min((padL + signal.sigIdx * cellW) / W * 100, 55)}
          y={Math.max(0, (padT + signal.sevIdx * cellH) / H * 100 - 30)}
          lines={[
            { label: signal.label, value: "" },
            { label: RISK_SEVERITY[signal.sevIdx], value: RISK_SIGNAL[signal.sigIdx].replace("\n", " ") },
          ]} />
      )}
      {showAxes && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, paddingLeft: 4 }}>
          {[["#ef4444","Confirmed signal"],["#fb923c","Elevated risk"],["#fef3c7","Moderate zone"],["#dcfce7","Low risk"]].map(([col,lbl]) => (
            <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.text4 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, flexShrink: 0, background: col, display: "inline-block" }} />{lbl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Artifact card (click-to-open) ───────────────────────────────
function ArtifactCard({ data, onOpen }: { data: ResultData; onOpen: () => void }) {
  return (
    <button onClick={onOpen}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all hover:shadow-md mb-3"
      style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: C.shadowSm }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: C.brandSoft }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke={C.brandText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M4 19l16 0" /><path d="M4 15l4 -6l4 2l4 -5l4 4" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold truncate" style={{ color: C.text1 }}>{data.artifactTitle}</p>
        <p className="text-[12px]" style={{ color: C.text4 }}>Forest plot · statistics · query · click to open</p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4, flexShrink: 0 }}>
        <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
      </svg>
    </button>
  );
}

// ─── Case demographics table (Auckin feature-modality pattern) ───

function CaseDemographicsTable() {
  const signalColor = "#ef4444";
  const COL_W = "120px";
  return (
    <div className="space-y-5">
      {/* Single-signal demographics */}
      <div>
        <p className="text-[12.5px] font-semibold mb-2" style={{ color: C.text1 }}>
          Hepatotoxicity case series · N=412
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          {/* Header */}
          <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: `1fr 1fr ${COL_W}`, background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>Feature</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>Modality</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-right" style={{ color: signalColor }}>HEPATOTOXICITY · Q3 2024</span>
          </div>
          {CASE_DEMOGRAPHICS.map((feat, fi) =>
            feat.rows.map((row, ri) => (
              <div key={`${fi}-${ri}`} className="grid px-4 py-2"
                style={{
                  gridTemplateColumns: `1fr 1fr ${COL_W}`,
                  background: (fi + ri) % 2 === 0 ? "#f9fafb" : "#fff",
                  borderBottom: `1px solid ${C.border}`,
                }}>
                <span className="text-[12.5px] font-semibold" style={{ color: C.text1 }}>
                  {ri === 0 ? feat.feature : ""}
                </span>
                <span className="text-[12.5px]" style={{ color: C.text2 }}>{row.modality}</span>
                <span className="text-[12.5px] text-right font-medium" style={{ color: C.text2 }}>{row.value}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Multi-signal comparison */}
      <div>
        <p className="text-[12.5px] font-semibold mb-2" style={{ color: C.text1 }}>
          Cross-signal demographics comparison
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: "1fr 1fr 80px 80px 80px", background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>Feature</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.text4 }}>Modality</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-right" style={{ color: "#ef4444" }}>HEPATO</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-right" style={{ color: "#f59e0b" }}>HYPER</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-right" style={{ color: "#9ca3af" }}>GI HAEM</span>
          </div>
          {MULTI_SIGNAL_ROWS.map((row, i) => (
            <div key={i} className="grid px-4 py-2"
              style={{ gridTemplateColumns: "1fr 1fr 80px 80px 80px", background: i % 2 === 0 ? "#f9fafb" : "#fff", borderBottom: i < MULTI_SIGNAL_ROWS.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <span className="text-[12.5px] font-semibold" style={{ color: C.text1 }}>{row.feature}</span>
              <span className="text-[12.5px]" style={{ color: C.text2 }}>{row.modality}</span>
              <span className="text-[12.5px] text-right font-medium" style={{ color: "#ef4444" }}>{row.hepato}</span>
              <span className="text-[12.5px] text-right font-medium" style={{ color: "#f59e0b" }}>{row.hyper}</span>
              <span className="text-[12.5px] text-right font-medium" style={{ color: "#9ca3af" }}>{row.gi}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Agents Chat Panel (right panel Agents tab) ──────────────────

function AgentsChatPanel() {
  // Per-agent message histories; Planner pre-seeded with intro.
  const [histories, setHistories] = useState<Record<string, { role: "user" | "agent"; text: string }[]>>(() => ({
    planner: [{ role: "agent", text: AGENT_PANEL_INTROS["planner"] ?? "" }],
    data: [],
    medical: [],
    phi: [],
  }));
  const [activeAgentId, setActiveAgentId] = useState("planner");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeAgent = AGENTS.find(a => a.id === activeAgentId)!;
  const messages = histories[activeAgentId] ?? [];

  const selectAgent = (agentId: string) => {
    setActiveAgentId(agentId);
    // Seed intro on first visit
    if (!(histories[agentId] ?? []).length) {
      setHistories(prev => ({ ...prev, [agentId]: [{ role: "agent", text: AGENT_PANEL_INTROS[agentId] ?? "" }] }));
    }
  };

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

  useEffect(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }, [histories, activeAgentId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.pageBg }}>
      {/* Header with agent intro */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.card }}>
        {/* Agent selector buttons */}
        <div style={{ display: "flex", gap: 6, padding: "12px 16px", flexWrap: "wrap", overflowY: "auto", maxHeight: 80 }}>
          {AGENTS.map(ag => {
            const isActive = ag.id === activeAgentId;
            return (
              <button key={ag.id} onClick={() => selectAgent(ag.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: isActive ? ag.color : "transparent",
                  color: isActive ? "#fff" : C.text3,
                  fontSize: 13, fontWeight: 600,
                  boxShadow: isActive ? "none" : `0 0 0 1px ${C.border}`,
                  transition: "all 0.15s ease",
                  minWidth: "fit-content",
                }}>
                <AgentIcon sides={ag.sides} color={isActive ? "#fff" : ag.color} size={14} />
                <span>{ag.name}</span>
                {isActive && typing && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Agent intro card */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, background: C.pageBg }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AgentIcon sides={activeAgent.sides} color={activeAgent.color} size={20} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, margin: "0 0 4px 0" }}>{activeAgent.name}</p>
              <p style={{ fontSize: 12, color: C.text3, margin: 0, lineHeight: 1.5 }}>{AGENT_PANEL_INTROS[activeAgentId] ?? "Awaiting input..."}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 12, scrollbarWidth: "thin" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "agent" && <AgentIcon sides={activeAgent.sides} color={activeAgent.color} size={18} />}
            <div style={{
              maxWidth: "78%", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.6, wordWrap: "break-word",
              borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
              background: m.role === "user" ? C.brandSoft : `${activeAgent.color}08`,
              color: m.role === "user" ? C.brandText : C.text1,
              border: `1px solid ${m.role === "user" ? `${C.brand}40` : `${activeAgent.color}30`}`,
              boxShadow: m.role === "user" ? "none" : `0 1px 3px rgba(0,0,0,0.04)`,
            }}>
              {m.text}
            </div>
            {m.role === "user" && <div />}
          </div>
        ))}
        {typing && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AgentIcon sides={activeAgent.sides} color={activeAgent.color} size={18} />
            <div style={{ padding: "12px 16px", borderRadius: "4px 14px 14px 14px", background: `${activeAgent.color}08`, border: `1px solid ${activeAgent.color}30` }}>
              <TypingDots color={activeAgent.color} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} style={{ height: 0 }} />
      </div>

      {/* Input area */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "12px 16px", background: C.card }}>
        <ChatInputBar onSend={sendMessage} placeholder={`Ask ${activeAgent.name}…`} stripped compact />
      </div>
    </div>
  );
}

function generateAgentPanelReply(agentId: string, userText: string): string {
  const lower = userText.toLowerCase();
  if (agentId === "medical") {
    if (lower.includes("prr") || lower.includes("signal")) return "The PRR of 3.2 with a lower 95% CI of 2.1 meets Evans criteria. I'd recommend cross-referencing with the Kaplan–Meier time-to-event data before escalating — do you want me to pull the causality assessment?";
    if (lower.includes("method")) return "The methodology uses FAERS spontaneous report counts with the all-drug-reports reference group. PRR = (a/b) / (c/d) where a = cases with drug+event, b = cases with drug, c = cases with event, d = total reports. Shall I walk through the Evans threshold check?";
    return "That's a good question for the clinical review. Based on the current signal profile, the hepatotoxicity finding warrants a Tier-1 assessment. What aspect would you like me to focus on — causality, severity grading, or population subgroups?";
  }
  if (agentId === "data") {
    if (lower.includes("faers") || lower.includes("data")) return "I retrieved 2,847 ICSRs from FAERS Q1 2022–Q3 2024 using the openFDA endpoint. MedDRA coding is v27.0. Would you like me to break down the case counts by reporting quarter or by reporter type?";
    if (lower.includes("coverage")) return "Current coverage: FAERS (US), EudraVigilance (EU). PubMed returned 14 relevant articles. The FAERS dataset represents approximately 23% of global spontaneous reports for this compound.";
    return "I can retrieve additional data if needed. What specific dataset or time range are you looking for?";
  }
  if (agentId === "phi") {
    return "PHI scan complete on the current output. Zero personal identifiers detected across 2,847 narratives. All age data is reported in ranges (not exact DOB), and geographic data is at country-level only. Output is HIPAA-compliant.";
  }
  return "Understood. Let me coordinate that with the relevant agents and get back to you with a structured response.";
}

// ─── Chart Source Row (chevron expand per chart) ─────────────────
function ChartSourceRow({ chartId, open, onToggle, onOpenAgentThread }: {
  chartId: string; open: boolean; onToggle: () => void; onOpenAgentThread?: (chartId: string) => void;
}) {
  const src = CHART_SOURCES[chartId];
  if (!src) return null;
  return (
    <div style={{ borderTop: `1px solid ${C.border}` }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, padding: "7px 16px", background: "transparent", border: "none", cursor: "pointer", color: C.text4, fontSize: 11.5, fontWeight: 600 }}>
        <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
        </motion.svg>
        Source
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.text4, marginBottom: 6 }}>Source</p>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: C.text2 }}>{src.summary}</p>
              </div>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: C.text4, marginBottom: 6 }}>Raw Source</p>
                <pre style={{ fontFamily: "Menlo, Courier New, monospace", fontSize: 11, backgroundColor: C.codeBg, color: "#e5e7eb", padding: "8px 12px", borderRadius: 6, overflow: "auto", whiteSpace: "pre-wrap", wordWrap: "break-word", margin: 0, lineHeight: 1.5 }}>
                  {src.raw.join('\n')}
                </pre>
              </div>
            </div>
            <div style={{ padding: "0 16px 14px" }}>
              <button onClick={() => onOpenAgentThread?.(chartId)}
                style={{ width: "100%", padding: "8px 12px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${C.brand}`, background: "transparent", color: C.brand, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                Chat with Medical Reviewer
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Artifact side panel ─────────────────────────────────────────

function ArtifactPanel({ data, full, onToggleFull, onClose, onOpenAgentThread }: {
  data: ResultData; full: boolean; onToggleFull: () => void; onClose: () => void;
  onOpenAgentThread?: (chartId: string) => void;
}) {
  const [tab, setTab] = useState<ArtifactTab>("charts");
  const [queryOpen, setQueryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sourceOpen, setSourceOpen] = useState<Record<string, boolean>>({});
  const toggleSource = (id: string) => setSourceOpen(prev => ({ ...prev, [id]: !prev[id] }));
  const copyQuery = async () => {
    try { await navigator.clipboard.writeText(data.artifactQuery); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* blocked */ }
  };
  const iconBtn = "w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100";
  return (
    <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="flex flex-col min-h-0 flex-shrink-0"
      style={{ width: full ? "100%" : "46%", minWidth: full ? undefined : 420, maxWidth: full ? undefined : 580, borderLeft: `1px solid ${C.border}`, background: C.card }}>
      {/* header */}
      <div className="flex items-center gap-3 px-5 flex-shrink-0" style={{ height: 56, borderBottom: `1px solid ${C.border}` }}>
        <h2 className="text-[14px] font-bold flex-1 truncate" style={{ color: C.text1, fontFamily: "Manrope, sans-serif" }}>{data.artifactTitle}</h2>
        <button onClick={onToggleFull} aria-label="Toggle fullscreen" className={iconBtn} style={{ color: C.text3 }}>
          {full ? (
            /* Minimise: two inward-pointing arrows */
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M5 9h4V5" /><path d="M3 3l6 6" />
              <path d="M19 9h-4V5" /><path d="M21 3l-6 6" />
              <path d="M5 15h4v4" /><path d="M3 21l6 -6" />
              <path d="M19 15h-4v4" /><path d="M21 21l-6 -6" />
            </svg>
          ) : (
            /* Expand: four outward-pointing arrows */
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 7V3h4" /><path d="M3 3l6 6" />
              <path d="M21 7V3h-4" /><path d="M21 3l-6 6" />
              <path d="M3 17v4h4" /><path d="M3 21l6 -6" />
              <path d="M21 17v4h-4" /><path d="M21 21l-6 -6" />
            </svg>
          )}
        </button>
        <button onClick={onClose} aria-label="Close panel" className={iconBtn} style={{ color: C.text3 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
        </button>
      </div>
      {/* tabs — flat segmented control */}
      <div className="flex items-center gap-2 px-5 flex-shrink-0" style={{ height: 52, borderBottom: `1px solid ${C.border}` }}>
        {(["charts", "agents"] as ArtifactTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 600,
              background: tab === t ? C.brand : C.pageBg,
              color: tab === t ? "#fff" : C.text3,
              transition: "background 0.15s, color 0.15s",
            }}>
            {t === "charts" ? "Charts" : "Agents"}
          </button>
        ))}
      </div>
      {/* body — agents tab gets its own full-height flex layout; charts tab scrolls */}
      {tab === "agents" ? (
        <div className="flex-1 min-h-0 flex flex-col" style={{ overflow: "hidden" }}>
          <AgentsChatPanel />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "thin" }}>
          <div className="space-y-4">
            {/* Signal Forest Plot */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
              <div className="p-4">
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 4 }}>Disproportionality by adverse event · FAERS Q3 2024</p>
                <SignalForestPlot onOpenAgentThread={onOpenAgentThread} />
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {(["strong", "moderate", "weak"] as const).map(l => (
                    <span key={l} className="flex items-center gap-1.5" style={{ fontSize: 12, color: C.text4 }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: SIGNAL_COLOR[l] }} />
                      {l === "strong" ? "Strong signal" : l === "moderate" ? "Moderate" : "Below threshold"}
                    </span>
                  ))}
                </div>
              </div>
              <ChartSourceRow chartId="forest" open={sourceOpen["forest"]} onToggle={() => toggleSource("forest")} onOpenAgentThread={onOpenAgentThread} />
            </div>

            {/* PRR Trend */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
              <div className="p-4">
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 2 }}>Hepatotoxicity PRR — FAERS Q4 2022 to Q3 2024</p>
                <p style={{ fontSize: 12, color: C.text4, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="#ef4444" viewBox="0 0 256 256"><path d="M232,56V120a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,124.69,29.66,191A8,8,0,0,1,18.34,179.71l72-72a8,8,0,0,1,11.32,0L128,140.69,204.69,64H160a8,8,0,0,1,0-16h64A8,8,0,0,1,232,56Z" /></svg>
                  Signal has exceeded the ICH E2E threshold for 6 consecutive quarters.
                </p>
                <PRRTrendChart onOpenAgentThread={onOpenAgentThread} />
              </div>
              <ChartSourceRow chartId="prr" open={sourceOpen["prr"]} onToggle={() => toggleSource("prr")} onOpenAgentThread={onOpenAgentThread} />
            </div>

            {/* Quarterly Case Volume */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
              <div className="p-4">
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 2 }}>Quarterly case volume · Ibuprofen vs. background</p>
                <p style={{ fontSize: 12, color: C.text4, marginBottom: 12 }}>Spontaneous reports per quarter. Ibuprofen cases are growing while background reporting is stable — consistent with an emerging signal.</p>
                <QuarterlyCaseChart onOpenAgentThread={onOpenAgentThread} />
              </div>
              <ChartSourceRow chartId="quarterly" open={sourceOpen["quarterly"]} onToggle={() => toggleSource("quarterly")} onOpenAgentThread={onOpenAgentThread} />
            </div>

            {/* Time-to-onset */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
              <div className="p-4">
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 2 }}>Time-to-onset distribution · Hepatotoxicity (N=412)</p>
                <p style={{ fontSize: 12, color: C.text4, marginBottom: 12 }}>Days from first drug exposure to onset of hepatotoxicity. Peak incidence at 8–30 days supports an idiosyncratic metabolic mechanism.</p>
                <TimeToOnsetChart onOpenAgentThread={onOpenAgentThread} />
              </div>
              <ChartSourceRow chartId="onset" open={sourceOpen["onset"]} onToggle={() => toggleSource("onset")} onOpenAgentThread={onOpenAgentThread} />
            </div>

            {/* Kaplan-Meier */}
            <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
              <div className="p-4">
                <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 2 }}>Kaplan–Meier · Event-free survival (hepatotoxicity)</p>
                <p style={{ fontSize: 12, color: C.text4, marginBottom: 12 }}>Time-to-event analysis comparing ibuprofen-exposed patients vs. unexposed reference cohort. Log-rank test p &lt; 0.001.</p>
                <KaplanMeierChart onOpenAgentThread={onOpenAgentThread} />
              </div>
              <ChartSourceRow chartId="km" open={sourceOpen["km"]} onToggle={() => toggleSource("km")} onOpenAgentThread={onOpenAgentThread} />
            </div>

            {/* Risk Matrices — one per signal */}
            {RISK_SIGNALS.map((sig, idx) => (
              <div key={sig.label} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: "#fff" }}>
                <div className="p-4">
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.text1, marginBottom: 2 }}>{sig.label} — Signal Risk Tier</p>
                  {idx === 0 && (
                    <p style={{ fontSize: 12, color: C.text4, marginBottom: 14, lineHeight: 1.5 }}>
                      Signal strength vs. clinical severity. Hepatotoxicity sits in the confirmed-signal / hospitalisation quadrant — consistent with Tier-1 regulatory action.
                    </p>
                  )}
                  <RiskMatrix signal={sig} showAxes={idx === 0} />
                </div>
                <ChartSourceRow chartId="risk" open={sourceOpen[`risk-${idx}`]} onToggle={() => toggleSource(`risk-${idx}`)} onOpenAgentThread={onOpenAgentThread} />
              </div>
            ))}
          </div>

          {/* collapsible query / code — charts tab only */}
          <div className="mt-4 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <button onClick={() => setQueryOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-2.5" style={{ background: C.pageBg }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}><path d="M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z" /></svg>
              <span style={{ fontSize: 14, fontWeight: 600, flex: 1, textAlign: "left", color: C.text2 }}>Query</span>
              <span onClick={(e) => { e.stopPropagation(); copyQuery(); }} style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, color: copied ? C.brandText : C.text4, background: copied ? C.brandSoft : "transparent" }}>{copied ? "Copied ✓" : "Copy"}</span>
              <motion.svg animate={{ rotate: queryOpen ? 180 : 0 }} transition={{ duration: 0.2 }} xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256" style={{ color: C.text4 }}><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" /></motion.svg>
            </button>
            <AnimatePresence initial={false}>
              {queryOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: "hidden" }}>
                  <pre style={{ padding: "12px 16px", fontSize: 11, lineHeight: 1.6, overflowX: "auto", background: C.codeBg, color: "#e8edf5", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", margin: 0 }}>{data.artifactQuery}</pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p style={{ fontSize: 11, marginTop: 12, textAlign: "center", color: C.text5 }}>Winnow is an AI and can make mistakes. Verify the query and statistics before clinical or regulatory use.</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Result Tabs ──────────────────────────────────────────────────

function ResultTabs({ data, onAsk, stream = false, onTick, onOpenArtifact, onShare }: {
  data: ResultData; onAsk?: (q: string) => void; stream?: boolean; onTick?: () => void;
  onOpenArtifact?: (d: ResultData) => void; onShare?: () => void;
}) {
  const [tab, setTab] = useState<ResultTab>("answer");
  const [highlightRef, setHighlightRef] = useState<number | null>(null);
  const refEls = useRef<Record<number, HTMLDivElement | null>>({});
  // Type the answer out once; tab switches afterwards show it instantly.
  const streamedRef = useRef(false);
  const [reportDone, setReportDone] = useState(!stream);
  const animateAnswer = stream && !streamedRef.current;

  const [isSigned, setIsSigned] = useState(data.params?.isSigned || false);
  const handleSign = () => {
    setIsSigned(true);
    if (data.params?.reportId) {
      window.dispatchEvent(new CustomEvent("winnow_report_signed", {
        detail: { reportId: data.params.reportId, title: data.artifactTitle }
      }));
    }
  };

  const tabs: { id: ResultTab; label: string }[] = [
    { id: "answer",     label: "Answer" },
    { id: "drug",       label: `Drug Info (${data.drugs.length})` },
    { id: "references", label: `References (${data.refs.length})` },
  ];

  const goToRef = (n: number) => {
    setTab("references");
    setHighlightRef(n);
    setTimeout(() => {
      refEls.current[n]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    setTimeout(() => setHighlightRef(null), 2200);
  };

  const copySummary = async () => {
    try { await navigator.clipboard.writeText(buildPlainSummary(data, data.params)); } catch { /* blocked */ }
  };
  const exportCSV = () => {
    const slug = (data.params.compound || "compound").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadBlob(`winnow-${slug}-signals.csv`, new Blob([buildSignalCSV(data)], { type: "text/csv;charset=utf-8" }));
  };
  const exportWord = () => {
    const slug = (data.params.compound || "compound").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadBlob(`winnow-${slug}-report.doc`, new Blob([buildReportHTML(data, data.params)], { type: "application/msword" }));
  };
  const exportPDF = () => {
    openPrintWindow(buildReportHTML(data, data.params));
  };

  return (
    <div className="mt-2">
      {onOpenArtifact && <ArtifactCard data={data} onOpen={() => onOpenArtifact(data)} />}
      <div className="flex gap-5 mb-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="text-[13px] font-medium pb-2.5 transition-colors"
            style={{
              color: tab === t.id ? C.text1 : C.text4,
              borderBottom: tab === t.id ? `2px solid ${C.brand}` : "2px solid transparent",
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {tab === "answer" && (
          <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {data.params?.isSurveillance && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
                marginBottom: 12
              }} className="animate-fadeIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span style={{ fontSize: 12, color: "#15803d", fontWeight: 650 }}>
                  These reports have also been sent to your email with all the necessary details.
                </span>
              </div>
            )}
            {data.params?.isSurveillance && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }} className="animate-fadeIn">
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Delta vs Last Run:</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                  <span>↑ {data.params.compound === "Pembrolizumab" ? "2 New" : "0 New"}</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" }}>
                  <span>↑ {data.params.compound === "Pembrolizumab" ? "1 Rising" : "0 Rising"}</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0" }}>
                  <span>→ {data.params.compound === "Pembrolizumab" ? "3 Stable" : "2 Stable"}</span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                  <span>↓ 0 Declining</span>
                </span>
              </div>
            )}
            <AnswerReport blocks={data.answer} signals={data.signals} onCite={goToRef}
              animate={animateAnswer} onTick={onTick}
              onDone={() => { streamedRef.current = true; setReportDone(true); }} />
            {reportDone && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} onAnimationStart={onTick}>
                <FeedbackBar
                  onCopy={copySummary}
                  onExportCSV={exportCSV}
                  onExportWord={exportWord}
                  onExportPDF={exportPDF}
                  onShare={onShare}
                  isSurveillance={data.params?.isSurveillance}
                  isSigned={isSigned}
                  onSign={handleSign}
                />
                <SuggestedQuestions questions={data.suggested} onAsk={onAsk} />
              </motion.div>
            )}
          </motion.div>
        )}
        {tab === "drug" && (
          <motion.div key="drug" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {data.drugs.map(d => <DrugInfoCard key={d.name} drug={d} refs={data.refs} />)}
          </motion.div>
        )}
        {tab === "references" && (
          <motion.div key="refs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {data.refs.map((ref, i) => (
              <ReferenceItem key={ref.n} item={ref} isLast={i === data.refs.length - 1}
                highlight={highlightRef === ref.n}
                refEl={el => { refEls.current[ref.n] = el; }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Message Bubbles ──────────────────────────────────────────────
function UserBubble({ text, agentThread }: { text: string; agentThread?: string }) {
  const threadAgent = agentThread ? AGENTS.find(a => a.id === agentThread) : null;
  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
      <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        {threadAgent && (
          <span style={{ fontSize: 11, fontWeight: 700, color: threadAgent.color, background: `${threadAgent.color}18`, border: `1px solid ${threadAgent.color}40`, borderRadius: 20, padding: "2px 8px", letterSpacing: "0.01em" }}>
            @{threadAgent.name}
          </span>
        )}
        <div style={{ padding: "10px 16px", borderRadius: "18px 18px 4px 18px", fontSize: 15, lineHeight: 1.6, background: C.brandSoft, border: "1px solid #86efac", color: C.brandText, fontFamily: "Manrope, sans-serif" }}>
          {text}
        </div>
      </div>
    </motion.div>
  );
}

function PermissionRequestBox({
  comp,
  locked,
  onComponentAction,
}: {
  comp: { kind: "permission-request"; agentId: string; requestText: string; costNote?: string };
  locked?: boolean;
  onComponentAction?: (userText: string, stateUpdate: Partial<AnalysisState>) => void;
}) {
  const [showSignModal, setShowSignModal] = useState(false);
  const [attested, setAttested] = useState(false);
  const [signatureUploadError, setSignatureUploadError] = useState<string | null>(null);
  const [sigText, setSigText] = useState<string>(localStorage.getItem("winnow_sig") || "");
  const ag = AGENTS.find(a => a.id === comp.agentId) || AGENTS[0];
  const hasUploadedSignature = sigText.startsWith("data:image/");
  const signedAt = new Date().toISOString();

  return (
    <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 16, background: "#fff", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <AgentIcon sides={ag.sides} color={ag.color} size={22} />
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: ag.color }}>{ag.name}</p>
          <p style={{ fontSize: 11, color: C.text4 }}>is requesting permission</p>
        </div>
      </div>
      <p style={{ fontSize: 13.5, color: C.text1, lineHeight: 1.6, marginBottom: comp.costNote ? 6 : 14 }}>{comp.requestText}</p>
      {comp.costNote && <p style={{ fontSize: 11.5, color: C.text4, marginBottom: 14 }}>{comp.costNote}</p>}
      
      {!locked && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowSignModal(true)}
            style={{ flex: 1, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: "none", background: C.brand, color: "#fff", cursor: "pointer" }}>
            Approve
          </button>
          <button onClick={() => onComponentAction?.("__deny__", {})}
            style={{ flex: 1, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: `1.5px solid #fca5a5`, background: "transparent", color: "#dc2626", cursor: "pointer" }}>
            Deny
          </button>
          <button onClick={() => onComponentAction?.("__other__", {})}
            style={{ flex: 1, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: `1.5px solid ${C.border}`, background: "transparent", color: C.text3, cursor: "pointer" }}>
            Other
          </button>
        </div>
      )}

      {showSignModal && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.40)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: "#fff", borderRadius: 20, maxWidth: 420, width: "100%", padding: 24,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text1, marginBottom: 12 }}>Attest & Sign Report</h3>
            <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, marginBottom: 16 }}>
              Apply your uploaded signature image as a 21 CFR Part 11 reviewer attestation for this safety report.
            </p>
            
            <div style={{
              background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 18, minHeight: 80, justifyContent: "center"
            }}>
              <span style={{ fontSize: 11, color: C.text4, textTransform: "uppercase", letterSpacing: 0.5 }}>Reviewer Signature</span>
              {hasUploadedSignature ? (
                <img src={sigText} alt="Reviewer Signature" style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }} />
              ) : (
                <label style={{
                  border: `2px dashed ${C.border}`, borderRadius: 12, padding: "16px", width: "100%",
                  textAlign: "center", cursor: "pointer", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 8
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span style={{ fontSize: 12.5, color: C.text2, fontWeight: 600 }}>Upload signature image</span>
                  <span style={{ fontSize: 11, color: C.text4 }}>PNG, JPG, or SVG mark required before signing</span>
                  <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: "none" }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setSignatureUploadError("No signature file was selected.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const result = event.target?.result;
                        if (typeof result !== "string" || !result.startsWith("data:image/")) {
                          setSignatureUploadError(`Signature upload failed for ${file.name}: expected image data URL, received ${typeof result}.`);
                          return;
                        }
                        setSigText(result);
                        setSignatureUploadError(null);
                        localStorage.setItem("winnow_sig", result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
            {signatureUploadError && <p style={{ fontSize: 11.5, color: "#dc2626", lineHeight: 1.4, margin: "-8px 0 12px 0" }}>{signatureUploadError}</p>}

            <div style={{ fontSize: 11.5, color: C.text4, lineHeight: 1.45, marginBottom: 12 }}>
              Timestamp: <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: C.text2 }}>{signedAt}</span>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} disabled={!hasUploadedSignature} style={{ marginTop: 3, accentColor: C.brand }} />
              <span style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.4 }}>
                I, Raya Surya, apply my uploaded signature to authorize this report and confirm my intent to sign under 21 CFR Part 11.
              </span>
            </label>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowSignModal(false)}
                style={{ flex: 1, padding: "10px 16px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: `1px solid ${C.border}`, background: "#fff", color: C.text2, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                disabled={!hasUploadedSignature || !attested}
                onClick={() => {
                  setShowSignModal(false);
                  onComponentAction?.("__approve__", {});
                }}
                style={{
                  flex: 1, padding: "10px 16px", fontSize: 13, fontWeight: 600, borderRadius: 10, border: "none",
                  background: hasUploadedSignature && attested ? C.brand : "#cbd5e1", color: "#fff",
                  cursor: hasUploadedSignature && attested ? "pointer" : "not-allowed"
                }}>
                Sign & Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function renderFlowComponent(
  comp: FlowComponent, locked: boolean, selection: string | undefined,
  onComponentAction?: (userText: string, stateUpdate: Partial<AnalysisState>) => void,
  onTraceComplete?: () => void,
  onAsk?: (q: string) => void,
  stream?: boolean,
  onTick?: () => void,
  onActiveAgents?: (ids: string[]) => void,
  onOpenArtifact?: (d: ResultData) => void,
  onShare?: () => void,
  onPatchState?: (patch: Partial<AnalysisState>) => void,
): React.ReactNode {
  switch (comp.kind) {
    case "compound-selector":
      return <CompoundSelector locked={locked} selection={selection} onSelect={c => onComponentAction?.(c, { compound: c })} />;
    case "date-range-selector":
      return <DateRangePills locked={locked} selection={selection} onSelect={p => onComponentAction?.(p, { period: p })} />;
    case "category-pills":
      return (
        <CategoryPills
          locked={locked}
          selection={selection}
          onSelect={(cats, text, adv, type, scienceUpdate) =>
            onComponentAction?.(text, {
              categories: cats,
              ...(adv ? { advanced: adv } : {}),
              ...(type ? { analysisType: type } : {}),
              ...(scienceUpdate ? { science: scienceUpdate } : {})
            })
          }
        />
      );
    case "pre-analysis-card":
      return <PreAnalysisCard params={comp.params} locked={locked}
        onRun={() => onComponentAction?.("Run Analysis", {})}
        onEdit={() => onComponentAction?.("__edit__", {})}
        onPatchState={onPatchState} />;
    case "planning-trace":
      return <PlanningTrace readOnly={locked} onComplete={onTraceComplete} onActiveAgents={onActiveAgents} onTick={onTick} />;
    case "result-tabs":
      return <ResultTabs data={comp.data} onAsk={onAsk} stream={stream} onTick={onTick} onOpenArtifact={onOpenArtifact} onShare={onShare} />;
    case "permission-request": {
      return <PermissionRequestBox comp={comp} locked={locked} onComponentAction={onComponentAction} />;
    }
    default:
      return null;
  }
}

function AgentBubble({ agent, text, typing = false, component, locked = false, selection, stream = false, thought, activityMode = "thinking", agentThread, onComponentAction, onTraceComplete, onAsk, onStreamTick, onActive, onActiveAgents, onOpenArtifact, onShare, onPatchState }: {
  agent: string; text?: string; typing?: boolean;
  component?: FlowComponent; locked?: boolean; selection?: string; stream?: boolean; thought?: AgentThought;
  activityMode?: AgentActivity; agentThread?: string;
  onComponentAction?: (userText: string, stateUpdate: Partial<AnalysisState>) => void;
  onTraceComplete?: () => void;
  onAsk?: (q: string) => void;
  onStreamTick?: () => void;
  onActive?: (id: string | null, mode: AgentActivity) => void;
  onActiveAgents?: (ids: string[]) => void;
  onOpenArtifact?: (d: ResultData) => void;
  onShare?: () => void;
  onPatchState?: (patch: Partial<AnalysisState>) => void;
}) {
  const a = AGENTS.find(x => x.id === agent) || AGENTS[0];
  const isThreaded = !!agentThread;
  // Reveal an attached component only after the text finishes streaming.
  const [textDone, setTextDone] = useState(!stream);

  // Light up this agent in the sidebar while its text is actively streaming.
  const onActiveRef = useRef(onActive);
  useEffect(() => { onActiveRef.current = onActive; });
  useEffect(() => {
    if (stream && !typing && (text || "").trim()) onActiveRef.current?.(agent, activityMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mb-5 items-start">
      <AgentIcon sides={a.sides} color={a.color} size={28} pulse={typing} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-[12.5px] font-bold" style={{ color: a.color }}>{a.name}</span>
          <span className="text-[11.5px]" style={{ color: C.text4 }}>{a.role}</span>
        </div>
        <div className="px-4 py-3.5 rounded-2xl rounded-tl-md text-[15px] leading-[1.75]"
          style={{ background: isThreaded ? `${a.color}08` : C.card, border: `1px solid ${isThreaded ? `${a.color}35` : C.border}`, color: C.text2, fontFamily: "Manrope, sans-serif", boxShadow: C.shadowSm }}>
          {typing
            ? <TypingDots color={a.color} />
            : <StreamingResponse text={text || ""} animate={stream} onTick={onStreamTick}
                onDone={() => { setTextDone(true); onActiveRef.current?.(null, activityMode); }} />}
        </div>
        {thought && !typing && textDone && <ThoughtDisclosure thought={thought} />}
        {component && !typing && textDone && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onAnimationStart={onStreamTick}>
            {renderFlowComponent(component, locked, selection, onComponentAction, onTraceComplete, onAsk, stream, onStreamTick, onActiveAgents, onOpenArtifact, onShare, onPatchState)}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function TypingDots({ color }: { color: string }) {
  return (
    <div className="flex gap-1.5 py-0.5">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: color, opacity: 0.5 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  );
}

function ResponseRenderer({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i} style={{ color: C.text1, fontWeight: 700 }}>{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  );
}

// Tokenize "**bold** plain" text into word-chunks (word + trailing space) that
// carry their bold flag, so we can reveal them one at a time without ever
// flashing a half-open "**" marker.

function tokenizeText(text: string): WordTok[] {
  const toks: WordTok[] = [];
  for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    const bold = part.startsWith("**") && part.endsWith("**");
    const inner = bold ? part.slice(2, -2) : part;
    for (const chunk of inner.match(/\S+\s*|\s+/g) ?? []) toks.push({ word: chunk, bold });
  }
  return toks;
}

// Streams an agent response word-by-word like a live chatbot. Animates once on
// mount; on completion fires onDone (used to reveal any attached component).
function StreamingResponse({ text, animate, onTick, onDone, msPerToken = 42 }: {
  text: string; animate: boolean; onTick?: () => void; onDone?: () => void; msPerToken?: number;
}) {
  const tokens = useMemo(() => tokenizeText(text), [text]);
  const [shown, setShown] = useState(animate ? 0 : tokens.length);
  const onTickRef = useRef(onTick); const onDoneRef = useRef(onDone);
  useEffect(() => { onTickRef.current = onTick; onDoneRef.current = onDone; });

  useEffect(() => {
    if (!animate) { onDoneRef.current?.(); return; }
    if (shown >= tokens.length) { onDoneRef.current?.(); return; }
    const id = setTimeout(() => { setShown(s => s + 1); onTickRef.current?.(); }, msPerToken);
    return () => clearTimeout(id);
  }, [shown, tokens.length, animate, msPerToken]);

  const done = shown >= tokens.length;
  return (
    <span>
      {tokens.slice(0, shown).map((t, i) =>
        t.bold
          ? <strong key={i} style={{ color: C.text1, fontWeight: 700 }}>{t.word}</strong>
          : <span key={i}>{t.word}</span>
      )}
      {!done && (
        <span aria-hidden style={{
          display: "inline-block", width: 7, height: "1.05em", marginLeft: 1,
          verticalAlign: "text-bottom", borderRadius: 1, background: C.brand,
          animation: "streamBlink 1s steps(1) infinite",
        }} />
      )}
    </span>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────
function WelcomeScreen({ onSend }: { onSend: (t: string) => void }) {
  const [greeting] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);
  const [beaming, setBeaming] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx(i => (i + 1) % WELCOME_PHRASES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // One full border-beam sweep on submit, then hand off to the chat.
  const send = (text: string) => {
    if (!text.trim() || beaming) return;
    setBeaming(true);
    setTimeout(() => { setBeaming(false); onSend(text); }, BEAM_MS);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 relative overflow-hidden"
      style={{ background: C.pageBg }}>
      <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        className="text-[26px] font-normal leading-tight text-center mb-10"
        style={{ color: C.text3, fontFamily: "Manrope, sans-serif" }}>
        {greeting}
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.1 }}
        className="relative w-full max-w-[680px]">
        <div className="absolute inset-x-8 -bottom-6 h-16 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(5,150,105,0.13) 0%, transparent 70%)", filter: "blur(12px)" }} />
        <ChatInputBar onSend={send} placeholder={WELCOME_PHRASES[phraseIdx]} beaming={beaming} />
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.18 }}
        className="text-[11.5px] mt-3 text-center" style={{ color: C.text5 }}>
        Winnow is an AI and can make mistakes. Verify important information.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.28 }}
        className="flex items-center gap-2.5 mt-4 flex-wrap justify-center">
        {PROMPT_CHIPS.map(chip => (
          <button key={chip.label} onClick={() => send(chip.prompt)}
            onMouseEnter={() => setHoveredChip(chip.label)} onMouseLeave={() => setHoveredChip(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all duration-150"
            style={{
              background: hoveredChip === chip.label ? C.card : "transparent",
              border: `1px solid ${hoveredChip === chip.label ? C.borderMid : C.border}`,
              color: hoveredChip === chip.label ? C.text2 : C.text3,
              boxShadow: hoveredChip === chip.label ? C.shadowSm : "none",
            }}>
            {chip.label}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

function parseQueryToConfig(query: string): AnalysisState {
  const lower = query.toLowerCase();
  
  let type: "signal" | "cohort" | "genomics" | "benefit-risk" | "literature" = "signal";
  let compound = "";
  let period = "Q3 2024";
  let categories: string[] = [];
  let science: AnalysisScience = { sources: ["faers", "eudravigilance"] };

  // Detect compound
  for (const d of DRUGS_LIST) {
    if (lower.includes(d.toLowerCase())) {
      compound = d;
      break;
    }
  }

  // Detect type
  if (lower.includes("genomic") || lower.includes("variant") || lower.includes("cyp2d6") || lower.includes("audit") || lower.includes("pgx")) {
    type = "genomics";
    science.sources = ["clinvar", "gnomad", "ensembl"];
    science.gene = "CYP2D6"; // default
    for (const g of GENES_LIST) {
      if (lower.includes(g.toLowerCase())) {
        science.gene = g;
        break;
      }
    }
  } else if (lower.includes("cohort") || lower.includes("population") || lower.includes("build a cohort") || lower.includes("cohort builder")) {
    type = "cohort";
    science.sources = ["faers"];
  } else if (lower.includes("benefit-risk") || lower.includes("profile") || lower.includes("b/r") || lower.includes("benefit - risk")) {
    type = "benefit-risk";
    science.sources = ["faers", "clinicaltrials", "pubmed", "europepmc", "chembl"];
  } else if (lower.includes("literature") || lower.includes("review") || lower.includes("citation") || lower.includes("pubmed") || lower.includes("europepmc")) {
    type = "literature";
    science.sources = ["europepmc", "pubmed", "biorxiv", "openalex"];
  }

  // Detect adverse events / categories
  for (const c of MEDDRA_LIST) {
    const parts = c.split(/[\/&]/).map(p => p.trim().toLowerCase());
    for (const part of parts) {
      if (part.length > 3 && lower.includes(part)) {
        if (!categories.includes(c)) {
          categories.push(c);
        }
      }
    }
  }
  // Default category if signal and empty
  if (type === "signal" && categories.length === 0) {
    categories = ["Hepatobiliary / Hepatotoxicity"];
  }

  // Detect period
  if (lower.includes("2024")) {
    period = "Full 2024";
  } else if (lower.includes("2020")) {
    period = "2020–2024";
  }

  let seriousness: string[] = [];
  if (lower.includes("serious")) {
    seriousness = ["Serious"];
  }

  return {
    compound,
    period,
    categories,
    analysisType: type,
    science,
    advanced: {
      ...DEFAULT_ADVANCED,
      caseDetails: {
        ...DEFAULT_ADVANCED.caseDetails,
        seriousness
      }
    }
  };
}

// ─── Chat Screen (step-gated Safety Signal Detection flow) ────────
function ChatScreen({ initialMessage, onActivity, onShare, panelFull, setPanelFull }: {
  initialMessage: string;
  onActivity?: (m: Record<string, AgentActivity>) => void;
  onShare?: () => void;
  panelFull: boolean;
  setPanelFull: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [beaming, setBeaming] = useState(false);
  const [activeThreadAgentId, setActiveThreadAgentId] = useState<string | null>(null);
  const threadTurnRef = useRef(0);
  const [artifact, setArtifact] = useState<ResultData | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ compound: "", period: "", categories: [] });
  const idRef = useRef(0);
  const nextStepRef = useRef(0);
  const analysisStateRef = useRef<AnalysisState>({ compound: "", period: "", categories: [] });
  const onActivityRef = useRef(onActivity);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Local overrides for setTimeout/clearTimeout to automatically track and cancel timers on stop
  const activeTimersRef = useRef<any[]>([]);
  const localSetTimeout = useCallback((handler: (...args: any[]) => void, timeout?: number) => {
    const timerId = window.setTimeout(() => {
      activeTimersRef.current = activeTimersRef.current.filter(t => t !== timerId);
      handler();
    }, timeout);
    activeTimersRef.current.push(timerId);
    return timerId;
  }, []);
  const localClearTimeout = useCallback((timerId: any) => {
    window.clearTimeout(timerId);
    activeTimersRef.current = activeTimersRef.current.filter(t => t !== timerId);
  }, []);
  const setTimeout = localSetTimeout;
  const clearTimeout = localClearTimeout;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      activeTimersRef.current.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => { onActivityRef.current = onActivity; }, [onActivity]);
  useEffect(() => { analysisStateRef.current = analysisState; }, [analysisState]);

  // Sidebar activity is the union of three concurrent signals: the typing-dots
  // agent, the set of agents reasoning in the trace (can be several at once),
  // and the agent currently streaming a message (with its mode).
  const typingRef = useRef<string | null>(null);
  const traceActiveRef = useRef<string[]>([]);
  const streamActiveRef = useRef<{ id: string; mode: AgentActivity } | null>(null);
  const pushActivity = useCallback(() => {
    const m: Record<string, AgentActivity> = {};
    traceActiveRef.current.forEach(id => { m[id] = "thinking"; });
    if (typingRef.current) m[typingRef.current] = "thinking";
    if (streamActiveRef.current) m[streamActiveRef.current.id] = streamActiveRef.current.mode;
    onActivityRef.current?.(m);
  }, []);
  const reportTraceActive = useCallback((ids: string[]) => { traceActiveRef.current = ids; pushActivity(); }, [pushActivity]);
  const reportStreamActive = useCallback((id: string | null, mode: AgentActivity) => {
    streamActiveRef.current = id ? { id, mode } : null; pushActivity();
  }, [pushActivity]);

  const atBottomRef = useRef(true);
  const handleChatScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (!atBottomRef.current) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  // Only follow the stream if the user hasn't scrolled up.
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, []);

  const setTypingAgent = useCallback((id: string | null) => {
    setTyping(id);
    typingRef.current = id;
    pushActivity();
  }, [pushActivity]);

  const handleStop = useCallback(() => {
    // 1. Clear all active timeouts
    activeTimersRef.current.forEach(window.clearTimeout);
    activeTimersRef.current = [];

    // 2. Reset states and refs
    setIsAnalyzing(false);
    setTypingAgent(null);
    traceActiveRef.current = [];
    streamActiveRef.current = null;
    pushActivity();

    // 3. Lock active/unfinished agent bubbles
    setMessages(prev =>
      prev.map(m => (m.type === "agent" && !m.locked ? { ...m, locked: true } : m))
    );

    // 4. Print stop notification
    setMessages(prev => [
      ...prev,
      {
        id: ++idRef.current,
        type: "agent",
        agent: "planner",
        text: "Analysis stopped by user.",
        locked: true,
      },
    ]);
  }, [setTypingAgent, pushActivity]);

  const playStep = useCallback((stepIdx: number, state: AnalysisState) => {
    if (stepIdx >= SAFETY_STEPS.length) return;
    const step = SAFETY_STEPS[stepIdx];
    setIsAnalyzing(true);
    setTypingAgent(step.agentId);
    setTimeout(() => {
      setTypingAgent(null);
      const id = ++idRef.current;
      setMessages(prev => [...prev, {
        id, type: "agent", agent: step.agentId,
        text: step.getText(state),
        component: step.getComponent?.(state),
        locked: false,
      }]);
    }, step.typingMs);
  }, [setTypingAgent]);

  useEffect(() => {
    try {
      // Check if this is a mock conversation (from history)
      const mockConv = MOCK_CONVERSATIONS[initialMessage];
      if (mockConv && mockConv.messages && mockConv.messages.length > 0) {
        // Load mock conversation instantly — no streaming animation
        setMessages(mockConv.messages.map(m => ({ ...m, noStream: true, locked: true })));
        setArtifact(mockConv.artifact);
        nextStepRef.current = mockConv.messages.length;
      } else {
        // Normal flow: run describe-parser immediately on the custom query / prompt chip
        const parsedState = parseQueryToConfig(initialMessage);
        setAnalysisState(parsedState);
        analysisStateRef.current = parsedState;

        const id = ++idRef.current;
        setMessages([
          { id, type: "user", text: initialMessage },
          {
            id: ++idRef.current,
            type: "agent",
            agent: "planner",
            text: `Planner interpretation: Seeding a **${parsedState.analysisType === "benefit-risk" ? "Benefit-Risk Profile" : parsedState.analysisType.charAt(0).toUpperCase() + parsedState.analysisType.slice(1)}** configuration card. Please review or click any token to edit.`,
            thought: {
              interpretation: `User query: "${initialMessage}". Parsed analysisType: ${parsedState.analysisType}. Seeding configuration card with sensible defaults.`,
              steps: [
                { kind: "reason", text: "Parsed user query to generate pre-analysis configuration card." }
              ]
            },
            component: { kind: "pre-analysis-card", params: parsedState }
          }
        ]);
        nextStepRef.current = 4;
      }
    } catch (err) {
      console.error("ChatScreen init error:", err);
      // Fallback: just show the initial message
      const id = ++idRef.current;
      setMessages([{ id, type: "user", text: initialMessage }]);
      nextStepRef.current = 1;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComponentAction = useCallback((userText: string, stateUpdate: Partial<AnalysisState>) => {
    // Edit — keep chat history, reset selections, show category selection again
    if (userText === "__edit__") {
      const freshState = { compound: "", period: "", categories: [] };
      setAnalysisState(freshState);
      analysisStateRef.current = freshState;
      nextStepRef.current = 1;
      // Add a new message with the category selection component, keep chat history
      setMessages(prev => [...prev, {
        id: ++idRef.current,
        type: "agent",
        agent: "planner",
        text: "Let me help you adjust your query. Pick one or more therapeutic areas to focus on:",
        component: { kind: "category-pills" },
      }]);
      return;
    }

    const newState = { ...analysisStateRef.current, ...stateUpdate };
    setAnalysisState(newState);
    analysisStateRef.current = newState;

    // Lock the last agent message
    setMessages(prev => {
      let idx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].type === "agent") { idx = i; break; }
      }
      if (idx === -1) return prev;
      return prev.map((m, i) => i === idx ? { ...m, locked: true, selection: userText } : m);
    });

    const userId = ++idRef.current;
    setMessages(prev => [...prev, { id: userId, type: "user", text: userText }]);

    const step = nextStepRef.current++;
    playStep(step, newState);
  }, [playStep]);

  const handlePatchState = useCallback((patch: Partial<AnalysisState>) => {
    const mergeState = (prev: AnalysisState): AnalysisState => {
      const next: AnalysisState = { ...prev, ...patch };
      if (prev.science || patch.science) {
        next.science = { ...(prev.science || {}), ...(patch.science || {}) };
      }
      if (prev.advanced || patch.advanced) {
        const prevAdv = prev.advanced || {};
        const patchAdv = patch.advanced || {};
        next.advanced = {
          ...prevAdv,
          ...patchAdv,
          temporal: (prevAdv.temporal || patchAdv.temporal) ? { ...(prevAdv.temporal || {}), ...(patchAdv.temporal || {}) } : undefined,
          demographics: (prevAdv.demographics || patchAdv.demographics) ? { ...(prevAdv.demographics || {}), ...(patchAdv.demographics || {}) } : undefined,
          caseDetails: (prevAdv.caseDetails || patchAdv.caseDetails) ? { ...(prevAdv.caseDetails || {}), ...(patchAdv.caseDetails || {}) } : undefined,
          geographic: (prevAdv.geographic || patchAdv.geographic) ? { ...(prevAdv.geographic || {}), ...(patchAdv.geographic || {}) } : undefined,
          drugDetails: (prevAdv.drugDetails || patchAdv.drugDetails) ? { ...(prevAdv.drugDetails || {}), ...(patchAdv.drugDetails || {}) } : undefined,
          signalDetection: (prevAdv.signalDetection || patchAdv.signalDetection) ? { ...(prevAdv.signalDetection || {}), ...(patchAdv.signalDetection || {}) } : undefined,
        } as any;
      }
      return next;
    };

    setAnalysisState(prev => {
      const next = mergeState(prev);
      analysisStateRef.current = next;
      return next;
    });

    setMessages(prev => prev.map(m => {
      if (m.component && m.component.kind === "pre-analysis-card" && !m.locked) {
        return {
          ...m,
          component: {
            ...m.component,
            params: mergeState(m.component.params)
          }
        };
      }
      return m;
    }));
  }, []);

  const handleTraceComplete = useCallback(() => {
    // Lock the planning-trace message immediately so re-mounts see readOnly=true
    setMessages(prev => {
      let idx = -1;
      for (let k = prev.length - 1; k >= 0; k--) {
        if (prev[k].type === "agent") { idx = k; break; }
      }
      if (idx === -1) return prev;
      return prev.map((m, k) => k === idx ? { ...m, locked: true } : m);
    });

    const state = analysisStateRef.current;
    let i = 0;
    const playNext = () => {
      if (i >= SYNTHESIS_SEQUENCE.length) {
        // All done — force-clear every agent's active state
        setTimeout(() => onActivityRef.current?.({}), 800);
        return;
      }
      const item = SYNTHESIS_SEQUENCE[i];
      setTypingAgent(item.agentId);
      setTimeout(() => {
        setTypingAgent(null);
        const id = ++idRef.current;
        setMessages(prev => [...prev, {
          id, type: "agent", agent: item.agentId,
          text: item.getText(state),
          component: item.result ? { kind: "result-tabs", data: buildResultData(state) } : undefined,
          locked: true,
        }]);
        i++;
        playNext();
      }, item.delayMs);
    };
    playNext();
  }, [setTypingAgent]);

  const handleFreeSend = (text: string) => {
    if (!text.trim() || beaming) return;
    const id = ++idRef.current;
    const threadAgent = activeThreadAgentId;
    setMessages(prev => [...prev, { id, type: "user", text, agentThread: threadAgent ?? undefined }]);
    setBeaming(true);

    // Refine by chat: Check if configuration card is currently active (pre-analysis-card and unlocked)
    const isConfigPhase = messages.some(m => m.component?.kind === "pre-analysis-card" && !m.locked);
    if (isConfigPhase) {
      setTypingAgent("planner");
      setTimeout(() => {
        setBeaming(false);
        setTypingAgent(null);
        
        const patch: Partial<AnalysisState> = {};
        const lower = text.toLowerCase();
        const state = analysisStateRef.current;
        
        if (lower.includes("serious")) {
          patch.advanced = { ...state.advanced, caseDetails: { ...(state.advanced?.caseDetails || DEFAULT_ADVANCED.caseDetails), seriousness: ["Serious"] } } as any;
        } else if (lower.includes("all severity") || lower.includes("all severities") || lower.includes("all severity levels")) {
          patch.advanced = { ...state.advanced, caseDetails: { ...(state.advanced?.caseDetails || DEFAULT_ADVANCED.caseDetails), seriousness: [] } } as any;
        }
        
        if (lower.includes("2024")) {
          patch.period = lower.includes("q3") ? "Q3 2024" : "Full 2024";
        } else if (lower.includes("2020")) {
          patch.period = "2020–2024";
        } else if (lower.includes("all time") || lower.includes("all-time")) {
          patch.period = "All-time";
        }
        
        for (const d of DRUGS_LIST) {
          if (lower.includes(d.toLowerCase())) {
            patch.compound = d;
            break;
          }
        }
        
        const addedSources: SourceId[] = [];
        for (const [src, label] of Object.entries(SOURCE_LABELS)) {
          if (lower.includes(src.toLowerCase()) || lower.includes(label.toLowerCase())) {
            addedSources.push(src as SourceId);
          }
        }
        if (addedSources.length > 0) {
          patch.science = { ...(state.science || {}), sources: [...(state.science?.sources || []), ...addedSources] } as any;
        }
        
        const addedCats: string[] = [];
        for (const c of MEDDRA_LIST) {
          const parts = c.split(/[\/&]/).map(p => p.trim().toLowerCase());
          for (const part of parts) {
            if (part.length > 3 && lower.includes(part)) {
              addedCats.push(c);
            }
          }
        }
        if (addedCats.length > 0) {
          patch.categories = [...(state.categories || []), ...addedCats];
        }
        
        for (const g of GENES_LIST) {
          if (lower.includes(g.toLowerCase())) {
            patch.science = { ...(state.science || {}), gene: g } as any;
            break;
          }
        }

        handlePatchState(patch);
        
        const rid = ++idRef.current;
        setMessages(prev => [...prev, {
          id: rid,
          type: "agent",
          agent: "planner",
          text: "Understood. I have updated the configuration parameters in the card above based on your message.",
          locked: true
        }]);
      }, 1200);
      return;
    }

    const lowerText = text.toLowerCase();
    const isPembro = initialMessage === "Pembrolizumab — Weekly";
    const isAtorva = initialMessage === "Atorvastatin — Monthly";

    setTimeout(() => {
      setBeaming(false);
      if (isPembro) {
        setTypingAgent("medical");
        setTimeout(() => {
          setTypingAgent(null);
          const rid = ++idRef.current;
          let replyText = "I have analyzed the current run data for Pembrolizumab. Let me know if you need to run disproportionality statistics or pull references.";
          
          if (lowerText.includes("myocarditis") || lowerText.includes("jump")) {
            replyText = "**Myocarditis** rose from PRR 3.2 to 4.1 this week due to 3 new Grade 3/4 spontaneous ICSR reports from EU clinical sites. The underlying mechanism is T-cell mediated cardiomyocyte infiltration. Standard steroids protocol recommended.";
          } else if (lowerText.includes("compare") || lowerText.includes("last week")) {
            replyText = "Compared to last week's run (2026-06-06), overall active signals rose from 3 to 5. New signals are Myocarditis (PRR 4.1, n=5) and Nephritis (PRR 2.4, n=8). Pneumonitis remains stable at PRR 3.5.";
          } else if (lowerText.includes("threshold") || lowerText.includes("above")) {
            replyText = "Yes. Myocarditis (PRR 4.1) and Pneumonitis (PRR 3.5) are currently above the safety threshold of 3.0. Both have been flagged for review.";
          } else if (lowerText.includes("source") || lowerText.includes("data")) {
            replyText = "Data is compiled from FDA FAERS (Q2 2026 partial), EMA EudraVigilance, and WHO VigiBase spontaneous reporting systems, coded under MedDRA v27.0.";
          } else {
            replyText = "I'll look into that and cross-reference the relevant safety data for Pembrolizumab.";
          }
          
          setMessages(prev => [...prev, {
            id: rid, type: "agent", agent: "medical",
            text: replyText,
            locked: true,
            agentThread: "medical"
          }]);
        }, 1200);
      } else if (isAtorva) {
        setTypingAgent("medical");
        setTimeout(() => {
          setTypingAgent(null);
          const rid = ++idRef.current;
          let replyText = "Atorvastatin safety surveillance shows stable parameters. No alerts are active.";
          
          if (lowerText.includes("new") || lowerText.includes("alert")) {
            replyText = "No new signals or PRR threshold violations were detected for Atorvastatin in this monthly run. The disproportionality profile remains completely stable.";
          } else if (lowerText.includes("stable") || lowerText.includes("background")) {
            replyText = "Stable background signals include Myalgia (PRR 1.8, n=120) and Mild Transaminase Elevation (PRR 1.4, n=45). Neither meets the disproportionality criteria (PRR >= 2.0).";
          } else if (lowerText.includes("next") || lowerText.includes("scheduled")) {
            replyText = "The Atorvastatin surveillance task is scheduled to run monthly. The next run is scheduled for July 1, 2026 at 00:00 UTC.";
          } else {
            replyText = "I'll look into that and cross-reference the Atorvastatin safety parameters.";
          }
          
          setMessages(prev => [...prev, {
            id: rid, type: "agent", agent: "medical",
            text: replyText,
            locked: true,
            agentThread: "medical"
          }]);
        }, 1200);
      } else if (threadAgent === "medical") {
        // Continue Medical Reviewer multi-turn conversation
        const turn = threadTurnRef.current;
        const script = MEDICAL_THREAD_SCRIPT;
        setTypingAgent("medical");
        setTimeout(() => {
          setTypingAgent(null);
          const rid = ++idRef.current;
          if (turn < script.length) {
            setMessages(prev => [...prev, {
              id: rid, type: "agent", agent: "medical",
              text: script[turn](""),
              locked: true, agentThread: "medical",
            }]);
            threadTurnRef.current = turn + 1;
          } else {
            // Conversation complete — hand back to Planner
            setMessages(prev => [...prev, {
              id: rid, type: "agent", agent: "medical",
              text: "I think we've covered the key points. I'll hand this summary to Planner to incorporate into your report draft.",
              locked: true, agentThread: "medical",
            }]);
            setActiveThreadAgentId(null);
            threadTurnRef.current = 0;
          }
        }, 1200);
      } else {
        setTypingAgent("planner");
        setTimeout(() => {
          setTypingAgent(null);
          const rid = ++idRef.current;
          setMessages(prev => [...prev, {
            id: rid, type: "agent", agent: "planner",
            text: "I'll look into that and cross-reference the relevant safety data.",
            locked: true,
          }]);
        }, 1200);
      }
    }, BEAM_MS);
  };

  const CHART_LABEL: Record<string, string> = {
    forest: "Signal Forest Plot", prr: "PRR Trend", quarterly: "Quarterly Case Volume",
    onset: "Time-to-Onset", km: "Kaplan–Meier", risk: "Risk Matrix",
  };

  // Multi-turn Medical Reviewer conversation script. Each turn is a reply + next question.
  const MEDICAL_THREAD_SCRIPT = [
    // turn 0 — after user's first message
    (chartLabel: string) => `Happy to walk through the **${chartLabel}** data. The hepatotoxicity PRR of 3.2 (95% CI 2.1–4.8) exceeds the Evans threshold and has held for 6 consecutive quarters — that's a Tier-1 signal by WHO-UMC criteria.\n\nFirst question: are you evaluating this signal for **label update**, **risk minimisation**, or **regulatory submission**? That affects which statistics I should emphasise.`,
    // turn 1 — after user's first reply
    (_chartLabel: string) => `Got it. For that use case I'd lead with the **Kaplan–Meier event separation** — log-rank p < 0.001 is hard to dispute at a regulatory meeting.\n\nSecond question: does your compound share the NSAID COX-1 inhibition pathway? If yes, I can pull the class-effect disproportionality to contextualise your signal against naproxen and diclofenac.`,
    // turn 2 — after user's second reply
    (_chartLabel: string) => `Understood. Given the class-effect context, the **time-to-onset peak at 8–30 days** is especially meaningful — it's consistent with an idiosyncratic metabolic mechanism rather than direct hepatotoxicity, which usually presents within 7 days.\n\nThird question: do you have **rechallenge data** in the FAERS narratives? Even 3–4 positive rechallenges would materially strengthen the causality assessment under CIOMS criteria.`,
    // turn 3 — after user's third reply
    (_chartLabel: string) => `That's helpful context. My recommendation: **include the KM curve and time-to-onset distribution** as primary exhibits, add the class-effect PRR comparison as supporting evidence, and note the rechallenge cases explicitly in the causality section.\n\nI can draft a structured clinical overview section if you'd like — just confirm the target format (ICH E2B narrative, PBRER, or DSUR) and I'll prepare the text.`,
  ];

  const handleOpenAgentThread = (chartId: string) => {
    setPanelFull(false);
    const chartLabel = CHART_LABEL[chartId] || chartId;
    const userId = ++idRef.current;
    threadTurnRef.current = 0;
    setActiveThreadAgentId("medical");
    setMessages(prev => [...prev,
      { id: userId, type: "user", text: `I'd like to discuss the ${chartLabel} findings.`, agentThread: "medical", contextCard: chartId },
    ]);
    setTypingAgent("medical");
    setTimeout(() => {
      setTypingAgent(null);
      const rid = ++idRef.current;
      setMessages(prev => [...prev, {
        id: rid, type: "agent", agent: "medical",
        text: MEDICAL_THREAD_SCRIPT[0](chartLabel),
        locked: true, agentThread: "medical",
      }]);
      threadTurnRef.current = 1;
    }, 1400);
  };

  return (
    <div className="flex-1 flex min-h-0">
      {/* Chat column — hidden when the artifact panel is fullscreen */}
      {!(artifact && panelFull) && (
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          <div ref={scrollRef} onScroll={handleChatScroll} className="flex-1 overflow-y-auto px-5 py-7"
            style={{ background: "radial-gradient(ellipse 80% 60% at 50% 30%, #ffffff 0%, #f7fafc 100%)", scrollbarWidth: "thin", scrollbarColor: `${C.border} transparent` }}>
            <div className="mx-auto w-full" style={{ maxWidth: artifact ? "100%" : 680 }}>
              {messages.map(m =>
                m.type === "user"
                  ? <UserBubble key={m.id} text={m.text!} agentThread={m.agentThread} />
                  : <AgentBubble key={m.id} agent={m.agent!} text={m.text} component={m.component}
                      locked={m.locked} selection={m.selection} stream={!m.noStream} thought={m.thought}
                      activityMode={m.component?.kind === "result-tabs" ? "generating" : "thinking"}
                      agentThread={m.agentThread}
                      onComponentAction={handleComponentAction}
                      onTraceComplete={handleTraceComplete}
                      onAsk={handleFreeSend}
                      onStreamTick={scrollToBottom}
                      onActive={reportStreamActive}
                      onActiveAgents={reportTraceActive}
                      onOpenArtifact={setArtifact}
                      onShare={onShare}
                      onPatchState={handlePatchState} />
              )}
              {typing && <AgentBubble agent={typing} typing />}
            </div>
          </div>

          <div className="flex-shrink-0 px-5 pb-6 pt-2 bg-transparent flex justify-center w-full">
            <div className="w-full animate-fadeIn" style={{ maxWidth: artifact ? "100%" : 680 }}>
              <ChatInputBar onSend={handleFreeSend} placeholder="Ask a follow-up question..." beaming={beaming} typing={isAnalyzing || !!typing} onStop={handleStop} />
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {artifact && (
          <ArtifactPanel key="artifact" data={artifact} full={panelFull}
            onToggleFull={() => setPanelFull(f => !f)}
            onClose={() => { setArtifact(null); setPanelFull(false); }}
            onOpenAgentThread={handleOpenAgentThread} />
        )}
      </AnimatePresence>
    </div>
  );
}

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (m: string) => void;
}

function UpgradeProModal({ isOpen, onClose, showToast }: UpgradeProModalProps): React.ReactElement | null {
  if (!isOpen) return null;

  const plans: Array<{
    name: string;
    price: string;
    summary: string;
    cta: string;
    disabled: boolean;
    intro: string;
    note: string;
    features: string[];
  }> = [
    {
      name: "Individual",
      price: "0",
      summary: "Sandbox signal review for portfolio exploration.",
      cta: "Your current plan",
      disabled: true,
      intro: "Core workspace includes:",
      note: "Evaluation workspace with limited monthly report volume.",
      features: ["Single active analysis stream", "Standard FAERS compilation", "Manual exports", "Uploaded reviewer signature"]
    },
    {
      name: "Team",
      price: "149",
      summary: "Higher limits for recurring pharmacovigilance teams.",
      cta: "Upgrade",
      disabled: false,
      intro: "Everything in Individual and:",
      note: "License managed by your regulatory operations admin.",
      features: ["Parallel multi-agent streams", "Full EudraVigilance and VigiBase institutional access", "Continuous safety scheduling", "eCTD and Word export packages", "Audit-grade signature trail"]
    },
    {
      name: "Enterprise",
      price: "Custom",
      summary: "Validated scale for regulated safety organizations.",
      cta: "Contact sales",
      disabled: false,
      intro: "Everything in Team and:",
      note: "Commercial terms set at the organizational license level.",
      features: ["Unlimited agent nodes", "Dedicated signal-detection compute", "SSO, SCIM, and RBAC controls", "GxP and CSV validation documentation", "Named compliance success manager", "Priority SLA"]
    }
  ];

  const handlePlanAction = (planName: string) => {
    onClose();
    showToast(planName === "Team" ? "Team license upgrade requested" : "Sales contact request started");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.40)", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 24, maxWidth: 960, width: "100%", padding: 30, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid #fed7aa", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#b45309", marginBottom: 6 }}>WinnowAI licensing</div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>Plans & Pricing</h3>
            <p style={{ fontSize: 13.5, color: C.text3, lineHeight: 1.5, margin: 0, maxWidth: 620 }}>Move from a portfolio sandbox to governed pharmacovigilance operations with continuous surveillance, audit trails, and validated exports.</p>
          </div>
          <button onClick={onClose} aria-label="Close plans" style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#fff7ed", fontSize: 20, color: "#92400e", cursor: "pointer", flexShrink: 0 }}>&times;</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 18 }}>
          {plans.map(plan => {
            const isTeam = plan.name === "Team";
            return (
              <div key={plan.name} style={{ border: isTeam ? "2px solid #f59e0b" : "1px solid #fed7aa", borderRadius: 18, padding: 18, backgroundColor: isTeam ? "#fffbeb" : "#fff", position: "relative", display: "flex", flexDirection: "column", minHeight: 472 }}>
                {isTeam && <span style={{ position: "absolute", top: -11, right: 16, backgroundColor: "#d97706", color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>Recommended</span>}
                <div style={{ width: 34, height: 34, borderRadius: 12, border: "1px solid #fcd34d", background: "linear-gradient(135deg, #fff7ed, #fffbeb)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21V10" />
                    <path d="M12 10C8 10 6 8 6 4c4 0 6 2 6 6Z" />
                    <path d="M12 14c4 0 6-2 6-6-4 0-6 2-6 6Z" />
                  </svg>
                </div>
                <h4 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: "0 0 10px 0" }}>{plan.name}</h4>
                <div style={{ marginBottom: 10 }}>
                  {plan.price === "Custom" ? (
                    <div style={{ fontSize: 36, fontWeight: 800, color: "#92400e", lineHeight: 1 }}>Custom</div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                      <span style={{ fontSize: 18, color: "#b45309", fontWeight: 600 }}>$</span>
                      <span style={{ fontSize: 44, fontWeight: 800, color: "#92400e", lineHeight: 1 }}>{plan.price}</span>
                      <span style={{ fontSize: 11, color: C.text4, fontWeight: 700, textTransform: "uppercase" }}>USD / month</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 14, fontWeight: 650, color: C.text1, lineHeight: 1.45, margin: "0 0 14px 0", minHeight: 42 }}>{plan.summary}</p>
                <ul role="list" style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5, color: C.text2, lineHeight: 1.45, flex: 1 }}>
                  <li style={{ fontWeight: 800, color: "#0f172a" }}>{plan.intro}</li>
                  {plan.features.map(feature => (
                    <li key={feature} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                        <path d="M16 5 8 15l-4-4" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className={plan.disabled ? undefined : "upgrade-ring"} style={{ width: "100%", borderRadius: 13, marginBottom: 16 }}>
                  <button disabled={plan.disabled} onClick={() => handlePlanAction(plan.name)}
                    style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: plan.disabled ? "1px solid #fed7aa" : "none", background: plan.disabled ? "#fff7ed" : "linear-gradient(135deg, #d97706, #f59e0b)", color: plan.disabled ? "#92400e" : "#fff", fontSize: 13, fontWeight: 800, cursor: plan.disabled ? "default" : "pointer" }}>
                    {plan.cta}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: C.text4, lineHeight: 1.45, margin: "0 0 0 0" }}>{plan.note}</p>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid #fed7aa", paddingTop: 14, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <p style={{ fontSize: 11.5, color: C.text4, margin: 0 }}>*Usage limits apply. Plans and pricing are set at the organizational license level.</p>
          <button onClick={() => handlePlanAction("Enterprise")} style={{ border: "1px solid #f59e0b", background: "#fff7ed", color: "#92400e", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Contact license admin</button>
        </div>
      </div>
    </div>
  );
}

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (m: string) => void;
}

function ExportReportModal({ isOpen, onClose, showToast }: ExportReportModalProps): React.ReactElement | null {
  const [exportMode, setExportMode] = useState<"pdf" | "ectd" | "vault">("pdf");

  const handleExport = () => {
    if (exportMode === "pdf") {
      showToast("Report exported as PDF.");
    } else if (exportMode === "ectd") {
      showToast("Report exported as Word / eCTD package.");
    } else {
      showToast("Report securely transferred to Vault.");
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.40)", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "#ffffff", borderRadius: 24, maxWidth: 520, width: "100%", padding: 32, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Header */}
        <div style={{ display: "flex", alignItems: "start", gap: 8, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", margin: 0 }}>Export Report</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Select a compliance-approved destination.</p>
          </div>
          <button onClick={onClose} type="button" aria-label="Close"
            style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", transition: "all 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="15" y1="5" x2="5" y2="15"></line>
              <line x1="5" y1="5" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            
            {/* PDF Option */}
            <button
              onClick={() => setExportMode("pdf")}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px",
                border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "12px 12px 0 0",
                textAlign: "left", cursor: "pointer", transition: "colors 0.15s",
                backgroundColor: exportMode === "pdf" ? "#f8fafc" : "#ffffff"
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              onMouseLeave={e => { if (exportMode !== "pdf") e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              <div style={{ width: 20, height: 20, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Export as PDF</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>Standard document format</p>
              </div>
              {exportMode === "pdf" && (
                <div style={{ width: 20, height: 20, color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M15.188 5.11a.5.5 0 0 1 .752.626l-.056.084-7.5 9a.5.5 0 0 1-.738.033l-3.5-3.5-.064-.078a.501.501 0 0 1 .693-.693l.078.064 3.113 3.113 7.15-8.58z"></path></svg>
                </div>
              )}
            </button>

            {/* Word / eCTD Option */}
            <button
              onClick={() => setExportMode("ectd")}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px",
                border: "1px solid #e2e8f0", borderBottom: "none", borderRadius: "0",
                textAlign: "left", cursor: "pointer", transition: "colors 0.15s",
                backgroundColor: exportMode === "ectd" ? "#f8fafc" : "#ffffff"
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              onMouseLeave={e => { if (exportMode !== "ectd") e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              <div style={{ width: 20, height: 20, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Word / eCTD package</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>For regulatory submission</p>
              </div>
              {exportMode === "ectd" && (
                <div style={{ width: 20, height: 20, color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M15.188 5.11a.5.5 0 0 1 .752.626l-.056.084-7.5 9a.5.5 0 0 1-.738.033l-3.5-3.5-.064-.078a.501.501 0 0 1 .693-.693l.078.064 3.113 3.113 7.15-8.58z"></path></svg>
                </div>
              )}
            </button>

            {/* Secure Vault Option */}
            <button
              onClick={() => setExportMode("vault")}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px",
                border: "1px solid #e2e8f0", borderRadius: "0 0 12px 12px",
                textAlign: "left", cursor: "pointer", transition: "colors 0.15s",
                backgroundColor: exportMode === "vault" ? "#f8fafc" : "#ffffff"
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f8fafc")}
              onMouseLeave={e => { if (exportMode !== "vault") e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              <div style={{ width: 20, height: 20, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Send to Secure Vault</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>Audit-logged transfer</p>
              </div>
              {exportMode === "vault" && (
                <div style={{ width: 20, height: 20, color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M15.188 5.11a.5.5 0 0 1 .752.626l-.056.084-7.5 9a.5.5 0 0 1-.738.033l-3.5-3.5-.064-.078a.501.501 0 0 1 .693-.693l.078.064 3.113 3.113 7.15-8.58z"></path></svg>
                </div>
              )}
            </button>

          </div>
        </div>

        {/* Action Button Row */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 16px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: "#ffffff", color: "#334155" }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            style={{ background: "#059669", border: "none", color: "#ffffff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#047857")}
            onMouseLeave={e => (e.currentTarget.style.background = "#059669")}
          >
            Export
          </button>
        </div>

      </div>
    </div>
  );
}

interface SettingsProfileTabProps {
  name: string;
  setName: (s: string) => void;
  email: string;
  uploadedSig: string | null;
  setUploadedSig: (s: string | null) => void;
  signatureText: string;
  setSignatureText: (s: string) => void;
  signatureUploadError: string | null;
  setSignatureUploadError: (s: string | null) => void;
  showToast: (m: string) => void;
}

function SettingsProfileTab({
  name,
  setName,
  email,
  uploadedSig,
  setUploadedSig,
  signatureText,
  setSignatureText,
  signatureUploadError,
  setSignatureUploadError,
  showToast,
}: SettingsProfileTabProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Profile Settings</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Manage your personal details and regulatory credentials.</p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#ffffff" }}>
        {/* Row: Full Name */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Full name</span>
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13.5, outline: "none", color: "#0f172a", width: 224, backgroundColor: "#f8fafc" }} />
        </div>

        {/* Row: Display Email */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Email Address</span>
          </div>
          <input type="text" value={email} readOnly
            style={{ padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13.5, outline: "none", color: "#64748b", width: 224, backgroundColor: "#f1f5f9" }} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: "#334155", margin: "0 0 6px 0" }}>Digital Signature</h4>
        <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.4, margin: "0 0 12px 0" }}>
          Upload the signature image used for 21 CFR Part 11 attestations. WinnowAI never generates a signature from typed text.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{
            border: "2px dashed #cbd5e1", borderRadius: 12, padding: "20px",
            textAlign: "center", cursor: "pointer", background: "#f8fafc",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>Click to upload signature image</span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>PNG, JPG, or SVG (transparent background recommended)</span>
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) {
                  setSignatureUploadError("No signature file was selected.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                  const result = event.target?.result;
                  if (typeof result !== "string" || !result.startsWith("data:image/")) {
                    setSignatureUploadError(`Signature upload failed for ${file.name}: expected image data URL, received ${typeof result}.`);
                    return;
                  }
                  setUploadedSig(result);
                  setSignatureUploadError(null);
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {signatureUploadError && <p style={{ fontSize: 11.5, color: "#dc2626", margin: "-2px 0 0 0" }}>{signatureUploadError}</p>}
          
          <div style={{
            background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minHeight: 80, justifyContent: "center"
          }}>
            <span style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Uploaded Signature Preview</span>
            {uploadedSig ? (
              <img src={uploadedSig} alt="Uploaded Signature" style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>No uploaded signature configured</span>
            )}
          </div>
          
          <button onClick={() => {
            if (!uploadedSig) {
              setSignatureUploadError("Upload a PNG, JPG, or SVG signature image before saving.");
              return;
            }
            setSignatureText(uploadedSig);
            localStorage.setItem("winnow_sig", uploadedSig);
            setSignatureUploadError(null);
            showToast("Uploaded signature updated");
          }}
            style={{ alignSelf: "flex-end", padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none", background: "#059669", color: "#ffffff", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#047857")}
            onMouseLeave={e => (e.currentTarget.style.background = "#059669")}>
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingsSubscriptionTabProps {
  onClose: () => void;
  onOpenUpgrade?: () => void;
}

function SettingsSubscriptionTab({ onClose, onOpenUpgrade }: SettingsSubscriptionTabProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Organization License</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Review license validity, volume constraints, and billing status.</p>
      </div>
      
      <div style={{ border: "1px solid #fed7aa", borderRadius: 16, padding: 20, backgroundColor: "#fffbeb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#b45309" }}>Current Plan</span>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "2px 0 0 0" }}>Team License</p>
          </div>
          <span style={{ fontSize: 11, color: "#d97706", backgroundColor: "#fef3c7", padding: "4px 10px", borderRadius: 12, fontWeight: 600 }}>Active</span>
        </div>
        <div style={{ display: "flex", gap: 24, marginBottom: 16, fontSize: 13, color: "#475569" }}>
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Organization</div>
            <div>PharmaGuard Global</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Seats</div>
            <div>42 of 50 allocated</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>Renewal</div>
            <div>Oct 1, 2026</div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 16px 0" }}>
          Compare governed license options for unlimited multi-agent streams.
        </p>
        <div className="upgrade-ring" style={{ width: "fit-content", display: "inline-block" }}>
          <button onClick={() => { onClose(); onOpenUpgrade?.(); }}
            style={{ padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#fff", cursor: "pointer" }}>
            View plans
          </button>
        </div>
      </div>
    </div>
  );
}

interface SettingsComplianceTabProps {
  showToast: (m: string) => void;
}

function SettingsComplianceTab({ showToast }: SettingsComplianceTabProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Compliance & Privacy</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Manage regulatory compliance audits, de-identification parameters, and logs.</p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#ffffff" }}>
        {/* Row: Regulatory Conformity */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Regulatory Compliance Reports</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>View auto-generated HIPAA / CIOMS conformity certs.</span>
          </div>
          <button onClick={() => showToast("Downloading Compliance Report bundle...")}
            style={{ fontSize: 12, fontWeight: 600, color: "#059669", background: "#ecfdf5", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#d1fae5")}
            onMouseLeave={e => (e.currentTarget.style.background = "#ecfdf5")}>
            Download Bundle
          </button>
        </div>

        {/* Row: Activity Logs */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Audit Trail</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Review full cryptographic pipeline audit trace.</span>
          </div>
          <button onClick={() => showToast("Exporting Audit Log...")}
            style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", background: "#f0f9ff", border: "none", borderRadius: 6, padding: "6px 12px", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#e0f2fe")}
            onMouseLeave={e => (e.currentTarget.style.background = "#f0f9ff")}>
            Export Logs
          </button>
        </div>

        {/* Row: HIPAA Threshold */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>HIPAA safe-harbor k-Anonymity</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Sets the privacy threshold for grouping patient demographics. Default is k=5.</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
            <input type="range" min="2" max="20" defaultValue="5" style={{ flex: 1, accentColor: "#059669" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", minWidth: 40, textAlign: "right" }}>k ≥ 5</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>Data Source Governance</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#f8fafc", padding: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11.5, color: "#475569", lineHeight: 1.4 }}>
            <div>
              <strong>Genomic data (ClinVar/gnomAD/Ensembl):</strong> GINA-aware handling; population allele frequencies are aggregate, non-identifying; no individual genotype storage.
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
              <strong>ClinicalTrials.gov:</strong> Registry data used under public-data terms; attribution retained.
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
              <strong>OpenFDA / FAERS:</strong> Spontaneous-report disclaimer (reports do not imply causation; no incidence rates calculated).
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
              <strong>EudraVigilance:</strong> EMA data-access policy acknowledgement and conformity guidelines applied.
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
              <strong>Literature (Europe PMC / bioRxiv / OpenAlex):</strong> Preprint records are explicitly flagged as "not peer-reviewed."
            </div>
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
              <strong>MedDRA via OLS:</strong> Licensed terminology; version pinned (v27.x) in the audit trail.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsPreferencesTabProps {
  workflowExecution: string;
  setWorkflowExecution: (s: string) => void;
}

function SettingsPreferencesTab({ workflowExecution, setWorkflowExecution }: SettingsPreferencesTabProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>System Preferences</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Configure the default UI appearance and pipeline settings.</p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#ffffff" }}>
        {/* Row: Default Workflow Execution */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Default Workflow Execution</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Run pipeline sequentially or stagger agent DAGs.</span>
          </div>
          <select value={workflowExecution} onChange={e => setWorkflowExecution(e.target.value)}
            style={{ padding: "8px 12px", fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", outline: "none", width: 180 }}>
            <option value="staggered">Staggered (Fast)</option>
            <option value="sequential">Sequential (Strict)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface SettingsNotificationsTabProps {
  recCompletions: boolean;
  setRecCompletions: (b: boolean) => void;
  notifyPhi: boolean;
  setNotifyPhi: (b: boolean) => void;
  weeklyBrief: boolean;
  setWeeklyBrief: (b: boolean) => void;
}

function SettingsNotificationsTab({
  recCompletions,
  setRecCompletions,
  notifyPhi,
  setNotifyPhi,
  weeklyBrief,
  setWeeklyBrief,
}: SettingsNotificationsTabProps): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Alerts & Notifications</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Set up email integrations and compliance warnings.</p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#ffffff" }}>
        {/* Switch 1: Report Completions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Response completions</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Get notified when a safety report finishes compilation.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={recCompletions}
            onClick={() => setRecCompletions(!recCompletions)}
            style={{
              position: "relative", display: "inline-flex", flexShrink: 0, borderRadius: 9999, border: "none", outline: "none", cursor: "pointer",
              height: 20, width: 36, padding: 2, backgroundColor: recCompletions ? "#059669" : "#cbd5e1", transition: "background-color 0.15s ease"
            }}
          >
            <span style={{
              display: "block", borderRadius: 9999, backgroundColor: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              height: 16, width: 16, transform: recCompletions ? "translateX(16px)" : "translateX(0px)", transition: "transform 0.15s ease"
            }} />
          </button>
        </div>

        {/* Switch 2: PHI violations */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>PHI Violation Warnings</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Notify immediately of PHI Safe Harbor violations.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyPhi}
            onClick={() => setNotifyPhi(!notifyPhi)}
            style={{
              position: "relative", display: "inline-flex", flexShrink: 0, borderRadius: 9999, border: "none", outline: "none", cursor: "pointer",
              height: 20, width: 36, padding: 2, backgroundColor: notifyPhi ? "#059669" : "#cbd5e1", transition: "background-color 0.15s ease"
            }}
          >
            <span style={{
              display: "block", borderRadius: 9999, backgroundColor: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              height: 16, width: 16, transform: notifyPhi ? "translateX(16px)" : "translateX(0px)", transition: "transform 0.15s ease"
            }} />
          </button>
        </div>

        {/* Switch 3: Weekly Brief */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>Weekly Safety Trend Brief</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Receive weekly pharmacovigilance trend briefs.</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={weeklyBrief}
            onClick={() => setWeeklyBrief(!weeklyBrief)}
            style={{
              position: "relative", display: "inline-flex", flexShrink: 0, borderRadius: 9999, border: "none", outline: "none", cursor: "pointer",
              height: 20, width: 36, padding: 2, backgroundColor: weeklyBrief ? "#059669" : "#cbd5e1", transition: "background-color 0.15s ease"
            }}
          >
            <span style={{
              display: "block", borderRadius: 9999, backgroundColor: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              height: 16, width: 16, transform: weeklyBrief ? "translateX(16px)" : "translateX(0px)", transition: "transform 0.15s ease"
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsDocsTab(): React.ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>Guidance & Regulatory Docs</h3>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Regulatory templates, guidelines, and WinnowAI operating manuals.</p>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <a href="https://www.fda.gov/drugs/questions-and-answers-fdas-adverse-event-reporting-system-faers" target="_blank" rel="noreferrer"
          style={{ padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#334155", transition: "border-color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#059669")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#cbd5e1")}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>FDA FAERS Safety Reporting Guidelines</span>
            <p style={{ fontSize: 11.5, color: "#64748b", margin: "2px 0 0 0" }}>Official regulatory framework for post-marketing signal audits.</p>
          </div>
        </a>

        <a href="https://www.ema.europa.eu/en/human-regulatory/post-authorisation/pharmacovigilance" target="_blank" rel="noreferrer"
          style={{ padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#334155", transition: "border-color 0.15s" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "#059669")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#cbd5e1")}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ecfdf5", border: "1px solid #a7f3d0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>EMA Pharmacovigilance Guidelines</span>
            <p style={{ fontSize: 11.5, color: "#64748b", margin: "2px 0 0 0" }}>Conformity guidelines under EU GMP rules.</p>
          </div>
        </a>

        <div style={{ padding: 12, border: "1px solid #cbd5e1", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>WinnowAI User Manual v1.2</span>
            <p style={{ fontSize: 11.5, color: "#64748b", margin: "2px 0 0 0" }}>How to configure multi-agent DAGs, interpret disproportionality values, and generate CIOMS templates.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────
interface SettingsPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  signatureText: string;
  setSignatureText: (s: string) => void;
  showToast: (m: string) => void;
  onOpenUpgrade?: () => void;
}

function SettingsPageModal({
  isOpen,
  onClose,
  initialTab = "profile",
  signatureText,
  setSignatureText,
  showToast,
  onOpenUpgrade,
}: SettingsPageModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [uploadedSig, setUploadedSig] = useState<string | null>(
    signatureText.startsWith("data:image/") ? signatureText : null
  );
  const [signatureUploadError, setSignatureUploadError] = useState<string | null>(null);
  const [name, setName] = useState("Raya Surya");
  const [email, setEmail] = useState("r.surya@pharmaguard.org");
  const [workflowExecution, setWorkflowExecution] = useState("staggered");
  const [recCompletions, setRecCompletions] = useState(true);
  const [notifyPhi, setNotifyPhi] = useState(true);
  const [weeklyBrief, setWeeklyBrief] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (signatureText.startsWith("data:image/")) {
      setUploadedSig(signatureText);
    } else {
      setUploadedSig(null);
    }
  }, [signatureText]);

  const SETTINGS_TABS = [
    {
      id: "profile",
      label: "Profile & Signature",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      id: "subscription",
      label: "Subscription & Billing",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      )
    },
    {
      id: "compliance",
      label: "Compliance & Audit",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    },
    {
      id: "preferences",
      label: "Preferences",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="16" cy="12" r="2" fill="currentColor" /><circle cx="10" cy="18" r="2" fill="currentColor" />
        </svg>
      )
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    },
    {
      id: "docs",
      label: "Guidance & Docs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
        </svg>
      )
    }
  ];

  return (
    <SidebarModal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      tabs={SETTINGS_TABS}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeTab === "profile" && (
        <SettingsProfileTab
          name={name}
          setName={setName}
          email={email}
          uploadedSig={uploadedSig}
          setUploadedSig={setUploadedSig}
          signatureText={signatureText}
          setSignatureText={setSignatureText}
          signatureUploadError={signatureUploadError}
          setSignatureUploadError={setSignatureUploadError}
          showToast={showToast}
        />
      )}

      {activeTab === "subscription" && (
        <SettingsSubscriptionTab
          onClose={onClose}
          onOpenUpgrade={onOpenUpgrade}
        />
      )}

      {activeTab === "compliance" && (
        <SettingsComplianceTab
          showToast={showToast}
        />
      )}

      {activeTab === "preferences" && (
        <SettingsPreferencesTab
          workflowExecution={workflowExecution}
          setWorkflowExecution={setWorkflowExecution}
        />
      )}

      {activeTab === "notifications" && (
        <SettingsNotificationsTab
          recCompletions={recCompletions}
          setRecCompletions={setRecCompletions}
          notifyPhi={notifyPhi}
          setNotifyPhi={setNotifyPhi}
          weeklyBrief={weeklyBrief}
          setWeeklyBrief={setWeeklyBrief}
        />
      )}

      {activeTab === "docs" && (
        <SettingsDocsTab />
      )}
    </SidebarModal>
  );
}

interface SidebarModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  children: React.ReactNode;
}

function SidebarModal({
  isOpen,
  onClose,
  title,
  tabs,
  activeTab,
  setActiveTab,
  children
}: SidebarModalProps): React.ReactElement | null {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.40)", backdropFilter: "blur(4px)", padding: 16 }}>
      <div style={{ background: "#ffffff", borderRadius: 24, maxWidth: 960, width: "100%", height: 600, display: "flex", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: "1px solid #cbd5e1" }}>
        
        {/* Left Sidebar Nav */}
        <nav aria-label={title} style={{ width: 192, borderRight: "1px solid #cbd5e1", backgroundColor: "#f8fafc", padding: 16, display: "flex", flexDirection: "column", gap: 12, flexShrink: 0, overflowY: "auto" }}>
          <h2 style={{ display: "none" }}>{title}</h2>
          
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4, paddingTop: 4 }}>{title}</div>
          
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {tabs.map(t => {
              const isActive = activeTab === t.id;
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => setActiveTab(t.id)}
                    style={{
                      width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: isActive ? 600 : 500,
                      backgroundColor: isActive ? "#e2e8f0" : "transparent", color: isActive ? "#0f172a" : "#475569",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s"
                    }}
                    onMouseEnter={e => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "#e2e8f0";
                    }}
                    onMouseLeave={e => {
                      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                    }}>
                    <span style={{ display: "flex", alignItems: "center", flexShrink: 0, color: isActive ? "#059669" : "#64748b" }}>{t.icon}</span>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right Content Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#ffffff" }}>
          {/* Header containing X close button only */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px 8px 24px", flexShrink: 0 }}>
            <button onClick={onClose} type="button" aria-label="Close"
              style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", transition: "all 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="15" y1="5" x2="5" y2="15"></line>
                <line x1="5" y1="5" x2="15" y2="15"></line>
              </svg>
            </button>
          </div>

          {/* Scrollable tab content */}
          <div style={{ flex: 1, padding: "0 24px 24px 24px", overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}

const MOCK_COMPLIANCE_REPORTS = [
  {
    id: "COMP-2026-001",
    title: "Metformin Q3 2024 Safety Attestation",
    type: "PHI Safe Harbor",
    date: "2026-06-10",
    status: "Cleared",
    signedBy: "Raya Surya",
    summary: "PHI screening completed on Metformin safety signals dataset. No Protected Health Information (PHI) detected. All 18 Safe Harbor identifiers verified as redacted.",
    kAnonymity: "k = 7 (compliant)",
    checklist: [
      { id: 1, identifier: "Names", status: "Redacted" },
      { id: 2, identifier: "Geographic subdivisions (small)", status: "Redacted" },
      { id: 3, identifier: "Dates (birth, admission, discharge, death, age > 89)", status: "Redacted" },
      { id: 4, identifier: "Telephone numbers", status: "Redacted" },
      { id: 5, identifier: "Fax numbers", status: "Redacted" },
      { id: 6, identifier: "Email addresses", status: "Redacted" },
      { id: 7, identifier: "Social Security numbers", status: "Redacted" },
      { id: 8, identifier: "Medical record numbers", status: "Redacted" },
      { id: 9, identifier: "Health plan beneficiary numbers", status: "Redacted" },
      { id: 10, identifier: "Account numbers", status: "Redacted" },
      { id: 11, identifier: "Certificate/license numbers", status: "Redacted" },
      { id: 12, identifier: "Vehicle identifiers & serials", status: "Redacted" },
      { id: 13, identifier: "Device identifiers & serials", status: "Redacted" },
      { id: 14, identifier: "Web URLs", status: "Redacted" },
      { id: 15, identifier: "IP address numbers", status: "Redacted" },
      { id: 16, identifier: "Biometric identifiers (finger, voice)", status: "Redacted" },
      { id: 17, identifier: "Full face photos & comparable images", status: "Redacted" },
      { id: 18, identifier: "Any other unique identifying number/code", status: "Redacted" }
    ]
  },
  {
    id: "COMP-2026-002",
    title: "Dupixent B/R Compilation Report",
    type: "GDPR Compliance",
    date: "2026-06-08",
    status: "Cleared",
    signedBy: "Raya Surya",
    summary: "Cross-border data transfer audit completed for Dupixent benefit-risk compiler findings. Data minimized, pseudonymous mapping verified.",
    kAnonymity: "k = 6 (compliant)",
    checklist: [
      { id: 1, identifier: "Direct Identifiers", status: "Redacted" },
      { id: 2, identifier: "Pseudonymization Keys", status: "Secured" },
      { id: 3, identifier: "Data Minimization", status: "Cleared" }
    ]
  },
  {
    id: "COMP-2026-003",
    title: "Pembrolizumab Signal Evaluation",
    type: "Signal Eval",
    date: "2026-06-05",
    status: "Cleared",
    signedBy: "Raya Surya",
    summary: "Signal evaluation report for Pembrolizumab immune-mediated adverse events. Verified against local and global spontaneous report datasets.",
    kAnonymity: "N/A",
    checklist: []
  },
  {
    id: "COMP-2026-004",
    title: "CYP2D6 Codeine Audit Trail",
    type: "PHI Safe Harbor",
    date: "2026-06-12",
    status: "Flagged",
    signedBy: "Unsigned",
    summary: "Genomics Audit detected 2 records containing potential identifying genetic coordinates. Requires manual review or structural re-redaction before signing.",
    kAnonymity: "k = 3 (non-compliant)",
    checklist: [
      { id: 1, identifier: "Names", status: "Redacted" },
      { id: 2, identifier: "Geographic subdivisions", status: "Redacted" },
      { id: 3, identifier: "Dates", status: "Redacted" },
      { id: 4, identifier: "Genetic sequences/coordinates", status: "2 Violations Found" },
      { id: 5, identifier: "Other identifying codes", status: "Redacted" }
    ]
  }
];

const MOCK_AUDIT_LOGS = [
  { timestamp: "2026-06-12T18:42:01Z", actor: "Raya Surya (User)", action: "Signature applied", target: "COMP-2026-001 (Metformin)", ip: "192.168.1.14", hash: "8a4f91b7e289c..." },
  { timestamp: "2026-06-12T18:41:45Z", actor: "PHI Guard (Agent)", action: "PHI scan", target: "Metformin Signal Dataset", ip: "Agent Node A", hash: "4c9e81b2a75d..." },
  { timestamp: "2026-06-12T15:20:10Z", actor: "Raya Surya (User)", action: "Report exported", target: "Dupixent B/R (eCTD)", ip: "192.168.1.14", hash: "a93f2c5d1e48..." },
  { timestamp: "2026-06-12T11:05:32Z", actor: "Medical Reviewer (Agent)", action: "ClinVar lookup", target: "CYP2D6 *4 Variant", ip: "Agent Node C", hash: "e2b9c7d4f6a8..." },
  { timestamp: "2026-06-12T10:14:15Z", actor: "Raya Surya (User)", action: "Threshold changed", target: "PRR Floor 1.5 -> 2.0", ip: "192.168.1.14", hash: "b8c4d3e2a1f0..." },
  { timestamp: "2026-06-11T09:30:00Z", actor: "Raya Surya (User)", action: "Login success", target: "PharmaGuard Identity", ip: "192.168.1.14", hash: "f7e6d5c4b3a2..." },
  { timestamp: "2026-06-10T16:15:22Z", actor: "Raya Surya (User)", action: "Signature applied", target: "COMP-2026-002 (Dupixent)", ip: "192.168.1.14", hash: "c3b2a1f0e9d8..." },
  { timestamp: "2026-06-10T16:14:05Z", actor: "PHI Guard (Agent)", action: "PHI scan", target: "Dupixent Dataset", ip: "Agent Node A", hash: "d4e5f6a7b8c9..." },
  { timestamp: "2026-06-08T14:22:18Z", actor: "Raya Surya (User)", action: "Signature applied", target: "COMP-2026-003 (Pembrolizumab)", ip: "19.82.110.5", hash: "7f6e5d4c3b2a..." },
  { timestamp: "2026-06-08T14:19:40Z", actor: "Planner (Agent)", action: "Flow instantiated", target: "Pembrolizumab Weekly", ip: "Agent Node D", hash: "1b2c3d4e5f6a..." },
  { timestamp: "2026-06-05T09:11:02Z", actor: "Raya Surya (User)", action: "Login success", target: "PharmaGuard Identity", ip: "19.82.110.5", hash: "9a8b7c6d5e4f..." },
  { timestamp: "2026-06-01T08:00:00Z", actor: "System Daemon", action: "Key rotation", target: "SHA-256 Ledger Root", ip: "Vault Server", hash: "e5d4c3b2a1f9..." }
];

const MOCK_SIGNATURE_HISTORY = [
  { timestamp: "2026-06-12T18:42:01Z", report: "Metformin Q3 2024 Safety Attestation", reviewer: "Raya Surya", method: "Uploaded image", status: "Valid", hash: "8a4f91b7..." },
  { timestamp: "2026-06-10T16:15:22Z", report: "Dupixent B/R Compilation Report", reviewer: "Raya Surya", method: "Uploaded image", status: "Valid", hash: "c3b2a1f0..." },
  { timestamp: "2026-06-08T14:22:18Z", report: "Pembrolizumab Signal Evaluation", reviewer: "Raya Surya", method: "Uploaded image", status: "Valid", hash: "7f6e5d4c..." },
  { timestamp: "2026-06-01T10:14:55Z", report: "CYP2D6 Preliminary Screening", reviewer: "Raya Surya", method: "Uploaded image", status: "Revoked", hash: "e2b9c7d4..." }
];

interface WorkspaceComplianceTabProps {
  showToast: (m: string) => void;
}

function WorkspaceComplianceTab({ showToast }: WorkspaceComplianceTabProps): React.ReactElement {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const reports = MOCK_COMPLIANCE_REPORTS.filter(r => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const selectedReport = MOCK_COMPLIANCE_REPORTS.find(r => r.id === selectedReportId);
  const sigText = localStorage.getItem("winnow_sig") || "";
  const hasUploadedSignature = sigText.startsWith("data:image/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", position: "relative" }}>
      {/* Header actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Library of auto-generated PHI and GDPR compliance attestations.</p>
        <button 
          onClick={() => showToast("Initializing new compliance audit run...")}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#fff", cursor: "pointer"
          }}
        >
          Generate Report
        </button>
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#fff" }}>
            <option value="all">All Types</option>
            <option value="PHI Safe Harbor">PHI Safe Harbor</option>
            <option value="GDPR Compliance">GDPR Compliance</option>
            <option value="Signal Eval">Signal Eval</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Status</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#fff" }}>
            <option value="all">All Statuses</option>
            <option value="Cleared">Cleared</option>
            <option value="Flagged">Flagged</option>
          </select>
        </div>
      </div>

      {/* Table container */}
      <div style={{ flex: 1, overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Report ID</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Title</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Type</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Date</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Status</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Signed By</th>
              <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "32px 16px", textAlign: "center", color: "#64748b" }}>No compliance reports found matching criteria.</td>
              </tr>
            ) : (
              reports.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", transition: "background 0.15s" }} className="hover:bg-slate-50" onClick={() => setSelectedReportId(r.id)}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#0f172a", fontFamily: "monospace" }}>{r.id}</td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>{r.title}</td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>
                    <span style={{ fontSize: 11.5, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>{r.type}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#64748b" }}>{r.date}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: r.status === "Cleared" ? "#ecfdf5" : "#fffbeb",
                      color: r.status === "Cleared" ? "#047857" : "#b45309",
                      border: r.status === "Cleared" ? "1px solid #a7f3d0" : "1px solid #fde68a"
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{r.signedBy}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button onClick={() => setSelectedReportId(r.id)} style={{ padding: "4px 8px", fontSize: 12, background: "#f1f5f9", border: "none", borderRadius: 6, color: "#475569", cursor: "pointer", fontWeight: 500 }}>View</button>
                      <button onClick={() => showToast(`Downloading PDF for ${r.id}...`)} style={{ padding: "4px 8px", fontSize: 12, background: "#ecfdf5", border: "none", borderRadius: 6, color: "#047857", cursor: "pointer", fontWeight: 500 }}>Export</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer (Overlay) */}
      {selectedReport && (
        <div style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 380, background: "#fff",
          borderLeft: "1px solid #cbd5e1", boxShadow: "-4px 0 12px rgba(0,0,0,0.05)", zIndex: 10,
          display: "flex", flexDirection: "column", padding: 20, boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: 12, marginBottom: 16 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Report Details - {selectedReport.id}</h4>
            <button onClick={() => setSelectedReportId(null)} style={{ border: "none", background: "transparent", fontSize: 18, color: "#94a3b8", cursor: "pointer" }}>&times;</button>
          </div>
          
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Title</span>
              <p style={{ margin: "2px 0 0 0", fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{selectedReport.title}</p>
            </div>
            
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Summary</span>
              <p style={{ margin: "2px 0 0 0", fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>{selectedReport.summary}</p>
            </div>

            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>k-Anonymity Posture</span>
              <p style={{ margin: "2px 0 0 0", fontSize: 13, fontWeight: 600, color: "#0d9488" }}>{selectedReport.kAnonymity}</p>
            </div>

            {selectedReport.checklist.length > 0 && (
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Safe Harbor 18-Identifier Audit</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, maxHeight: 180, overflowY: "auto", border: "1px solid #f1f5f9", padding: 8, borderRadius: 8, background: "#f8fafc" }}>
                  {selectedReport.checklist.map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <span style={{ color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>{c.identifier}</span>
                      <span style={{ fontWeight: 600, color: c.status.includes("Violations") ? "#dc2626" : "#047857" }}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Part 11 Signature Mark</span>
              <div style={{ marginTop: 6, border: "1px solid #cbd5e1", borderRadius: 8, padding: 8, background: "#f8fafc", minHeight: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {selectedReport.status === "Cleared" && hasUploadedSignature ? (
                  <img src={sigText} alt="Reviewer Signature" style={{ maxHeight: 40, maxWidth: "100%", objectFit: "contain" }} />
                ) : selectedReport.status === "Cleared" ? (
                  <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic", fontFamily: "cursive" }}>Raya Surya</div>
                ) : (
                  <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>Unsigned - Requires Redaction</span>
                )}
              </div>
            </div>
          </div>

          {/* Regulatory-output exclusion notice */}
          <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 11.5, color: "#b45309", lineHeight: 1.4, margin: "12px 0 0 0" }}>
            ⚠️ Sandbox and In Review sub-agents are automatically excluded from regulatory outputs in compliance audits.
          </div>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={() => showToast(`Downloading PDF for ${selectedReport.id}...`)} style={{ flex: 1, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, border: "none", borderRadius: 8, background: C.brand, color: "#fff", cursor: "pointer" }}>
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface WorkspaceAuditTabProps {
  showToast: (m: string) => void;
}

function WorkspaceAuditTab({ showToast }: WorkspaceAuditTabProps): React.ReactElement {
  const [actorFilter, setActorFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = MOCK_AUDIT_LOGS.filter(l => {
    if (actorFilter !== "all") {
      const isAgent = l.actor.includes("Agent") || l.actor.includes("Daemon");
      if (actorFilter === "user" && isAgent) return false;
      if (actorFilter === "agent" && !isAgent) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.target.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Tamper banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span style={{ fontSize: 12.5, color: "#15803d", fontWeight: 600 }}>SHA-256 integrity-chained audit logs · 21 CFR Part 11 Compliance Ledger</span>
      </div>

      {/* Filter and Search */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", backgroundColor: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Search Log</label>
          <input 
            type="text" 
            placeholder="Search actor, action, target..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: "4px 8px", fontSize: 12.5, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Actor Class</label>
          <select value={actorFilter} onChange={e => setActorFilter(e.target.value)} style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", background: "#fff" }}>
            <option value="all">All Actors</option>
            <option value="user">User Actions Only</option>
            <option value="agent">Agent Pipeline Only</option>
          </select>
        </div>
        <div style={{ alignSelf: "flex-end" }}>
          <button 
            onClick={() => showToast("Exporting cryptographic audit log (CSV)...")}
            style={{ padding: "6px 12px", fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", color: C.text2, cursor: "pointer" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div style={{ flex: 1, overflowY: "auto", border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#475569" }}>Timestamp (UTC)</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#475569" }}>Actor</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#475569" }}>Action</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#475569" }}>Target Object</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#475569" }}>Session IP</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, color: "#475569", fontFamily: "monospace" }}>SHA-256 Chain Hash</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((l, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 12px", color: "#64748b", fontFamily: "monospace" }}>{l.timestamp}</td>
                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#334155" }}>{l.actor}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    fontSize: 11, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                    background: l.action === "Signature applied" ? "#e0f2fe" : l.action === "PHI scan" ? "#fee2e2" : "#f1f5f9",
                    color: l.action === "Signature applied" ? "#0369a1" : l.action === "PHI scan" ? "#b91c1c" : "#475569"
                  }}>
                    {l.action}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", color: "#334155" }}>{l.target}</td>
                <td style={{ padding: "10px 12px", color: "#64748b" }}>{l.ip}</td>
                <td style={{ padding: "10px 12px", color: "#94a3b8", fontFamily: "monospace" }}>{l.hash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface WorkspaceSignaturesTabProps {
  onClose: () => void;
  showToast: (m: string) => void;
}

function WorkspaceSignaturesTab({ onClose, showToast }: WorkspaceSignaturesTabProps): React.ReactElement {
  const sigText = localStorage.getItem("winnow_sig") || "";
  const hasUploadedSignature = sigText.startsWith("data:image/");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      {/* Top Card: Active Signature */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", padding: 18,
        border: "1px solid #cbd5e1", borderRadius: 12, background: "#f8fafc"
      }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{
            width: 100, height: 50, border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
          }}>
            {hasUploadedSignature ? (
              <img src={sigText} alt="Active Signature" style={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>No Sig File</span>
            )}
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Attestation Profile</h4>
            <p style={{ margin: "2px 0 0 0", fontSize: 12.5, color: "#64748b" }}>
              {hasUploadedSignature ? "Signature verified and locked for regulatory signing." : "Signature missing. Upload PNG/JPG in Settings to authorize reports."}
            </p>
          </div>
        </div>
        <button 
          onClick={() => {
            onClose();
            window.dispatchEvent(new CustomEvent("winnow_open_modal", { detail: "account" }));
          }}
          style={{
            padding: "8px 14px", fontSize: 12.5, fontWeight: 600, border: "1px solid #cbd5e1",
            borderRadius: 8, backgroundColor: "#fff", color: C.text2, cursor: "pointer"
          }}
        >
          Manage
        </button>
      </div>

      {/* Signature Log */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Reviewer Audit Log</h4>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#fff", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Signing Date</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Report Signed</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Reviewer</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Mark</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Method</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Integrity Hash</th>
                <th style={{ padding: "10px 16px", fontWeight: 600, color: "#475569" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SIGNATURE_HISTORY.map((sh, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", color: "#64748b", fontFamily: "monospace" }}>{sh.timestamp}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#334155" }}>{sh.report}</td>
                  <td style={{ padding: "12px 16px", color: "#334155" }}>{sh.reviewer}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{
                      width: 50, height: 26, border: "1px solid #e2e8f0", borderRadius: 4, background: "#f8fafc",
                      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
                    }}>
                      {hasUploadedSignature && sh.status === "Valid" ? (
                        <img src={sigText} alt="Signature Thumbnail" style={{ maxHeight: "90%", maxWidth: "90%", objectFit: "contain" }} />
                      ) : (
                        <span style={{ fontSize: 9.5, color: "#94a3b8", fontFamily: "cursive" }}>Raya Surya</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#475569" }}>{sh.method}</td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontFamily: "monospace" }}>{sh.hash}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 20,
                      background: sh.status === "Valid" ? "#e0f2fe" : "#fee2e2",
                      color: sh.status === "Valid" ? "#0369a1" : "#dc2626"
                    }}>
                      {sh.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface WorkspaceRegDocsTabProps {
  showToast: (m: string) => void;
}

function WorkspaceRegDocsTab({ showToast }: WorkspaceRegDocsTabProps): React.ReactElement {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const docs = [
    { title: "Ibuprofen Hepatic Signal — Signal Eval", type: "Signal Eval", version: "v2.1", status: "Final", date: "2026-06-11", owner: "Raya Surya", format: "PDF" },
    { title: "Dupixent PBRER 2024 Annual Update", type: "PSUR/PBRER", version: "v1.0", status: "Draft", date: "2026-06-08", owner: "Raya Surya", format: "DOCX" },
    { title: "Pembrolizumab B/R Assessment", type: "B/R Assessment", version: "v3.2", status: "Submitted", date: "2026-06-05", owner: "Raya Surya", format: "eCTD" },
    { title: "Metformin Lactic Acidosis Review", type: "Signal Eval", version: "v1.4", status: "Final", date: "2026-06-10", owner: "System Agent", format: "PDF" },
    { title: "Dupixent Clinical Trial Protocol Audit", type: "DSUR", version: "v2.0", status: "Submitted", date: "2026-06-02", owner: "Regulatory Admin", format: "eCTD" },
    { title: "Pembrolizumab FDA Submission Dossier", type: "Submissions", version: "v5.1", status: "Submitted", date: "2026-05-28", owner: "Raya Surya", format: "eCTD" }
  ];

  const filteredDocs = selectedCategory === "all" ? docs : docs.filter(d => d.type === selectedCategory);
  const categories = ["all", "PSUR/PBRER", "Signal Eval", "B/R Assessment", "DSUR", "Submissions"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Category chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "6px 12px", fontSize: 12, fontWeight: 600, borderRadius: 20,
              border: selectedCategory === cat ? "1px solid #059669" : "1px solid #cbd5e1",
              backgroundColor: selectedCategory === cat ? "#ecfdf5" : "#fff",
              color: selectedCategory === cat ? "#047857" : "#475569",
              cursor: "pointer"
            }}
          >
            {cat === "all" ? "All Documents" : cat}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 16, overflowY: "auto", flex: 1, paddingRight: 4
      }}>
        {filteredDocs.map((doc, idx) => (
          <div key={idx} style={{
            border: "1px solid #cbd5e1", borderRadius: 12, backgroundColor: "#fff",
            padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)", transition: "all 0.15s"
          }} className="hover:border-emerald-500">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                {/* Doc icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ background: "#ecfdf5", padding: 6, borderRadius: 8 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: doc.status === "Submitted" ? "#e0f2fe" : doc.status === "Final" ? "#ecfdf5" : "#f1f5f9",
                    color: doc.status === "Submitted" ? "#0369a1" : doc.status === "Final" ? "#047857" : "#475569"
                  }}>{doc.status}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#f1f5f9", color: "#475569", padding: "2px 6px", borderRadius: 4 }}>{doc.format}</span>
                </div>
              </div>
              <h4 style={{ margin: "0 0 4px 0", fontSize: 13.5, fontWeight: 700, color: "#0f172a", lineHeight: 1.4 }}>{doc.title}</h4>
              <p style={{ margin: 0, fontSize: 11.5, color: "#64748b" }}>Version: {doc.version} · Owner: {doc.owner}</p>
            </div>

            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Modified {doc.date}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => showToast(`Opening document preview...`)} style={{ fontSize: 11.5, fontWeight: 600, color: "#059669", background: "none", border: "none", cursor: "pointer" }}>Open</button>
                <button onClick={() => showToast(`Downloading ${doc.title} in ${doc.format} format...`)} style={{ fontSize: 11.5, fontWeight: 600, color: "#475569", background: "none", border: "none", cursor: "pointer" }}>Export</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface WorkspaceGuidelinesTabProps {
  showToast: (m: string) => void;
}

function WorkspaceGuidelinesTab({ showToast }: WorkspaceGuidelinesTabProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState("FDA");
  const [searchQuery, setSearchQuery] = useState("");

  const guidelines = [
    { agency: "FDA", code: "21 CFR Part 11", title: "Electronic Records; Electronic Signatures", year: 2024, summary: "Regulations governing electronic records and signatures to satisfy trustworthiness, reliability, and equivalence to paper.", url: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/cfrsearch.cfm?fr=11.1" },
    { agency: "FDA", code: "FDA-2023-D-2101", title: "Postmarketing Safety Reporting for Human Drug and Biological Products", year: 2023, summary: "Guidance on reporting adverse events, safety findings, and periodic safety reports to the FDA.", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/postmarketing-safety-reporting-human-drug-and-biological-products-and-human-cells-tissues-and" },
    { agency: "EMA", code: "GVP Module IX", title: "Guideline on good pharmacovigilance practices (GVP) - Module IX (Signal Management)", year: 2023, summary: "Detailed guidelines on the processes for signal detection, validation, evaluation, and recommendation for safety actions.", url: "https://www.ema.europa.eu/en/documents/scientific-guideline/guideline-good-pharmacovigilance-practices-gvp-module-ix-signal-management-rev-1_en.pdf" },
    { agency: "EMA", code: "GVP Module VII", title: "Guideline on good pharmacovigilance practices (GVP) - Module VII (Periodic Safety Update Report)", year: 2022, summary: "Requirements for periodic evaluations of the benefit-risk balance of marketed medicines.", url: "https://www.ema.europa.eu/en/documents/scientific-guideline/guideline-good-pharmacovigilance-practices-gvp-module-vii-periodic-safety-update-report-rev-1_en.pdf" },
    { agency: "ICH", code: "ICH E2E", title: "Pharmacovigilance Planning Guidance", year: 2004, summary: "International standards for planning safety monitoring activities, especially for early postmarketing phases.", url: "https://www.ich.org/page/efficacy-guidelines" },
    { agency: "ICH", code: "ICH E2C (R2)", title: "Periodic Benefit-Risk Evaluation Report (PBRER)", year: 2012, summary: "Standard format and content for periodic safety reporting across international regulatory regions.", url: "https://www.ich.org/page/efficacy-guidelines" },
    { agency: "WHO-UMC", code: "WHO Causality", title: "WHO-UMC system for standardised case causality assessment", year: 2013, summary: "Standardized system for assessing the causal relationship between a drug and an adverse event.", url: "https://who-umc.org/media/164002/who-umc-causality-assessment.pdf" },
    { agency: "WHO-UMC", code: "MedDRA Guidance", title: "MedDRA Terminology Mapping and MSSO Guidelines", year: 2024, summary: "Official guide for coding adverse events using the Medical Dictionary for Regulatory Activities.", url: "https://www.meddra.org/how-to-use/support-documentation" }
  ];

  const filtered = guidelines.filter(g => {
    if (g.agency !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return g.title.toLowerCase().includes(q) || g.code.toLowerCase().includes(q) || g.summary.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      {/* Sub-tabs & Search */}
      <div style={{ display: "flex", justifySelf: "space-between", alignItems: "center", gap: 12, borderBottom: "1px solid #e2e8f0", paddingBottom: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["FDA", "EMA", "ICH", "WHO-UMC"].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 12px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 500, borderRadius: 6,
                border: "none", backgroundColor: activeTab === tab ? "#f1f5f9" : "transparent",
                color: activeTab === tab ? "#0f172a" : "#64748b", cursor: "pointer"
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <input 
          type="text" 
          placeholder="Search guidelines..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ padding: "6px 10px", fontSize: 12.5, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none", width: 200, marginLeft: "auto" }}
        />
      </div>

      {/* Guidelines List */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
        {filtered.map((g, idx) => (
          <div key={idx} style={{
            border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, backgroundColor: "#fff",
            boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", gap: 6
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: "#ecfdf5", color: "#047857", padding: "2px 6px", borderRadius: 4 }}>{g.code}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>Published {g.year}</span>
              </div>
              <a 
                href={g.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => showToast(`Opening outbound guideline link in new tab...`)}
                style={{
                  fontSize: 12, fontWeight: 600, color: "#059669", display: "flex", alignItems: "center", gap: 4,
                  textDecoration: "none"
                }}
              >
                <span>Open Link</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
            </div>
            <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{g.title}</h4>
            <p style={{ margin: 0, fontSize: 12.5, color: "#475569", lineHeight: 1.45 }}>{g.summary}</p>
            <p style={{ margin: 0, fontSize: 10.5, color: "#94a3b8", fontFamily: "monospace" }}>Source: {g.url}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface WorkspaceHipaaTabProps {
  showToast: (m: string) => void;
}

function WorkspaceHipaaTab({ showToast }: WorkspaceHipaaTabProps): React.ReactElement {
  const [openSection, setOpenSection] = useState<string | null>("handling");

  const statTiles = [
    { label: "PHI Scans Run (30d)", value: "142", icon: "✓" },
    { label: "Identifiers Redacted", value: "8,421", icon: "▲" },
    { label: "k-Anonymity Floor", value: "k ≥ 6", icon: "⬡" },
    { label: "Open PHI Exposures", value: "0", icon: "🔒" }
  ];

  const policySections = [
    { id: "handling", title: "1. Data Handling & PHI Redaction", content: "All patient datasets processed by WinnowAI undergo automatic Safe Harbor sanitization. 18 categories of Protected Health Information (PHI) are removed or generalized before any LLM compilation runs. Local sandboxing ensures zero leakage of non-redacted source text." },
    { id: "retention", title: "2. Data Retention Policy", content: "Under HIPAA and GxP guidelines, raw log payloads are held for a maximum of 30 days. Final compliance attestations and signed reports are stored in encrypted cold storage for 7 years to meet FDA audit-trail regulations." },
    { id: "access", title: "3. Access Control & RBAC", content: "System access is limited via OAuth 2.0 and Role-Based Access Control (RBAC). Named reviewer signatures require multi-factor verification before report stamping." },
    { id: "breach", title: "4. Breach Response Protocol", content: "In the event of key revocation or integrity hash mismatch (tampering detected), all node processing is suspended, and security administrators are alerted via cryptographic event triggers." }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%", overflowY: "auto", paddingRight: 4 }}>
      {/* Stat Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {statTiles.map((tile, i) => (
          <div key={i} style={{ border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{tile.label}</span>
              <span style={{ fontSize: 14, color: "#0d9488" }}>{tile.icon}</span>
            </div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Accordion Policy */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Privacy governance</h4>
          <button 
            onClick={() => showToast("Downloading Privacy Policy PDF...")}
            style={{ fontSize: 12, fontWeight: 600, color: "#059669", background: "none", border: "none", cursor: "pointer" }}
          >
            Download Policy PDF
          </button>
        </div>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
          {policySections.map((sec) => {
            const isOpen = openSection === sec.id;
            return (
              <div key={sec.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <button 
                  onClick={() => setOpenSection(isOpen ? null : sec.id)}
                  style={{
                    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: 14, border: "none", background: "none", textAlign: "left", cursor: "pointer",
                    fontSize: 13, fontWeight: 600, color: "#1e293b"
                  }}
                >
                  <span>{sec.title}</span>
                  <span style={{ fontSize: 16, color: "#94a3b8" }}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 14px 14px 14px", fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>
                    {sec.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkspaceManualTab(): React.ReactElement {
  const [activeArticle, setActiveArticle] = useState("detection");

  const articles = {
    detection: {
      title: "Running a Signal Detection",
      content: (
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
          <p>This guide describes how to trigger and review a safety signal detection analysis run using the WinnowAI multi-agent coordinator.</p>
          <h5 style={{ margin: "14px 0 6px 0", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Step 1: Compound & Stream Setup</h5>
          <p style={{ margin: "0 0 10px 0" }}>Navigate to the main panel, select a pharmacovigilance target (e.g., <strong>Pembrolizumab</strong> or <strong>Metformin</strong>), and input your specific safety query. The Planner agent will map out a customized retrieval and validation workflow based on the compound's history.</p>
          
          <h5 style={{ margin: "14px 0 6px 0", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Step 2: Sub-agent Evidence Aggregation</h5>
          <p style={{ margin: "0 0 10px 0" }}>The <strong>Data Compiler</strong> sub-agents will fetch spontaneous adverse event records from <em>OpenFDA (FAERS)</em>, clinical trials registers, and academic databases. All literature hits are citation-mapped, and pre-prints are flagged accordingly.</p>
          
          <h5 style={{ margin: "14px 0 6px 0", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Step 3: Verification and Thresholding</h5>
          <p style={{ margin: "0 0 10px 0" }}>The <strong>Medical Reviewer</strong> sub-agents will perform genomic validation (via ClinVar/gnomAD), pathway analysis, and tissue-expression mapping. Finally, the coordinator computes the Proportional Reporting Ratio (PRR) and checks if signals cross your configured significance threshold (e.g., PRR &ge; 2.0).</p>
          
          <div style={{ margin: "16px 0", padding: "12px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#15803d" }}>
            <strong>Regulatory Standard Note:</strong> All signal detections run within this workspace are automatically logged in the append-only ledger (Audit Logs) in accordance with EMA GVP Module IX requirements.
          </div>
        </div>
      )
    },
    attestation: {
      title: "Signing & Attestation (21 CFR Part 11)",
      content: (
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
          <p>WinnowAI requires a valid reviewer attestation before exporting final signal evaluation reports for regulatory submission.</p>
          <h5 style={{ margin: "14px 0 6px 0", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Configuring your signature:</h5>
          <ol style={{ margin: "0 0 12px 0", paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}>Navigate to <strong>Settings &rarr; Profile & Signature</strong>.</li>
            <li style={{ marginBottom: 6 }}>Upload an official PNG/JPG/SVG graphic file of your signature mark. WinnowAI does not support text-to-cursive generated signatures to maintain Part 11 integrity.</li>
            <li style={{ marginBottom: 6 }}>Save the profile. Your uploaded signature is encrypted and held locally.</li>
          </ol>
          
          <h5 style={{ margin: "14px 0 6px 0", fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>Applying the signature:</h5>
          <p style={{ margin: "0 0 10px 0" }}>When a report is generated, click the <strong>Approve</strong> button. You will be prompted with a modal containing the legal attestation text and a checkbox: <em>"I apply my uploaded signature to authorize this report and confirm my intent to sign..."</em>.</p>
          
          <p style={{ margin: "0 0 10px 0" }}>Checking the attestation and clicking <strong>Sign</strong> embeds your signature mark into the report document, writes an entry to the Signature History ledger, and appends a SHA-256 integrity hash to the Audit Trail.</p>
        </div>
      )
    },
    agents: {
      title: "The 4+1 Agents Architecture",
      content: (
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
          <p>WinnowAI's core consists of 4 primary specialized agents cooperating with 1 hidden coordinator:</p>
          <ul style={{ margin: "0 0 12px 0", paddingLeft: 20 }}>
            <li style={{ marginBottom: 6 }}><strong>Planner (⬡):</strong> Organizes retrieval paths and structures safety queries.</li>
            <li style={{ marginBottom: 6 }}><strong>Data Compiler (⬠):</strong> Retrieves spontaneous reports and clinical evidence.</li>
            <li style={{ marginBottom: 6 }}><strong>Medical Reviewer (◆):</strong> Performs molecular profiling and genomics checks.</li>
            <li style={{ marginBottom: 6 }}><strong>PHI Guard (▲):</strong> Redacts identifying data and ensures compliance.</li>
            <li style={{ marginBottom: 6 }}><strong>UI Agent (Hidden):</strong> Manages interactive chat feedback and modal views.</li>
          </ul>
        </div>
      )
    }
  };

  const currentArticle = articles[activeArticle as keyof typeof articles] || articles.detection;

  return (
    <div style={{ display: "flex", gap: 16, height: "100%", minHeight: 0 }}>
      {/* Left TOC inside content area */}
      <div style={{ width: 180, borderRight: "1px solid #e2e8f0", paddingRight: 12, display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, overflowY: "auto" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, display: "block" }}>TOC</span>
        <button onClick={() => setActiveArticle("detection")} style={{ textAlign: "left", padding: "6px 8px", fontSize: 12, fontWeight: activeArticle === "detection" ? 600 : 500, color: activeArticle === "detection" ? "#047857" : "#475569", background: activeArticle === "detection" ? "#ecfdf5" : "none", border: "none", borderRadius: 4, cursor: "pointer" }}>Running a Signal Detection</button>
        <button onClick={() => setActiveArticle("attestation")} style={{ textAlign: "left", padding: "6px 8px", fontSize: 12, fontWeight: activeArticle === "attestation" ? 600 : 500, color: activeArticle === "attestation" ? "#047857" : "#475569", background: activeArticle === "attestation" ? "#ecfdf5" : "none", border: "none", borderRadius: 4, cursor: "pointer" }}>Signing & Attestation</button>
        <button onClick={() => setActiveArticle("agents")} style={{ textAlign: "left", padding: "6px 8px", fontSize: 12, fontWeight: activeArticle === "agents" ? 600 : 500, color: activeArticle === "agents" ? "#047857" : "#475569", background: activeArticle === "agents" ? "#ecfdf5" : "none", border: "none", borderRadius: 4, cursor: "pointer" }}>The 4+1 Agents Architecture</button>
        <span style={{ fontSize: 11, color: "#cbd5e1", padding: "4px 8px" }}>Stubs:</span>
        <span style={{ fontSize: 11.5, color: "#94a3b8", paddingLeft: 8 }}>Configuring Thresholds</span>
        <span style={{ fontSize: 11.5, color: "#94a3b8", paddingLeft: 8 }}>Exporting Reports</span>
        <span style={{ fontSize: 11.5, color: "#94a3b8", paddingLeft: 8 }}>Compliance & PHI</span>
        <span style={{ fontSize: 11.5, color: "#94a3b8", paddingLeft: 8 }}>FAQ</span>
      </div>

      {/* Right Article Scroll Panel */}
      <div style={{ flex: 1, overflowY: "auto", paddingLeft: 4 }}>
        <h4 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{currentArticle.title}</h4>
        {currentArticle.content}
      </div>
    </div>
  );
}

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  showToast: (m: string) => void;
  complianceReports: any[];
  setComplianceReports: React.Dispatch<React.SetStateAction<any[]>>;
  auditLogs: any[];
  setAuditLogs: React.Dispatch<React.SetStateAction<any[]>>;
  signatureHistory: any[];
  setSignatureHistory: React.Dispatch<React.SetStateAction<any[]>>;
}

function WorkspaceModal({
  isOpen,
  onClose,
  initialTab = "compliance",
  showToast,
  complianceReports,
  setComplianceReports,
  auditLogs,
  setAuditLogs,
  signatureHistory,
  setSignatureHistory
}: WorkspaceModalProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const WORKSPACE_TABS = [
    {
      id: "compliance",
      label: "Compliance Reports",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      )
    },
    {
      id: "audit",
      label: "Audit Logs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      )
    },
    {
      id: "signatures",
      label: "Signature History",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      )
    },
    {
      id: "regdocs",
      label: "Regulatory Docs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      )
    },
    {
      id: "guidelines",
      label: "FDA/EMA Guidelines",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      )
    },
    {
      id: "hipaa",
      label: "HIPAA & Privacy",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    },
    {
      id: "manual",
      label: "User Manual",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    }
  ];

  return (
    <SidebarModal
      isOpen={isOpen}
      onClose={onClose}
      title="Workspace"
      tabs={WORKSPACE_TABS}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 4px 0" }}>
            {WORKSPACE_TABS.find(t => t.id === activeTab)?.label}
          </h3>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {activeTab === "compliance" && <WorkspaceComplianceTab showToast={showToast} reportsList={complianceReports} />}
          {activeTab === "audit" && <WorkspaceAuditTab showToast={showToast} auditLogsList={auditLogs} />}
          {activeTab === "signatures" && <WorkspaceSignaturesTab onClose={onClose} showToast={showToast} signatureHistoryList={signatureHistory} />}
          {activeTab === "regdocs" && <WorkspaceRegDocsTab showToast={showToast} />}
          {activeTab === "guidelines" && <WorkspaceGuidelinesTab showToast={showToast} />}
          {activeTab === "hipaa" && <WorkspaceHipaaTab showToast={showToast} />}
          {activeTab === "manual" && <WorkspaceManualTab />}
        </div>
      </div>
    </SidebarModal>
  );
}

function ScheduledTasksPill({
  chatHistory,
  setChatHistory,
  setChatInitialMessage,
  setScreen,
  showToast,
  schedules,
  setSchedules
}: {
  chatHistory: any[];
  setChatHistory: React.Dispatch<React.SetStateAction<any[]>>;
  setChatInitialMessage: (m: string) => void;
  setScreen: (s: string) => void;
  showToast: (msg: string) => void;
  schedules: any[];
  setSchedules: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [open, setOpen] = useState(false);
  
  const handleOpenThread = (title: string) => {
    setChatHistory(prev => {
      const exists = prev.some(h => h.title === title);
      if (exists) {
        return prev.map(h => h.title === title ? { ...h, isUnread: false } : h);
      } else {
        return [
          ...prev,
          { id: Date.now().toString(), title, date: "Just now", isSurveillance: true, isUnread: false }
        ];
      }
    });
    setChatInitialMessage(title);
    setScreen("chat");
    setOpen(false);
    showToast(`Loaded surveillance thread for ${title}`);
  };

  const handleDeleteTask = (id: string, compound: string) => {
    setSchedules(prev => prev.filter(item => item.id !== id));
    setChatHistory(prev => prev.filter(h => !(h.isSurveillance && h.title.startsWith(compound))));
    showToast(`Cancelled scheduled task for ${compound}`);
  };

  const getScheduleDetails = (s: any) => {
    const isPembro = s.compound === "Pembrolizumab";
    const isAtorva = s.compound === "Atorvastatin";
    
    const threadTitle = isPembro ? "Pembrolizumab — Weekly" : isAtorva ? "Atorvastatin — Monthly" : `${s.compound} — ${s.frequency}`;
    const thread = chatHistory.find(h => h.title === threadTitle || (h.isSurveillance && h.title.startsWith(s.compound)));
    const isUnread = thread ? thread.isUnread : false;

    if (isPembro) {
      return {
        id: s.id,
        compound: s.compound,
        frequency: s.frequency,
        title: "Pembrolizumab — Weekly",
        status: "Completed",
        duration: "1m 21s",
        toolCalls: "21 tool calls",
        result: "5 signals · 2 new (↑ Myocarditis PRR 4.1)",
        isUnread,
        colorClass: "emerald"
      };
    } else if (isAtorva) {
      return {
        id: s.id,
        compound: s.compound,
        frequency: s.frequency,
        title: "Atorvastatin — Monthly",
        status: "Completed",
        duration: "48s",
        toolCalls: "12 tool calls",
        result: "2 signals · 0 new (Stable)",
        isUnread,
        colorClass: "slate"
      };
    } else {
      return {
        id: s.id,
        compound: s.compound,
        frequency: s.frequency,
        title: `${s.compound} — ${s.frequency}`,
        status: "Active",
        duration: "--",
        toolCalls: "0 tool calls",
        result: "Pending initial run",
        isUnread,
        colorClass: "slate"
      };
    }
  };

  const enrichedSchedules = schedules.map(getScheduleDetails);
  const readySchedules = enrichedSchedules.filter(s => s.isUnread);
  const activeSchedules = enrichedSchedules.filter(s => !s.isUnread);

  const renderCard = (s: any) => {
    return (
      <div key={s.id} className="p-3 rounded-xl border flex flex-col gap-1.5 transition-all duration-150 hover:bg-slate-50"
        style={{
          backgroundColor: s.isUnread ? "#f0fdf4" : "#fff",
          borderColor: s.isUnread ? "#bbf7d0" : "#e2e8f0"
        }}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.isUnread ? "bg-emerald-500" : "bg-slate-400"}`} />
            {s.title}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            s.colorClass === "emerald" 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}>{s.frequency}</span>
        </div>
        
        <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
          <span className={`font-semibold ${s.isUnread ? "text-emerald-700" : "text-slate-600"}`}>{s.status}</span>
          {s.duration !== "--" && (
            <>
              <span>·</span>
              <span>{s.duration}</span>
            </>
          )}
          {s.toolCalls !== "0 tool calls" && (
            <>
              <span>·</span>
              <span>{s.toolCalls}</span>
            </>
          )}
        </div>
        
        <div className={`text-[12px] text-slate-700 font-medium p-2 rounded-lg border border-slate-100 mt-1 ${
          s.isUnread ? "bg-white/60" : "bg-slate-50"
        }`}>
          {s.result}
        </div>
        
        <div className="flex justify-between items-center mt-1.5">
          <button 
            onClick={() => handleDeleteTask(s.id, s.compound)} 
            className="text-[11.5px] font-medium text-rose-600 hover:text-rose-700 transition-colors bg-transparent border-none p-0 cursor-pointer"
          >
            Cancel Task
          </button>
          <button 
            onClick={() => handleOpenThread(s.title)} 
            className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 bg-transparent border-none p-0 cursor-pointer"
          >
            Open thread
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute top-4 right-4 z-30">
      <button
        onClick={() => setOpen(!open)}
        className="px-3.5 py-1.5 rounded-full text-[12px] font-normal shadow-sm transition-all duration-200 border bg-white cursor-pointer"
        style={{
          borderColor: C.border,
          color: C.text3,
        }}
      >
        Scheduled Tasks: {schedules.length}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-[360px] rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-4 flex flex-col gap-3"
              style={{ maxHeight: "480px", overflowY: "auto" }}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[13.5px] font-bold text-slate-900 flex items-center gap-1.5">
                  Scheduled Tasks
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{schedules.length} Active</span>
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {readySchedules.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Ready</div>
                    {readySchedules.map(renderCard)}
                  </div>
                )}

                {activeSchedules.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Active</div>
                    {activeSchedules.map(renderCard)}
                  </div>
                )}
                
                {schedules.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-[13px] italic">
                    No scheduled tasks configured.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (m: string) => void;
  schedules: any[];
  setSchedules: (s: any[]) => void;
}

function ScheduleModal({ isOpen, onClose, showToast, schedules, setSchedules }: ScheduleModalProps): React.ReactElement | null {
  const [selectedCompound, setSelectedCompound] = useState("Metformin");
  const [frequency, setFrequency] = useState("Weekly");
  const [triggerType, setTriggerType] = useState<"new-signal" | "prr-threshold" | "count-delta">("new-signal");
  const [triggerPrr, setTriggerPrr] = useState(2.0);
  const [triggerDelta, setTriggerDelta] = useState(25);
  const [selectedAgents, setSelectedAgents] = useState<Record<string, boolean>>({
    planner: true,
    data: true,
    medical: true,
    phi: true,
    qa: true
  });

  const handleToggleAgent = (id: string) => {
    setSelectedAgents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSchedule = () => {
    const activeAgentNames = Object.entries(selectedAgents)
      .filter(([_, active]) => active)
      .map(([id]) => {
        const ag = AGENTS.find(a => a.id === id);
        return ag ? ag.name : id;
      });

    let triggerLabel = "Any new signal";
    if (triggerType === "prr-threshold") {
      triggerLabel = `PRR ≥ ${triggerPrr}`;
    } else if (triggerType === "count-delta") {
      triggerLabel = `Case count ↑ ${triggerDelta}%`;
    }

    const newSchedule = {
      id: Date.now().toString(),
      compound: selectedCompound,
      frequency,
      agents: activeAgentNames,
      trigger: triggerLabel,
      created: new Date().toLocaleDateString()
    };

    setSchedules([...schedules, newSchedule]);
    showToast(`Scheduled continuous safety monitor for ${selectedCompound}`);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules(schedules.filter(s => s.id !== id));
    showToast("Schedule removed");
  };

  return (
    <Modal.Modal active={isOpen} onClickOutside={onClose}>
      <Modal.Body>
        <Modal.Header>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <Modal.Title>Task Scheduler</Modal.Title>
            <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 24, color: "#64748b", cursor: "pointer", padding: 0, marginTop: -24, lineHeight: 1 }}>&times;</button>
          </div>
        </Modal.Header>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Compound Selection */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Select Compound</label>
              <select value={selectedCompound} onChange={e => setSelectedCompound(e.target.value)}
                style={{ padding: "8px 12px", fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", outline: "none" }}>
                <option value="Ibuprofen">Ibuprofen</option>
                <option value="Pembrolizumab">Pembrolizumab</option>
                <option value="Metformin">Metformin</option>
                <option value="Rivaroxaban">Rivaroxaban</option>
                <option value="Atorvastatin">Atorvastatin</option>
                <option value="Adalimumab">Adalimumab</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                style={{ padding: "8px 12px", fontSize: 13.5, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", color: "#0f172a", outline: "none" }}>
                <option value="Daily">Daily Scan</option>
                <option value="Weekly">Weekly Scan</option>
                <option value="Monthly">Monthly Scan</option>
              </select>
            </div>
          </div>

          {/* Trigger Condition Config */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Alert Trigger Condition</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "#f8fafc", padding: 12, borderRadius: 10, border: "1px solid #e2e8f0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#334155" }}>
                <input type="radio" name="trigger" checked={triggerType === "new-signal"} onChange={() => setTriggerType("new-signal")} style={{ accentColor: "#059669" }} />
                Any new disproportionality signal detected
              </label>
              
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#334155" }}>
                  <input type="radio" name="trigger" checked={triggerType === "prr-threshold"} onChange={() => setTriggerType("prr-threshold")} style={{ accentColor: "#059669" }} />
                  PRR Threshold &ge;
                </label>
                {triggerType === "prr-threshold" && (
                  <input type="number" step="0.1" min="1.0" max="10.0" value={triggerPrr} onChange={e => setTriggerPrr(parseFloat(e.target.value) || 2.0)}
                    style={{ padding: "2px 6px", width: 60, fontSize: 12.5, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none" }} />
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#334155" }}>
                  <input type="radio" name="trigger" checked={triggerType === "count-delta"} onChange={() => setTriggerType("count-delta")} style={{ accentColor: "#059669" }} />
                  Case count delta increase &ge;
                </label>
                {triggerType === "count-delta" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="number" min="5" max="500" value={triggerDelta} onChange={e => setTriggerDelta(parseInt(e.target.value) || 25)}
                      style={{ padding: "2px 6px", width: 60, fontSize: 12.5, borderRadius: 6, border: "1px solid #cbd5e1", outline: "none" }} />
                    <span style={{ fontSize: 12.5, color: "#64748b" }}>%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Agent Selection */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Target Surveillance Agents</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {AGENTS.map(ag => (
                <label key={ag.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid #e2e8f0`, borderRadius: 8, cursor: "pointer", background: selectedAgents[ag.id] ? `${ag.color}08` : "#fff" }}>
                  <input type="checkbox" checked={!!selectedAgents[ag.id]} onChange={() => handleToggleAgent(ag.id)} style={{ accentColor: ag.color }} />
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "#334155" }}>{ag.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action button placed on the right */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={handleAddSchedule}
              style={{ padding: "8px 16px", background: "linear-gradient(135deg, #059669, #0d9488)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#047857")}
              onMouseLeave={e => (e.currentTarget.style.background = C.brand)}>
              Schedule {selectedCompound} Monitor
            </button>
          </div>

          <div style={{ height: 1, background: "#f1f5f9" }} />

          {/* Active Tasks List */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Active Scheduled Monitors ({schedules.length})</label>
            {schedules.length === 0 ? (
              <div style={{ padding: "16px", border: "1px dashed #cbd5e1", borderRadius: 12, textAlign: "center", color: "#64748b", fontSize: 12.5 }}>
                No safety monitors scheduled. Add one above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {schedules.map((s) => (
                  <div key={s.id} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{s.compound}</span>
                        <span style={{ fontSize: 10.5, color: "#059669", backgroundColor: "#ecfdf5", padding: "1px 6px", borderRadius: 6, fontWeight: 600 }}>{s.frequency}</span>
                      </div>
                      <p style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: "4px 0 0 0" }}>
                        Pipeline: {s.agents.join(" → ")}
                      </p>
                      <p style={{ fontSize: 11.5, color: "#0d9488", fontWeight: 600, margin: "2px 0 0 0" }}>
                        Trigger: {s.trigger || "Any new signal"}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteSchedule(s.id)}
                      style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 8px" }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
    </Modal.Modal>
  );
}

interface ToastNotificationProps {
  message: string;
  onClose: () => void;
}

function ToastNotification({ message, onClose }: ToastNotificationProps): React.ReactElement {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 200,
      backgroundColor: "#0f172a", color: "#fff", borderRadius: 12, padding: "12px 18px",
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.1)",
      display: "flex", alignItems: "center", gap: 10, maxWidth: 360,
      border: "1px solid rgba(255,255,255,0.08)"
    }}>
      <span style={{ color: "#10b981", fontSize: 16 }}>✓</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#94a3b8", fontSize: 16, cursor: "pointer", marginLeft: "auto", paddingLeft: 8 }}>&times;</button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────
export default function WinnowAI(): React.ReactElement {
  const [screen, setScreen] = useState<"welcome" | "chat">("welcome");
  const [view, setView] = useState<"app" | "agent-store">("app");
  const [chatInitialMessage, setChatInitialMessage] = useState("");
  const [panelFull, setPanelFull] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Record<string, AgentActivity>>({});

  const DEFAULT_SIGNATURE = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNTAiIGhlaWdodD0iNTAiPjxwYXRoIGQ9Ik0xMCAzMCBRMzAgNSA2MCAyMCBUMTAwIDIwIFQxNDAgMTAiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHRleHQgeD0iMTAiIHk9IjQwIiBmb250LWZhbWlseT0iY3Vyc2l2ZSIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzY0NzQ4YiI+UmF5YSBTdXJ5YTwvdGV4dD48L3N2Zz4=";

  // New States for Gaps
  const [agentsList, setAgentsList] = useState<any[]>(AGENTS);
  const [previewRole, setPreviewRole] = useState<"scientist" | "admin">("scientist");
  const [signatureText, setSignatureText] = useState(localStorage.getItem("winnow_sig") || DEFAULT_SIGNATURE);
  const [activeModal, setActiveModal] = useState<"upgrade" | "account" | "schedule" | "share" | "workspace" | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<string>("compliance");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [complianceReports, setComplianceReports] = useState<any[]>(MOCK_COMPLIANCE_REPORTS);
  const [auditLogs, setAuditLogs] = useState<any[]>(MOCK_AUDIT_LOGS);
  const [signatureHistory, setSignatureHistory] = useState<any[]>(MOCK_SIGNATURE_HISTORY);

  const [chatHistory, setChatHistory] = useState<any[]>([
    { id: 1, title: "Metformin FAERS Q3 Analysis", date: "2 hours ago", isSurveillance: false, isUnread: false },
    { id: 2, title: "Oncology Cohort — Pembrolizumab", date: "Yesterday", isSurveillance: false, isUnread: false },
    { id: 3, title: "CYP2D6 Genomics Audit", date: "3 days ago", isSurveillance: false, isUnread: false },
    { id: 4, title: "Dupixent B/R Compilation", date: "1 week ago", isSurveillance: false, isUnread: false },
    { id: "surv-1", title: "Pembrolizumab — Weekly", date: "Weekly run ready", isSurveillance: true, cadence: "Weekly", isUnread: true },
    { id: "surv-2", title: "Atorvastatin — Monthly", date: "2 days ago", isSurveillance: true, cadence: "Monthly", isUnread: false }
  ]);

  const [schedules, setSchedules] = useState<any[]>([
    { id: "1", compound: "Pembrolizumab", frequency: "Weekly", agents: ["Planner", "Data Compiler", "Medical Reviewer"], trigger: "Any new signal", created: "2026-06-08" },
    { id: "2", compound: "Atorvastatin", frequency: "Monthly", agents: ["Planner", "Data Compiler", "PHI Guard", "Medical Reviewer"], trigger: "PRR ≥ 2.0", created: "2026-06-01" }
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const handleOpenModal = (e: CustomEvent<any> | Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "upgrade" || detail === "account" || detail === "schedule" || detail === "workspace") {
        setActiveModal(detail);
      }
    };
    window.addEventListener("winnow_open_modal" as any, handleOpenModal);
    return () => window.removeEventListener("winnow_open_modal" as any, handleOpenModal);
  }, []);

  useEffect(() => {
    const handleReportSigned = (e: CustomEvent<any> | Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { reportId, title } = detail;
      const timestamp = new Date().toISOString();
      const reviewer = "Raya Surya";
      
      setComplianceReports(prev => {
        const exists = prev.some(r => r.id === reportId);
        if (exists) {
          return prev.map(r => r.id === reportId ? { ...r, status: "Cleared", signedBy: reviewer } : r);
        } else {
          return [...prev, {
            id: reportId,
            title: title || "Weekly Safety Surveillance Report",
            type: "Signal Eval",
            date: timestamp.split("T")[0],
            status: "Cleared",
            signedBy: reviewer,
            summary: "Safety surveillance report verified and signed under 21 CFR Part 11.",
            kAnonymity: "N/A",
            checklist: []
          }];
        }
      });
      
      setSignatureHistory(prev => [
        {
          timestamp,
          report: title || `Report ${reportId}`,
          reviewer,
          method: "Uploaded image",
          status: "Valid",
          hash: Math.random().toString(16).substring(2, 10) + "..."
        },
        ...prev
      ]);
      
      setAuditLogs(prev => [
        {
          timestamp,
          actor: `${reviewer} (User)`,
          action: "Signature applied",
          target: `${reportId} (${title})`,
          ip: "192.168.1.14",
          hash: Math.random().toString(16).substring(2, 10) + "..."
        },
        ...prev
      ]);
      
      showToast(`Signature applied successfully to ${reportId}`);
    };
    
    window.addEventListener("winnow_report_signed" as any, handleReportSigned);
    return () => window.removeEventListener("winnow_report_signed" as any, handleReportSigned);
  }, []);

  const handleWelcomeSend = (text: string) => {
    if (!text.trim()) return;
    setChatInitialMessage(text);
    setScreen("chat");
  };

  const handleProvisionAgent = (newSubAgent: any) => {
    const pId = newSubAgent.parentId || "data";
    const subAgentObj: any = {
      ...newSubAgent,
      parentId: pId,
      origin: newSubAgent.origin || "store",
      status: newSubAgent.status || (previewRole === "admin" ? "validated" : "sandbox"),
      scope: newSubAgent.scope || "org",
      capability: newSubAgent.capability || "faers"
    };

    setAgentsList(prev => {
      return prev.map(parent => {
        if (parent.id === pId) {
          const exists = parent.subAgents.some((sa: any) => sa.id === subAgentObj.id);
          if (exists) {
            return {
              ...parent,
              subAgents: parent.subAgents.map((sa: any) => sa.id === subAgentObj.id ? subAgentObj : sa)
            };
          } else {
            return {
              ...parent,
              subAgents: [...parent.subAgents, subAgentObj]
            };
          }
        }
        return parent;
      });
    });

    setActiveAgents(prev => ({
      ...prev,
      [subAgentObj.id]: { status: "thinking", message: "initializing agent node..." }
    }));
    setTimeout(() => {
      setActiveAgents(prev => ({
        ...prev,
        [subAgentObj.id]: { status: "idle", message: "surveillance node active" }
      }));
    }, 2000);
    showToast(`Provisioned custom sub-agent: ${subAgentObj.name}`);
  };

  const handleLogout = () => {
    setActiveAgents({});
    setChatInitialMessage("");
    setScreen("welcome");
    showToast("Logged out successfully");
  };

  const handleSelectHistory = (title: string) => {
    setChatHistory(prev => prev.map(h => h.title === title ? { ...h, isUnread: false } : h));
    const mockConv = MOCK_CONVERSATIONS[title];
    if (mockConv) {
      // Load mock conversation with all messages
      setChatInitialMessage(title);
      setScreen("chat");
    } else {
      setChatInitialMessage(title);
      setScreen("chat");
    }
  };

  if (view === "agent-store") {
    return (
      <AgentStorePage
        onClose={() => setView("app")}
        onProvisionAgent={handleProvisionAgent}
        agentsList={agentsList}
        previewRole={previewRole}
        setPreviewRole={setPreviewRole}
      />
    );
  }

  return (
    <div className="w-full h-screen flex overflow-hidden"
      style={{ fontFamily: "Manrope, sans-serif", background: C.pageBg, color: C.text2 }}>
      <Sidebar screen={screen} setScreen={setScreen} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} activeAgents={activeAgents}
        onStopAgent={(id: string) => setActiveAgents(prev => { const next = { ...prev }; delete next[id]; return next; })}
        onOpenAgentStore={() => setView("agent-store")}
        onOpenModal={(m: any, tab?: string) => {
          setActiveModal(m);
          if (tab) setWorkspaceTab(tab);
        }}
        onLogout={handleLogout}
        onSelectHistory={handleSelectHistory}
        agentsList={agentsList}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory} />

      <main className="flex-1 flex flex-col min-h-0 min-w-0 relative">
        {!panelFull && (
          <ScheduledTasksPill
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            setChatInitialMessage={setChatInitialMessage}
            setScreen={setScreen}
            showToast={showToast}
            schedules={schedules}
            setSchedules={setSchedules}
          />
        )}
        {screen === "welcome" ? (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
            <WelcomeScreen onSend={handleWelcomeSend} />
          </motion.div>
        ) : (
          <motion.div key={`chat-${chatInitialMessage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col min-h-0">
            <ChatScreen initialMessage={chatInitialMessage} onActivity={setActiveAgents} onShare={() => setActiveModal("share")} panelFull={panelFull} setPanelFull={setPanelFull} />
          </motion.div>
        )}
      </main>

      {/* Render Modals */}
      <UpgradeProModal isOpen={activeModal === "upgrade"} onClose={() => setActiveModal(null)} showToast={showToast} />
      <ExportReportModal isOpen={activeModal === "share"} onClose={() => setActiveModal(null)} showToast={showToast} />
      <SettingsPageModal isOpen={activeModal === "account"} onClose={() => setActiveModal(null)} signatureText={signatureText} setSignatureText={setSignatureText} showToast={showToast} onOpenUpgrade={() => setActiveModal("upgrade")} />
      <WorkspaceModal
        isOpen={activeModal === "workspace"}
        onClose={() => setActiveModal(null)}
        initialTab={workspaceTab}
        showToast={showToast}
        complianceReports={complianceReports}
        setComplianceReports={setComplianceReports}
        auditLogs={auditLogs}
        setAuditLogs={setAuditLogs}
        signatureHistory={signatureHistory}
        setSignatureHistory={setSignatureHistory}
      />
      <ScheduleModal isOpen={activeModal === "schedule"} onClose={() => setActiveModal(null)} showToast={showToast} schedules={schedules} setSchedules={setSchedules} />
      {toastMessage && <ToastNotification message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}
