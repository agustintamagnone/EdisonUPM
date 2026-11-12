import { apiJson, apiRequest, type ApiPath } from '@/utils/api';
import { csrfHeaders } from '@/utils/auth';
import type {
  Attachment, CommentList, DevelopmentStage, Idea, IdeaBasics, IdeaClassification,
  IdeaComment, IdeaSummary, IdeaTag, PageResponse, PublishIdeaRequest,
} from '@/types';

const ideaPath = (id: string): ApiPath => `/api/ideas/${encodeURIComponent(id)}`;
const savedPath = '/api/users/me/saved-ideas';
type WriteMethod = 'POST' | 'PUT' | 'DELETE';

async function writeJson<T>(path: ApiPath, method: WriteMethod, body?: object): Promise<T> {
  const headers = await csrfHeaders();
  if (body) headers['Content-Type'] = 'application/json';
  return apiJson<T>(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

export function listIdeas(q: string, tag: IdeaTag | null, page: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), size: '12' });
  if (q.trim()) params.set('q', q.trim());
  if (tag) params.set('tag', tag);
  return apiJson<PageResponse<IdeaSummary>>(`/api/ideas?${params}`, { signal });
}

export const getTags = (signal?: AbortSignal) => apiJson<IdeaTag[]>('/api/tags', { signal });
export const getStages = (signal?: AbortSignal) => apiJson<DevelopmentStage[]>('/api/development-stages', { signal });
export const getIdea = (id: string, signal?: AbortSignal) => apiJson<Idea>(ideaPath(id), { signal });
export const getComments = (id: string, signal?: AbortSignal) => apiJson<CommentList>(`${ideaPath(id)}/comments`, { signal });
export const getAttachments = (id: string, signal?: AbortSignal) => apiJson<Attachment[]>(`${ideaPath(id)}/attachments`, { signal });
export const getSavedIdeas = (signal?: AbortSignal) => apiJson<IdeaSummary[]>(savedPath, { signal });
export const getMyIdeas = (signal?: AbortSignal) => apiJson<IdeaSummary[]>('/api/ideas/mine', { signal });

export function postComment(id: string, content: string, clientRequestId: string) {
  return writeJson<IdeaComment>(`${ideaPath(id)}/comments`, 'POST', { content, clientRequestId });
}

export async function setSavedIdea(id: string, saved: boolean) {
  await apiRequest(`${savedPath}/${encodeURIComponent(id)}`, { method: saved ? 'PUT' : 'DELETE', headers: await csrfHeaders() });
}

export function saveBasics(id: string | null, basics: IdeaBasics) {
  return id
    ? writeJson<Idea>(`${ideaPath(id)}/basics`, 'PUT', basics)
    : writeJson<Idea>('/api/ideas', 'POST', basics);
}

export const saveClassification = (id: string, data: IdeaClassification) =>
  writeJson<Idea>(`${ideaPath(id)}/classification`, 'PUT', data);

export const saveMvpLink = (id: string, mvpUrl: string) =>
  mvpUrl
    ? writeJson<Idea>(`${ideaPath(id)}/mvp-link`, 'PUT', { mvpUrl })
    : writeJson<Idea>(`${ideaPath(id)}/mvp-link`, 'DELETE');

export async function uploadAttachment(id: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return apiJson<Attachment>(`${ideaPath(id)}/attachments`, { method: 'POST', headers: await csrfHeaders(), body });
}

export async function removeAttachment(id: string, attachmentId: string) {
  await apiRequest(`${ideaPath(id)}/attachments/${encodeURIComponent(attachmentId)}`, { method: 'DELETE', headers: await csrfHeaders() });
}

export const publishIdea = (id: string, data: PublishIdeaRequest) =>
  writeJson<Idea>(`${ideaPath(id)}/publish`, 'POST', data);
export const archiveIdea = (id: string) => writeJson<Idea>(`${ideaPath(id)}/archive`, 'POST');

export const isIdeaId = (id: string) => /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
