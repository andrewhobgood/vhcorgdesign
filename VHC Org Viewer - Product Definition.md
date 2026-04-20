# VHC 2026 Org Viewer — Product Definition

**Purpose:** Interactive web experience for presenting the VHC 2026 organizational redesign to Andy Ruttgers and Jay Scher. Animates the transition from Current to Proposed org structure, surfaces role scorecards, and makes coaching/reporting relationships navigable.

**Audience:** VHC Leadership Team (Andy R, Jay, Jen, Hanah, Steve, Max). Not public-facing. Presentation tool for a meeting, not a production application.

**Tech Stack:** Single-file React app (JSX). Tailwind CSS for styling. D3 for org chart rendering + animations. No build step needed — runs as a claude.ai artifact or standalone HTML file.

---

## 1. Core Concept: The Time Slider

The centerpiece interaction is a **horizontal timeline slider** at the top of the screen that moves the entire org chart between two states:

| Position | Label | What's Shown |
|----------|-------|-------------|
| Left (0%) | **Current State** | How VHC is organized today — roles, reporting lines, who reports to whom |
| Right (100%) | **Proposed 2026** | The 28-role proposed structure from the Org Design Proposal |

### Animation Behavior

As the user drags the slider from Current → Proposed:

1. **Roles that exist in both states** slide smoothly to their new position in the tree. If their reporting line changes (e.g., Chef moves from Steve → Jen), the connecting line animates — old line fades out, new line fades in, the node glides to its new parent.

