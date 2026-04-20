# VHC 2026 Org Viewer — Build Prompt

## What you're building

An interactive presentation tool that animates the VHC 2026 organizational redesign. A timeline slider morphs the org chart from "Current State" to "Proposed 2026" — roles slide to new positions, new roles fade in, reporting lines animate. Clicking any role opens its scorecard with clickable coach/report links for tree navigation. This is a presentation for two people (CEO and COO of a luxury chocolate company), not a production app.

## Source files

Everything you need is in two files in this directory:

1. **`VHC Org Viewer - Product Definition.md`** — Full product spec. Read this first, end to end. It covers: the timeline slider concept, org chart layout, scorecard drill-down panel, animation behaviors, visual design (dark luxury aesthetic), interaction table, current-state org structure, and stretch enhancements. The spec is detailed and opinionated — follow it.

2. **`vhc-org-data.json`** — Complete, verified data model ready to embed. Contains 40 roles (28 with scorecards, 12 supporting team members), all scorecard initiatives, coach/report relationships, `currentState` and `proposedState` with `parentId` for both org chart positions, 15 annotated transitions, pillar definitions with hex colors, and scorecard inheritance pointers. Every reference in this file has been validated — all parentIds, coachIds, directSupports, and scorecardRefs resolve to real role IDs.

**Do not re-extract data from the Excel workbook or Figma.** The JSON is the source of truth. It already incorporates the 04-18 scorecard revisions, the Chef/R&D placement fix, and the scorecard inheritance resolution.

## Tech approach

Set up a React 18 + TypeScript + Vite project with Tailwind CSS:

```bash
npm create vite@latest vhc-org-viewer -- --template react-ts
cd vhc-org-viewer
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install d3 @types/d3
```

For the org chart rendering and transitions, use **D3.js** (`d3-hierarchy` for tree layout, `d3-transition` for animations, `d3-shape` for Bezier connection lines).

The final deliverable should be a single self-contained HTML file that can be opened in a browser with no server — use `vite build` and then inline everything, or build it as a single-file app. The audience will open this file on a laptop plugged into a projector.

## Critical design rules

These are non-negotiable. The spec explains each in detail, but here's the short version:

1. **CEO and COO are ALWAYS peers.** Both report to Board in both states. They sit side by side with a horizontal dashed line between them. Jay never reports to Andy. Never render them as parent-child.

2. **Chef / R&D Director moves from Steve → Jen** in the Proposed state. This is THE signature structural move of the redesign. In Current state, Chef reports to Director of Operations (Steve). In Proposed state, Chef reports to Director of Ecom (Jen). Don't conflate the two states.

3. **Scorecard inheritance:** Three roles don't own their own scorecard — they reference another role's. `cust-tech-ops` shows the Head of Technology scorecard with a banner. `denise` and `ian` both show the Sales Account Manager scorecard. Check the `scorecardRef` field on each role.

4. **Visual aesthetic:** Dark background (`#1a1a1a`), cream text (`#f5f0e8`), gold/copper card borders (`#c4956a`). Muted pillar colors (burgundy, teal, amber — not neon). Serif for role titles, sans-serif for body. This should look like a luxury brand presentation, not a Lucidchart embed.

5. **EOY hire roles** (roles with `holderStatus: "eoy-hire"`) get dashed borders and slightly lower opacity. They're planned hires, not current positions.

## Build sequence

Suggested order — adjust as needed:

1. **Static proposed org chart** — get the tree layout rendering with D3. Nodes, connection lines, pillar colors. CEO/COO peer positioning. Get this right before anything else.

2. **Scorecard panel** — click a node, panel slides in from right. Wire up the data: identity section, initiatives, skills, coach/report links.

3. **Scorecard navigation** — make coach and direct support links clickable. Clicking a link transitions the panel AND pulses the corresponding node in the chart.

4. **Current state rendering** — add the current-state tree. Use each role's `currentState.parentId` to build the "before" layout.

5. **Timeline slider + transitions** — the centerpiece. Dragging the slider interpolates between current and proposed positions. Roles that move slide smoothly. New roles fade in at ~60%. Connection lines animate (old fades out, new fades in). Structural moves get a highlight pulse.

6. **Play button** — auto-animate from 0% → 100% over 3 seconds.

7. **Polish** — hover tooltips, keyboard nav (arrow keys for slider, Escape to close panel), transition annotations, responsive behavior.

## Data model quick reference

The JSON structure (see the product def for full TypeScript interfaces):

- `roles[]` — each role has `id`, `tabNumber` (1-28 for scorecard roles, null for supporting), `title`, `shortTitle`, `pillar`, `currentHolder`, `holderStatus`, `coachId`, `directSupports[]`, `scorecardRef`, `initiatives[]`, `skills[]`, `currentState { exists, parentId }`, `proposedState { exists, parentId }`
- `transitions[]` — each has `roleId`, `type` (move/new/remove/rename/restructure), `description`, `highlight` (true for the big moves that deserve annotation)
- `pillars[]` — id, name, color hex, description
- `implementationSteps[]` — 9-phase rollout sequence (stretch: could be shown as a timeline overlay)

## What "done" looks like

1. Andy R and Jay can see the structural story of the redesign in under 10 seconds — who moves where and why
2. Every role's scorecard is one click away
3. Coach → report navigation makes accountability chains obvious
4. The transition animation makes before vs. after instantly legible without a verbal walkthrough
5. It looks like something a luxury brand would present
