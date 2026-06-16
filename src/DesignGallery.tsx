import React, { useState } from "react";
import { C, radius, spacing, font, shadow, agentColors, premium } from "./design/tokens";
import Button from "./components/ui/Button";
import IconButton from "./components/ui/IconButton";
import Select from "./components/ui/Select";
import Tabs from "./components/ui/Tabs";
import Card from "./components/ui/Card";
import Badge from "./components/ui/Badge";
import Pill from "./components/ui/Pill";
import Radio from "./components/ui/Radio";
import Checkbox from "./components/ui/Checkbox";
import {
  Grid, Settings, LayoutPanelTop, AudioLines, FileText, Calendar, Info,
  CircleHelp, LogOut, Pen, Clock, ShoppingBag, X, ChevronRight, ChevronDown,
  Sparkles, List, Paperclip, Upload, Download, Check, Shield, ExternalLink,
  TrendingUp, Minimize, Maximize, User, CreditCard, SlidersHorizontal, Bell,
  Monitor, Folder, Book, Lock, HelpCircle, Building2, Users, File, ChevronUp,
  Square, ArrowUp, Mic, Search, ArrowRight, Pencil, MessageCircle, Link,
  Share2, ThumbsUp, ThumbsDown, Copy, FilePlus, CirclePlus, Mail, LoaderCircle,
} from "lucide-react";

const SECTIONS = [
  { id: "tokens", label: "Tokens" },
  { id: "button", label: "Button" },
  { id: "icon-button", label: "IconButton" },
  { id: "select", label: "Select" },
  { id: "tabs", label: "Tabs" },
  { id: "card", label: "Card" },
  { id: "badge-pill", label: "Badge / Pill" },
  { id: "radio-checkbox", label: "Radio / Checkbox" },
  { id: "modal", label: "Modal" },
  { id: "icons", label: "Icons" },
];

const COLOR_ENTRIES: { label: string; value: string; hex: string }[] = [
  { label: "pageBg", value: C.pageBg, hex: C.pageBg },
  { label: "card", value: C.card, hex: C.card },
  { label: "cardHover", value: C.cardHover, hex: C.cardHover },
  { label: "border", value: C.border, hex: C.border },
  { label: "borderMid", value: C.borderMid, hex: C.borderMid },
  { label: "text1", value: C.text1, hex: C.text1 },
  { label: "text2", value: C.text2, hex: C.text2 },
  { label: "text3", value: C.text3, hex: C.text3 },
  { label: "text4", value: C.text4, hex: C.text4 },
  { label: "text5", value: C.text5, hex: C.text5 },
  { label: "brand", value: C.brand, hex: C.brand },
  { label: "brandSoft", value: C.brandSoft, hex: C.brandSoft },
  { label: "brandText", value: C.brandText, hex: C.brandText },
  { label: "premium", value: premium, hex: premium },
];

const AGENT_COLOR_ENTRIES = [
  { label: "Planner", hex: agentColors.planner },
  { label: "Data Compiler", hex: agentColors.dataCompiler },
  { label: "Medical Reviewer", hex: agentColors.medicalReviewer },
  { label: "PHI Guard", hex: agentColors.phiGuard },
];

