import { create } from "zustand";

export const useStore = create((set, get) => ({
    authUser: null,
    authLoading: true,
    setAuthUser: (user) => set({ authUser: user, authLoading: false}),
    clearAuth: () => set({ authUser: null, authLoading: false})
}))