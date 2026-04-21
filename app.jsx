// Main VHC Org Viewer component
const { useState, useEffect, useRef, useMemo, useCallback } = React;

function getPillarColor(pillar) {
  const map = {
    leadership: '#242423',
    meaning: '#440A56',
    making: '#2e6160',
    selling: '#9a7520',
    connective: '#5A2A83'
  };
  return map[pillar] || '#242423';
}

// Right-angle edge: down from parent center-bottom, horizontal at midpoint, down to child center-top
function edgePath(p, c) {
  const parentBottom = p.y + 56; // NODE_H
  const childTop = c.y;
  const midY = parentBottom + 12; // route just below parent
  if (Math.abs(p.x - c.x) < 2) {
    // Straight vertical
    return `M ${p.x} ${parentBottom} L ${c.x} ${childTop}`;
  }
  return `M ${p.x} ${parentBottom} L ${p.x} ${midY} L ${c.x} ${midY} L ${c.x} ${childTop}`;
}

function interpolate(a, b, t) {
  if (a == null && b == null) return null;
  if (a == null) return b;
  if (b == null) return a;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// Eased time value used for opacity ramps
function ramp(t, a, b) {
  if (t <= a) return 0;
  if (t >= b) return 1;
  return (t - a) / (b - a);
}

function Node({ role, pos, state, tier, selected, pulsing, ghostOpacity, onClick, onHover }) {
  if (!pos) return null;
  const pillarColor = getPillarColor(role.pillar);
  const title = role[state]?.title || role.shortTitle;
  const holder = role.currentHolder;
  const isTBD = role.holderStatus === 'tbd';
  const isEOY = role.holderStatus === 'eoy-hire';
  const isGhost = ghostOpacity < 1;

  return (
    <div
      className={'node' + (isEOY ? ' eoy' : '')}
      data-tier={tier}
      data-selected={selected ? 'true' : 'false'}
      data-pulsing={pulsing ? 'true' : 'false'}
      data-ghost={isGhost ? 'true' : 'false'}
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, 0)',
        '--pillar-color': pillarColor,
        '--ghost-opacity': ghostOpacity
      }}
      onClick={() => onClick(role.id)}
      onMouseEnter={(e) => onHover({ role, x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => onHover({ role, x: e.clientX, y: e.clientY })}
      onMouseLeave={() => onHover(null)}
    >
      <span className="bar" style={{ background: pillarColor }}></span>
      <div>
        <span className="pip" style={{ background: pillarColor }}></span>
        {role.tabNumber && <span className="tab">{String(role.tabNumber).padStart(2,'0')}</span>}
      </div>
      <div className="title">{title}</div>
      {(holder || isTBD) && (
        <div className={'holder' + (isTBD ? ' tbd' : '')}>
          {isTBD ? 'Open seat · New hire' : holder}
        </div>
      )}
    </div>
  );
}

