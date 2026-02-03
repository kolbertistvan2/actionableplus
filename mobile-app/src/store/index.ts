import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// Secure storage adapter for Zustand persist
const secureStorage = {
  getItem: async (name: string) => {
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
};

// Auth store
interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setToken: (token) =>
        set({ token, isAuthenticated: token !== null }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Conversation type (minimal for list display)
export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  endpoint: string;
  model?: string;
}

// Conversations store
interface ConversationsState {
  conversations: Conversation[];
  selectedConversationId: string | null;
  isLoading: boolean;
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useConversationsStore = create<ConversationsState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  isLoading: false,
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),
  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      selectedConversationId:
        state.selectedConversationId === id
          ? null
          : state.selectedConversationId,
    })),
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// App settings store
interface SettingsState {
  colorScheme: 'light' | 'dark' | 'system';
  biometricsEnabled: boolean;
  notificationsEnabled: boolean;
  setColorScheme: (scheme: SettingsState['colorScheme']) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      colorScheme: 'system',
      biometricsEnabled: false,
      notificationsEnabled: true,
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
      setNotificationsEnabled: (notificationsEnabled) =>
        set({ notificationsEnabled }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => secureStorage),
    }
  )
);
