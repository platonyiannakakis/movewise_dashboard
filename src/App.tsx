import { useState, useMemo, useEffect, useRef } from "react";

/* ─── Constants ─────────────────────────────────────────── */
const CAP = 25000;
const WKS = 12;
const NOW = 5;

const P = {
  dark: "#202014",
  taupe: "#b9ae93",
  cream: "#ece4d0",
  creamMid: "#c9bfa8",
  creamDim: "#9a9280",
  gold: "#d4b050",
  amber: "#d4a03c",
  red: "#c45c4a",
  green: "#7aaa6a",
  greenDim: "#5a8a4a",
  textDim: "#706858",
  rainbow: ["#7ab07a", "#d4b050", "#d4903c", "#c45c4a", "#9a6aaa", "#5a8aaa"],
};

const serif = "Georgia,'Times New Roman',serif";
const sans = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const brd = "rgba(185,174,147,0.1)";
const cardS = {
  background: "rgba(32,32,20,0.6)",
  borderRadius: 10,
  padding: "16px 20px",
  border: `1px solid ${brd}`,
  backdropFilter: "blur(10px)",
};

/* Convert #rrggbb + alpha → rgba() — never string-concat opacity */
function hr(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ─── Budget Data ────────────────────────────────────────── */
// All numbers verified against brief.
// planned total = €22,560  actual (wk5) = €24,079  cap = €25,000
const CATEGORIES = [
  {
    id: "people", name: "People", color: P.rainbow[0],
    items: [
      { id: "dev",    name: "App Development",        rate: 65,   pQty: 100, aQty: 135, unit: "hrs",     type: "variable", who: "Dev team (external)",   notes: "3rd-party dev team sprint 1. Includes 35 hrs unplanned (reward rebuild + analytics).", status: "up" },
      { id: "pm",     name: "Project Manager (Anja)", rate: 50,   pQty: 80,  aQty: 95,  unit: "hrs",     type: "variable", who: "Anja @ 20% FTE",        notes: "Internal Ops — already exceeding 20% FTE capacity at Wk5.", status: "up" },
      { id: "ux",     name: "Design & UX",            rate: 55,   pQty: 60,  aQty: 60,  unit: "hrs",     type: "variable", who: "Freelance designer",    notes: "Mobile UX + landing pages. On target. Consider cutting for savings.", status: "ok" },
    ],
  },
  {
    id: "partners", name: "Partners", color: P.rainbow[1],
    items: [
      { id: "onboard", name: "Local Business Onboarding", rate: 150, pQty: 30, aQty: 24, unit: "partners", type: "variable", who: "Nina / Biz Dev", notes: "One-time incentive package. 6 partners not yet confirmed.", status: "down" },
    ],
  },
  {
    id: "marketing", name: "Marketing", color: P.rainbow[2],
    items: [
      { id: "i18n",     name: "Translations (app + docs)", rate: 0.08, pQty: 2000, aQty: 2000, unit: "words",    type: "variable", who: "External translator", notes: "Round 1 done. Minimum 3 rounds needed — 4–5× underbudgeted.", status: "ok" },
      { id: "campaign", name: "Marketing Materials",        rate: 2000, pQty: 1,    aQty: 1,    unit: "campaign", type: "fixed",    who: "Marketing / Nina",   notes: "Awareness phase (video + social). Single district only.", status: "ok" },
      { id: "rewards",  name: "Reward Budget",              rate: 0.20, pQty: 4000, aQty: 970,  unit: "uses",     type: "variable", who: "System / auto",      notes: "Points redeemed = partner payouts. 24% redemption rate.", status: "down" },
    ],
  },
  {
    id: "admin", name: "Admin", color: P.rainbow[4],
    items: [
      { id: "tools", name: "Admin + Tools", rate: 800, pQty: 1, aQty: 1, unit: "flat", type: "fixed", who: "Ops", notes: "Slack, Notion, Typeform, Zoom licences.", status: "ok" },
    ],
  },
  {
    id: "contingency", name: "Contingency", color: P.rainbow[5],
    items: [
      { id: "buffer", name: "Contingency", rate: 500, pQty: 1, aQty: 1, unit: "flat", type: "fixed", who: "—", notes: "Original buffer. Should be 10% = €2,500. Wildly inadequate.", status: "ok" },
    ],
  },
  {
    id: "invisible", name: "Invisible Costs", color: P.red,
    items: [
      { id: "consult",  name: "External Consultant (You)",   rate: 75,   pQty: 0, aQty: 0, unit: "hrs",   type: "variable", who: "You",        notes: "Not budgeted. Est. 60–80 hrs Wk5–12.", status: "new" },
      { id: "i18n2",    name: "Translation Rounds 2–3",      rate: 0.08, pQty: 0, aQty: 0, unit: "words", type: "variable", who: "Translator", notes: "Push notifications + docs. Sven flagged.", status: "new" },
      { id: "flyers",   name: "Printed Flyers",              rate: 350,  pQty: 0, aQty: 0, unit: "batch", type: "fixed",    who: "Nina",       notes: "F'hain partners: offline materials non-negotiable.", status: "new" },
      { id: "videos",   name: "District Onboarding Videos",  rate: 1200, pQty: 0, aQty: 0, unit: "video", type: "fixed",    who: "External",   notes: "Per-district localised. ×2 outside original €2k budget.", status: "new" },
      { id: "gdpr",     name: "GDPR / Legal Review",         rate: 1500, pQty: 0, aQty: 0, unit: "flat",  type: "fixed",    who: "Legal",      notes: "Data retention compliance. Unresolved.", status: "new" },
      { id: "coord",    name: "Coordination Costs",          rate: 0,    pQty: 0, aQty: 0, unit: "flat",  type: "fixed",    who: "—",          notes: "Reports for funder, dashboards, stakeholder alignment.", status: "new" },
    ],
  },
];

const STATUS_META = {
  up:   { label: "↑",   color: P.red,   tip: "Over plan" },
  down: { label: "↓",   color: P.amber, tip: "Under plan" },
  ok:   { label: "—",   color: P.green, tip: "On track" },
  new:  { label: "NEW", color: P.red,   tip: "Not budgeted" },
};

// Scope creep breakdown (already spent, absorbed in App Dev 135 hrs)
const CREEP = [
  { id: "creep1", name: "Reward Flow Rebuild",       hrs: 20, rate: 65, total: 1300, source: "Sven (Slack): P'Berg merchants rejected UX" },
  { id: "creep2", name: "District Analytics Feature", hrs: 15, rate: 65, total: 975,  source: "Sven: started without sign-off" },
];

// Assumptions
const ASSUMPTIONS = [
  { original: "One campaign covers two districts",        reality: "Districts have different needs / languages",     impact: "Marketing underfunded" },
  { original: "Partners self-onboard with kits",          reality: "Partners need active support, confused",         impact: "Onboarding cost higher" },
  { original: "Translation is one round (2,000 words)",   reality: "Minimum 3 rounds, 8,000+ words needed",          impact: "4–5× too low" },
  { original: "PM at 20% FTE (80 hrs)",                   reality: "Already at 95 hrs by Week 5",                    impact: "Biggest unacknowledged overrun" },
  { original: "Dev scope stays frozen",                   reality: "Reward flow rebuilt + analytics started",        impact: "35 extra hours, no change control" },
  { original: "€500 contingency covers unknowns",         reality: "GDPR, flyers, videos, consultant unbudgeted",    impact: "Contingency was symbolic" },
  { original: "No external consultant needed",            reality: "You were hired at Week 5",                       impact: "Entire cost category missing" },
];

const TRADEOFFS = [
  "Cut UX/Design by 50% for remaining weeks → frees ~€1,650",
  "No analytics dashboard this pilot → saves 15–20 dev hrs",
  "Stop partner onboarding at 24 → saves €900",
  "Hold reward budget; reallocate up to €600 if usage stays low",
  "No new features until Week 9",
  "Consultant capped at 60 hours with review at 40",
];

const TRACKING = [
  "Weekly burn rate by category",
  "Hours logged vs hours budgeted (variable costs)",
  "Budget-to-Actual variance report at Week 8",
  "Change request log (no more silent scope creep)",
  "Reward redemption rate (determines if reallocation possible)",
];

/* ─── Grain Canvas ───────────────────────────────────────── */
function GrainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const w = (c.width = 1400), h = (c.height = 2000);
    const g = ctx.createLinearGradient(0, 0, w * 0.7, h);
    g.addColorStop(0, "#202014");
    g.addColorStop(0.35, "#2a2818");
    g.addColorStop(0.65, "#4a4430");
    g.addColorStop(1, "#7a7460");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const g2 = ctx.createLinearGradient(w * 0.3, 0, w, h * 0.8);
    g2.addColorStop(0, "rgba(185,174,147,0)");
    g2.addColorStop(0.6, "rgba(185,174,147,0.08)");
    g2.addColorStop(1, "rgba(185,174,147,0.15)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
    // Film grain
    for (let i = 0; i < 90000; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const a = Math.random() * 0.07;
      ctx.fillStyle = Math.random() > 0.6 ? `rgba(236,228,208,${a})` : `rgba(0,0,0,${Math.random() * 0.1})`;
      ctx.fillRect(x, y, Math.random() > 0.9 ? 2 : 1, 1);
    }
    // Vertical scratches
    for (let i = 0; i < 55; i++) {
      ctx.beginPath();
      const a = Math.random() * 0.06 + 0.01;
      ctx.strokeStyle = `rgba(236,228,208,${a})`;
      ctx.lineWidth = Math.random() * 0.8 + 0.2;
      const sx = Math.random() * w;
      ctx.moveTo(sx, Math.random() * h * 0.3);
      ctx.lineTo(sx + (Math.random() - 0.5) * 10, Math.random() * h * 0.8 + h * 0.2);
      ctx.stroke();
    }
    // Horizontal scratches
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      const a = Math.random() * 0.03 + 0.005;
      ctx.strokeStyle = `rgba(236,228,208,${a})`;
      ctx.lineWidth = Math.random() * 0.5 + 0.1;
      const sy = Math.random() * h;
      ctx.moveTo(0, sy);
      ctx.lineTo(w, sy + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
    // Vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(32,32,20,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

/* ─── Rainbow Stripe ─────────────────────────────────────── */
function Rainbow({ height = 4, style = {} }) {
  return (
    <div style={{ display: "flex", width: "100%", height, borderRadius: height / 2, overflow: "hidden", ...style }}>
      {P.rainbow.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
    </div>
  );
}

/* ─── Budget Table (shared across Dashboard) ─────────────── */
function BudgetTable({ cats, setCats }) {
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");

  const startEdit = (id, val) => { setEditId(id); setEditVal(String(val)); };
  const saveEdit = (catIdx, itemIdx) => {
    setCats(prev =>
      prev.map((cat, ci) =>
        ci !== catIdx ? cat : {
          ...cat,
          items: cat.items.map((it, ii) =>
            ii !== itemIdx ? it : { ...it, aQty: Math.max(0, parseFloat(editVal) || 0) }
          ),
        }
      )
    );
    setEditId(null);
  };

  return (
    <>
      {cats.map((cat, ci) => {
        const catPlanned = cat.items.reduce((s, it) => s + it.rate * it.pQty, 0);
        const catActual  = cat.items.reduce((s, it) => s + it.rate * it.aQty, 0);
        return (
          <div key={cat.id} style={{ ...cardS, marginBottom: 10, padding: "14px 16px", borderLeft: `3px solid ${cat.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: serif, fontSize: 16, color: cat.color }}>{cat.name}</span>
              <span style={{ fontSize: 10, color: P.creamDim, fontFamily: sans }}>
                €{Math.round(catActual).toLocaleString()} spent
                {cat.id !== "invisible" && ` / €${Math.round(catPlanned).toLocaleString()} planned`}
              </span>
              {cat.id === "invisible" && (
                <span style={{ fontSize: 10, color: P.red, fontStyle: "italic", marginLeft: 4 }}>
                  — fill in qty to model future exposure
                </span>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${brd}` }}>
                    {[
                      ["Category",           "left",   160],
                      ["Status",             "center",  60],
                      ["Unit Cost",          "right",   90],
                      ["Qty (plan)",         "right",   80],
                      ["Qty (actual) ✎",    "right",   90],
                      ["Total (plan)",       "right",   90],
                      ["Total (actual)",     "right",   90],
                      ["Notes",             "left",   null],
                    ].map(([h, align, w]) => (
                      <th key={h} style={{
                        padding: "6px 8px", color: P.creamDim, fontWeight: 600,
                        fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase",
                        textAlign: align, whiteSpace: "nowrap",
                        ...(w ? { width: w } : {}),
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.items.map((it, ii) => {
                    const pCost = it.rate * it.pQty;
                    const aCost = it.rate * it.aQty;
                    const sm = STATUS_META[it.status];
                    const isEditing = editId === it.id;
                    return (
                      <tr key={it.id} style={{ borderBottom: `1px solid ${brd}` }}>
                        <td style={{ padding: "8px 8px" }}>
                          <div style={{ fontWeight: 600, color: P.cream, lineHeight: 1.3 }}>{it.name}</div>
                          <div style={{ fontSize: 10, color: P.creamDim, marginTop: 2 }}>
                            {it.who} ·{" "}
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4,
                              color: it.type === "fixed" ? "#9a9ac8" : "#c89a9a" }}>
                              {it.type}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: "center", padding: "8px 6px" }}>
                          <span style={{
                            background: hr(sm.color, 0.14), color: sm.color,
                            padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700,
                          }}>{sm.label}</span>
                        </td>
                        <td style={{ textAlign: "right", color: P.taupe, fontFamily: serif, padding: "8px 6px", whiteSpace: "nowrap" }}>
                          {it.rate > 0 ? `€${it.rate}/${it.unit}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", color: P.creamDim, fontFamily: serif, padding: "8px 6px" }}>
                          {it.pQty > 0 ? it.pQty.toLocaleString() : "—"}
                        </td>
                        <td
                          style={{ textAlign: "right", padding: "4px 8px", cursor: "pointer" }}
                          onClick={() => !isEditing && startEdit(it.id, it.aQty)}
                        >
                          {isEditing ? (
                            <input
                              type="number" value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={() => saveEdit(ci, ii)}
                              onKeyDown={e => e.key === "Enter" && saveEdit(ci, ii)}
                              autoFocus
                              style={{
                                width: 72, padding: "4px 6px", border: `1px solid ${P.gold}`,
                                borderRadius: 4, fontSize: 12, textAlign: "right",
                                background: "rgba(32,32,20,0.9)", color: P.cream, outline: "none", fontFamily: serif,
                              }}
                            />
                          ) : (
                            <span style={{
                              borderBottom: `1px dashed ${P.creamDim}`, fontFamily: serif,
                              color: it.aQty > it.pQty && it.pQty > 0 ? P.red : P.cream,
                            }}>
                              {it.aQty > 0 ? it.aQty.toLocaleString() : "—"}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", color: P.creamDim, fontFamily: serif, padding: "8px 6px" }}>
                          {pCost > 0 ? `€${Math.round(pCost).toLocaleString()}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: serif, fontWeight: 700, padding: "8px 6px",
                          color: aCost > pCost && pCost > 0 ? P.red : aCost > 0 ? P.gold : P.creamDim }}>
                          {aCost > 0 ? `€${Math.round(aCost).toLocaleString()}` : "€0"}
                        </td>
                        <td style={{ padding: "8px 8px", fontSize: 11, color: P.creamDim, lineHeight: 1.4, maxWidth: 200 }}>
                          {it.notes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ─── Burn Chart ─────────────────────────────────────────── */
function BurnChart({ tots, projWk }) {
  const cW = 700, cH = 240, pL = 52, pR = 14, pT = 22, pB = 30;
  const maxV = Math.max(CAP * 1.18, tots.weeklyBurn * WKS * 1.05);
  const xS = w => pL + (w / WKS) * (cW - pL - pR);
  const yS = v => pT + (1 - Math.min(v, maxV) / maxV) * (cH - pT - pB);
  const mkL = pts => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const wks = Array.from({ length: WKS + 1 }, (_, i) => i);
  const plannedRate = tots.planned / WKS;
  const plannedPts = wks.map(w => ({ x: xS(w), y: yS(plannedRate * w) }));
  const actPts     = wks.filter(w => w <= NOW).map(w => ({ x: xS(w), y: yS(tots.weeklyBurn * w) }));
  const projPts    = wks.map(w => ({ x: xS(w), y: yS(tots.weeklyBurn * w) }));
  const projAt     = tots.weeklyBurn * projWk;

  return (
    <div style={cardS}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: serif, fontSize: 18 }}>Budget <em>Burn</em></span>
        <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
          {[[P.rainbow[5], "Planned"], [P.green, "Actual"], [P.red, "Projected"], [P.gold, "€25k Cap"]].map(([c, l]) => (
            <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, color: P.creamDim }}>
              <span style={{ width: 10, height: 3, borderRadius: 1, background: c, display: "inline-block" }} />{l}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${cW} ${cH}`} style={{ width: "100%", height: "auto" }}>
        {/* Grid lines */}
        {[0, 5000, 10000, 15000, 20000, 25000, 30000].filter(v => v <= maxV).map(v => (
          <g key={v}>
            <line x1={pL} x2={cW - pR} y1={yS(v)} y2={yS(v)} stroke="rgba(185,174,147,0.07)" strokeWidth={0.5} />
            <text x={pL - 6} y={yS(v) + 3} textAnchor="end" fontSize={8} fill={P.creamDim} fontFamily={sans}>
              €{(v / 1000).toFixed(0)}k
            </text>
          </g>
        ))}
        {/* Week labels */}
        {wks.filter(w => w % 2 === 0 || w === NOW).map(w => (
          <text key={w} x={xS(w)} y={cH - 8} textAnchor="middle" fontSize={8}
            fill={w === NOW ? P.gold : P.creamDim} fontFamily={sans} fontWeight={w === NOW ? 700 : 400}>
            W{w}
          </text>
        ))}
        {/* Cap line */}
        <line x1={pL} x2={cW - pR} y1={yS(CAP)} y2={yS(CAP)} stroke={P.gold} strokeWidth={1.5} strokeDasharray="6,3" opacity={0.6} />
        <text x={cW - pR - 2} y={yS(CAP) - 4} textAnchor="end" fontSize={8} fill={P.gold} fontFamily={sans}>€25k</text>
        {/* NOW marker */}
        <line x1={xS(NOW)} x2={xS(NOW)} y1={pT} y2={cH - pB} stroke="rgba(185,174,147,0.18)" strokeWidth={1} strokeDasharray="3,3" />
        <text x={xS(NOW)} y={pT - 5} textAnchor="middle" fontSize={9} fill={P.gold} fontFamily={serif} fontWeight={700}>NOW</text>
        {/* Projection week marker */}
        {projWk !== NOW && (
          <line x1={xS(projWk)} x2={xS(projWk)} y1={pT} y2={cH - pB} stroke={hr(P.red, 0.18)} strokeWidth={1} strokeDasharray="2,4" />
        )}
        {/* Lines */}
        <path d={mkL(plannedPts)} fill="none" stroke={P.rainbow[5]} strokeWidth={1.5} opacity={0.45} />
        <path d={mkL(projPts)}    fill="none" stroke={P.red}        strokeWidth={1.5} strokeDasharray="5,3" opacity={0.6} />
        <path d={mkL(actPts)}     fill="none" stroke={P.green}      strokeWidth={2.5} />
        {actPts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === actPts.length - 1 ? 4 : 3} fill={P.green} stroke={P.dark} strokeWidth={1} />)}
        {/* Projection endpoint */}
        <circle cx={xS(projWk)} cy={yS(projAt)} r={4} fill={P.red} stroke={P.dark} strokeWidth={1} opacity={0.85} />
        <text x={xS(projWk) + 7} y={yS(projAt) + 4} fontSize={9} fill={P.red} fontFamily={serif} fontWeight={700}>
          €{Math.round(projAt).toLocaleString()}
        </text>
      </svg>
    </div>
  );
}

/* ─── Analysis View ──────────────────────────────────────── */
function AnalysisView() {
  return (
    <>
      {/* What Went Wrong */}
      <div style={{ ...cardS, borderLeft: `3px solid ${P.red}`, marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 20, color: P.red, marginBottom: 14 }}>What <em>went wrong</em></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            {
              n: "01", head: "The original estimates were wrong",
              body: "PM was planned at 80 hrs (20% FTE) — already at 95 hrs by Week 5 with 7 weeks left. Dev was planned at 100 hrs — reached 135 hrs before the pilot hit its midpoint. Neither overrun triggered a review.",
            },
            {
              n: "02", head: "Scope crept without change control",
              body: "Two unplanned workstreams — Reward Flow Rebuild (20 hrs) and District Analytics (15 hrs) — added €2,275 of dev cost. Neither had a change request. Neither was approved in advance. The budget absorbed them silently.",
            },
            {
              n: "03", head: "Entire cost categories were never budgeted",
              body: "External consultant, GDPR/legal review, printed flyers, and district onboarding videos were not modelled at proposal stage. These aren't optional — they're required to complete the pilot. The original budget had no line for any of them.",
            },
            {
              n: "04", head: "The burn rate already exceeds what the budget can sustain",
              body: "At Week 5, €24,079 of a €25,000 grant is spent — leaving €921. The weekly burn rate is €4,816. At this rate, the budget is exhausted by Week 5.2. Seven weeks of the project have no confirmed funding.",
            },
          ].map(({ n, head, body }) => (
            <div key={n} style={{ background: hr(P.red, 0.06), borderRadius: 6, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, color: P.red, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, opacity: 0.7 }}>{n}</div>
              <div style={{ fontWeight: 700, color: P.cream, fontSize: 13, lineHeight: 1.4, marginBottom: 6 }}>{head}</div>
              <div style={{ fontSize: 11, color: P.creamDim, lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Broken Assumptions */}
      <div style={{ ...cardS, marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 20, marginBottom: 14 }}>Broken <em>Assumptions</em></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${brd}` }}>
                {["Original Assumption", "Week 5 Reality", "Impact"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", color: P.creamDim, fontWeight: 600, fontSize: 10,
                    letterSpacing: 0.5, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ASSUMPTIONS.map((a, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${brd}` }}>
                  <td style={{ padding: "10px 10px", color: P.creamDim,  lineHeight: 1.5, verticalAlign: "top" }}>{a.original}</td>
                  <td style={{ padding: "10px 10px", color: P.cream,     lineHeight: 1.5, verticalAlign: "top" }}>{a.reality}</td>
                  <td style={{ padding: "10px 10px", color: P.amber, fontWeight: 600, lineHeight: 1.5, verticalAlign: "top", whiteSpace: "nowrap" }}>{a.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Over/Underfunded */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ ...cardS, borderLeft: `3px solid ${P.red}` }}>
          <div style={{ fontFamily: serif, fontSize: 16, color: P.red, marginBottom: 12 }}>Severely <em>Underfunded</em></div>
          {[
            { item: "PM Hours",          note: "Will hit €7,000+ by Wk12 (budgeted €4,000)" },
            { item: "Translation",        note: "Needs 3+ rounds — 4–5× original budget" },
            { item: "Contingency",        note: "Should be 10% = €2,500 (budgeted €500)" },
            { item: "Dev Hours",          note: "35 hrs over plan, no change control used" },
            { item: "Marketing",          note: "Single district; second district uncosted" },
          ].map((x, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 9 }}>
              <span style={{ color: P.red, fontWeight: 700, lineHeight: 1.5 }}>↑</span>
              <div>
                <div style={{ color: P.cream, fontWeight: 600, fontSize: 12 }}>{x.item}</div>
                <div style={{ color: P.creamDim, fontSize: 11, lineHeight: 1.4 }}>{x.note}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ ...cardS, borderLeft: `3px solid ${P.green}` }}>
          <div style={{ fontFamily: serif, fontSize: 16, color: P.green, marginBottom: 12 }}><em>Overfunded</em> / Adequate</div>
          {[
            { item: "Reward Payouts",   note: "Only 970 / 4,000 uses (24% redemption rate)", sym: "↓", c: P.amber },
            { item: "Partner Kits",     note: "24 / 30 partners — 6 may not join",            sym: "↓", c: P.amber },
            { item: "Admin / Tools",    note: "Flat cost, delivered as planned",              sym: "—", c: P.green },
            { item: "Design / UX",      note: "On target — consider cutting for savings",     sym: "—", c: P.green },
          ].map((x, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 9 }}>
              <span style={{ color: x.c, fontWeight: 700, lineHeight: 1.5 }}>{x.sym}</span>
              <div>
                <div style={{ color: P.cream, fontWeight: 600, fontSize: 12 }}>{x.item}</div>
                <div style={{ color: P.creamDim, fontSize: 11, lineHeight: 1.4 }}>{x.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trade-offs + Tracking */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ ...cardS, borderLeft: `3px solid ${P.gold}` }}>
          <div style={{ fontFamily: serif, fontSize: 16, color: P.gold, marginBottom: 10 }}>Proposed <em>Trade-offs</em></div>
          {TRADEOFFS.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ color: P.gold, lineHeight: 1.5, flexShrink: 0 }}>→</span>
              <span style={{ color: P.creamDim, fontSize: 12, lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ ...cardS, borderLeft: `3px solid ${P.rainbow[5]}` }}>
          <div style={{ fontFamily: serif, fontSize: 16, color: P.rainbow[5], marginBottom: 10 }}>Metrics to <em>Track</em></div>
          {TRACKING.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ color: P.rainbow[5], lineHeight: 1.5, flexShrink: 0 }}>◉</span>
              <span style={{ color: P.creamDim, fontSize: 12, lineHeight: 1.5 }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scope Creep */}
      <div style={{ ...cardS, borderLeft: `3px solid ${P.amber}`, marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 16, color: P.amber, marginBottom: 10 }}>
          Scope Creep <em>Already Spent</em>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {CREEP.map(c => (
            <div key={c.id} style={{ background: hr(P.amber, 0.06), borderRadius: 6, padding: "12px 14px" }}>
              <div style={{ fontWeight: 700, color: P.cream, fontSize: 13, marginBottom: 6 }}>{c.name}</div>
              <div style={{ fontFamily: serif, fontSize: 22, color: P.amber }}>€{c.total.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: P.creamDim, marginTop: 4 }}>{c.hrs} hrs × €{c.rate}/hr</div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 4, fontStyle: "italic" }}>{c.source}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: "8px 12px", background: hr(P.red, 0.08), borderRadius: 6 }}>
          <span style={{ fontSize: 12, color: P.amber, fontWeight: 600 }}>
            Total unplanned: €{CREEP.reduce((s, c) => s + c.total, 0).toLocaleString()}
          </span>
          <span style={{ fontSize: 11, color: P.creamDim, marginLeft: 8 }}>— no change request process in place</span>
        </div>
      </div>
    </>
  );
}

/* ─── Cost Chart View ────────────────────────────────────── */
function CostChartView({ cats }) {
  const rows = [];

  // Original budget items (coloured by category)
  cats.forEach(cat => {
    if (cat.id === "invisible") return;
    cat.items.forEach(it => {
      rows.push({ name: it.name, planned: it.rate * it.pQty, actual: it.rate * it.aQty, color: cat.color, scope: "original" });
    });
  });
  // Creep items (amber)
  CREEP.forEach(c => rows.push({ name: c.name + " (creep)", planned: 0, actual: c.total, color: P.amber, scope: "creep" }));
  // Invisible items (red)
  const invisCat = cats.find(c => c.id === "invisible");
  invisCat.items.forEach(it =>
    rows.push({ name: it.name, planned: 0, actual: it.rate * it.aQty, color: P.red, scope: "hidden" })
  );

  const maxCost = Math.max(...rows.map(r => Math.max(r.planned, r.actual)), 9500);
  const rowH = 22, gap = 7, labelW = 230, chartW = 360, rightW = 80;
  const svgH = rows.length * (rowH + gap) + 6;
  const svgW = labelW + chartW + rightW;

  return (
    <div style={cardS}>
      <div style={{ fontFamily: serif, fontSize: 20, marginBottom: 4 }}>Cost per <em>Deliverable</em></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 10, color: P.creamDim, marginBottom: 18 }}>
        {[
          ["rgba(185,174,147,0.22)", "Planned"],
          [P.rainbow[0], "People"],
          [P.rainbow[1], "Partners"],
          [P.rainbow[2], "Marketing"],
          [P.rainbow[4], "Admin/Contingency"],
          [P.amber, "Scope creep"],
          [P.red,   "Hidden / unbudgeted"],
        ].map(([c, l]) => (
          <span key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 5, background: c, borderRadius: 2, display: "inline-block" }} />{l}
          </span>
        ))}
      </div>
      <div style={{ overflowX: "auto" }}>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", minWidth: 500, height: "auto" }}>
          {rows.map((row, i) => {
            const y = i * (rowH + gap);
            const pW = row.planned > 0 ? (row.planned / maxCost) * chartW : 0;
            const aW = row.actual  > 0 ? (row.actual  / maxCost) * chartW : 0;
            return (
              <g key={i}>
                <text x={labelW - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={10} fill={P.creamDim} fontFamily={sans}>
                  {row.name}
                </text>
                {/* Planned bar (faint, behind) */}
                {row.planned > 0 && (
                  <rect x={labelW} y={y + 4} width={pW} height={rowH - 8} rx={2} fill="rgba(185,174,147,0.18)" />
                )}
                {/* Actual bar */}
                {row.actual > 0 ? (
                  <rect x={labelW} y={y} width={aW} height={rowH} rx={3} fill={row.color} opacity={0.82} />
                ) : (
                  <rect x={labelW} y={y + 8} width={18} height={rowH - 16} rx={2} fill="rgba(185,174,147,0.06)" />
                )}
                {/* Value label */}
                {row.actual > 0 ? (
                  <text x={labelW + aW + 6} y={y + rowH / 2 + 4} fontSize={9} fill={row.color} fontFamily={serif} fontWeight={700}>
                    €{Math.round(row.actual).toLocaleString()}
                  </text>
                ) : (
                  <text x={labelW + 24} y={y + rowH / 2 + 4} fontSize={9} fill="rgba(185,174,147,0.28)" fontFamily={sans}>
                    not yet estimated
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ─── Action Plan Data ───────────────────────────────────── */
// Separate from confirmed data — user fills these in to model a feasible completion.
// Confirmed Wk5 spend (€24,079) is always frozen; only the proposed items below change.
const ACTION_PLAN_ITEMS = [
  // Variable costs — remaining hours/qty the user proposes for Wk6–12
  { id: "ap-dev",     name: "App Development",          rate: 65,   unit: "hrs",     group: "remaining", color: P.rainbow[0], placeholder: "e.g. 20" },
  { id: "ap-pm",      name: "Project Manager (Anja)",   rate: 50,   unit: "hrs",     group: "remaining", color: P.rainbow[0], placeholder: "e.g. 40" },
  { id: "ap-ux",      name: "Design & UX",              rate: 55,   unit: "hrs",     group: "remaining", color: P.rainbow[0], placeholder: "e.g. 10" },
  { id: "ap-rewards", name: "Reward Payouts",            rate: 0.20, unit: "uses",    group: "remaining", color: P.rainbow[2], placeholder: "e.g. 1500" },
  { id: "ap-i18n",    name: "Translations (add. words)", rate: 0.08, unit: "words",  group: "remaining", color: P.rainbow[2], placeholder: "e.g. 6000" },
  // Hidden costs — not yet spent, user decides whether / how much to include
  { id: "ap-consult", name: "External Consultant",       rate: 75,   unit: "hrs",    group: "hidden",    color: P.red,        placeholder: "e.g. 60" },
  { id: "ap-i18n2",   name: "Translation Rounds 2–3",   rate: 0.08, unit: "words",  group: "hidden",    color: P.red,        placeholder: "e.g. 8000" },
  { id: "ap-flyers",  name: "Printed Flyers",            rate: 350,  unit: "batch",  group: "hidden",    color: P.red,        placeholder: "e.g. 1" },
  { id: "ap-videos",  name: "Onboarding Videos",         rate: 1200, unit: "video",  group: "hidden",    color: P.red,        placeholder: "e.g. 2" },
  { id: "ap-gdpr",    name: "GDPR / Legal Review",       rate: 1500, unit: "flat",   group: "hidden",    color: P.red,        placeholder: "e.g. 1" },
];

const CONFIRMED_SPEND = 24079; // frozen — confirmed actual at Week 5

/* ─── Action Plan View ───────────────────────────────────── */
function ActionPlanView() {
  // Isolated state — never touches confirmed budget data
  const [qtys, setQtys] = useState(() => Object.fromEntries(ACTION_PLAN_ITEMS.map(it => [it.id, ""])));
  const [notes, setNotes] = useState(() => Object.fromEntries(ACTION_PLAN_ITEMS.map(it => [it.id, ""])));

  const proposed = useMemo(() =>
    ACTION_PLAN_ITEMS.reduce((s, it) => s + (parseFloat(qtys[it.id]) || 0) * it.rate, 0),
    [qtys]
  );
  const total = CONFIRMED_SPEND + proposed;
  const headroom = CAP - total;
  const viable = total <= CAP;

  // Progress bar widths (cap = 100%)
  const confirmedPct = Math.min((CONFIRMED_SPEND / CAP) * 100, 100);
  const proposedPct  = Math.min((proposed / CAP) * 100, 100 - confirmedPct);
  const overflowPct  = total > CAP ? ((total - CAP) / CAP) * 100 : 0;

  const setQty = (id, val) => setQtys(prev => ({ ...prev, [id]: val }));
  const setNote = (id, val) => setNotes(prev => ({ ...prev, [id]: val }));

  const inputStyle = {
    background: "rgba(32,32,20,0.7)", border: `1px solid ${brd}`, borderRadius: 4,
    color: P.cream, fontFamily: serif, fontSize: 12, padding: "5px 8px",
    outline: "none", width: "100%",
  };

  const renderGroup = (groupId, label) => {
    const items = ACTION_PLAN_ITEMS.filter(it => it.group === groupId);
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 2, textTransform: "uppercase",
          fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${brd}` }}>
          {label}
        </div>
        {items.map(it => {
          const qty = parseFloat(qtys[it.id]) || 0;
          const cost = qty * it.rate;
          return (
            <div key={it.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 110px 1fr", gap: 8,
              alignItems: "center", marginBottom: 8, padding: "6px 0", borderBottom: `1px solid ${hr(P.taupe, 0.06)}` }}>
              {/* Name + rate */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: P.cream }}>{it.name}</div>
                <div style={{ fontSize: 10, color: P.creamDim }}>€{it.rate}/{it.unit}</div>
              </div>
              {/* Qty input */}
              <div>
                <div style={{ fontSize: 9, color: P.creamDim, marginBottom: 3 }}>Proposed qty</div>
                <input
                  type="number" min="0" value={qtys[it.id]}
                  placeholder={it.placeholder}
                  onChange={e => setQty(it.id, e.target.value)}
                  style={{ ...inputStyle, borderColor: qtys[it.id] ? it.color : brd, textAlign: "right" }}
                />
              </div>
              {/* Cost */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: P.creamDim, marginBottom: 3 }}>Cost</div>
                <div style={{ fontFamily: serif, fontSize: 14, color: cost > 0 ? it.color : P.textDim, fontWeight: 700 }}>
                  {cost > 0 ? `€${Math.round(cost).toLocaleString()}` : "—"}
                </div>
              </div>
              {/* Notes */}
              <div>
                <div style={{ fontSize: 9, color: P.creamDim, marginBottom: 3 }}>Rationale / note</div>
                <input
                  type="text" value={notes[it.id]} placeholder="e.g. cap at 40 hrs, defer to Phase 2…"
                  onChange={e => setNote(it.id, e.target.value)}
                  style={{ ...inputStyle }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Header card — frozen context */}
      <div style={{ ...cardS, marginBottom: 12, borderLeft: `3px solid ${P.gold}` }}>
        <div style={{ fontFamily: serif, fontSize: 20, marginBottom: 6 }}>
          Feasibility <em>Planner</em> — Wk6–12
        </div>
        <div style={{ fontSize: 12, color: P.creamDim, lineHeight: 1.6, marginBottom: 14 }}>
          Confirmed Week 5 spend is <span style={{ color: P.gold, fontWeight: 700 }}>frozen at €{CONFIRMED_SPEND.toLocaleString()}</span>.
          Enter proposed quantities below to model whether the remaining work fits within the €25,000 grant cap.
          Nothing here changes the historical data in Dashboard or Analysis.
        </div>
        {/* Progress bar */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", height: 20, borderRadius: 4, overflow: "visible", background: "rgba(185,174,147,0.08)", position: "relative" }}>
            {/* Confirmed segment */}
            <div style={{ width: `${confirmedPct}%`, background: P.gold, borderRadius: "4px 0 0 4px", opacity: 0.85, flexShrink: 0 }} />
            {/* Proposed segment */}
            {proposed > 0 && (
              <div style={{
                width: `${proposedPct}%`, flexShrink: 0,
                background: viable ? P.green : P.red,
                opacity: 0.75,
                borderRadius: total > CAP ? 0 : "0 4px 4px 0",
              }} />
            )}
            {/* Cap marker */}
            <div style={{ position: "absolute", right: 0, top: -3, bottom: -3, width: 2,
              background: P.gold, borderRadius: 1, opacity: 0.5 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: P.creamDim, marginTop: 5 }}>
            <span style={{ color: P.gold }}>Confirmed €{CONFIRMED_SPEND.toLocaleString()}</span>
            {proposed > 0 && <span style={{ color: viable ? P.green : P.red }}>+ Proposed €{Math.round(proposed).toLocaleString()}</span>}
            <span style={{ color: P.taupe }}>Cap €{CAP.toLocaleString()}</span>
          </div>
        </div>
        {/* Summary numbers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { label: "Confirmed (frozen)", val: `€${CONFIRMED_SPEND.toLocaleString()}`, c: P.gold },
            { label: "Proposed Wk6–12",   val: proposed > 0 ? `€${Math.round(proposed).toLocaleString()}` : "—", c: P.creamMid },
            { label: "Total projected",   val: `€${Math.round(total).toLocaleString()}`,    c: viable ? P.green : P.red },
            { label: viable ? "Headroom" : "Over cap by", val: `€${Math.abs(Math.round(headroom)).toLocaleString()}`, c: viable ? P.green : P.red },
          ].map((s, i) => (
            <div key={i} style={{ background: hr(P.dark, 0.4), borderRadius: 6, padding: "8px 12px" }}>
              <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: serif, fontSize: 18, color: s.c }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Burn chart — action plan projection */}
      <div style={{ ...cardS, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: serif, fontSize: 18 }}>
            Projected <em>Burn</em>
          </span>
          <div style={{ display: "flex", gap: 14, fontSize: 10 }}>
            {[[P.green, "Actual (frozen)"], [viable ? P.green : P.red, "Action plan"], [P.gold, "€25k cap"]].map(([c, l]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, color: P.creamDim }}>
                <span style={{ width: 10, height: 3, borderRadius: 1, background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </div>
        {(() => {
          const cW = 560, cH = 180, pL = 46, pR = 16, pT = 20, pB = 28;
          const planColor = viable ? P.green : P.red;
          const maxV = Math.max(total * 1.14, CAP * 1.14);
          const xS = w => pL + (w / WKS) * (cW - pL - pR);
          const yS = v => pT + (1 - Math.min(v, maxV) / maxV) * (cH - pT - pB);
          const mkL = pts => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
          const wks = Array.from({ length: WKS + 1 }, (_, i) => i);
          // Historical: Wk0–5, slope = confirmed / 5
          const histSlope = CONFIRMED_SPEND / NOW;
          const histPts = wks.filter(w => w <= NOW).map(w => ({ x: xS(w), y: yS(histSlope * w) }));
          // Action plan: Wk5–12, starts at confirmed, adds proposed evenly over 7 weeks
          const planWeekly = proposed > 0 ? proposed / (WKS - NOW) : 0;
          const planPts = wks.filter(w => w >= NOW).map(w => ({
            x: xS(w), y: yS(CONFIRMED_SPEND + planWeekly * (w - NOW))
          }));
          const endPt = planPts[planPts.length - 1];
          return (
            <svg viewBox={`0 0 ${cW} ${cH}`} style={{ width: "100%", height: "auto" }}>
              {/* Safe zone shading below cap */}
              <rect x={pL} y={yS(CAP)} width={cW - pL - pR} height={cH - pB - yS(CAP)}
                fill="rgba(122,170,106,0.04)" />
              {/* Grid lines */}
              {[0, 5000, 10000, 15000, 20000, 25000, 30000].filter(v => v <= maxV).map(v => (
                <g key={v}>
                  <line x1={pL} x2={cW - pR} y1={yS(v)} y2={yS(v)} stroke="rgba(185,174,147,0.07)" strokeWidth={0.5} />
                  <text x={pL - 5} y={yS(v) + 3} textAnchor="end" fontSize={8} fill={P.creamDim} fontFamily={sans}>
                    €{(v / 1000).toFixed(0)}k
                  </text>
                </g>
              ))}
              {/* Week labels */}
              {wks.filter(w => w % 2 === 0 || w === NOW).map(w => (
                <text key={w} x={xS(w)} y={cH - 8} textAnchor="middle" fontSize={8}
                  fill={w === NOW ? P.gold : P.creamDim} fontFamily={sans} fontWeight={w === NOW ? 700 : 400}>
                  W{w}
                </text>
              ))}
              {/* Cap line */}
              <line x1={pL} x2={cW - pR} y1={yS(CAP)} y2={yS(CAP)}
                stroke={P.gold} strokeWidth={1.5} strokeDasharray="6,3" opacity={0.6} />
              <text x={cW - pR - 2} y={yS(CAP) - 4} textAnchor="end" fontSize={8} fill={P.gold} fontFamily={sans}>€25k</text>
              {/* NOW marker */}
              <line x1={xS(NOW)} x2={xS(NOW)} y1={pT} y2={cH - pB}
                stroke="rgba(185,174,147,0.18)" strokeWidth={1} strokeDasharray="3,3" />
              <text x={xS(NOW)} y={pT - 5} textAnchor="middle" fontSize={9} fill={P.gold} fontFamily={serif} fontWeight={700}>NOW</text>
              {/* Historical actual line */}
              <path d={mkL(histPts)} fill="none" stroke={P.green} strokeWidth={2.5} />
              {histPts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={i === histPts.length - 1 ? 4 : 2.5}
                  fill={P.green} stroke={P.dark} strokeWidth={1} />
              ))}
              {/* Action plan projection line */}
              {proposed > 0 ? (
                <>
                  <path d={mkL(planPts)} fill="none" stroke={planColor} strokeWidth={2} strokeDasharray="6,3" opacity={0.85} />
                  <circle cx={endPt.x} cy={endPt.y} r={4} fill={planColor} stroke={P.dark} strokeWidth={1} />
                  <text x={endPt.x - 6} y={endPt.y - 8} textAnchor="end" fontSize={9}
                    fill={planColor} fontFamily={serif} fontWeight={700}>
                    €{Math.round(total).toLocaleString()}
                  </text>
                  {/* Health label */}
                  <rect x={pL + 6} y={pT + 2} width={viable ? 88 : 96} height={16} rx={3}
                    fill={viable ? hr(P.green, 0.15) : hr(P.red, 0.15)} />
                  <text x={pL + 10} y={pT + 13} fontSize={9} fill={viable ? P.green : P.red}
                    fontFamily={sans} fontWeight={700}>
                    {viable
                      ? `✓ Within cap — €${Math.round(headroom).toLocaleString()} headroom`
                      : `✗ Over cap by €${Math.round(-headroom).toLocaleString()}`}
                  </text>
                </>
              ) : (
                <text x={(pL + cW - pR) / 2} y={cH / 2} textAnchor="middle" fontSize={11}
                  fill={P.textDim} fontFamily={serif} fontStyle="italic">
                  Enter quantities below to project completion
                </text>
              )}
            </svg>
          );
        })()}
      </div>

      {/* Budget build-up chart */}
      <div style={{ ...cardS, marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 16, marginBottom: 14 }}>Budget <em>Build-up</em></div>
        {(() => {
          const chartW = 560, barH = 32;
          const maxVal = Math.max(total * 1.08, CAP * 1.08);
          const sc = v => (v / maxVal) * chartW;
          const capX = sc(CAP);
          // Build segments: confirmed + each proposed item with value
          const segs = [{ label: "Confirmed Wk5", val: CONFIRMED_SPEND, color: P.gold }];
          ACTION_PLAN_ITEMS.forEach(it => {
            const v = (parseFloat(qtys[it.id]) || 0) * it.rate;
            if (v > 0) segs.push({ label: it.name, val: v, color: it.group === "remaining" ? P.green : P.red });
          });
          let xCursor = 0;
          const svgH = barH + 40;
          return (
            <svg viewBox={`0 0 ${chartW} ${svgH}`} style={{ width: "100%", height: "auto" }}>
              {/* Background track */}
              <rect x={0} y={0} width={chartW} height={barH} rx={4} fill="rgba(185,174,147,0.06)" />
              {/* Over-cap zone */}
              {total > CAP && <rect x={capX} y={0} width={chartW - capX} height={barH} rx={0} fill={hr(P.red, 0.08)} />}
              {/* Segments */}
              {segs.map((seg, i) => {
                const x = xCursor;
                const w = sc(seg.val);
                xCursor += w;
                return (
                  <g key={i}>
                    <rect x={x} y={0} width={w} height={barH}
                      rx={i === 0 ? 4 : 0}
                      fill={seg.color} opacity={i === 0 ? 0.85 : 0.75} />
                    {w > 28 && (
                      <text x={x + w / 2} y={barH / 2 + 4} textAnchor="middle"
                        fontSize={8} fill={P.dark} fontFamily={sans} fontWeight={700} opacity={0.8}>
                        €{Math.round(seg.val / 1000 * 10) / 10}k
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Cap marker */}
              <line x1={capX} y1={-4} x2={capX} y2={barH + 4} stroke={P.gold} strokeWidth={1.5} strokeDasharray="4,2" opacity={0.7} />
              <text x={capX} y={barH + 14} textAnchor="middle" fontSize={8} fill={P.gold} fontFamily={sans}>€25k cap</text>
              {/* Total marker */}
              {proposed > 0 && (
                <>
                  <line x1={sc(total)} y1={-4} x2={sc(total)} y2={barH + 4}
                    stroke={viable ? P.green : P.red} strokeWidth={1.5} opacity={0.8} />
                  <text x={Math.min(sc(total), chartW - 30)} y={barH + 14} textAnchor="middle"
                    fontSize={8} fill={viable ? P.green : P.red} fontFamily={serif} fontWeight={700}>
                    €{Math.round(total).toLocaleString()}
                  </text>
                </>
              )}
              {/* Legend */}
              <text x={0} y={svgH} fontSize={8} fill={P.creamDim} fontFamily={sans}>€0</text>
            </svg>
          );
        })()}
        {/* Segment legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, fontSize: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: P.creamDim }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: P.gold, display: "inline-block" }} />
            Confirmed Wk5
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: P.creamDim }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: P.green, display: "inline-block" }} />
            Remaining items
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: P.creamDim }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: P.red, display: "inline-block" }} />
            Hidden costs
          </span>
          {proposed === 0 && (
            <span style={{ color: P.textDim, fontStyle: "italic" }}>— enter quantities below to see projection</span>
          )}
        </div>
      </div>

      {/* Input table */}
      <div style={cardS}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>{renderGroup("remaining", "Remaining budget items (Wk6–12)")}</div>
          <div>{renderGroup("hidden", "Hidden / unbudgeted costs")}</div>
        </div>
        <div style={{ marginTop: 12, padding: "10px 12px", background: hr(P.dark, 0.4), borderRadius: 6,
          fontSize: 11, color: P.creamDim, lineHeight: 1.6 }}>
          <span style={{ color: P.taupe, fontWeight: 600 }}>Tip:</span> To stay within cap, proposed spend must be ≤ €{(CAP - CONFIRMED_SPEND).toLocaleString()}.
          That's roughly <span style={{ color: P.gold }}>{Math.round((CAP - CONFIRMED_SPEND) / 7)} per remaining week</span> across all categories.
        </div>
      </div>
    </>
  );
}

/* ─── Main App ───────────────────────────────────────────── */
export default function App() {
  const [cats, setCats] = useState(CATEGORIES);
  const [projWk, setProjWk] = useState(WKS);
  const [activeTab, setActiveTab] = useState("dashboard");

  const tots = useMemo(() => {
    let planned = 0, mainActual = 0, invisibleActual = 0;
    cats.forEach(cat => {
      cat.items.forEach(it => {
        const pCost = it.rate * it.pQty;
        const aCost = it.rate * it.aQty;
        planned += pCost;
        if (cat.id === "invisible") invisibleActual += aCost;
        else mainActual += aCost;
      });
    });
    // weeklyBurn = confirmed actual spend / weeks elapsed
    const weeklyBurn = mainActual / NOW;
    const proj = weeklyBurn * projWk;
    return { planned, mainActual, invisibleActual, weeklyBurn, proj };
  }, [cats, projWk]);

  const over = tots.proj > CAP;
  const remaining = CAP - tots.mainActual;
  const runsOutWk = tots.weeklyBurn > 0 ? (CAP / tots.weeklyBurn).toFixed(1) : "—";

  const TABS = [
    { id: "dashboard",   label: "Dashboard" },
    { id: "analysis",    label: "Analysis" },
    { id: "chart",       label: "Cost Chart" },
    { id: "action-plan", label: "Action Plan" },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <GrainCanvas />
      <div style={{ position: "relative", zIndex: 1, padding: "36px 24px", fontFamily: sans, color: P.cream, maxWidth: 1100, margin: "0 auto" }}>

        <Rainbow height={5} style={{ marginBottom: 24, opacity: 0.75 }} />

        {/* ── Header ── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 22, paddingBottom: 22, borderBottom: `1px solid ${brd}`,
          flexWrap: "wrap", gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: P.taupe, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
              MoveWise Berlin · 12-Week Pilot · €25,000 Grant
            </div>
            <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 400, margin: 0, lineHeight: 1.1 }}>
              What got <em>built</em>, what it <em>cost</em>.
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "Originally Planned", val: tots.planned, c: P.taupe,            sub: `of €${CAP.toLocaleString()} available` },
              { label: "Spent Wk5",          val: tots.mainActual, c: P.gold,          sub: `${((tots.mainActual / CAP) * 100).toFixed(0)}% of budget` },
              { label: `Proj. Wk${projWk}`,  val: tots.proj, c: over ? P.red : P.green, sub: over ? `+€${Math.round(tots.proj - CAP).toLocaleString()} over cap` : `€${Math.round(CAP - tots.proj).toLocaleString()} headroom` },
            ].map((k, i) => (
              <div key={i} style={{ ...cardS, padding: "10px 16px", minWidth: 140 }}>
                <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{k.label}</div>
                <div style={{ fontFamily: serif, fontSize: 26, color: k.c, lineHeight: 1 }}>€{Math.round(k.val).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: i === 2 && over ? P.red : P.creamDim, marginTop: 4 }}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Side nav + content grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "148px 1fr", gap: 20, alignItems: "start" }}>

          {/* Side tabs */}
          <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 5 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                display: "block", width: "100%", padding: "11px 14px",
                borderRadius: 6, cursor: "pointer", fontFamily: sans,
                fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
                textAlign: "left", transition: "all 0.12s",
                border: `1px solid ${brd}`,
                borderLeft: `3px solid ${activeTab === t.id ? P.gold : "transparent"}`,
                background: activeTab === t.id ? hr(P.gold, 0.12) : "rgba(32,32,20,0.35)",
                color: activeTab === t.id ? P.gold : P.creamDim,
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div>

        {/* ── Dashboard Tab ── */}
        {activeTab === "dashboard" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12, marginBottom: 14 }}>
              <BurnChart tots={tots} projWk={projWk} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Slider */}
                <div style={cardS}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: P.taupe }}>Projection week</span>
                    <span style={{ fontFamily: serif, fontSize: 20, color: P.gold }}>Wk{projWk}</span>
                  </div>
                  <input type="range" min={NOW} max={WKS} value={projWk} onChange={e => setProjWk(+e.target.value)}
                    style={{ width: "100%", margin: "8px 0", accentColor: P.gold }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: P.creamDim }}>
                    <span>Wk{NOW}</span><span>Wk8</span><span>Wk{WKS}</span>
                  </div>
                </div>
                {[
                  { label: "Weekly burn rate",   val: `€${Math.round(tots.weeklyBurn).toLocaleString()}/wk`, c: P.green },
                  { label: "Budget runs out at", val: `Week ${runsOutWk}`,                                   c: remaining > 0 ? P.gold : P.red },
                  { label: "Budget remaining",   val: `€${Math.round(remaining).toLocaleString()}`,          c: remaining > 0 ? P.green : P.red },
                ].map((s, i) => (
                  <div key={i} style={cardS}>
                    <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontFamily: serif, fontSize: 20, color: s.c }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <Rainbow height={3} style={{ marginBottom: 14, opacity: 0.4 }} />

            <BudgetTable cats={cats} setCats={setCats} />

            {/* Totals row */}
            <div style={{ ...cardS, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Original Total</div>
                <div style={{ fontFamily: serif, fontSize: 24, color: P.taupe }}>€{Math.round(tots.planned).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: P.creamDim, marginTop: 4 }}>of €{CAP.toLocaleString()} available</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Actual Wk5</div>
                <div style={{ fontFamily: serif, fontSize: 24, color: P.gold }}>€{Math.round(tots.mainActual).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: P.gold, marginTop: 4 }}>{((tots.mainActual / CAP) * 100).toFixed(0)}% of budget spent</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Invisible (flagged)</div>
                <div style={{ fontFamily: serif, fontSize: 24, color: P.red }}>€{Math.round(tots.invisibleActual).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: P.creamDim, marginTop: 4 }}>Fill in qty estimates above</div>
              </div>
              <div>
                <div style={{ fontSize: 9, color: P.creamDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Budget Remaining</div>
                <div style={{ fontFamily: serif, fontSize: 24, color: remaining > 0 ? P.green : P.red }}>
                  €{Math.round(remaining).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: P.creamDim, marginTop: 4 }}>Before invisible costs</div>
              </div>
            </div>
          </>
        )}

        {activeTab === "analysis"    && <AnalysisView />}
        {activeTab === "chart"       && <CostChartView cats={cats} />}
        {activeTab === "action-plan" && <ActionPlanView />}

          </div>{/* end content area */}
        </div>{/* end side nav grid */}

        <Rainbow height={4} style={{ marginTop: 24, opacity: 0.6 }} />
        <div style={{ marginTop: 14, textAlign: "center", paddingBottom: 36 }}>
          <div style={{ fontFamily: serif, fontSize: 13, color: P.creamDim, fontStyle: "italic" }}>
            "The budget is a consequence of the work, not a number that exists separately from it."
          </div>
        </div>
      </div>
    </div>
  );
}
