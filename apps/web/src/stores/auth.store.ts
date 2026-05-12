import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

interface User {
  sub: string;
  email: string;
  fullName?: string;
  roleSlug?: string;
  permissions: string[];
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  hasPermission: (perm: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { accessToken, refreshToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);

        // Decode JWT to get user info (basic decode without verify)
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        set({
          accessToken,
          isAuthenticated: true,
          user: {
            sub: payload.sub,
            email: payload.email,
            permissions: [],
          },
        });

        // Fetch full user profile
        const profile = await api.get(`/users/${payload.sub}`);
        set({
          user: {
            sub: payload.sub,
            email: payload.email,
            fullName: profile.data.fullName,
            roleSlug: profile.data.roleSlug,
            permissions: profile.data.permissions ?? [],
            avatarUrl: profile.data.avatarUrl,
          },
        });
      },

      logout: async () => {
        try {
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } catch {}
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),

      hasPermission: (perm) => {
        const { user } = get();
        return user?.permissions.includes(perm) ?? false;
      },
    }),
    {
      name: 'xbuild-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
