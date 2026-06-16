import { create } from 'zustand'

const useAppStore = create((set) => ({
  // Active module: 'crm' | 'intel'
  activeModule: 'crm',
  setActiveModule: (module) => set({ activeModule: module }),

  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // KPI passcode gate
  kpiUnlocked: false,
  setKpiUnlocked: (val) => set({ kpiUnlocked: val }),

  // Revenue passcode gate
  revenueUnlocked: false,
  setRevenueUnlocked: (val) => set({ revenueUnlocked: val }),

  // Global search
  searchOpen: false,
  setSearchOpen: (val) => set({ searchOpen: val }),

  // Notifications
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications] })),
  clearNotifications: () => set({ notifications: [] }),
}))

export default useAppStore
