# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

An interactive presentation tool animating the VHC 2026 organizational redesign. A timeline slider morphs the org chart from "Current State" to "Proposed 2026" — roles slide, connection lines animate, scorecards open on click. Audience: two people (CEO + COO of Vosges Haut-Chocolat). Deliverable: a single self-contained HTML file.

## Source of Truth

**`vhc-org-data.json`** is the canonical data source. Do not re-extract from `Vosges 2026 Job Scorecards.xlsx` or `Vosges 2026 Org Design Proposal.docx` — the JSON already incorporates all revisions. The full product spec is in `VHC Org Viewer - Product Definition.md`.

## Tech Stack

React 18 + TypeScript + Vite + Tailwind CSS + D3.js. Bootstrap the project with:

```bash
npm create vite@latest vhc-org-viewer -- --template react-ts
cd vhc-org-viewer
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install d3 @types/d3
```

Once scaffolded, standard commands:

```bash
npm run dev      # dev server
npm run build    # production build
npm run preview  # preview built output
```

The final output must be a single self-contained HTML file (all assets inlined) — open it in a browser with no server.

## Architecture

The app is data-driven from `vhc-org-data.json` embedded directly (no API calls). Core rendering is split between React (UI shell, scorecard panel, slider controls) and D3 (org chart SVG, node layout, transitions).

**Data model key fields:**
- `roles[].currentState.parentId` / `proposedState.parentId` — build the two org trees from these
- `roles[].currentState.exists` / `proposedState.exists` — determines if a role appears in each state
- `roles[].scorecardRef` — if non-null, this role shows another role's scorecard with an inheritance banner
- `roles[].holderStatus` — `"eoy-hire"` roles get dashed border + reduced opacity
- `transitions[].highlight` — these are the Big Structural Moves that get annotation tooltips

**Slider interpolation:** At `t=0`, render current-state tree. At `t=1`, render proposed-state tree. Nodes present in both states interpolate position. New roles (`proposedState.exists && !currentState.exists`) fade in at `t≈0.6`. Removed roles fade out.

**Scorecard panel:** Slides in from right at 40% width. Coach and Direct Support links are clickable — clicking transitions the panel to that role's scorecard AND pulses the corresponding node in the chart.

## Critical Non-Negotiables

1. **CEO and COO are always peers** — both `parentId: "board"` in both states. Render side-by-side with a horizontal dashed line, never as parent-child.

2. **Chef / R&D Director (`chef-rd`)** — `currentState.parentId: "dir-ops"`, `proposedState.parentId: "dir-ecom"`. This is the signature structural move of the redesign.

3. **Scorecard inheritance:**
   - `cust-tech-ops` → shows `head-tech` scorecard with "uses Head of Technology scorecard" banner. Also has `⚠️` indicator (Andy flagged as under review 2026-04-18).
   - `denise` and `ian` → show `sales-account-mgr` scorecard with "Corporate Gifting — uses Sales Account Manager scorecard" banner.

4. **Visual aesthetic:** `#1a1a1a` background, `#f5f0e8` cream text, `#c4956a` gold/copper card borders. Pillar colors: burgundy `#722F37` (meaning), teal `#2F5D5C` (making), amber `#B8860B` (selling), purple `#6B5B73` (connective), charcoal `#3d3d3d` (leadership). Serif for role titles, sans-serif for body.

5. **EOY hire roles** (`holderStatus: "eoy-hire"`) — dashed border, slightly lower opacity until slider reaches 100%.

## Build Sequence

1. Static proposed-state org chart (D3 tree, nodes, pillar colors, CEO/COO peer layout)
2. Scorecard panel (click a node → panel slides in with identity, initiatives, skills, coach/report links)
3. Scorecard navigation (coach/report links clickable, panel transitions + node pulse)
4. Current-state tree (use `currentState.parentId` for layout)
5. Timeline slider + animated transitions (the centerpiece)
6. Play button (auto-animate 0→100% over 3 seconds)
7. Polish (hover tooltips, keyboard nav, transition annotations)

## Pillar Layout

- Board of Directors: thin bar at top
- CEO + COO: side by side below Board (horizontal dashed peer line between them)
- Three columns below: Meaning/left, Making/center-right, Selling/right
- Connective Services (HR, Tech): floating cards connected by dotted lines to their coach

## Open Flags in the Data

- `cust-tech-ops` scorecard is under review (show `⚠️` or yellow border indicator)
- `art-director` title may change to "Creative Director" (show note)
- `sr-designer` and `designer` scorecards may be revised (Alyssa's Figma doc pending)
- Current-state org is approximate — not authoritative, it's the contrast that matters