function Scorecard({ role, allRoles, onClose, onNavigate, state }) {
  if (!role) return null;
  const refRole = role.scorecardRef ? allRoles.find(r => r.id === role.scorecardRef) : role;
  const pillarColor = getPillarColor(role.pillar);
  const coachId = role[state]?.parentId || role.coachId;
  const coach = coachId ? allRoles.find(r => r.id === coachId) : null;
  const reports = (role.directSupports || [])
    .map(id => allRoles.find(r => r.id === id))
    .filter(Boolean)
    .filter(r => r[state]?.exists);

  const initiatives = (refRole.initiatives || []);
  const skills = (refRole.skills || []);
  const isUnderReview = role.note && role.note.includes('SCORECARD UNDER REVIEW');

  return (
    <aside className="scorecard open" onClick={e => e.stopPropagation()}>
      <div className="sc-head">
        <button className="sc-close" onClick={onClose}>×</button>
        <div className="sc-kicker">
          <span className="pip" style={{ background: pillarColor }}></span>
          <span>
            {role.tabNumber ? `Tab ${String(role.tabNumber).padStart(2,'0')} · ` : ''}
            {role.pillar === 'meaning' ? 'Meaning — Brand & Product' :
             role.pillar === 'making' ? 'Making — Operations' :
             role.pillar === 'selling' ? 'Selling — Sales' :
             role.pillar === 'connective' ? 'Connective Services' : 'Leadership'}
          </span>
        </div>
        <h2 className="sc-title">{role.title}</h2>
        <div className="sc-holder">
          {role.currentHolder
            ? role.currentHolder + (role.location ? ' · ' + role.location : '')
            : <span className="tbd">Open seat · {role.holderStatus === 'eoy-hire' ? 'Planned hire, H2 2026' : 'New hire'}</span>}
        </div>

        {isUnderReview && (
          <div className="sc-review">⚠ Scorecard under review · Andy flagged 2026-04-18</div>
        )}
        {role.scorecardRef && (
          <div className="sc-inherit">
            This role uses the <strong>{refRole.title}</strong> scorecard.
            {role.id === 'denise' || role.id === 'ian'
              ? ' Corporate Gifting assignment under Director of Sales.'
              : ' Displayed content is inherited from the parent role.'}
          </div>
        )}
      </div>

      <div className="sc-body">
        {refRole.purposeOfRole && (
          <p className="sc-purpose">"{refRole.purposeOfRole}"</p>
        )}

        <div className="sc-section">
          <div className="sc-section-title"><span>Relationships</span></div>
          <dl className="sc-kv">
            {coach && <>
              <dt>Coach</dt>
              <dd>
                <button className="sc-link" onClick={() => onNavigate(coach.id)}>
                  <span className="pip" style={{ '--pillar-color': getPillarColor(coach.pillar), background: getPillarColor(coach.pillar) }}></span>
                  <span className="arrow">→</span> {coach.title}
                </button>
              </dd>
            </>}
            {reports.length > 0 && <>
              <dt>Supports</dt>
              <dd>
                <div className="sc-links">
                  {reports.map(r => (
                    <button key={r.id} className="sc-link" onClick={() => onNavigate(r.id)}>
                      <span className="pip" style={{ '--pillar-color': getPillarColor(r.pillar), background: getPillarColor(r.pillar) }}></span>
                      <span className="arrow">→</span> {r.shortTitle}
                      {r.holderStatus === 'eoy-hire' && <span style={{color:'var(--ink-faint)', fontSize:10, marginLeft:4}}>· EOY</span>}
                    </button>
                  ))}
                </div>
              </dd>
            </>}
          </dl>
        </div>

        {refRole.jobDescription && (
          <div className="sc-section">
            <div className="sc-section-title"><span>Mandate</span></div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-dim)', margin: 0 }}>
              {refRole.jobDescription}
            </p>
          </div>
        )}

        {initiatives.length > 0 && (
          <div className="sc-section">
            <div className="sc-section-title"><span>2026 Outcomes</span></div>
            {initiatives.map((i, idx) => (
              <div className="init" key={idx}>
                <div className="init-head">
                  <div className="init-num">{String(i.priority).padStart(2,'0')}</div>
                  <div className="init-name">{i.name}</div>
                </div>
                <dl className="init-kv">
                  <dt>Result</dt>
                  <dd>{i.desiredResult}</dd>
                  <dt>Metric</dt>
                  <dd>{i.successMetric}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div className="sc-section">
            <div className="sc-section-title"><span>Skills & Traits</span></div>
            <div className="skills">
              {skills.map((s, i) => <span className="skill" key={i}>{s}</span>)}
            </div>
          </div>
        )}

        {role.note && !isUnderReview && (
          <div className="sc-section">
            <div className="sc-section-title"><span>Notes</span></div>
            <div className="sc-note">{role.note}</div>
          </div>
        )}
      </div>
    </aside>
  );
}

function PillarHeader({ name, color, x, y }) {
  return (
    <div className="pillar-header" style={{ left: x, top: y, transform: 'translateX(-50%)', textAlign: 'center' }}>
      <span className="mark" style={{ background: color, '--pillar-color': color }}></span>
      {name}
      <span className="sep" style={{ margin: '8px auto 0' }}></span>
    </div>
  );
}

function VHCOrgViewer() {
  const data = window.ORG_DATA;
  const [selectedId, setSelectedId] = useState(null);
  const [pulsingId, setPulsingId] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [transitionToast, setTransitionToast] = useState(null);
  const [showTweaks, setShowTweaks] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Per-step: which role IDs have moved to proposed position
  // Step 0: Current State (nobody moved)
  // Step 1: Directors move (Dir of Sales appears, Retail GM moves under Sales)
  // Step 2: Managers move (QA, CS to Dir Ops; Chef to Dir Ecom)
  // Step 3: Others (Product Ops, sales roles, EOY hires)
  // Step 4: Final Proposed
  const STEPS = useMemo(() => {
    const salesMoves = new Set(['dir-sales', 'regional-gm', 'denise', 'ian']);
    const managerMoves = new Set(['qa-manager', 'cust-service-mgr', 'chef-rd', 'procurement-mgr', 'fulfillment-super']);
    const otherMoves = new Set(['product-ops', 'jr-account-mgr', 'wholesale-pl', 'jr-marketing-coord', 'cust-tech-ops', 'head-tech']);

    return [
      { label: 'Current State', moved: new Set(), toast: null },
      { label: 'Sales Organization', moved: salesMoves,
        toast: { title: 'Sales Organization', desc: 'Director of Sales created; Retail GM, Corporate Gifting, and Sales roles consolidate under Sales', annotation: 'One leader accountable for all B2B revenue' } },
      { label: 'Manager Realignment', moved: new Set([...salesMoves, ...managerMoves]),
        toast: { title: 'Manager Realignment', desc: 'Chef/R&D → Brand & Product; QA & Customer Service → Operations', annotation: 'Aligning managers to the right pillars' } },
      { label: 'New Roles & EOY Hires', moved: new Set([...salesMoves, ...managerMoves, ...otherMoves]),
        toast: { title: 'New Roles & EOY Hires', desc: 'Head of Tech formalized under COO; Product Ops, Customer Tech Ops, and EOY hires', annotation: 'Filling in the new structure' } },
      { label: 'Proposed 2026', moved: null, toast: null },
    ];
  }, []);

  const goToStep = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    setStepIndex(clamped);
    setPlaying(false);
  }, [STEPS]);

  // Toast follows step
  useEffect(() => {
    setTransitionToast(STEPS[stepIndex]?.toast || null);
  }, [stepIndex, STEPS]);

  const [tweaks, setTweaks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vhc-tweaks') || '{}'); } catch(e) { return {}; }
  });
  const canvasRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => { localStorage.setItem('vhc-tweaks', JSON.stringify(tweaks)); }, [tweaks]);

  const currentLayout = useMemo(() => window.computeLayout(data.roles, 'currentState'), [data]);
  const proposedLayout = useMemo(() => window.computeLayout(data.roles, 'proposedState'), [data]);

  // Compute layout for the current step (mixed state)
  const stepLayout = useMemo(() => {
    const movedSet = STEPS[stepIndex]?.moved;
    return window.computeLayout(data.roles, 'proposedState', movedSet);
  }, [data, stepIndex, STEPS]);

  // Compute chart bounds from ALL possible layouts
  const chartBounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    // Check all step layouts for bounds
    STEPS.forEach(step => {
      const layout = window.computeLayout(data.roles, 'proposedState', step.moved);
      Object.values(layout.pos).forEach(p => {
        if (p.x - 80 < minX) minX = p.x - 80;
        if (p.x + 80 > maxX) maxX = p.x + 80;
        if (p.y + 70 > maxY) maxY = p.y + 70;
      });
    });
    return { minX: Math.max(0, minX - 30), maxX: maxX + 30, maxY: maxY + 30, w: (maxX + 30) - Math.max(0, minX - 30) + 60 };
  }, [data, STEPS]);

  // Auto-scale to fit viewport
  useEffect(() => {
    function resize() {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = rect.width / chartBounds.w;
      const scaleY = rect.height / chartBounds.maxY;
      setCanvasScale(Math.max(0.35, Math.min(scaleX, scaleY, 1)));
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [chartBounds]);

  // Tweaks protocol
  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setShowTweaks(true);
      if (e.data.type === '__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Auto-play: step through all steps
  useEffect(() => {
    if (!playing) return;
    setStepIndex(0);
    let current = 0;
    const iv = setInterval(() => {
      current++;
      if (current >= STEPS.length) {
        setPlaying(false);
        clearInterval(iv);
        return;
      }
      setStepIndex(current);
    }, 2000);
    return () => clearInterval(iv);
  }, [playing, STEPS]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelectedId(null); }
      if (e.key === 'ArrowLeft' && !selectedId) goToStep(stepIndex - 1);
      if (e.key === 'ArrowRight' && !selectedId) goToStep(stepIndex + 1);
      if (e.key === ' ' && !selectedId) {
        e.preventDefault();
        setPlaying(p => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // Remove old annotation-based toast

  const selectedRole = selectedId ? data.roles.find(r => r.id === selectedId) : null;
  const state = stepIndex >= 2 ? 'proposedState' : 'currentState';

  function nodeTier(role) {
    if (role.id === 'ceo' || role.id === 'coo') return 1;
    const dep = (proposedLayout.depth[role.id] || currentLayout.depth[role.id]);
    if (dep === 2) return 2;
    if (dep === 3) return 3;
    return 4;
  }

  const navigateTo = useCallback((id) => {
    setSelectedId(id);
    setPulsingId(id);
    setTimeout(() => setPulsingId(null), 1400);
  }, []);

  // Position: use the step layout directly
  function nodePos(role) {
    return stepLayout.pos[role.id] || null;
  }

  function nodeGhostOpacity(role) {
    // If role has no position in this step, it's hidden (returns null from nodePos)
    // New roles that just appeared get slightly transparent
    const movedSet = STEPS[stepIndex]?.moved;
    if (!role.currentState.exists && role.proposedState.exists) {
      if (movedSet === null) return 1;
      if (movedSet.has(role.id)) return 0.85;
      return 0;
    }
    return 1;
  }

  // Build edges from stepLayout's children map
  function getEdges() {
    const result = [];
    const ch = stepLayout.children;
    Object.keys(ch).forEach(parentId => {
      const parentPos = stepLayout.pos[parentId];
      if (!parentPos) return;
      ch[parentId].forEach(childId => {
        const childPos = stepLayout.pos[childId];
        if (!childPos) return;
        const child = data.roles.find(r => r.id === childId);
        result.push({
          id: childId + '-edge',
          path: edgePath(parentPos, childPos),
          stroke: getPillarColor(child?.pillar),
          op: 0.5
        });
      });
    });
    return result;
  }

  // Board/CEO/COO positions follow step
  const pos_board = stepLayout.pos.board;
  const pos_ceo = stepLayout.pos.ceo;
  const pos_coo = stepLayout.pos.coo;

  const highlightIds = new Set();
  if (stepIndex >= STEPS.length - 1) {
    data.transitions.filter(t => t.highlight).forEach(t => highlightIds.add(t.roleId));
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <img className="brand-logo" src="assets/vosges-haut-chocolat-wordmark.svg" alt="Vosges Haut-Chocolat" />
          <span className="brand-sub">2026 Org Design</span>
        </div>

        <div className="slider-wrap">
          <div className="slider-labels">
            <span className={stepIndex === 0 ? 'active' : ''}>Current</span>
            <span className="center">
              {STEPS[stepIndex]?.label || ''}
            </span>
            <span className={stepIndex === STEPS.length - 1 ? 'active' : ''}>Proposed 2026</span>
          </div>
          <div className="slider-track-wrap">
            <div className="slider-track"></div>
            <div className="slider-fill" style={{ width: (stepIndex / (STEPS.length - 1) * 100) + '%' }}></div>
            <div className="slider-thumb" style={{ left: (stepIndex / (STEPS.length - 1) * 100) + '%' }}></div>
          </div>
        </div>

        <div className="topbar-right">
          <button className="btn" onClick={() => goToStep(stepIndex - 1)} disabled={stepIndex === 0}>← Back</button>
          <button className="btn primary" onClick={() => setPlaying(true)}>
            ▶ Play All
          </button>
          <button className="btn" onClick={() => goToStep(stepIndex + 1)} disabled={stepIndex === STEPS.length - 1}>Next →</button>
        </div>
      </div>

      <div className="canvas" ref={canvasRef} style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
        <div className="chart-scroll" style={{
          transform: `scale(${canvasScale})`,
          transformOrigin: 'top center',
          width: chartBounds.w,
          height: chartBounds.maxY,
          flexShrink: 0,
          position: 'relative'
        }}>
          <div className="board-rule" style={{ position: 'absolute', top: 10, left: 0, right: 0 }}>
            <span className="line"></span>
            <span className="dot"></span>
            <span>Board of Directors</span>
            <span className="dot"></span>
            <span className="line"></span>
          </div>

          {/* SVG edges */}
          <svg className="chart-svg" width={chartBounds.w} height={chartBounds.maxY}>
            {/* Board -> CEO and COO */}
            {pos_board && pos_ceo && <path className="edge" d={edgePath(pos_board, pos_ceo)} stroke="#A5A5A5" />}
            {pos_board && pos_coo && <path className="edge" d={edgePath(pos_board, pos_coo)} stroke="#A5A5A5" />}
            {/* Peer line */}
            {pos_ceo && pos_coo && (
              <line className="peer-line"
                x1={pos_ceo.x + 120} y1={pos_ceo.y + 35}
                x2={pos_coo.x - 120} y2={pos_coo.y + 35} />
            )}

            {getEdges().map(e => (
              <path key={e.id} className="edge" d={e.path} stroke={e.stroke} style={{ opacity: e.op }} />
            ))}
          </svg>

          {/* Nodes */}
          {data.roles.map(r => {
            if (r.id === 'board') return null;
            const pos = nodePos(r);
            if (!pos) return null;
            return (
              <Node
                key={r.id}
                role={r}
                pos={pos}
                state={state}
                tier={nodeTier(r)}
                selected={selectedId === r.id}
                pulsing={pulsingId === r.id}
                ghostOpacity={nodeGhostOpacity(r)}
                onClick={navigateTo}
                onHover={setTooltip}
              />
            );
          })}
        </div>
      </div>

      {/* Scorecard panel */}
      {selectedRole && (
        <>
          <div className="scorim-backdrop open" onClick={() => setSelectedId(null)}></div>
          <Scorecard
            role={selectedRole}
            allRoles={data.roles}
            state={state}
            onClose={() => setSelectedId(null)}
            onNavigate={navigateTo}
          />
        </>
      )}

      {/* Tooltip */}
      {tooltip && !selectedRole && (
        <div className="tooltip show" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
          {tooltip.role.title}
          <div className="sub">
            {tooltip.role.currentHolder || (tooltip.role.holderStatus === 'eoy-hire' ? 'EOY 2026 hire' : 'Open')}
          </div>
        </div>
      )}

      {/* Transition toast */}
      {transitionToast && (
        <div className="transition-toast show">
          <div className="kicker">{stepIndex} of {STEPS.length - 1}</div>
          <div className="sep"></div>
          <div>
            <strong>{transitionToast.title}</strong> — {transitionToast.desc}
            {transitionToast.annotation && <> · <em>{transitionToast.annotation}</em></>}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="legend">
        <div className="item"><span className="sw" style={{background:'#440A56'}}></span>Meaning</div>
        <div className="item"><span className="sw" style={{background:'#2e6160'}}></span>Making</div>
        <div className="item"><span className="sw" style={{background:'#9a7520'}}></span>Selling</div>
        <div className="item"><span className="sw" style={{background:'#5A2A83'}}></span>Connective</div>
      </div>

      {/* Tweaks */}
      {showTweaks && (
        <div className="tweaks">
          <h4>Tweaks</h4>
          <label>Show peer line
            <input type="checkbox"
              checked={tweaks.peerLine !== false}
              onChange={e => setTweaks(t => ({ ...t, peerLine: e.target.checked }))} />
          </label>
          <label>Auto-play loop
            <input type="checkbox"
              checked={!!tweaks.autoLoop}
              onChange={e => setTweaks(t => ({ ...t, autoLoop: e.target.checked }))} />
          </label>
          <label>Show toast
            <input type="checkbox"
              checked={tweaks.toast !== false}
              onChange={e => setTweaks(t => ({ ...t, toast: e.target.checked }))} />
          </label>
        </div>
      )}
    </div>
  );
}

window.VHCOrgViewer = VHCOrgViewer;
