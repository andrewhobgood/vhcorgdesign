import type { OrgData, Role } from './types';

export interface NodeLayout {
  role: Role;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  depth: number;
}

export interface LinkLayout {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  opacity: number;
  dashed: boolean;
}

export const PILLAR_COLORS: Record<string, string> = {
  leadership: '#38165f',
  meaning: '#722F37',
  making: '#2F5D5C',
  selling: '#B8860B',
  connective: '#3d1152',
};

// Node dimensions by depth
const W = [220, 190, 170, 150, 140];
const H = [48, 62, 58, 52, 48];
const V_GAP = 72;
const H_GAP = 16;

interface TreeNode {
  id: string;
  role: Role;
  children: TreeNode[];
  depth: number;
  x: number;
  y: number;
  subtreeWidth: number;
}

function buildTreeNode(
  id: string,
  roleMap: Map<string, Role>,
  childrenMap: Map<string, string[]>,
  depth: number,
  excluded: Set<string>
): TreeNode | null {
  const role = roleMap.get(id);
  if (!role || excluded.has(id)) return null;
  const childIds = childrenMap.get(id) || [];
  const children = childIds
    .map(cid => buildTreeNode(cid, roleMap, childrenMap, depth + 1, excluded))
    .filter(Boolean) as TreeNode[];
  return { id, role, children, depth, x: 0, y: 0, subtreeWidth: 0 };
}

function computeSubtreeWidths(node: TreeNode): number {
  const w = W[Math.min(node.depth, W.length - 1)];
  if (node.children.length === 0) {
    node.subtreeWidth = w;
    return w;
  }
  const childrenTotal = node.children.reduce((sum, c) => sum + computeSubtreeWidths(c) + H_GAP, -H_GAP);
  node.subtreeWidth = Math.max(w, childrenTotal);
  return node.subtreeWidth;
}

function assignPositions(node: TreeNode, centerX: number, topY: number): void {
  node.x = centerX;
  node.y = topY;
  if (node.children.length === 0) return;
  const totalChildWidth = node.children.reduce((s, c) => s + c.subtreeWidth + H_GAP, -H_GAP);
  let cx = centerX - totalChildWidth / 2;
  const childY = topY + H[Math.min(node.depth, H.length - 1)] + V_GAP;
  for (const child of node.children) {
    assignPositions(child, cx + child.subtreeWidth / 2, childY);
    cx += child.subtreeWidth + H_GAP;
  }
}

function collectPositions(node: TreeNode, out: Map<string, { x: number; y: number; depth: number }>): void {
  out.set(node.id, { x: node.x, y: node.y, depth: node.depth });
  node.children.forEach(c => collectPositions(c, out));
}


function getStatePositions(
  data: OrgData,
  state: 'current' | 'proposed',
  svgW: number
): Map<string, { x: number; y: number; depth: number }> {
  const sk = state === 'current' ? 'currentState' : 'proposedState';
  const activeRoles = data.roles.filter(r => r[sk].exists);
  const roleMap = new Map(activeRoles.map(r => [r.id, r]));

  // Build parent→children from state parentIds
  const childrenMap = new Map<string, string[]>();
  for (const role of activeRoles) {
    const pid = role[sk].parentId;
    if (pid) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(role.id);
    }
  }

  const positions = new Map<string, { x: number; y: number; depth: number }>();

  // ── Row 0: Board (thin banner) ──────────────────────────────
  const boardY = 32;
  positions.set('board', { x: svgW / 2, y: boardY, depth: 0 });

  // ── Row 1: CEO + COO side-by-side ──────────────────────────
  const ceoX = svgW / 2 - 160;
  const cooX = svgW / 2 + 160;
  const leaderY = boardY + H[0] + V_GAP;
  if (roleMap.has('ceo')) positions.set('ceo', { x: ceoX, y: leaderY, depth: 1 });
  if (roleMap.has('coo')) positions.set('coo', { x: cooX, y: leaderY, depth: 1 });

  // ── Three pillar columns ────────────────────────────────────
  const pillarY = leaderY + H[1] + V_GAP;

  // Exclude board/ceo/coo and connective from column layout
  const excluded = new Set(['board', 'ceo', 'coo', ...activeRoles.filter(r => r.pillar === 'connective').map(r => r.id)]);

  // Meaning column: under CEO (dir-ecom branch + hr-manager)
  const meaningRoots = (childrenMap.get('ceo') || []).filter(id => {
    const r = roleMap.get(id);
    return r && r.pillar === 'meaning';
  });
  // hr-manager is connective but hangs off CEO visually — treat separately
  const hrExists = activeRoles.find(r => r.id === 'hr-manager');

  const meaningColX = svgW * 0.20;
  buildPillarColumn(meaningRoots, roleMap, childrenMap, excluded, meaningColX, pillarY, 1, positions);

  // Making column: under COO (dir-ops branch)
  const makingRoots = (childrenMap.get('coo') || []).filter(id => {
    const r = roleMap.get(id);
    return r && r.pillar === 'making';
  });
  const makingColX = svgW * 0.52;
  buildPillarColumn(makingRoots, roleMap, childrenMap, excluded, makingColX, pillarY, 1, positions);

  // Selling column: under CEO (dir-sales + regional-gm if directly under ceo)
  const sellingRoots = (childrenMap.get('ceo') || []).filter(id => {
    const r = roleMap.get(id);
    return r && r.pillar === 'selling';
  });
  const sellingColX = svgW * 0.78;
  buildPillarColumn(sellingRoots, roleMap, childrenMap, excluded, sellingColX, pillarY, 1, positions);

  // HR manager (connective, reports to CEO) — float above meaning col
  if (hrExists && !positions.has('hr-manager')) {
    positions.set('hr-manager', { x: meaningColX - 120, y: leaderY, depth: 1 });
  }

  // Connective: head-tech + cust-tech-ops float right
  const techRoots = (childrenMap.get('coo') || []).filter(id => {
    const r = roleMap.get(id);
    return r && r.pillar === 'connective';
  });
  let techY = leaderY;
  for (const tid of techRoots) {
    if (!positions.has(tid)) {
      positions.set(tid, { x: svgW * 0.93, y: techY, depth: 2 });
      techY += H[2] + V_GAP * 0.8;
      // children of tech
      for (const cid of childrenMap.get(tid) || []) {
        if (!positions.has(cid)) {
          positions.set(cid, { x: svgW * 0.93, y: techY, depth: 3 });
          techY += H[3] + V_GAP * 0.8;
        }
      }
    }
  }

  return positions;
}

