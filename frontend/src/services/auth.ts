import apiClient from './api';
import type { LoginPayload, RegisterPayload, TokenResponse, User } from '../types';

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await apiClient.post<TokenResponse>('/api/auth/login', payload);
    return data;
  },

  async register(payload: RegisterPayload): Promise<User> {
    const { data } = await apiClient.post<User>('/api/auth/register', payload);
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get<User>('/api/auth/me');
    return data;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getStoredToken(): string | null {
    return localStorage.getItem('access_token');
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  storeSession(token: string, user: User) {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
};
