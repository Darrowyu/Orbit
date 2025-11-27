import { create } from 'zustand';
import { Team, TeamMember } from '../types';
import { teamApi, userApi } from '../services/api';


interface TeamStore {
  currentTeam: Team | null;
  teams: Team[];
  members: TeamMember[];
  isLoading: boolean;
  fetchTeams: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  createTeam: (name: string) => Promise<Team>;
  joinByCode: (code: string) => Promise<Team>;
  joinByLink: (inviteLink: string) => Promise<Team>;
  switchTeam: (teamId: string) => Promise<void>;
  setCurrentTeam: (team: Team) => void;
  updateMemberRole: (memberId: string, role: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  regenerateCode: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  currentTeam: null,
  teams: [],
  members: [],
  isLoading: false,

  fetchTeams: async () => {
    set({ isLoading: true });
    try {
      const { data } = await teamApi.getMyTeams();
      set({ teams: data, isLoading: false });
      if (data.length && !get().currentTeam) set({ currentTeam: data[0] });
    } catch { set({ isLoading: false }); }
  },

  fetchMembers: async () => {
    try {
      const { data } = await userApi.getTeam();
      set({ members: data });
    } catch {}
  },

  createTeam: async (name) => {
    const { data } = await teamApi.create(name);
    set((s) => ({ teams: [...s.teams, data], currentTeam: data }));
    return data;
  },

  joinByCode: async (code) => {
    const { data } = await teamApi.joinByCode(code);
    set((s) => ({ teams: [...s.teams, data], currentTeam: data }));
    return data;
  },

  joinByLink: async (inviteLink) => {
    const { data } = await teamApi.joinByLink(inviteLink);
    set((s) => ({ teams: [...s.teams, data], currentTeam: data }));
    return data;
  },

  switchTeam: async (teamId) => {
    const { data } = await teamApi.switchTeam(teamId);
    set({ currentTeam: data });
    await get().fetchMembers();
  },

  setCurrentTeam: (team) => set({ currentTeam: team }),

  updateMemberRole: async (memberId, role) => {
    const team = get().currentTeam;
    if (!team) return;
    const { data } = await teamApi.updateMemberRole(team.id, memberId, role);
    set({ currentTeam: data });
    await get().fetchMembers();
  },

  removeMember: async (memberId) => {
    const team = get().currentTeam;
    if (!team) return;
    const { data } = await teamApi.removeMember(team.id, memberId);
    set({ currentTeam: data });
    await get().fetchMembers();
  },

  regenerateCode: async () => {
    const team = get().currentTeam;
    if (!team) return;
    const { data } = await teamApi.regenerateCode(team.id);
    set({ currentTeam: data });
  },
}));
