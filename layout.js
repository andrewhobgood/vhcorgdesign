// Layout — proper horizontal tree. Children spread horizontally under parent.
// Uses bottom-up subtree width to prevent overlap.

(function(){
  const NODE_W = 130;
  const NODE_H = 56;
  const H_GAP = 14;
  const V_GAP = 70;     // vertical space between levels (leaves room for connectors)
  const BOARD_Y = 14;
  const LEADERS_Y = 70;
  const L2_Y = 160;

  const EXCLUDE = new Set([
    'prod-supervisors','prod-staff','warehouse','maintenance',
    'shipping','sanitation','concierge-ccd','concierge-boutique','gm-ohare'
  ]);

  function computeLayout(roles, state, movedSet) {
    if (movedSet === undefined) {
      movedSet = state === 'proposedState' ? null : new Set();
    }

    const byId = Object.fromEntries(roles.map(r => [r.id, r]));
    const existing = new Set();
    const parentOf = {};

    roles.forEach(r => {
      if (EXCLUDE.has(r.id)) return;
      const isAllProposed = movedSet === null;
      const isMoved = movedSet && movedSet.has(r.id);
      if (isAllProposed) {
        if (r.proposedState.exists) { existing.add(r.id); parentOf[r.id] = r.proposedState.parentId; }
      } else if (isMoved) {
        if (r.proposedState.exists) { existing.add(r.id); parentOf[r.id] = r.proposedState.parentId; }
      } else {
        if (r.currentState.exists) { existing.add(r.id); parentOf[r.id] = r.currentState.parentId; }
      }
    });

    ['board', 'ceo', 'coo'].forEach(id => {
      if (!existing.has(id)) existing.add(id);
      if (!parentOf[id]) {
        const r = byId[id];
        if (r) parentOf[id] = r.proposedState.parentId || r.currentState.parentId;
      }
    });

    const children = {};
    existing.forEach(id => {
      const pid = parentOf[id];
      if (pid && existing.has(pid)) {
        (children[pid] = children[pid] || []).push(id);
      }
    });

    const po = { meaning: 0, selling: 1, making: 2, connective: 3, leadership: 0 };
    Object.keys(children).forEach(pid => {
      children[pid].sort((a, b) => {
        const pa = po[byId[a]?.pillar] ?? 2, pb = po[byId[b]?.pillar] ?? 2;
        if (pa !== pb) return pa - pb;
        return (byId[a]?.tabNumber || 99) - (byId[b]?.tabNumber || 99);
      });
    });

    const depth = {};
    function setDepth(id, d) { depth[id] = d; (children[id] || []).forEach(c => setDepth(c, d + 1)); }
    if (existing.has('board')) setDepth('board', 0);

    // Bottom-up subtree width
    const stw = {};
    function calcW(id) {
      const kids = children[id] || [];
      if (!kids.length) { stw[id] = NODE_W; return NODE_W; }
      let t = 0;
      kids.forEach((c, i) => { t += calcW(c); if (i > 0) t += H_GAP; });
      stw[id] = Math.max(NODE_W, t);
      return stw[id];
    }

    // Compute widths for CEO and COO subtrees
    const ceoKids = children['ceo'] || [];
    const cooKids = children['coo'] || [];
    ceoKids.forEach(c => calcW(c));
    cooKids.forEach(c => calcW(c));

    let ceoSubW = NODE_W;
    if (ceoKids.length) {
      ceoSubW = 0;
      ceoKids.forEach((c, i) => { ceoSubW += stw[c]; if (i > 0) ceoSubW += H_GAP; });
    }
    let cooSubW = NODE_W;
    if (cooKids.length) {
      cooSubW = 0;
      cooKids.forEach((c, i) => { cooSubW += stw[c]; if (i > 0) cooSubW += H_GAP; });
    }

    const PEER_GAP = 40;
    const totalW = ceoSubW + PEER_GAP + cooSubW;
    const PAD = 80;
    const centerX = Math.max(totalW / 2 + PAD, 400);

    const pos = {};

    // Recursive: place children centered under parent
    function placeChildren(parentId, parentX, baseY) {
      const kids = children[parentId] || [];
      if (!kids.length) return;
      let totalChildW = 0;
      kids.forEach((c, i) => { totalChildW += stw[c]; if (i > 0) totalChildW += H_GAP; });
      let cx = parentX - totalChildW / 2;
      kids.forEach(c => {
        const w = stw[c];
        const x = cx + w / 2;
        pos[c] = { x, y: baseY };
        placeChildren(c, x, baseY + V_GAP);
        cx += w + H_GAP;
      });
    }

    // Place CEO children
    const ceoX = centerX - (cooSubW + PEER_GAP) / 2;
    const cooX = centerX + (ceoSubW + PEER_GAP) / 2;

    placeChildren('ceo', ceoX, L2_Y);
    placeChildren('coo', cooX, L2_Y);

    // Place children of L2+ recursively (already done by placeChildren)

    pos['board'] = { x: (ceoX + cooX) / 2, y: BOARD_Y };
    pos['ceo'] = { x: ceoX, y: LEADERS_Y };
    pos['coo'] = { x: cooX, y: LEADERS_Y };

    return { pos, depth, children, excluded: EXCLUDE, existing };
  }

  window.computeLayout = computeLayout;
})();
