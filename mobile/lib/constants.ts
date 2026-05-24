import { Department } from '../types';

export const COLORS = {
  bg:         '#fafaf9',
  surface:    '#ffffff',
  surface2:   '#f5f5f4',
  ink:        '#1c1917',
  inkSoft:    '#57534e',
  inkMute:    '#a8a29e',
  rule:       '#e7e5e4',
  ruleStrong: '#d6d3d1',
  accent:     '#0c4a6e',
  accentSoft: '#f0f9ff',
  done:       '#15803d',
  doneSoft:   '#f0fdf4',
  warn:       '#c2410c',
  warnSoft:   '#fff7ed',
  alert:      '#b91c1c',
  alertSoft:  '#fef2f2',
};

export const DEPT_CONFIG: Record<Department, { label: string; color: string; soft: string; icon: string }> = {
  bridge:   { label: 'Bridge',      color: '#1e3a8a', soft: '#eff6ff', icon: 'compass' },
  deck:     { label: 'Deck',        color: '#0c4a6e', soft: '#f0f9ff', icon: 'anchor' },
  engine:   { label: 'Engineering', color: '#991b1b', soft: '#fef2f2', icon: 'settings' },
  interior: { label: 'Interior',    color: '#6b21a8', soft: '#faf5ff', icon: 'star' },
  galley:   { label: 'Galley',      color: '#854d0e', soft: '#fefce8', icon: 'restaurant' },
  eto:      { label: 'ETO',         color: '#115e59', soft: '#f0fdfa', icon: 'wifi' },
};

export const CREW_COLORS = [
  '#16a34a', '#0891b2', '#7c3aed', '#ec4899',
  '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6',
];

export const TODAY = new Date().toISOString().split('T')[0];
