import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReviewCard, ReviewStats } from '@vocabapp/shared';
import { apiClient } from './client';

export const reviewKeys = {
  due: ['review', 'due'] as const,
  stats: ['review', 'stats'] as const,
};

export function useReviewDue() {
  return useQuery({
    queryKey: reviewKeys.due,
    queryFn: async () => {
      const { data } = await apiClient.get<ReviewCard[]>('/review/due');
      return data;
    },
  });
}

export function useReviewStats() {
  return useQuery({
    queryKey: reviewKeys.stats,
    queryFn: async () => {
      const { data } = await apiClient.get<ReviewStats>('/review/stats');
      return data;
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: { reviewCardId: string; quality: 1 | 3 | 4 | 5 }) => {
      await apiClient.post('/review/submit', req);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.due });
      queryClient.invalidateQueries({ queryKey: reviewKeys.stats });
    },
  });
}
