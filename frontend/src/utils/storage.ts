import { Idea, FeedbackCommentItem } from '@/types';
import { INITIAL_IDEAS, INITIAL_COMMENTS, DEMO_FOUNDER } from '@/data/mockData';

const IDEAS_STORAGE_KEY = 'edison_upm_custom_ideas_v1';
const COMMENTS_STORAGE_KEY = 'edison_upm_comments_v1';
const RATINGS_STORAGE_KEY = 'edison_upm_ratings_v1';

export interface IdeaRatingSummary {
  count: number;
  average: number;
  userRating: number | null;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'idea';
}

export function getCustomIdeas(): Idea[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(IDEAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getIdeas(): Idea[] {
  const custom = getCustomIdeas();
  // Custom newly published ideas appear alongside initial WattWise idea
  return [...INITIAL_IDEAS, ...custom];
}

export function getIdeaBySlug(slug: string): Idea | undefined {
  const all = getIdeas();
  return all.find((item) => item.slug.toLowerCase() === slug.toLowerCase());
}

export interface CreateIdeaInput {
  title: string;
  elevatorPitch: string;
  problemStatement: string;
  description: string;
  industries: Idea['industries'];
  stage: Idea['stage'];
  mvpUrl?: string;
  coverImage?: string;
  coverImages?: string[];
  isAnonymous: boolean;
}

export function savePublishedIdea(input: CreateIdeaInput): Idea {
  const existingIdeas = getIdeas();
  const baseSlug = slugify(input.title);
  let candidateSlug = baseSlug;
  let counter = 2;

  while (existingIdeas.some((idea) => idea.slug.toLowerCase() === candidateSlug.toLowerCase())) {
    candidateSlug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const stageLabel =
    input.stage === 'MVP'
      ? 'MVP live'
      : input.stage === 'Idea'
      ? 'Idea stage'
      : input.stage;

  const newIdea: Idea = {
    id: `idea-${Date.now()}`,
    slug: candidateSlug,
    title: input.title.trim(),
    elevatorPitch: input.elevatorPitch.trim(),
    problemStatement: input.problemStatement.trim(),
    description: input.description.trim(),
    industries: input.industries.length > 0 ? input.industries : ['Green Tech'],
    stage: input.stage,
    stageLabel,
    mvpUrl: input.mvpUrl?.trim() ? input.mvpUrl.trim() : undefined,
    coverImage: input.coverImages?.[0] || input.coverImage || undefined,
    coverImages: input.coverImages?.length ? input.coverImages : undefined,
    metrics: [],
    lookingFor: [
      'Pricing feedback',
      'Early testers from UPM schools',
      'Product & UX feedback',
      'UPM mentors & labs',
    ],
    founder: DEMO_FOUNDER,
    isAnonymous: input.isAnonymous,
    createdAt: new Date().toISOString(),
    viewsCount: 1,
    savesCount: 0,
    helpfulCount: 0,
  };

  if (!isBrowser()) {
    throw new Error('Ideas can only be published from a browser.');
  }

  try {
    const currentCustom = getCustomIdeas();
    window.localStorage.setItem(
      IDEAS_STORAGE_KEY,
      JSON.stringify([...currentCustom, newIdea])
    );
  } catch {
    throw new Error('Your idea could not be saved in this browser. Try smaller images or free up storage.');
  }

  return newIdea;
}

export function revealIdeaFounder(slug: string): Idea {
  if (!isBrowser()) {
    throw new Error('This action is only available in a browser.');
  }

  const ideas = getCustomIdeas();
  const ideaIndex = ideas.findIndex((idea) => idea.slug.toLowerCase() === slug.toLowerCase());
  if (ideaIndex === -1) {
    throw new Error('This idea is not available in this browser.');
  }

  const revealedIdea = { ...ideas[ideaIndex], isAnonymous: false };
  ideas[ideaIndex] = revealedIdea;

  try {
    window.localStorage.setItem(IDEAS_STORAGE_KEY, JSON.stringify(ideas));
  } catch {
    throw new Error('Your name could not be revealed because this browser could not save the change.');
  }

  return revealedIdea;
}

function getStoredRatings(): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(RATINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, rating]) =>
          typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
      )
    );
  } catch {
    return {};
  }
}

export function getIdeaRatingSummary(slug: string): IdeaRatingSummary {
  const rating = getStoredRatings()[slug.toLowerCase()];
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { count: 0, average: 0, userRating: null };
  }
  return { count: 1, average: rating, userRating: rating };
}

export function rateIdea(slug: string, rating: number): IdeaRatingSummary {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Choose a rating from 1 to 5.');
  }
  if (!isBrowser()) {
    throw new Error('Ratings can only be saved from a browser.');
  }

  const ratings = getStoredRatings();
  ratings[slug.toLowerCase()] = rating;
  try {
    window.localStorage.setItem(RATINGS_STORAGE_KEY, JSON.stringify(ratings));
  } catch {
    throw new Error('Your rating could not be saved in this browser.');
  }
  return { count: 1, average: rating, userRating: rating };
}

function getStoredCommentsMap(): Record<string, FeedbackCommentItem[]> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getCommentsForIdea(slug: string): FeedbackCommentItem[] {
  const normalizedSlug = slug.toLowerCase();
  const initial = INITIAL_COMMENTS[normalizedSlug] || [];
  const storedMap = getStoredCommentsMap();
  const custom = storedMap[normalizedSlug] || [];
  return [...custom, ...initial];
}

export function getCommentCount(slug: string): number {
  return getCommentsForIdea(slug).length;
}

export function addCommentToIdea(
  slug: string,
  commentText: string,
  isAnonymous = false
): FeedbackCommentItem {
  const normalizedSlug = slug.toLowerCase();
  const newComment: FeedbackCommentItem = {
    id: `comment-${Date.now()}`,
    ideaSlug: normalizedSlug,
    authorName: isAnonymous ? 'UPM Community member' : DEMO_FOUNDER.name,
    authorInitials: isAnonymous ? 'UP' : DEMO_FOUNDER.initials,
    role: 'Peer',
    timeLabel: '· Just now',
    comment: commentText.trim(),
    helpfulCount: 0,
    isNew: true,
  };

  if (isBrowser()) {
    try {
      const storedMap = getStoredCommentsMap();
      const existingForSlug = storedMap[normalizedSlug] || [];
      storedMap[normalizedSlug] = [newComment, ...existingForSlug];
      window.localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(storedMap));
    } catch {
      // Ignore quota errors
    }
  }

  return newComment;
}
