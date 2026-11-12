import { apiRequest } from './api.js';
import { User } from '../types/index.js';

export interface LoginResponse {
  token: string;
  user: User;
}

export async function loginApi(email: string, passwordPlain: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: passwordPlain }),
  });
}

export async function getMeApi(): Promise<User> {
  return apiRequest<User>('/auth/me', {
    method: 'GET',
  });
}

// Session alias
export async function getSessionApi(): Promise<User> {
  return getMeApi();
}

export async function logoutApi(): Promise<{ loggedOut: boolean }> {
  try {
    return await apiRequest<{ loggedOut: boolean }>('/auth/logout', {
      method: 'POST',
    });
  } finally {
    localStorage.removeItem('spar_token');
    localStorage.removeItem('spar_user');
  }
}
