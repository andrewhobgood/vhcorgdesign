// Layout engine — horizontal tree with special column stacking for dir-ecom and sibling pairs.

(function(){
  const NODE_W = 130;
  const NODE_H = 56;
  const H_GAP = 14;
  const V_GAP = 90;      // vertical space between levels (gives ~34px clearance)
  const STACK_GAP = 16;  // gap between vertically-stacked items in a column group
  const COL3_ECOM_GAP = 46; // wider gap before stacked/side columns (leaves room for spine)
  const BOARD_Y = 14;
  const LEADERS_Y = 110; // raised to give space for Board→CEO connector
  const L2_Y = 200;      // LEADERS_Y + NODE_H + 34px clearance

  const EXCLUDE = new Set([
    'prod-supervisors','prod-staff','warehouse','maintenance',
    'shipping','sanitation','concierge-ccd','concierge-boutique','gm-ohare'
  ]);

  // dir-ecom children are split into three fixed columns:
  //   col1: art-director (with its own subtree below)
  //   col2: sr-product-mgr (with its own subtree below)
  //   col3: everything else, stacked vertically
  const ECOM_COL1 = new Set(['art-director']);
  const ECOM_COL2 = new Set(['sr-product-mgr']);

  // Sibling groups that share one column (stacked vertically) to save horizontal space
  const SIBLING_STACKS = [new Set(['denise', 'ian'])];

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

    const pos = {};
    const stw = {};
    const busGroups = [];

    // Group sibling ids into layout slots.
    // SIBLING_STACKS members share one column (counted as NODE_W wide).
    function groupSlots(kids) {
      const used = new Set();
      const slots = [];
      kids.forEach(c => {
        if (used.has(c)) return;
        const sg = SIBLING_STACKS.find(g => g.has(c));
        if (sg) {
          const stackKids = kids.filter(k => sg.has(k));
          stackKids.forEach(k => used.add(k));
          if (stackKids.length > 1) {
            slots.push({ type: 'stack', ids: stackKids });
          } else {
            slots.push({ type: 'single', id: stackKids[0] });
          }
        } else {
          used.add(c);
          slots.push({ type: 'single', id: c });
        }
      });
      return slots;
    }

    // Bottom-up subtree width calculation
    function calcW(id) {
      // dir-ecom: dynamic column layout
      // col1=art-director, col2=sr-product-mgr, then stacked (no children), then one col per child-having node
      if (id === 'dir-ecom') {
        const kids = children['dir-ecom'] || [];
        kids.forEach(c => calcW(c));
        const col1 = kids.filter(c => ECOM_COL1.has(c));
        const col2 = kids.filter(c => ECOM_COL2.has(c));
        const remaining = kids.filter(c => !ECOM_COL1.has(c) && !ECOM_COL2.has(c));
        const extraCols = remaining.filter(c => (children[c] || []).length > 0);
        const stackedNodes = remaining.filter(c => (children[c] || []).length === 0);

        const widths = [];
        if (col1.length) widths.push(stw[col1[0]] || NODE_W);
        if (col2.length) widths.push(stw[col2[0]] || NODE_W);
        if (stackedNodes.length) widths.push(NODE_W);
        extraCols.forEach(c => widths.push(stw[c] || NODE_W));

        let total = 0;
        widths.forEach((w, i) => {
          // col1→col2 = H_GAP; col2→stacked/extraCols = COL3_ECOM_GAP; extraCol→extraCol = H_GAP
          const gap = i === 0 ? 0 : i === 2 ? COL3_ECOM_GAP : H_GAP;
          total += gap + w;
        });
        stw['dir-ecom'] = Math.max(NODE_W, total);
        return stw['dir-ecom'];
      }

      const kids = children[id] || [];
      if (!kids.length) { stw[id] = NODE_W; return NODE_W; }

      const slots = groupSlots(kids);
      let t = 0;
      slots.forEach((slot, i) => {
        if (i > 0) t += H_GAP;
        if (slot.type === 'single') {
          t += calcW(slot.id);
        } else {
          slot.ids.forEach(sid => calcW(sid)); // calc widths even if stacked
          t += NODE_W; // stacked group counts as one node wide
        }
      });
      stw[id] = Math.max(NODE_W, t);
      return stw[id];
    }

    // Max bottom-Y of a subtree (requires positions to be set already)
    function subtreeBottom(id) {
      let bottom = (pos[id] ? pos[id].y : 0) + NODE_H;
      (children[id] || []).forEach(c => {
        const cb = subtreeBottom(c);
        if (cb > bottom) bottom = cb;
      });
      return bottom;
    }

    // Place a vertical stack of nodes (used for col3 under dir-ecom).
    // Each node's children are placed below it; the next stacked node begins after.
    function placeColumnGroup(nodes, colX, startY) {
      let curY = startY;
      nodes.forEach(nodeId => {
        pos[nodeId] = { x: colX, y: curY };
        const nodeKids = children[nodeId] || [];
        if (nodeKids.length) {
          placeChildren(nodeId, colX, curY + V_GAP);
          curY = subtreeBottom(nodeId) + STACK_GAP;
        } else {
          curY += NODE_H + STACK_GAP;
        }
      });
    }

    // Recursively place children under a parent node
    function placeChildren(parentId, parentX, baseY) {
      const kids = children[parentId] || [];
      if (!kids.length) return;

      // dir-ecom: dynamic column layout
      // col1=art-director, col2=sr-product-mgr, stacked (leaf nodes), then one col per child-having node
      if (parentId === 'dir-ecom') {
        const col1 = kids.filter(c => ECOM_COL1.has(c));
        const col2 = kids.filter(c => ECOM_COL2.has(c));
        const remaining = kids.filter(c => !ECOM_COL1.has(c) && !ECOM_COL2.has(c));
        const extraCols = remaining.filter(c => (children[c] || []).length > 0);
        const stackedNodes = remaining.filter(c => (children[c] || []).length === 0);

        const parts = [];
        if (col1.length) parts.push({ type: 'single', id: col1[0], w: stw[col1[0]] || NODE_W });
        if (col2.length) parts.push({ type: 'single', id: col2[0], w: stw[col2[0]] || NODE_W });
        if (stackedNodes.length) parts.push({ type: 'col3', ids: stackedNodes, w: NODE_W });
        extraCols.forEach(c => parts.push({ type: 'single', id: c, w: stw[c] || NODE_W }));

        let totalW = 0;
        parts.forEach((p, i) => {
          p.gapBefore = i === 0 ? 0 : i === 2 ? COL3_ECOM_GAP : H_GAP;
          totalW += p.gapBefore + p.w;
        });
        let cx = parentX - totalW / 2;
        parts.forEach(part => {
          cx += part.gapBefore;
          const x = cx + part.w / 2;
          if (part.type === 'single') {
            pos[part.id] = { x, y: baseY };
            placeChildren(part.id, x, baseY + V_GAP);
          } else {
            placeColumnGroup(part.ids, x, baseY);
            busGroups.push({
              parentId: 'dir-ecom',
              ids: part.ids,
              spineX: x - NODE_W / 2 - 14,
              cardLeftX: x - NODE_W / 2
            });
          }
          cx += part.w;
        });
        return;
      }

      // Normal layout with sibling-stack support
      const slots = groupSlots(kids);
      let totalW = 0;
      slots.forEach((slot, i) => {
        if (i > 0) totalW += H_GAP;
        totalW += slot.type === 'single' ? stw[slot.id] : NODE_W;
      });
      let cx = parentX - totalW / 2;
      slots.forEach(slot => {
        if (slot.type === 'single') {
          const w = stw[slot.id];
          const x = cx + w / 2;
          pos[slot.id] = { x, y: baseY };
          placeChildren(slot.id, x, baseY + V_GAP);
          cx += w + H_GAP;
        } else {
          // Vertical sibling stack (e.g., denise + ian) — spine+stub connectors
          const x = cx + NODE_W / 2;
          let sy = baseY;
          slot.ids.forEach(sid => {
            pos[sid] = { x, y: sy };
            sy += NODE_H + STACK_GAP;
          });
          busGroups.push({
            parentId,
            ids: [...slot.ids],
            spineX: x - NODE_W / 2 - 14,
            cardLeftX: x - NODE_W / 2
          });
          cx += NODE_W + H_GAP;
        }
      });
    }

    // Calculate subtree widths for CEO and COO children
    const ceoKids = children['ceo'] || [];
    const cooKids = children['coo'] || [];
    ceoKids.forEach(c => calcW(c));
    cooKids.forEach(c => calcW(c));

    // Leader subtree total span (respects sibling stacks)
    function calcSubtreeW(kids) {
      if (!kids.length) return NODE_W;
      const slots = groupSlots(kids);
      let w = 0;
      slots.forEach((slot, i) => {
        if (i > 0) w += H_GAP;
        w += slot.type === 'single' ? stw[slot.id] : NODE_W;
      });
      return w;
    }

    const ceoSubW = calcSubtreeW(ceoKids);
    const cooSubW = calcSubtreeW(cooKids);

    const PEER_GAP = 40;
    const totalW = ceoSubW + PEER_GAP + cooSubW;
    const PAD = 80;
    const centerX = Math.max(totalW / 2 + PAD, 400);

    const ceoX = centerX - (cooSubW + PEER_GAP) / 2;
    const cooX = centerX + (ceoSubW + PEER_GAP) / 2;

    placeChildren('ceo', ceoX, L2_Y);
    placeChildren('coo', cooX, L2_Y);

    pos['board'] = { x: (ceoX + cooX) / 2, y: BOARD_Y };
    pos['ceo'] = { x: ceoX, y: LEADERS_Y };
    pos['coo'] = { x: cooX, y: LEADERS_Y };

    return { pos, depth, children, excluded: EXCLUDE, existing, busGroups };
  }

  window.computeLayout = computeLayout;
})();
