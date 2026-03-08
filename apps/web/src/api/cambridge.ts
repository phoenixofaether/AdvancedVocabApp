import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AttemptResponse,
  ExerciseResponse,
  ExerciseTypeInfo,
  GenerateExerciseRequest,
  SkillProfileEntry,
  SubmitAttemptRequest,
} from '@vocabapp/shared';
import { apiClient } from './client';

export const cambridgeKeys = {
  exerciseTypes: ['cambridge', 'exercise-types'] as const,
  exercise: (id: string) => ['cambridge', 'exercise', id] as const,
  attempt: (id: string) => ['cambridge', 'attempt', id] as const,
  skillProfile: ['cambridge', 'skill-profile'] as const,
};

export const useExerciseTypes = () =>
  useQuery({
    queryKey: cambridgeKeys.exerciseTypes,
    queryFn: async () => {
      const { data } = await apiClient.get<ExerciseTypeInfo[]>('/cambridge/exercise-types');
      return data;
    },
    staleTime: Infinity, // static metadata
  });

export const useGenerateExercise = () => {
  return useMutation({
    mutationFn: async (req: GenerateExerciseRequest) => {
      const { data } = await apiClient.post<ExerciseResponse>('/cambridge/exercises', req);
      return data;
    },
  });
};

export const useExercise = (id: string) =>
  useQuery({
    queryKey: cambridgeKeys.exercise(id),
    queryFn: async () => {
      const { data } = await apiClient.get<ExerciseResponse>(`/cambridge/exercises/${id}`);
      return data;
    },
    enabled: !!id,
  });

export const useSubmitAttempt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: SubmitAttemptRequest) => {
      const { data } = await apiClient.post<AttemptResponse>('/cambridge/attempts', req);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cambridgeKeys.skillProfile });
    },
  });
};

export const useAttempt = (id: string) =>
  useQuery({
    queryKey: cambridgeKeys.attempt(id),
    queryFn: async () => {
      const { data } = await apiClient.get<AttemptResponse>(`/cambridge/attempts/${id}`);
      return data;
    },
    enabled: !!id,
  });

export const useSkillProfile = () =>
  useQuery({
    queryKey: cambridgeKeys.skillProfile,
    queryFn: async () => {
      const { data } = await apiClient.get<SkillProfileEntry[]>('/cambridge/skill-profile');
      return data;
    },
  });
