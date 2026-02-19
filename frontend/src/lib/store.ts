// Global Zustand store for application state
import { create } from "zustand";

interface Project {
    id: string;
    name: string;
    description?: string;
    category_id?: string;
    color: string;
}

interface Conversation {
    id: string;
    title: string;
    is_flagged: boolean;
    is_saved: boolean;
    llm_provider: string;
    created_at: string;
}

interface Message {
    id: string;
    role: "human" | "ai" | "system";
    content: string;
    has_interactive: boolean;
    interactive_html_url?: string;
    created_at: string;
}

interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    planTier: "free" | "pro" | "team";
}

interface AppState {
    // User
    user: UserProfile | null;
    setUser: (user: UserProfile | null) => void;

    // Projects
    projects: Project[];
    setProjects: (projects: Project[]) => void;
    activeProject: Project | null;
    setActiveProject: (project: Project | null) => void;

    // Conversations
    conversations: Conversation[];
    setConversations: (conversations: Conversation[]) => void;
    activeConversation: Conversation | null;
    setActiveConversation: (conversation: Conversation | null) => void;

    // Messages
    messages: Message[];
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;

    // UI State
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    selectedProvider: string;
    setSelectedProvider: (provider: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    // User
    user: null,
    setUser: (user) => set({ user }),

    // Projects
    projects: [],
    setProjects: (projects) => set({ projects }),
    activeProject: null,
    setActiveProject: (activeProject) => set({ activeProject }),

    // Conversations
    conversations: [],
    setConversations: (conversations) => set({ conversations }),
    activeConversation: null,
    setActiveConversation: (activeConversation) => set({ activeConversation }),

    // Messages
    messages: [],
    setMessages: (messages) => set({ messages }),
    addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

    // UI State
    sidebarOpen: true,
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    selectedProvider: "gemini",
    setSelectedProvider: (selectedProvider) => set({ selectedProvider }),
    isLoading: false,
    setIsLoading: (isLoading) => set({ isLoading }),
}));
