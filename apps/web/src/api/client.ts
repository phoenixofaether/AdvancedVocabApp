import axios from 'axios';
import type { AuthResponse } from '@vocabapp/shared';

const BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error as Error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        pendingRequests.push(resolve);
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      pendingRequests.forEach((resolve) => resolve(data.accessToken));
      pendingRequests = [];

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject(error as Error);
    } finally {
      isRefreshing = false;
    }
  },
);
