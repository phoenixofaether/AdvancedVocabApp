import { create } from 'zustand';
import type { UserProfile } from '@vocabapp/shared';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setUser: (user: UserProfile | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },
}));
