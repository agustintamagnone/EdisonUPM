import type { DevelopmentStage, IdeaSummary, IdeaTag } from '@/types';

export type TicketSize = 'UNDER_10K' | '10K_50K' | '50K_150K' | 'OVER_150K';
export type HelpType = 'FUNDING' | 'MENTORING' | 'PILOT_CUSTOMER' | 'NETWORKING';

export interface InvestorPreferences {
  tags: IdeaTag[];
  stages: DevelopmentStage[];
  ticketSize: TicketSize;
  helpTypes: HelpType[];
}

export const DEFAULT_INVESTOR_PREFERENCES: InvestorPreferences = {
  tags: ['GREEN_TECH', 'SOFTWARE', 'CIRCULAR_ECONOMY'],
  stages: ['PROTOTYPE', 'MVP_LIVE'],
  ticketSize: '10K_50K',
  helpTypes: ['FUNDING', 'MENTORING', 'NETWORKING'],
};

const ideaTags: IdeaTag[] = [
  'GREEN_TECH', 'SOFTWARE', 'HARDWARE', 'HEALTH_TECH', 'ED_TECH', 'CIRCULAR_ECONOMY',
];
const developmentStages: DevelopmentStage[] = ['CONCEPT', 'PROTOTYPE', 'MVP_LIVE'];
const ticketSizes: TicketSize[] = ['UNDER_10K', '10K_50K', '50K_150K', 'OVER_150K'];
const helpTypes: HelpType[] = ['FUNDING', 'MENTORING', 'PILOT_CUSTOMER', 'NETWORKING'];

function validValues<T extends string>(values: string[], allowed: T[]): T[] {
  return values.reduce<T[]>((result, value) => {
    const validValue = allowed.find((candidate) => candidate === value);
    if (validValue) result.push(validValue);
    return result;
  }, []);
}

export function readInvestorPreferences(params: URLSearchParams): InvestorPreferences {
  const ticketSize = params.get('ticket');
  const validTicketSize = ticketSizes.find((value) => value === ticketSize);
  return {
    tags: validValues(params.getAll('tags'), ideaTags),
    stages: validValues(params.getAll('stages'), developmentStages),
    ticketSize: validTicketSize ?? DEFAULT_INVESTOR_PREFERENCES.ticketSize,
    helpTypes: validValues(params.getAll('help'), helpTypes),
  };
}

export function investorPreferencesHref(path: '/pitch-board' | '/investor-interests', preferences: InvestorPreferences) {
  const params = new URLSearchParams({ sort: 'match' });
  preferences.tags.forEach((tag) => params.append('tags', tag));
  preferences.stages.forEach((stage) => params.append('stages', stage));
  params.set('ticket', preferences.ticketSize);
  preferences.helpTypes.forEach((help) => params.append('help', help));
  return `${path}?${params.toString()}`;
}

export function rankIdeas(ideas: IdeaSummary[], preferences: InvestorPreferences): IdeaSummary[] {
  const selectedTags = new Set(preferences.tags);
  const selectedStages = new Set(preferences.stages);
  const score = (idea: IdeaSummary) =>
    idea.tags.filter((tag) => selectedTags.has(tag)).length * 2
    + (idea.developmentStage && selectedStages.has(idea.developmentStage) ? 1 : 0);

  return [...ideas].sort((first, second) =>
    score(second) - score(first)
    || Date.parse(second.publishedAt ?? '') - Date.parse(first.publishedAt ?? '')
    || first.id.localeCompare(second.id));
}
