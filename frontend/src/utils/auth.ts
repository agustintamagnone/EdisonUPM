import { ApiError, apiJson, apiRequest } from '@/utils/api';

export type AccountType = 'UPM_ACCOUNT' | 'EXTERNAL_USER';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'PROFESSOR' | 'ADMINISTRATOR' | 'INVESTOR';
}

export interface LoginCredentials {
  email: string;
  password: string;
  accountType: AccountType;
}

interface CsrfToken {
  token: string;
  headerName: string;
  parameterName: string;
}

export async function csrfHeaders() {
  const { headerName, token } = await apiJson<CsrfToken>('/api/auth/csrf');
  return { [headerName]: token };
}

export async function getCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    return await apiJson<AuthUser>('/api/users/me', { signal });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export async function login({ email, password, accountType }: LoginCredentials): Promise<AuthUser> {
  return apiJson<AuthUser>('/api/auth/login', {
    method: 'POST',
    headers: {
      ...(await csrfHeaders()),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ email, password, accountType }),
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
    headers: await csrfHeaders(),
  });
}
