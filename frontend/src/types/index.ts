export type IndustryCategory =
  | "Green Tech"
  | "Software"
  | "Hardware"
  | "HealthTech"
  | "EdTech"
  | "Circular Economy"
  | "AgriTech";

export type IdeaStage = "Idea" | "Prototype" | "MVP" | "Traction";

export type ReviewerRole = "Professor" | "Peer" | "Professional" | "Founder";

export interface IdeaMetric {
  id: string;
  value: string;
  label: string;
}

export interface FeedbackCommentItem {
  id: string;
  ideaSlug: string;
  authorName: string;
  authorInitials: string;
  role: ReviewerRole;
  timeLabel: string;
  comment: string;
  helpfulCount: number;
  isNew?: boolean;
}

export interface FounderInfo {
  name: string;
  initials: string;
  schoolAndYear: string;
  fullDegreeAndSchool: string;
  bio: string;
}

export interface Idea {
  id: string;
  slug: string;
  title: string;
  elevatorPitch: string;
  problemStatement: string;
  description: string;
  industries: IndustryCategory[];
  stage: IdeaStage;
  stageLabel: string;
  coverImage?: string;
  coverImages?: string[];
  isAnonymous?: boolean;
  mvpUrl?: string;
  metrics: IdeaMetric[];
  founder: FounderInfo;
  lookingFor: string[];
  viewsCount: number;
  savesCount: number;
  helpfulCount: number;
  createdAt: string;
}
