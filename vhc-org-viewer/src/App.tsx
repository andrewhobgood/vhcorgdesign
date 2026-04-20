import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import orgDataRaw from '../../vhc-org-data.json';
import type { OrgData } from './types';
import OrgChart from './OrgChart';
import ScorecardPanel from './ScorecardPanel';
import TimelineSlider from './TimelineSlider';
import TransitionBanner from './TransitionBanner';

const data = orgDataRaw as OrgData;

const PLAY_DURATION = 3500; // ms for 0→100%

export default function App() {
  const [t, setT] = useState(0);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [pulsingRoleId, setPulsingRoleId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playRef = useRef<{ start: number; startT: number; raf: number } | null>(null);

  // Highlighted transitions: roles that have crossed their structural-move threshold
  const [highlightedTransitions, setHighlightedTransitions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const highlighted = data.transitions
      .filter(tr => tr.highlight && tr.type === 'move' && t >= 0.5)
      .map(tr => tr.roleId);
    setHighlightedTransitions(new Set(highlighted));
  }, [t]);

  const stopPlay = useCallback(() => {
    if (playRef.current) {
      cancelAnimationFrame(playRef.current.raf);
      playRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlay = useCallback(() => {
    stopPlay();
    const startT = t >= 1 ? 0 : t;
    if (startT >= 1) return;

    setT(startT);
    setIsPlaying(true);

    const startTime = performance.now();
    const remainingFraction = 1 - startT;
    const duration = PLAY_DURATION * remainingFraction;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease in-out cubic
      const eased = progress < 0.5
        ? 4 * progress ** 3
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const newT = startT + eased * remainingFraction;
      setT(newT);
      if (progress < 1) {
        playRef.current!.raf = requestAnimationFrame(tick);
      } else {
        setT(1);
        setIsPlaying(false);
        playRef.current = null;
      }
    }

    const raf = requestAnimationFrame(tick);
    playRef.current = { start: startTime, startT, raf };
  }, [t, stopPlay]);

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) stopPlay();
    else startPlay();
  }, [isPlaying, stopPlay, startPlay]);

  const handleSliderChange = useCallback((newT: number) => {
    stopPlay();
    setT(newT);
  }, [stopPlay]);

  const handleNodeClick = useCallback((roleId: string) => {
    setSelectedRoleId(prev => prev === roleId ? null : roleId);
    setPulsingRoleId(null);
  }, []);

  const handleScorecardNavigate = useCallback((roleId: string) => {
    setSelectedRoleId(roleId);
    setPulsingRoleId(roleId);
    setTimeout(() => setPulsingRoleId(null), 1200);
  }, []);

  const handleScorecardClose = useCallback(() => {
    setSelectedRoleId(null);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: '#121212', overflow: 'hidden',
    }}>
      {/* Top header */}
      <header style={{
        padding: '12px 24px',
        borderBottom: '1px solid #1e1e1e',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        background: '#0e0e0e',
      }}>
        <div>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 18, fontWeight: 600, color: '#f6f6f4',
            margin: 0, letterSpacing: '0.5px',
          }}>
            Vosges Haut-Chocolat
          </h1>
          <div style={{
            fontSize: 10, color: '#555', fontFamily: "'Roboto', sans-serif",
            letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2,
          }}>
            2026 Organizational Design
          </div>
        </div>
        <div style={{
          fontSize: 9, color: '#444', fontFamily: "'Roboto', sans-serif",
          letterSpacing: '1px', textAlign: 'right',
        }}>
          <div>Click any role to open its scorecard</div>
          <div>← → to step · Space to play</div>
        </div>
      </header>

      {/* Timeline slider */}
      <TimelineSlider
        t={t}
        onChange={handleSliderChange}
        isPlaying={isPlaying}
        onPlayToggle={handlePlayToggle}
      />

      {/* Pillar legend */}
      <div style={{
        display: 'flex', gap: 20, padding: '8px 24px',
        borderBottom: '1px solid #1a1a1a', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {data.pillars.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, background: p.color, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: '#555', fontFamily: "'Roboto', sans-serif", letterSpacing: '0.5px' }}>
              {p.name.split('—')[0].trim()}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <div style={{
            width: 20, height: 10, border: '1px dashed #555',
            background: 'transparent', opacity: 0.7,
          }} />
          <span style={{ fontSize: 9, color: '#555', fontFamily: "'Roboto', sans-serif" }}>
            EOY Hire (2026 H2)
          </span>
        </div>
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <OrgChart
          data={data}
          t={t}
          selectedRoleId={selectedRoleId}
          pulsingRoleId={pulsingRoleId}
          onNodeClick={handleNodeClick}
          highlightedTransitions={highlightedTransitions}
        />
      </div>

      {/* Scorecard panel */}
      {selectedRoleId && (
        <ScorecardPanel
          roleId={selectedRoleId}
          data={data}
          onClose={handleScorecardClose}
          onNavigate={handleScorecardNavigate}
        />
      )}

      {/* Transition annotation banners */}
      <TransitionBanner data={data} t={t} />
    </div>
  );
}
