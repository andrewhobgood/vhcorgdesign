import React, { useEffect, useRef } from 'react';
import type { OrgData, Role } from './types';
import { PILLAR_COLORS } from './layout';

interface Props {
  roleId: string | null;
  data: OrgData;
  onClose: () => void;
  onNavigate: (roleId: string) => void;
}

const PILLAR_NAMES: Record<string, string> = {
  leadership: 'Leadership',
  meaning: 'Meaning — Brand & Product',
  making: 'Making — Operations',
  selling: 'Selling — Sales',
  connective: 'Connective Services',
};

function getEffectiveScorecard(role: Role, data: OrgData): { role: Role; inherited: boolean; inheritedFrom: string | null } {
  if (role.scorecardRef) {
    const ref = data.roles.find(r => r.id === role.scorecardRef);
    if (ref) return { role: ref, inherited: true, inheritedFrom: ref.title };
  }
  return { role, inherited: false, inheritedFrom: null };
}

function NavLink({ label, roleId, onClick }: { label: string; roleId: string; onClick: (id: string) => void }) {
  return (
    <button
      onClick={() => onClick(roleId)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#c4a8e0', fontSize: 12, fontFamily: "'Montserrat', sans-serif",
        padding: '2px 0', textDecoration: 'underline', textUnderlineOffset: 3,
      }}
    >
      → {label}
    </button>
  );
}

export default function ScorecardPanel({ roleId, data, onClose, onNavigate }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const role = roleId ? data.roles.find(r => r.id === roleId) : null;

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Scroll panel to top on role change
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [roleId]);

  if (!role) return null;

  const { role: card, inherited, inheritedFrom } = getEffectiveScorecard(role, data);
  const pillarColor = PILLAR_COLORS[role.pillar] || '#38165f';
  const coach = card.coachId ? data.roles.find(r => r.id === card.coachId) : null;
  const directSupports = card.directSupports
    .map(id => data.roles.find(r => r.id === id))
    .filter(Boolean) as Role[];

  const isUnderReview = role.note?.includes('SCORECARD UNDER REVIEW') || role.id === 'cust-tech-ops';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 40, transition: 'opacity 0.25s',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(480px, 42vw)',
          background: '#1a1a1a',
          borderLeft: `1px solid ${pillarColor}`,
          zIndex: 50,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          animation: 'slideIn 0.25s ease-out',
        }}
      >
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
          @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(196,168,224,0); } 50% { box-shadow: 0 0 0 6px rgba(196,168,224,0.3); } }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid #2a2a2a`,
          position: 'sticky', top: 0, background: '#1a1a1a', zIndex: 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              {isUnderReview && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#2a1f00', border: '1px solid #B8860B',
                  color: '#B8860B', fontSize: 10, padding: '3px 8px',
                  marginBottom: 10, fontFamily: "'Roboto', sans-serif",
                  letterSpacing: '0.5px',
                }}>
                  ⚠ SCORECARD UNDER REVIEW
                </div>
              )}
              {inherited && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#1a1a2e', border: `1px solid ${pillarColor}`,
                  color: '#c4a8e0', fontSize: 10, padding: '3px 8px',
                  marginBottom: 10, fontFamily: "'Roboto', sans-serif",
                  letterSpacing: '0.5px',
                }}>
                  Uses {inheritedFrom} scorecard
                </div>
              )}
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 20, fontWeight: 600, color: '#f6f6f4', margin: 0, lineHeight: 1.2,
              }}>
                {role.title}
              </h2>
              {role.title !== card.title && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{card.title}</div>
              )}
              <div style={{
                marginTop: 6, fontSize: 10, color: pillarColor,
                fontFamily: "'Roboto', sans-serif", letterSpacing: '1px', fontWeight: 500,
              }}>
                {card.tabNumber ? `Tab #${String(card.tabNumber).padStart(2, '0')} · ` : ''}
                {PILLAR_NAMES[role.pillar]}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid #333', color: '#888',
                cursor: 'pointer', padding: '4px 10px', fontSize: 14,
                fontFamily: "'Roboto', sans-serif", flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>

          {/* Identity */}
          <Section label="Identity">
            {card.purposeOfRole && (
              <Field label="Purpose">{card.purposeOfRole}</Field>
            )}
            {role.currentHolder && (
              <Field label="Team Member">
                <span style={{ color: role.holderStatus === 'tbd' ? '#888' : '#f6f6f4' }}>
                  {role.holderStatus === 'tbd' ? '[TBD — new hire]' : role.currentHolder}
                  {role.holderStatus === 'eoy-hire' && <span style={{ color: '#B8860B', marginLeft: 6 }}>2026 H2</span>}
                </span>
              </Field>
            )}
            {role.location && (
              <Field label="Location">{role.location}</Field>
            )}
            {coach && (
              <Field label="Coach">
                <NavLink label={coach.title} roleId={coach.id} onClick={onNavigate} />
              </Field>
            )}
            {directSupports.length > 0 && (
              <Field label="Direct Supports">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {directSupports.map(ds => (
                    <NavLink key={ds.id} label={ds.title} roleId={ds.id} onClick={onNavigate} />
                  ))}
                </div>
              </Field>
            )}
          </Section>

          {/* Initiatives */}
          {card.initiatives.length > 0 && (
            <Section label={`2026 Outcomes (${card.initiatives.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {card.initiatives.map(init => (
                  <div key={init.priority} style={{ paddingLeft: 12, borderLeft: `2px solid ${pillarColor}` }}>
                    <div style={{
                      fontSize: 11, fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 600, color: '#f6f6f4', marginBottom: 6,
                    }}>
                      {init.priority}. {init.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
                      <span style={{ color: '#666', fontWeight: 600, fontSize: 9, letterSpacing: '0.5px' }}>RESULT </span>
                      {init.desiredResult}
                    </div>
                    <div style={{ fontSize: 11, color: '#999' }}>
                      <span style={{ color: '#666', fontWeight: 600, fontSize: 9, letterSpacing: '0.5px' }}>METRIC </span>
                      {init.successMetric}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Skills */}
          {card.skills.length > 0 && (
            <Section label="Skills & Traits">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {card.skills.map((skill, i) => (
                  <div key={i} style={{
                    fontSize: 11, color: '#ccc', display: 'flex', alignItems: 'flex-start', gap: 8,
                  }}>
                    <span style={{ color: pillarColor, flexShrink: 0, marginTop: 1 }}>▪</span>
                    {skill}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Notes */}
          {card.note && (
            <Section label="Notes">
              <p style={{ fontSize: 11, color: '#777', fontStyle: 'italic', margin: 0, lineHeight: 1.6 }}>
                {card.note}
              </p>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 9, letterSpacing: '1.5px', color: '#555',
        fontFamily: "'Roboto', sans-serif", fontWeight: 600,
        textTransform: 'uppercase', marginBottom: 10,
        paddingBottom: 6, borderBottom: '1px solid #222',
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 11, lineHeight: 1.5 }}>
      <span style={{
        color: '#555', fontFamily: "'Roboto', sans-serif",
        minWidth: 90, flexShrink: 0, fontSize: 10, paddingTop: 1,
      }}>
        {label}
      </span>
      <span style={{ color: '#ccc', flex: 1 }}>{children}</span>
    </div>
  );
}
