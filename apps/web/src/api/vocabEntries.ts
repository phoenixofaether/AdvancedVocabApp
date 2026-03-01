import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VocabEntry } from '@vocabapp/shared';
import { apiClient } from './client';
import { reviewKeys } from './review';

export const entryKeys = {
  detail: (id: string) => ['vocab-entries', id] as const,
};

export function useVocabEntry(id: string) {
  return useQuery({
    queryKey: entryKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<VocabEntry>(`/vocab-entries/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVocabEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      word: string;
      language?: string;
      customDefinition?: string;
      customPhonetic?: string;
    }) => {
      const { data } = await apiClient.post<VocabEntry>('/vocab-entries', req);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(entryKeys.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: reviewKeys.due });
      queryClient.invalidateQueries({ queryKey: reviewKeys.stats });
    },
  });
}

export function useUpdateVocabEntry(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      customDefinition?: string | null;
      customPhonetic?: string | null;
    }) => {
      const { data } = await apiClient.put<VocabEntry>(`/vocab-entries/${id}`, req);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(entryKeys.detail(id), data);
    },
  });
}

export function useDeleteVocabEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      await apiClient.delete(`/vocab-entries/${entryId}`);
    },
    onSuccess: (_data, entryId) => {
      queryClient.removeQueries({ queryKey: entryKeys.detail(entryId) });
    },
  });
}
