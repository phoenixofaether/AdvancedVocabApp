import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { VocabSet, VocabEntry } from '@vocabapp/shared';
import { apiClient } from './client';

export const setKeys = {
  all: ['vocab-sets'] as const,
  detail: (id: string) => ['vocab-sets', id] as const,
  entries: (id: string) => ['vocab-sets', id, 'entries'] as const,
};

export function useVocabSets() {
  return useQuery({
    queryKey: setKeys.all,
    queryFn: async () => {
      const { data } = await apiClient.get<VocabSet[]>('/vocab-sets');
      return data;
    },
  });
}

export function useVocabSet(id: string) {
  return useQuery({
    queryKey: setKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get<VocabSet>(`/vocab-sets/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useVocabSetEntries(setId: string) {
  return useQuery({
    queryKey: setKeys.entries(setId),
    queryFn: async () => {
      const { data } = await apiClient.get<VocabEntry[]>(`/vocab-sets/${setId}/entries`);
      return data;
    },
    enabled: !!setId,
  });
}

export function useCreateVocabSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: { name: string; description?: string; targetLanguage?: string }) => {
      const { data } = await apiClient.post<VocabSet>('/vocab-sets', req);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setKeys.all });
    },
  });
}

export function useUpdateVocabSet(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: { name: string; description?: string }) => {
      const { data } = await apiClient.put<VocabSet>(`/vocab-sets/${id}`, req);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setKeys.all });
      queryClient.invalidateQueries({ queryKey: setKeys.detail(id) });
    },
  });
}

export function useDeleteVocabSet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/vocab-sets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setKeys.all });
    },
  });
}

export function useAddEntriesToSet(setId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      await apiClient.post(`/vocab-sets/${setId}/entries`, { entryIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setKeys.entries(setId) });
      queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
      queryClient.invalidateQueries({ queryKey: setKeys.all });
    },
  });
}

export function useRemoveEntryFromSet(setId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      await apiClient.delete(`/vocab-sets/${setId}/entries/${entryId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: setKeys.entries(setId) });
      queryClient.invalidateQueries({ queryKey: setKeys.detail(setId) });
      queryClient.invalidateQueries({ queryKey: setKeys.all });
    },
  });
}
