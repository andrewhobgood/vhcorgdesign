import React, { useEffect, useState } from 'react';
import type { OrgData } from './types';

interface Props {
  data: OrgData;
  t: number;
}

interface ActiveAnnotation {
  id: string;
  annotation: string;
  description: string;
}

// Each highlight transition fires when t crosses its threshold
const THRESHOLDS: Record<string, number> = {
  'chef-rd': 0.62,
  'qa-manager': 0.55,
  'cust-service-mgr': 0.50,
  'dir-sales': 0.70,
  'regional-gm': 0.65,
  'product-ops': 0.75,
};

export default function TransitionBanner({ data, t }: Props) {
  const [shown, setShown] = useState<ActiveAnnotation | null>(null);
  const [visible, setVisible] = useState(false);
  const prevT = React.useRef(t);

  const highlightTransitions = data.transitions.filter(tr => tr.highlight && tr.annotation);

  useEffect(() => {
    const prev = prevT.current;
    prevT.current = t;

    // Only fire when moving forward (dragging right / playing)
    if (t <= prev) return;

    for (const tr of highlightTransitions) {
      const threshold = THRESHOLDS[tr.roleId] ?? 0.6;
      if (prev < threshold && t >= threshold) {
        setShown({ id: tr.roleId, annotation: tr.annotation!, description: tr.description });
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 3500);
        return () => clearTimeout(timer);
      }
    }
  }, [t, highlightTransitions]);

  if (!shown) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 40,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      maxWidth: 480,
      background: '#1a1a2e',
      border: '1px solid #38165f',
      padding: '14px 20px',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <div style={{
        fontSize: 9, color: '#38165f', fontFamily: "'Roboto', sans-serif",
        letterSpacing: '1.5px', fontWeight: 600, marginBottom: 6,
        textTransform: 'uppercase',
      }}>
        Structural Move
      </div>
      <div style={{
        fontSize: 13, color: '#f6f6f4',
        fontFamily: "'Playfair Display', Georgia, serif",
        fontStyle: 'italic', marginBottom: 4, lineHeight: 1.4,
      }}>
        "{shown.annotation}"
      </div>
      <div style={{ fontSize: 10, color: '#666', fontFamily: "'Montserrat', sans-serif" }}>
        {shown.description}
      </div>
    </div>
  );
}
