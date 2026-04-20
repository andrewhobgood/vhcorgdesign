import React, { useRef, useCallback, useEffect } from 'react';

interface Props {
  t: number;
  onChange: (t: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
}

const LABELS = ['Current State', 'In Transition', 'Proposed 2026'];

export default function TimelineSlider({ t, onChange, isPlaying, onPlayToggle }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getLabel = () => {
    if (t < 0.15) return LABELS[0];
    if (t > 0.85) return LABELS[2];
    return LABELS[1];
  };

  const computeT = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const { left, width } = track.getBoundingClientRect();
    const raw = (clientX - left) / width;
    onChange(Math.max(0, Math.min(1, raw)));
  }, [onChange]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    computeT(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    computeT(e.clientX);
  };
  const onPointerUp = () => { dragging.current = false; };

  // Keyboard: left/right arrows step 10%
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') onChange(Math.min(1, t + 0.1));
      if (e.key === 'ArrowLeft') onChange(Math.max(0, t - 0.1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [t, onChange]);

  const pct = `${(t * 100).toFixed(1)}%`;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 24px',
      borderBottom: '1px solid #1e1e1e',
      background: '#0e0e0e',
    }}>
      {/* Play button */}
      <button
        onClick={onPlayToggle}
        style={{
          background: isPlaying ? '#38165f' : 'none',
          border: '1px solid #38165f',
          color: '#f6f6f4',
          cursor: 'pointer',
          padding: '5px 14px',
          fontSize: 12,
          fontFamily: "'Roboto', sans-serif",
          letterSpacing: '0.5px',
          flexShrink: 0,
          transition: 'background 0.2s',
        }}
      >
        {isPlaying ? '■ Stop' : '▶ Play'}
      </button>

      {/* State labels */}
      <div style={{
        fontSize: 9, color: '#444', fontFamily: "'Roboto', sans-serif",
        letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0,
      }}>
        Current
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          flex: 1, height: 32, position: 'relative', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        {/* Track background */}
        <div style={{
          width: '100%', height: 2, background: '#2a2a2a', position: 'relative',
        }}>
          {/* Fill */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: pct, background: '#38165f',
            transition: dragging.current ? 'none' : 'width 0.05s',
          }} />
        </div>

        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: pct,
          transform: 'translateX(-50%)',
          width: 14, height: 14,
          background: '#38165f',
          border: '2px solid #f6f6f4',
          cursor: 'grab',
          flexShrink: 0,
          transition: dragging.current ? 'none' : 'left 0.05s',
        }} />

        {/* Label above thumb */}
        <div style={{
          position: 'absolute',
          left: pct,
          top: -22,
          transform: 'translateX(-50%)',
          fontSize: 9,
          color: '#f6f6f4',
          fontFamily: "'Roboto', sans-serif",
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transition: dragging.current ? 'none' : 'left 0.05s',
        }}>
          {getLabel()}
        </div>
      </div>

      <div style={{
        fontSize: 9, color: '#444', fontFamily: "'Roboto', sans-serif",
        letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0,
      }}>
        Proposed
      </div>

      {/* Percentage readout */}
      <div style={{
        fontSize: 11, color: '#555', fontFamily: "'Roboto', sans-serif",
        minWidth: 36, textAlign: 'right', flexShrink: 0,
      }}>
        {Math.round(t * 100)}%
      </div>
    </div>
  );
}