function buildPillarColumn(
  rootIds: string[],
  roleMap: Map<string, Role>,
  childrenMap: Map<string, string[]>,
  excluded: Set<string>,
  colCenterX: number,
  startY: number,
  baseDepth: number,
  positions: Map<string, { x: number; y: number; depth: number }>
) {
  // Build subtrees for each root and lay them out side by side
  const trees: TreeNode[] = [];
  for (const rid of rootIds) {
    const tree = buildTreeNode(rid, roleMap, childrenMap, baseDepth, excluded);
    if (tree) {
      computeSubtreeWidths(tree);
      trees.push(tree);
    }
  }
  if (trees.length === 0) return;

  const totalW = trees.reduce((s, t) => s + t.subtreeWidth + H_GAP, -H_GAP);
  let cx = colCenterX - totalW / 2;
  for (const tree of trees) {
    assignPositions(tree, cx + tree.subtreeWidth / 2, startY);
    collectPositions(tree, positions);
    cx += tree.subtreeWidth + H_GAP;
  }
}

export function computeLayout(
  data: OrgData,
  t: number,
  svgW: number
): { nodes: NodeLayout[]; links: LinkLayout[] } {
  const currentPos = getStatePositions(data, 'current', svgW);
  const proposedPos = getStatePositions(data, 'proposed', svgW);

  const nodes: NodeLayout[] = [];

  for (const role of data.roles) {
    const inC = role.currentState.exists;
    const inP = role.proposedState.exists;
    if (!inC && !inP) continue;

    let opacity = 1;
    if (!inC && inP) {
      opacity = t < 0.6 ? 0 : (t - 0.6) / 0.4;
    } else if (inC && !inP) {
      opacity = t < 0.5 ? 1 - t * 1.5 : Math.max(0, 1 - t * 2);
      opacity = Math.max(0, opacity);
    }
    if (opacity === 0) continue;

    const cPos = currentPos.get(role.id);
    const pPos = proposedPos.get(role.id);
    const from = cPos || pPos!;
    const to = pPos || cPos!;

    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const depth = from.depth;
    const w = W[Math.min(depth, W.length - 1)];
    const h = H[Math.min(depth, H.length - 1)];

    nodes.push({ role, x, y, width: w, height: h, opacity, depth });
  }

  const nodeMap = new Map(nodes.map(n => [n.role.id, n]));

  const links: LinkLayout[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    if (node.role.id === 'board') continue;

    // CEO + COO get board lines + a peer dashed line
    if (node.role.id === 'ceo' || node.role.id === 'coo') {
      const boardNode = nodeMap.get('board');
      if (boardNode) {
        const lid = `board→${node.role.id}`;
        if (!seen.has(lid)) {
          seen.add(lid);
          links.push({
            id: lid,
            sourceX: boardNode.x,
            sourceY: boardNode.y + H[0] / 2,
            targetX: node.x,
            targetY: node.y - node.height / 2,
            color: PILLAR_COLORS.leadership,
            opacity: node.opacity * 0.5,
            dashed: false,
          });
        }
      }
      continue;
    }

    // Effective parent at time t
    const cParent = node.role.currentState.parentId;
    const pParent = node.role.proposedState.parentId;
    const effectiveParent = t >= 0.5 ? (pParent ?? cParent) : (cParent ?? pParent);
    if (!effectiveParent) continue;

    const parentNode = nodeMap.get(effectiveParent);
    if (!parentNode) continue;

    const lid = `${effectiveParent}→${node.role.id}`;
    if (seen.has(lid)) continue;
    seen.add(lid);

    links.push({
      id: lid,
      sourceX: parentNode.x,
      sourceY: parentNode.y + parentNode.height / 2,
      targetX: node.x,
      targetY: node.y - node.height / 2,
      color: PILLAR_COLORS[node.role.pillar] || '#626262',
      opacity: node.opacity * 0.55,
      dashed: node.role.pillar === 'connective',
    });
  }

  return { nodes, links };
}

export function getSvgHeight(nodes: NodeLayout[]): number {
  if (nodes.length === 0) return 800;
  return Math.max(...nodes.map(n => n.y + n.height / 2)) + 80;
}
