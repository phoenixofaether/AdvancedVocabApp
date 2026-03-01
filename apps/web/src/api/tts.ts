import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export const ttsKeys = {
  voices: (language: string) => ['tts', 'voices', language] as const,
};

export function useAvailableVoices(language = 'en') {
  return useQuery({
    queryKey: ttsKeys.voices(language),
    queryFn: async () => {
      const { data } = await apiClient.get<string[]>(`/tts/voices?language=${language}`);
      return data;
    },
    staleTime: 1000 * 60 * 60, // voices rarely change
  });
}
