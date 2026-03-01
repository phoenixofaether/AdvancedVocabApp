import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfile } from '@vocabapp/shared';
import { apiClient } from './client';
import { authKeys } from './auth';

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: { voicePreference?: string | null; preferredLanguage?: string }) => {
      const { data } = await apiClient.put<UserProfile>('/users/me', req);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me, data);
    },
  });
}