function AgentIcon({ sides, color, size = 28 }: { sides: number; color: string; size?: number }) {
  const cx = size / 2;
  const r = size * 0.42;
  const pts = Array.from({ length: sides }, (_, i) => {
    const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return `${cx + r * Math.cos(a)},${cx + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <polygon points={pts} fill={color} opacity={0.85} />
    </svg>
  );
}

const LUCIDE_ICONS: { label: string; icon: React.ReactNode }[] = [
  { label: "Grid", icon: <Grid size={18} /> },
  { label: "Settings", icon: <Settings size={18} /> },
  { label: "LayoutPanelTop", icon: <LayoutPanelTop size={18} /> },
  { label: "AudioLines", icon: <AudioLines size={18} /> },
  { label: "FileText", icon: <FileText size={18} /> },
  { label: "Calendar", icon: <Calendar size={18} /> },
  { label: "Info", icon: <Info size={18} /> },
  { label: "CircleHelp", icon: <CircleHelp size={18} /> },
  { label: "LogOut", icon: <LogOut size={18} /> },
  { label: "Pen", icon: <Pen size={18} /> },
  { label: "Clock", icon: <Clock size={18} /> },
  { label: "ShoppingBag", icon: <ShoppingBag size={18} /> },
  { label: "X", icon: <X size={18} /> },
  { label: "ChevronRight", icon: <ChevronRight size={18} /> },
  { label: "ChevronDown", icon: <ChevronDown size={18} /> },
  { label: "Sparkles", icon: <Sparkles size={18} /> },
  { label: "List", icon: <List size={18} /> },
  { label: "Paperclip", icon: <Paperclip size={18} /> },
  { label: "Upload", icon: <Upload size={18} /> },
  { label: "Download", icon: <Download size={18} /> },
  { label: "Check", icon: <Check size={18} /> },
  { label: "Shield", icon: <Shield size={18} /> },
  { label: "ExternalLink", icon: <ExternalLink size={18} /> },
  { label: "TrendingUp", icon: <TrendingUp size={18} /> },
  { label: "Minimize", icon: <Minimize size={18} /> },
  { label: "Maximize", icon: <Maximize size={18} /> },
  { label: "User", icon: <User size={18} /> },
  { label: "CreditCard", icon: <CreditCard size={18} /> },
  { label: "SlidersHorizontal", icon: <SlidersHorizontal size={18} /> },
  { label: "Bell", icon: <Bell size={18} /> },
  { label: "Monitor", icon: <Monitor size={18} /> },
  { label: "Folder", icon: <Folder size={18} /> },
  { label: "Book", icon: <Book size={18} /> },
  { label: "Lock", icon: <Lock size={18} /> },
  { label: "HelpCircle", icon: <HelpCircle size={18} /> },
  { label: "Building2", icon: <Building2 size={18} /> },
  { label: "Users", icon: <Users size={18} /> },
  { label: "File", icon: <File size={18} /> },
  { label: "ChevronUp", icon: <ChevronUp size={18} /> },
  { label: "Square", icon: <Square size={18} /> },
  { label: "ArrowUp", icon: <ArrowUp size={18} /> },
  { label: "Mic", icon: <Mic size={18} /> },
  { label: "Search", icon: <Search size={18} /> },
  { label: "ArrowRight", icon: <ArrowRight size={18} /> },
  { label: "Pencil", icon: <Pencil size={18} /> },
  { label: "MessageCircle", icon: <MessageCircle size={18} /> },
  { label: "Link", icon: <Link size={18} /> },
  { label: "Share2", icon: <Share2 size={18} /> },
  { label: "ThumbsUp", icon: <ThumbsUp size={18} /> },
  { label: "ThumbsDown", icon: <ThumbsDown size={18} /> },
  { label: "Copy", icon: <Copy size={18} /> },
  { label: "FilePlus", icon: <FilePlus size={18} /> },
  { label: "CirclePlus", icon: <CirclePlus size={18} /> },
  { label: "Mail", icon: <Mail size={18} /> },
  { label: "LoaderCircle", icon: <LoaderCircle size={18} /> },
];

const AGENTS = [
  { id: "planner", name: "Planner", color: agentColors.planner, sides: 6 },
  { id: "data", name: "Data Compiler", color: agentColors.dataCompiler, sides: 4 },
  { id: "medical", name: "Medical Reviewer", color: agentColors.medicalReviewer, sides: 5 },
  { id: "phi", name: "PHI Guard", color: agentColors.phiGuard, sides: 3 },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text1, margin: "0 0 8px 0" }}>{children}</h2>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: C.text4, margin: "0 0 20px 0" }}>{children}</p>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</span>;
}

function ColorSwatch({ hex, label }: { hex: string; label: string }) {
  const isLight = hex === "#FFFFFF" || hex === "#F7FAFC" || hex === "#F0F4F8" || hex === "#e5efdb";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 8, background: hex, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: isLight ? C.text3 : "#fff" }}>{hex}</span>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: C.text3 }}>{label}</span>
    </div>
  );
}

export default function DesignGallery() {
  const [activeSection, setActiveSection] = useState("tokens");
  const [selectVal, setSelectVal] = useState("option-a");
  const [tabsVal, setTabsVal] = useState("charts");
  const [tabs3Val, setTabs3Val] = useState("one");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: font.family.sans, background: C.pageBg, color: C.text2 }}>
      {/* Sticky nav */}
      <nav style={{ position: "sticky", top: 0, width: 180, height: "100vh", borderRight: `1px solid ${C.border}`, padding: "24px 12px", overflowY: "auto", flexShrink: 0, background: C.card }}>
        <h1 style={{ fontSize: 15, fontWeight: 800, color: C.text1, margin: "0 0 20px 0" }}>Design Gallery</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); setActiveSection(s.id); document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" }); }}
              style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12.5, fontWeight: activeSection === s.id ? 700 : 500, color: activeSection === s.id ? C.brandText : C.text3, background: activeSection === s.id ? C.brandSoft : "transparent", textDecoration: "none", transition: "all 0.1s" }}>
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 40px", maxWidth: 960 }}>
        {/* ────────── TOKENS ────────── */}
        <section id="tokens" style={{ marginBottom: 48 }}>
          <SectionTitle>Tokens</SectionTitle>
          <SubTitle>Design tokens from <code>design/tokens.ts</code></SubTitle>

          <div style={{ marginBottom: 28 }}>
            <Label>Colors (C object + premium)</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
              {COLOR_ENTRIES.map((c) => <ColorSwatch key={c.label} hex={c.hex} label={c.label} />)}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Label>Agent Colors</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
              {AGENT_COLOR_ENTRIES.map((c) => <ColorSwatch key={c.label} hex={c.hex} label={c.label} />)}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Label>Radius (px)</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10, alignItems: "flex-end" }}>
              {(Object.entries(radius) as [string, number][]).map(([name, val]) => (
                <div key={name} style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                  <div style={{ width: 48, height: 48, border: `1px solid ${C.border}`, borderRadius: val, background: C.brandSoft }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: C.text3 }}>{name} ({val})</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Label>Spacing (px)</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10, alignItems: "center" }}>
              {(Object.entries(spacing) as [string, number][]).map(([name, val]) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: val || 1, height: 20, background: C.brand, borderRadius: 2, minWidth: 2 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: C.text3 }}>{name} ({val})</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <Label>Typography</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {(Object.entries(font.size) as [string, number][]).map(([name, val]) => (
                <div key={name} style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span style={{ width: 70, fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>{name}</span>
                  <span style={{ fontSize: val, fontWeight: font.weight.semibold, color: C.text1 }}>Manrope {val}px</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginTop: 8 }}>
                <span style={{ width: 70, fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>Accent</span>
                <span style={{ fontSize: 20, fontWeight: 400, fontFamily: font.family.accent, color: C.text1 }}>Instrument Serif</span>
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                <span style={{ width: 70, fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase" }}>Mono</span>
                <span style={{ fontSize: 14, fontFamily: font.family.mono, color: C.text1 }}>JetBrains Mono</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Shadow</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
              {(Object.entries(shadow) as [string, string][]).map(([name, val]) => (
                <div key={name} style={{ width: 140, padding: 16, borderRadius: 8, background: C.card, boxShadow: val, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.text3 }}>{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── BUTTON ────────── */}
        <section id="button" style={{ marginBottom: 48 }}>
          <SectionTitle>Button</SectionTitle>
          <SubTitle>Variants x sizes x states</SubTitle>
          {(["sm", "md", "lg"] as const).map((size) => (
            <div key={size} style={{ marginBottom: 20 }}>
              <Label>Size: {size}</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {(["primary", "secondary", "tertiary", "danger", "premium"] as const).map((variant) => (
                  <div key={variant} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Button variant={variant} size={size}>{variant}</Button>
                    <Button variant={variant} size={size} disabled>{variant}</Button>
                    <Button variant={variant} size={size} loading>{variant}</Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ────────── ICON BUTTON ────────── */}
        <section id="icon-button" style={{ marginBottom: 48 }}>
          <SectionTitle>IconButton</SectionTitle>
          <SubTitle>Sizes with common icons</SubTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
            {(["sm", "md", "lg"] as const).map((size) => (
              <div key={size} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Label style={{ width: 20 }}>{size}</Label>
                <IconButton size={size}><X size={size === "sm" ? 14 : size === "md" ? 16 : 20} /></IconButton>
                <IconButton size={size}><Settings size={size === "sm" ? 14 : size === "md" ? 16 : 20} /></IconButton>
                <IconButton size={size} disabled><X size={size === "sm" ? 14 : size === "md" ? 16 : 20} /></IconButton>
              </div>
            ))}
          </div>
        </section>

        {/* ────────── SELECT ────────── */}
        <section id="select" style={{ marginBottom: 48 }}>
          <SectionTitle>Select</SectionTitle>
          <SubTitle>Default, with long value, disabled</SubTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
            <Select value={selectVal} onChange={setSelectVal} options={[{ label: "Option A", value: "option-a" }, { label: "Option B", value: "option-b" }, { label: "Option C", value: "option-c" }]} />
            <Select value="long" onChange={() => {}} options={["short", "a very long option label that should trigger text overflow ellipsis"]} />
            <Select value="" onChange={() => {}} options={["Disabled option"]} disabled />
          </div>
        </section>

        {/* ────────── TABS ────────── */}
        <section id="tabs" style={{ marginBottom: 48 }}>
          <SectionTitle>Tabs</SectionTitle>
          <SubTitle>2-tab and 3-tab variants</SubTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label>2 tabs</Label>
              <div style={{ marginTop: 6 }}>
                <Tabs tabs={[{ label: "Charts", value: "charts" }, { label: "Agents", value: "agents" }]} active={tabsVal} onChange={setTabsVal} />
              </div>
            </div>
            <div>
              <Label>3 tabs</Label>
              <div style={{ marginTop: 6 }}>
                <Tabs tabs={[{ label: "One", value: "one" }, { label: "Two", value: "two" }, { label: "Three", value: "three" }]} active={tabs3Val} onChange={setTabs3Val} />
              </div>
            </div>
          </div>
        </section>

        {/* ────────── CARD ────────── */}
        <section id="card" style={{ marginBottom: 48 }}>
          <SectionTitle>Card</SectionTitle>
          <SubTitle>Variants + consistent sizing example</SubTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {(["elevated", "outlined", "flat"] as const).map((variant) => (
              <Card key={variant} variant={variant} padding="md" style={{ width: 200 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text1 }}>{variant}</p>
                <p style={{ margin: "4px 0 0 0", fontSize: 12, color: C.text4 }}>Card content preview</p>
              </Card>
            ))}
            <Card variant="elevated" padding="lg" style={{ width: 200 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text1 }}>padding=lg</p>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: C.text4 }}>Larger padding</p>
            </Card>
            <Card variant="elevated" padding="sm" style={{ width: 200 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text1 }}>padding=sm</p>
              <p style={{ margin: "4px 0 0 0", fontSize: 12, color: C.text4 }}>Smaller padding</p>
            </Card>
          </div>
        </section>

        {/* ────────── BADGE / PILL ────────── */}
        <section id="badge-pill" style={{ marginBottom: 48 }}>
          <SectionTitle>Badge / Pill</SectionTitle>
          <SubTitle>All color and status variants</SubTitle>
          <div style={{ marginBottom: 20 }}>
            <Label>Badge</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" }}>
              {(["success", "warning", "danger", "info", "neutral"] as const).map((v) => (
                <React.Fragment key={v}>
                  <Badge variant={v} size="sm">{v}</Badge>
                  <Badge variant={v} size="md">{v}</Badge>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div>
            <Label>Pill</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, alignItems: "center" }}>
              {(["sm", "md"] as const).map((size) => (
                <React.Fragment key={size}>
                  <Pill size={size}>Default</Pill>
                  <Pill size={size} active>Active</Pill>
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ────────── RADIO / CHECKBOX ────────── */}
        <section id="radio-checkbox" style={{ marginBottom: 48 }}>
          <SectionTitle>Radio / Checkbox</SectionTitle>
          <SubTitle>Unchecked, checked, disabled</SubTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <Label>Radio</Label>
              <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center" }}>
                <Radio checked={false} onChange={() => {}} label="Unchecked" />
                <Radio checked={true} onChange={() => {}} label="Checked" />
                <Radio checked={false} onChange={() => {}} label="Disabled" disabled />
                <Radio checked={true} onChange={() => {}} label="Disabled checked" disabled />
              </div>
            </div>
            <div>
              <Label>Checkbox</Label>
              <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center" }}>
                <Checkbox checked={false} onChange={() => {}} label="Unchecked" />
                <Checkbox checked={true} onChange={() => {}} label="Checked" />
                <Checkbox checked={false} onChange={() => {}} label="Disabled" disabled />
                <Checkbox checked={true} onChange={() => {}} label="Disabled checked" disabled />
              </div>
            </div>
          </div>
        </section>

        {/* ────────── MODAL ────────── */}
        <section id="modal" style={{ marginBottom: 48 }}>
          <SectionTitle>Modal</SectionTitle>
          <SubTitle>Trigger button opens the standardized modal overlay</SubTitle>
          <Button variant="primary" onClick={() => setModalOpen(true)}>Open Modal</Button>
          {modalOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.40)", backdropFilter: "blur(4px)" }} onClick={() => setModalOpen(false)}>
              <div style={{ background: "#fff", borderRadius: 12, maxWidth: 480, width: "100%", padding: 28, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text1 }}>Modal Title</h3>
                  <IconButton onClick={() => setModalOpen(false)}><X size={20} /></IconButton>
                </div>
                <p style={{ fontSize: 13.5, color: C.text3, lineHeight: 1.6, margin: "0 0 20px 0" }}>
                  This is a modal overlay. It uses the same backdrop blur and card pattern as the app's modals.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ────────── ICONS ────────── */}
        <section id="icons" style={{ marginBottom: 48 }}>
          <SectionTitle>Icons</SectionTitle>
          <SubTitle>Lucide icons used in the app + AgentIcon polygons</SubTitle>
          <div style={{ marginBottom: 24 }}>
            <Label>Lucide Icons</Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 12, marginTop: 10 }}>
              {LUCIDE_ICONS.map((ico) => (
                <div key={ico.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.card }}>
                  {ico.icon}
                  <span style={{ fontSize: 9, fontWeight: 600, color: C.text4, textAlign: "center" }}>{ico.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>AgentIcon Polygons</Label>
            <div style={{ display: "flex", gap: 24, marginTop: 10 }}>
              {AGENTS.map((a) => (
                <div key={a.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <AgentIcon sides={a.sides} color={a.color} size={32} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>{a.name}</span>
                  <span style={{ fontSize: 10, color: C.text4 }}>{a.sides} sides</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
