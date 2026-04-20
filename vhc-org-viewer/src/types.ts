export interface Initiative {
  priority: number;
  name: string;
  desiredResult: string;
  successMetric: string;
  coachFeedback: string | null;
}

export interface RoleState {
  exists: boolean;
  parentId: string | null;
  title?: string;
  directSupports?: string[];
  note?: string;
}

export interface Role {
  id: string;
  tabNumber: number | null;
  title: string;
  shortTitle: string;
  pillar: string;
  currentHolder: string | null;
  holderStatus: 'filled' | 'tbd' | 'eoy-hire';
  location: string | null;
  purposeOfRole: string | null;
  jobDescription: string | null;
  note: string | null;
  coachId: string | null;
  directSupports: string[];
  scorecardRef: string | null;
  hasScorecard: boolean;
  initiatives: Initiative[];
  skills: string[];
  currentState: RoleState;
  proposedState: RoleState;
}

export interface Transition {
  roleId: string;
  type: 'move' | 'new' | 'remove' | 'rename' | 'restructure';
  description: string;
  annotation: string | null;
  highlight: boolean;
  implementationPhase: number | null;
}

export interface Pillar {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface OrgData {
  metadata: { title: string; version: string; lastUpdated: string };
  pillars: Pillar[];
  roles: Role[];
  transitions: Transition[];
  implementationSteps: { phase: number; description: string; roleId: string | null }[];
}

export interface LayoutNode {
  role: Role;
  x: number;
  y: number;
  width: number;
  height: number;
}
