import type { ApiPath } from '@/utils/api';
import type { AuthUser } from '@/utils/auth';

export type IdeaTag = 'GREEN_TECH' | 'SOFTWARE' | 'HARDWARE' | 'HEALTH_TECH' | 'ED_TECH' | 'CIRCULAR_ECONOMY';
export type DevelopmentStage = 'CONCEPT' | 'PROTOTYPE' | 'MVP_LIVE';
export type IdeaStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Visibility = 'PUBLIC' | 'UPM_COMMUNITY';
export type UserRole = AuthUser['role'];

export interface IdeaSummary {
  id: string;
  title: string;
  elevatorPitch: string;
  status: IdeaStatus;
  visibility: Visibility;
  developmentStage: DevelopmentStage | null;
  tags: IdeaTag[];
  founder: AuthUser;
  createdAt: string;
  publishedAt: string | null;
}

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  displayOrder: number;
  url: ApiPath;
  uploadedAt: string;
}

export interface Idea extends IdeaSummary {
  problemStatement: string;
  solutionDescription: string;
  mvpUrl: string | null;
  feedbackEnabled: boolean;
  allowedCommenterRoles: UserRole[];
  screenshots: Attachment[];
}

export interface IdeaComment {
  id: string;
  ideaId: string;
  author: AuthUser;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface CommentList {
  count: number;
  comments: IdeaComment[];
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface IdeaBasics {
  title: string;
  elevatorPitch: string;
  problemStatement: string;
  solutionDescription: string;
}

export interface IdeaClassification {
  tags: IdeaTag[];
  developmentStage: DevelopmentStage;
}

export interface PublishIdeaRequest {
  feedbackEnabled: boolean;
  allowedCommenterRoles: UserRole[];
  visibility: Visibility;
  declarationAccepted: boolean;
}
