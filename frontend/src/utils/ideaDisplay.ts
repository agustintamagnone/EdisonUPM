import type { DevelopmentStage, IdeaStatus, IdeaTag, UserRole, Visibility } from '@/types';

export const TAG_LABELS: Record<IdeaTag, string> = {
  GREEN_TECH: 'Green Tech',
  SOFTWARE: 'Software',
  HARDWARE: 'Hardware',
  HEALTH_TECH: 'HealthTech',
  ED_TECH: 'EdTech',
  CIRCULAR_ECONOMY: 'Circular Economy',
};

export const STAGE_LABELS: Record<DevelopmentStage, string> = {
  CONCEPT: 'Idea',
  PROTOTYPE: 'Prototype',
  MVP_LIVE: 'MVP live',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'UPM Student',
  PROFESSOR: 'Professor',
  ADMINISTRATOR: 'Administrator',
  INVESTOR: 'Investor',
};

export const STATUS_LABELS: Record<IdeaStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  PUBLIC: 'Public',
  UPM_COMMUNITY: 'UPM community',
};

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value));
