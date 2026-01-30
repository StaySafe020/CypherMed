import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'patient' | 'doctor' | 'nurse' | 'hospital_admin' | 'insurer' | null;
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected';

interface UserProfile {
  walletAddress: string;
  role: UserRole;
  name?: string;
  email?: string;
  licenseNumber?: string;
  specialty?: string;
  institution?: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

interface UserState {
  // Current user data
  profile: UserProfile | null;
  isFirstTime: boolean;
  
  // Actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setRole: (role: UserRole) => void;
  setVerificationStatus: (status: VerificationStatus) => void;
  clearProfile: () => void;
  
  // Helpers
  isProvider: () => boolean;
  isVerified: () => boolean;
  needsVerification: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      profile: null,
      isFirstTime: true,

      setProfile: (profile) => set({ profile, isFirstTime: false }),

      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null
      })),

      setRole: (role) => set((state) => ({
        profile: state.profile ? { ...state.profile, role } : null
      })),

      setVerificationStatus: (status) => set((state) => ({
        profile: state.profile ? { ...state.profile, verificationStatus: status } : null
      })),

      clearProfile: () => set({ profile: null, isFirstTime: true }),

      isProvider: () => {
        const role = get().profile?.role;
        return role === 'doctor' || role === 'nurse' || role === 'hospital_admin' || role === 'insurer';
      },

      isVerified: () => get().profile?.verificationStatus === 'verified',

      needsVerification: () => {
        const state = get();
        return state.isProvider() && state.profile?.verificationStatus !== 'verified';
      },
    }),
    {
      name: 'cyphermed-user',
    }
  )
);