2. **New roles** (roles that don't exist in Current) fade in at ~60% slider position with a subtle scale-up animation. They appear as ghost/outline nodes before becoming solid at 100%.

3. **Removed/consolidated roles** fade out as the slider moves right.

4. **Title changes** on the same role crossfade the text label (e.g., if Mark's title changes from "Regional General Manager" to a new proposed title).

5. **Structural moves** — the big ones that make this redesign matter — get a subtle highlight pulse when they complete:
   - Chef / R&D Director moves from Operations (Steve) → Brand & Product Engine (Jen)
   - QA Manager moves from COO → Director of Operations
   - Customer Service Manager moves from COO → Director of Operations
   - Sales org consolidation under new Director of Sales

### Slider Details

- Snap points at 0% and 100% (with smooth settling animation)
- Optional intermediate snap at 50% showing "In Transition" state where moved roles are mid-flight
- Keyboard: Left/Right arrows to step 10% at a time
- Play button: auto-animates from Current → Proposed over 3 seconds
- The slider label updates: "Current" ... "In Transition" ... "Proposed 2026"

---

## 2. Org Chart Layout

### Visual Design

- **Tree layout:** Top-down hierarchical. CEO and COO at the top as peers (side by side, not one above the other — they both report to Board).
- **Node design:** Rounded rectangle cards. Each card shows:
  - Role title (primary text)
  - Current holder name or "[TBD]" (secondary text, smaller)
  - A small colored pip indicating the **pillar** the role belongs to (see Pillars below)
  - A subtle badge if the role is EOY (end-of-year hire) — dashed border or "2026H2" tag
- **Connection lines:** Curved Bezier lines from parent to child. Color-coded by pillar.
- **Peer relationships:** CEO ↔ COO shown with a horizontal dashed line (peers, not parent-child).

### Pillars (Color Coding)

The proposal organizes roles into three strategic pillars. Each gets a color:

| Pillar | Color | Roles |
|--------|-------|-------|
| **Leadership** | Slate/charcoal | CEO (#01), COO (#02) |
| **Meaning** (Brand & Product Engine) | Deep burgundy/wine | Dir of Ecom (#03), Sr Product Manager (#07), Perf Marketing (#08), Ecom Mgr (#09), Marketing Mgr (#10), Art Director (#11), Sr Designer (#12), Designer (#13), Chef/R&D (#14), Product Ops (#15), Jr Marketing Coord (#16) |
| **Making** (Operations Engine) | Dark teal | Dir of Operations (#20), Ops Mgr (#21), Fulfillment Supervisor (#22), Procurement Mgr (#23), Inventory Specialist (#24), QA Mgr (#25), Customer Service Mgr (#26) |
| **Selling** (Sales Engine) | Warm amber | Dir of Sales (#04), Regional GM (#05), Sales Account Mgr (#17), Jr Account Mgr (#18), Wholesale/PL Sales (#19) |
| **Connective Services** | Soft purple | HR Manager (#06), Head of Technology (#27), Customer Tech Ops (#28) |

### Layout Rules

- Board of Directors shown as a thin bar at the very top
- CEO and COO side by side below Board
- Three columns below: Meaning (left), Making (center-right), Selling (right)
- Connective Services roles positioned as floating cards connected by dotted lines to their coach
- The layout should be responsive but optimized for a laptop/projector (1280px+ width)

---

## 3. Scorecard Drill-Down

### Click Interaction

Clicking any role node opens a **scorecard panel** that slides in from the right (40% width overlay, rest of org chart dimmed but visible).

### Scorecard Panel Contents

```
┌──────────────────────────────────────┐
│ [X close]                            │
│                                      │
│  DIRECTOR OF SALES                   │
│  Tab #04 · Selling Pillar            │
│                                      │
│  ─── Identity ───                    │
│  Purpose: lead the B2B Sales org...  │
│  Location: Chicago (on-site)         │
│  Team Member: [TBD — new hire]       │
│                                      │
│  Coach: → CEO  [clickable link]      │
│  Direct Supports:                    │
│    → Sales Account Manager           │
│    → Junior Account Manager (EOY)    │
│    → Wholesale & PL Sales (EOY)      │
│  [each clickable — opens THEIR card] │
│                                      │
│  ─── 2026 Outcomes ───               │
│  1. Establish B2B Sales org          │
│     Result: Build foundation...      │
│     Metric: B2B org fully op...      │
│                                      │
│  2. Partner with Dir Ops on SLAs     │
│     Result: Define mutual...         │
│     Metric: Documented SLAs...       │
│                                      │
│  [... up to 5 initiatives]           │
│                                      │
│  ─── Skills & Traits ───             │
│  • B2B sales leadership              │
│  • Process improvement               │
│  • Cross-functional influence        │
│                                      │
│  ─── Notes ───                       │
│  "Andy's gold-standard scorecard"    │
└──────────────────────────────────────┘
```

### Scorecard Navigation

The killer feature: **Coach and Direct Support links are clickable.** Clicking "→ CEO" in the Coach field smoothly transitions the scorecard panel to show the CEO's scorecard AND highlights/pulses the CEO node in the org chart. This lets a presenter walk the tree: "Here's the Director of Sales, and here's who coaches them, and here's who they coach."

### Scorecard Inheritance

Two special cases (from the resolved 2026-04-20 design decision):

1. **Customer Tech Operations (#28):** When you click this node, the scorecard panel shows the **Head of Technology (#27)** scorecard with a banner: "This role uses the Head of Technology scorecard." The CTO node in the chart gets a small "↗" icon indicating inherited scorecard.

2. **Denise Saladino & Ian Thomas:** These are two instances of the **Sales Account Manager (#17)** scorecard. If the chart shows them as individual nodes under Director of Sales, clicking either one shows the Sales Account Manager scorecard with a banner: "Corporate Gifting — uses Sales Account Manager scorecard."

---

## 4. Data Model

The app is driven by a single JSON data structure embedded in the file. No API calls.

```typescript
interface OrgData {
  roles: Role[];
  transitions: Transition[];
  pillars: Pillar[];
}

interface Role {
  id: string;                    // e.g., "ceo", "dir-ecom", "chef-rd"
  tabNumber: number;             // 1-28
  title: string;                 // "Chief Executive Officer"
  shortTitle: string;            // "CEO" — for node labels
  pillar: string;                // "leadership" | "meaning" | "making" | "selling" | "connective"
  currentHolder: string | null;  // "Andy Ruttgers" or null for TBD
  holderStatus: "filled" | "tbd" | "eoy-hire";
  location: string;
  purposeOfRole: string;
  jobDescription: string;
  note: string;                  // The note line from the scorecard
  coachId: string | null;        // id of coach role
  directSupports: string[];      // ids of direct reports
  scorecardRef: string | null;   // if non-null, this role inherits another role's scorecard
  initiatives: Initiative[];
  skills: string[];
  
  // Position data for both states
  currentState: {
    exists: boolean;             // false for new roles
    parentId: string | null;     // who this role reports to in Current state
    title?: string;              // if title differs in Current state
  };
  proposedState: {
    exists: boolean;             // false for roles being eliminated
    parentId: string | null;     // who this role reports to in Proposed state
    title?: string;              // if title differs
  };
}

interface Initiative {
  priority: number;              // 1-5
  name: string;                  // "Own the 3-year strategic plan"
  desiredResult: string;
  successMetric: string;
  coachFeedback: string | null;
}

interface Transition {
  roleId: string;
  type: "move" | "new" | "remove" | "rename" | "restructure";
  description: string;           // Human-readable: "Moves from Operations to Brand & Product Engine"
  highlight: boolean;            // true for the Big Structural Moves
}

interface Pillar {
  id: string;
  name: string;
  color: string;
  description: string;
}
```

---

## 5. Key Structural Transitions to Animate

These are the moves that tell the story of the redesign. They should be called out with special treatment — a brief tooltip or annotation that appears when the transition completes:

| # | Move | Story |
|---|------|-------|
| 1 | **Chef / R&D Director** moves from Director of Operations (Steve) → Director of Ecom (Jen) | "R&D feeds the NPD pipeline — pair it with product strategy, not factory operations" |
| 2 | **QA Manager** moves from COO → Director of Operations | "QA is an operating function, not a strategic one" |
| 3 | **Customer Service Manager** moves from COO → Director of Operations | "Service is operational execution" |
| 4 | **Sales Account Manager, Jr Account Manager, Wholesale/PL Sales** appear under new **Director of Sales** | "Building the B2B Sales organization from scratch" |
| 5 | **CEO ↔ COO** become explicit peers (both report to Board) | "Peer structure, not hierarchy — co-ownership of strategy" |
| 6 | **Product Operations Specialist** appears under Sr Product Manager | "Closing the historical handoff gap between R&D and Operations" |
| 7 | **Operating cadence** responsibility moves from COO → Director of Operations | "COO holds leaders accountable; Dir Ops runs the cadence" |

---

## 6. Interaction Summary

| Action | Result |
|--------|--------|
| Drag timeline slider | Org chart animates between Current and Proposed states |
| Click Play button | Auto-animates Current → Proposed over 3 seconds |
| Click a role node | Scorecard panel slides in from right |
| Click Coach link in scorecard | Scorecard transitions to coach's card; coach node pulses in chart |
| Click Direct Support link | Scorecard transitions to that report's card; their node pulses |
| Press [X] or click outside panel | Scorecard panel closes |
| Press Escape | Close scorecard panel |
| Hover a role node | Tooltip with role title + holder name |
| Press Left/Right arrow | Step slider 10% |

---

## 7. Current State Org Structure

For the animation to work, we need the "before" picture. Based on meeting notes and the proposal doc, the Current state is approximately:

### CEO (Andy Ruttgers)
- Jen Hockey (head of Marketing/Ecom — NOT yet "Director of Ecom")
- Amanda Benfield (NPD Manager)
- Hanah Mathius (HR)
- Mark Valenzuela (Retail — "Regional General Manager")
- Steve Palumbo (Facility/Warehouse/Ops — has Chef Eric under him, plus production, QA, fulfillment)

### COO (Jay Scher)
- QA (Kaylyn) — currently under COO, moves to Dir Ops
- Customer Service — currently under COO, moves to Dir Ops
- Head of Technology (Max)
- Teresa Diaz (Procurement/Supply Chain)

### Under Steve (current state)
- Chef Eric (R&D) — THIS MOVES to Jen in proposed
- Melissa (Ops/Production Manager)
- Fulfillment
- Warehouse

### Under Jen (current state)
- Ashley (Marketing)
- Kelsey (Creative/Art Director)
- Sarah R (Performance Marketing)
- William (Ecom Manager)

### Under Amanda (current state — note: Amanda's role gets restructured)
- Kathy (order processing — limbo role)
- Sarah Bornhorst (tech stack)

### Standalone / Unclear
- Denise + Ian (Corporate Gifting sales — floating)
- Alyson/Allison Cannon (order processing)
- Carol/Caroline Fortin (support)

**Note to builder:** The Current state doesn't need to be as precise as Proposed — it's the "before" picture that makes the structural moves legible. If a role's current placement is unclear, default to the most logical parent and flag it in the data as `approximate: true`.

---

## 8. Visual Design Notes

### Vosges Brand Feel

This is a presentation for a luxury chocolate company. The design should feel:
- **Warm and sophisticated**, not corporate-tech
- Dark background (near-black or very deep charcoal, like `#1a1a1a`)
- Cream/ivory text (`#f5f0e8`)
- Node cards with subtle shadows and a fine gold/copper border (`#c4956a`)
- Pillar colors should be muted/luxurious (burgundy, teal, amber — not neon)
- Typography: serif for role titles (Georgia or similar), sans-serif for body text
- The timeline slider itself could be styled as a progress bar with a chocolate-brown fill

### Node Card Sizes

- **Level 1 (CEO, COO):** Larger cards, ~200×80px
- **Level 2 (Directors):** Medium cards, ~180×70px
- **Level 3+ (Managers, ICs):** Standard cards, ~160×60px
- EOY roles: Same size but dashed border + slightly lower opacity until slider is at 100%

### Responsive Behavior

- At < 1024px: Stack the three pillar columns vertically
- At < 768px: Collapse to a list view with expandable sections per pillar
- But primarily optimized for 1280px+ (laptop/projector)

---

## 9. Enhancements to Consider

These are stretch goals — not required for v1 but would make the tool more powerful:

1. **Search/filter:** Type a person's name to highlight their node and open their scorecard.

2. **Pillar isolation:** Click a pillar header to dim all other pillars and zoom into just that branch.

3. **Dependency view:** Toggle to show cross-functional partnerships mentioned in scorecards (e.g., "Chef partners with Ops Manager" draws a dashed line between them even though they're in different branches).

4. **Print/export view:** A static version optimized for PDF export — both states side by side.

5. **Annotation mode:** Presenter can click to add sticky-note annotations during a meeting that persist in the session (localStorage or just state).

6. **Keyboard navigation:** Tab through nodes, Enter to open scorecard, Escape to close.

7. **OKR overlay:** Toggle to show which roles own which OKRs — draws connection lines between roles that co-own the same OKR.

8. **Hiring timeline:** When slider is at 100%, EOY roles show their planned hire quarter with a subtle timeline bar.

---

## 10. File Inventory for Builder

The builder will need access to these files to extract data:

| File | Path | What to Extract |
|------|------|----------------|
| **Pre-built JSON** | `vhc-org-data.json` | **START HERE.** Complete data model: 40 roles (28 scorecard + 12 supporting), all initiatives, coach/report relationships, current & proposed parentIds, 15 transitions, scorecard inheritance, pillar assignments. Ready to embed directly in the app. |
| Scorecard Workbook | `Vosges 2026 Job Scorecards.xlsx` | Reference only — already extracted into JSON. All 28 role scorecards: titles, coaches, direct supports, initiatives, skills |
| Org Design Proposal | `Vosges 2026 Org Design Proposal.docx` | Reference only — narrative context, pillar descriptions |
| FigJam Org Chart | Figma ID `I97cpRfgnDXiVvwUXeVsCd` | Reference only — visual layout. Current + proposed positions already in JSON |
| Project Memory | `memory/projects/vhc-2026-org-design.md` | Scorecard inheritance rules, open items |
| 04-18 Meeting Notes | `memory/meetings/2026-04/2026-04-18_*` | Andy's revisions — already applied to JSON |

---

## 11. Open Items / Flags for Builder

1. **Customer Tech Operations scorecard "isn't quite right"** (Andy's 2026-04-18 flag). Build the card with current content but add a visual indicator (⚠️ or yellow border) that this one is under review.

2. **Mark's title needs replacement.** "Regional General Manager" is wrong. Builder should use whatever title Andy approves, or show it with a "[Title TBD]" badge.

3. **Art Director / Creative Director ambiguity.** Kelsey's title may change. Show current title with a note.

4. **Senior Designer / Designer scorecards deferred** pending Alyssa's Figma document. Show with current content but note they may be revised.

5. **Current-state org chart is approximate.** No canonical "Current" diagram exists — it's been reconstructed from meeting notes and institutional knowledge. The builder should not present it as authoritative; it's the contrast that matters, not the precision of the "before."

---

## 12. Success Criteria

The tool succeeds if:

1. Andy R and Jay can see, in under 10 seconds, the structural story of the redesign — who moves where and why
2. Every role's scorecard is one click away
3. The coach → report navigation makes accountability chains obvious
4. The transition animation makes the "before vs. after" instantly legible without a verbal walkthrough
5. It looks like something a luxury brand would present, not a Lucidchart embed
