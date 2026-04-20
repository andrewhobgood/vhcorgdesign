import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { OrgData } from './types';
import { computeLayout, getSvgHeight, PILLAR_COLORS } from './layout';

interface Props {
  data: OrgData;
  t: number;
  selectedRoleId: string | null;
  pulsingRoleId: string | null;
  onNodeClick: (roleId: string) => void;
  highlightedTransitions: Set<string>;
}

const BOARD_H = 32;
const BOARD_W_FRAC = 0.6;

export default function OrgChart({
  data, t, selectedRoleId, pulsingRoleId, onNodeClick, highlightedTransitions,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(1400);

  const draw = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgW = widthRef.current;
    const { nodes, links } = computeLayout(data, t, svgW);
    const svgH = getSvgHeight(nodes);
    svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
    svg.setAttribute('height', String(svgH));

    const root = d3.select(svg);

    // ── Links ──────────────────────────────────────────────────────
    const linkGroup = root.select<SVGGElement>('.links');
    linkGroup.selectAll<SVGPathElement, typeof links[0]>('path')
      .data(links, d => d.id)
      .join(
        enter => enter.append('path').attr('fill', 'none').attr('stroke-width', 1.5),
        update => update,
        exit => exit.remove()
      )
      .attr('d', d => {
        const mx = d.sourceX;
        const my = (d.sourceY + d.targetY) / 2;
        return `M${d.sourceX},${d.sourceY} C${mx},${my} ${d.targetX},${my} ${d.targetX},${d.targetY}`;
      })
      .attr('stroke', d => d.color)
      .attr('opacity', d => d.opacity)
      .attr('stroke-dasharray', d => d.dashed ? '5,4' : null);

    // ── CEO ↔ COO peer line ────────────────────────────────────────
    const ceoNode = nodes.find(n => n.role.id === 'ceo');
    const cooNode = nodes.find(n => n.role.id === 'coo');
    const peerLine = root.select<SVGLineElement>('.peer-line');
    if (ceoNode && cooNode) {
      peerLine
        .attr('x1', ceoNode.x + ceoNode.width / 2)
        .attr('y1', ceoNode.y)
        .attr('x2', cooNode.x - cooNode.width / 2)
        .attr('y2', cooNode.y)
        .attr('display', null);
    } else {
      peerLine.attr('display', 'none');
    }

    // ── Board bar ─────────────────────────────────────────────────
    const boardNode = nodes.find(n => n.role.id === 'board');
    const boardBar = root.select<SVGGElement>('.board-bar');
    if (boardNode) {
      const bw = svgW * BOARD_W_FRAC;
      boardBar.select('rect')
        .attr('x', svgW / 2 - bw / 2)
        .attr('y', boardNode.y - BOARD_H / 2)
        .attr('width', bw)
        .attr('height', BOARD_H);
      boardBar.select('text')
        .attr('x', svgW / 2)
        .attr('y', boardNode.y + 5);
    }

    // ── Nodes ──────────────────────────────────────────────────────
    const nodeGroup = root.select<SVGGElement>('.nodes');
    const nodeGs = nodeGroup.selectAll<SVGGElement, typeof nodes[0]>('g.node')
      .data(nodes.filter(n => n.role.id !== 'board'), d => d.role.id)
      .join(
        enter => {
          const g = enter.append('g').attr('class', 'node').style('cursor', 'pointer');
          g.append('rect').attr('class', 'node-bg');
          g.append('rect').attr('class', 'node-accent');
          g.append('text').attr('class', 'node-title');
          g.append('text').attr('class', 'node-holder');
          g.append('text').attr('class', 'node-badge');
          return g;
        },
        update => update,
        exit => exit.remove()
      );

    nodeGs
      .attr('transform', d => `translate(${d.x - d.width / 2},${d.y - d.height / 2})`)
      .attr('opacity', d => d.opacity)
      .on('click', (_e, d) => {
        if (d.role.id !== 'board') onNodeClick(d.role.id);
      });

    nodeGs.select<SVGRectElement>('rect.node-bg')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', d => {
        if (d.role.id === selectedRoleId) return '#38165f';
        return '#1e1e1e';
      })
      .attr('stroke', d => {
        if (d.role.id === selectedRoleId) return '#38165f';
        if (d.role.id === pulsingRoleId) return '#f6f6f4';
        if (highlightedTransitions.has(d.role.id)) return '#B8860B';
        return PILLAR_COLORS[d.role.pillar] || '#38165f';
      })
      .attr('stroke-width', d => {
        if (d.role.id === pulsingRoleId) return 2.5;
        if (d.role.id === selectedRoleId) return 2;
        return 1;
      })
      .attr('stroke-dasharray', d => d.role.holderStatus === 'eoy-hire' ? '5,3' : null)
      .attr('opacity', d => d.role.holderStatus === 'eoy-hire' ? 0.75 : 1);

    // Left accent bar (pillar color)
    nodeGs.select<SVGRectElement>('rect.node-accent')
      .attr('width', 3)
      .attr('height', d => d.height)
      .attr('fill', d => PILLAR_COLORS[d.role.pillar] || '#38165f')
      .attr('opacity', d => d.role.id === selectedRoleId ? 0 : 0.9);

    // Role title
    nodeGs.select<SVGTextElement>('text.node-title')
      .attr('x', d => 3 + (d.width - 3) / 2)
      .attr('y', d => d.role.currentHolder || d.role.holderStatus !== 'filled' ? d.height * 0.38 : d.height / 2 + 5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#f6f6f4')
      .attr('font-size', d => d.depth <= 1 ? 11 : 10)
      .attr('font-family', "'Playfair Display', Georgia, serif")
      .attr('font-weight', '500')
      .each(function(d) {
        const el = d3.select(this);
        const title = t > 0.5 && d.role.proposedState.title
          ? d.role.proposedState.title
          : (t <= 0.5 && d.role.currentState.title
            ? d.role.currentState.title
            : d.role.shortTitle);
        el.text(null);
        // Wrap long titles
        const words = title.split(' ');
        const maxChars = Math.floor(d.width / 6.5);
        let line = '';
        const lines: string[] = [];
        for (const w of words) {
          if ((line + w).length > maxChars && line) {
            lines.push(line.trim());
            line = w + ' ';
          } else {
            line += w + ' ';
          }
        }
        lines.push(line.trim());
        const lineH = 13;
        const totalH = lines.length * lineH;
        const startY = d.role.currentHolder ? -totalH / 2 + lineH / 2 : 0;
        lines.forEach((l, i) => {
          el.append('tspan')
            .attr('x', 3 + (d.width - 3) / 2)
            .attr('dy', i === 0 ? startY : lineH)
            .text(l);
        });
      });

    // Holder name
    nodeGs.select<SVGTextElement>('text.node-holder')
      .attr('x', d => 3 + (d.width - 3) / 2)
      .attr('y', d => d.height * 0.72)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#888')
      .attr('font-size', 9)
      .attr('font-family', "'Montserrat', sans-serif")
      .text(d => {
        if (d.role.holderStatus === 'tbd') return '[TBD]';
        if (d.role.holderStatus === 'eoy-hire') return '2026 H2';
        return d.role.currentHolder || '';
      });

    // Warning badge for under-review roles
    nodeGs.select<SVGTextElement>('text.node-badge')
      .attr('x', d => d.width - 6)
      .attr('y', 10)
      .attr('text-anchor', 'end')
      .attr('font-size', 10)
      .text(d => d.role.note?.includes('SCORECARD UNDER REVIEW') ? '⚠' : '');

  }, [data, t, selectedRoleId, pulsingRoleId, onNodeClick, highlightedTransitions]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        widthRef.current = entry.contentRect.width || 1400;
        draw();
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto overflow-y-auto">
      <svg ref={svgRef} style={{ width: '100%', display: 'block', minWidth: 900 }}>
        <g className="links" />
        <line
          className="peer-line"
          stroke="#f6f6f4"
          strokeWidth={1}
          strokeDasharray="6,4"
          opacity={0.3}
        />
        <g className="board-bar">
          <rect fill="none" stroke="#38165f" strokeWidth={1} />
          <text
            textAnchor="middle"
            fill="#f6f6f4"
            fontSize={10}
            fontFamily="'Montserrat', sans-serif"
            fontWeight="600"
            letterSpacing="2"
          >
            BOARD OF DIRECTORS
          </text>
        </g>
        <g className="nodes" />
      </svg>
    </div>
  );
}
