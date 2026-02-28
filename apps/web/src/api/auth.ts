import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponse, UserProfile } from '@vocabapp/shared';
import { apiClient } from './client';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

export function useCurrentUser() {
  return useQuery<UserProfile>({
    queryKey: authKeys.me,
    queryFn: async () => {
      const { data } = await apiClient.get<UserProfile>('/auth/me');
      return data;
    },
    enabled: !!localStorage.getItem('accessToken'),
    retry: false,
  });
}

export function useGoogleLogin() {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, Error, string>({
    mutationFn: async (idToken: string) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/google', { idToken });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(authKeys.me, data.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    },
    onSettled: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      queryClient.clear();
    },
  });
}
