import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type RoleMode = 'super_admin' | 'organizer' | 'admin' | 'user';

export interface BranchOption {
  id: string;
  name: string;
  organizationId: string;
  isActive: boolean;
}

export interface OrgOption {
  id: string;
  name: string;
}

interface TenantState {
  // Actual authenticated role
  actualRole: RoleMode;
  // Active role (either native or simulated)
  activeRoleMode: RoleMode;
  selectedOrganizationId: string;
  selectedBranchId: string | 'all';
  selectedBranchIds: string[]; // Array of branch UUIDs or ['all']
  organizations: OrgOption[];
  branches: BranchOption[];
  isLoading: boolean;

  // Simulation State
  isSimulating: boolean;
  simulatedOrgName?: string;
  simulatedBranchName?: string;

  // Actions
  setRoleMode: (mode: RoleMode) => void;
  setSelectedOrganization: (orgId: string) => void;
  setSelectedBranch: (branchId: string | 'all') => void;
  setSelectedBranches: (branchIds: string[]) => void;
  toggleBranchSelection: (branchId: string) => void;
  selectAllBranches: () => void;
  setTenancyData: (data: {
    actualRole: RoleMode;
    activeRoleMode?: RoleMode;
    selectedOrganizationId?: string;
    selectedBranchId?: string | 'all';
    selectedBranchIds?: string[];
    organizations: OrgOption[];
    branches: BranchOption[];
  }) => void;
  startSimulation: (params: {
    role: RoleMode;
    orgId: string;
    orgName: string;
    branchId: string | 'all';
    branchName: string;
  }) => void;
  exitSimulation: () => void;
  updateSimulatedRole: (role: RoleMode) => void;
  updateSimulatedBranch: (branchId: string | 'all', branchName: string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      actualRole: 'super_admin',
      activeRoleMode: 'super_admin',
      selectedOrganizationId: '00000000-0000-0000-0000-000000000001',
      selectedBranchId: 'all',
      selectedBranchIds: ['all'],
      organizations: [],
      branches: [],
      isLoading: false,

      isSimulating: false,
      simulatedOrgName: undefined,
      simulatedBranchName: undefined,

      setRoleMode: (mode) => set({ activeRoleMode: mode }),

      setSelectedOrganization: (orgId) =>
        set({ selectedOrganizationId: orgId, selectedBranchId: 'all', selectedBranchIds: ['all'] }),

      setSelectedBranch: (branchId) =>
        set({
          selectedBranchId: branchId,
          selectedBranchIds: branchId === 'all' ? ['all'] : [branchId],
        }),

      setSelectedBranches: (branchIds) =>
        set((state) => {
          if (!branchIds || branchIds.length === 0 || branchIds.includes('all')) {
            return { selectedBranchId: 'all', selectedBranchIds: ['all'] };
          }
          if (state.branches.length > 0 && branchIds.length === state.branches.length) {
            return { selectedBranchId: 'all', selectedBranchIds: ['all'] };
          }
          return {
            selectedBranchId: branchIds[0] || 'all',
            selectedBranchIds: branchIds,
          };
        }),

      toggleBranchSelection: (branchId) =>
        set((state) => {
          if (branchId === 'all') {
            return { selectedBranchId: 'all', selectedBranchIds: ['all'] };
          }

          let currentIds = state.selectedBranchIds;
          // If currently in 'all' mode, toggling a branch selects all EXCEPT that branch (or if starting fresh, selects only that branch if was all)
          if (currentIds.includes('all')) {
            // When currently on all branches, clicking a checkbox toggles to all existing branches minus this one, or just this one
            const allAvailableIds = state.branches.map((b) => b.id);
            if (allAvailableIds.length <= 1) {
              return { selectedBranchId: branchId, selectedBranchIds: [branchId] };
            }
            const filtered = allAvailableIds.filter((id) => id !== branchId);
            return {
              selectedBranchId: filtered[0] || 'all',
              selectedBranchIds: filtered.length > 0 ? filtered : ['all'],
            };
          }

          let nextIds: string[];
          if (currentIds.includes(branchId)) {
            nextIds = currentIds.filter((id) => id !== branchId);
          } else {
            nextIds = [...currentIds, branchId];
          }

          if (
            nextIds.length === 0 ||
            (state.branches.length > 0 && nextIds.length >= state.branches.length)
          ) {
            return { selectedBranchId: 'all', selectedBranchIds: ['all'] };
          }

          return {
            selectedBranchId: nextIds[0] || 'all',
            selectedBranchIds: nextIds,
          };
        }),

      selectAllBranches: () =>
        set({ selectedBranchId: 'all', selectedBranchIds: ['all'] }),

      setTenancyData: (data) =>
        set((state) => ({
          actualRole: data.actualRole,
          // If simulating, do not let background fetches clobber the active simulated role or org
          activeRoleMode: state.isSimulating
            ? state.activeRoleMode
            : data.activeRoleMode || state.activeRoleMode || data.actualRole,
          selectedOrganizationId: state.isSimulating
            ? state.selectedOrganizationId
            : data.selectedOrganizationId || state.selectedOrganizationId,
          selectedBranchId: state.isSimulating
            ? state.selectedBranchId
            : data.selectedBranchId || state.selectedBranchId,
          selectedBranchIds: state.isSimulating
            ? state.selectedBranchIds
            : data.selectedBranchIds ||
              (data.selectedBranchId && data.selectedBranchId !== 'all'
                ? [data.selectedBranchId]
                : state.selectedBranchIds),
          organizations: data.organizations,
          branches: data.branches,
          isLoading: false,
        })),

      startSimulation: ({ role, orgId, orgName, branchId, branchName }) =>
        set({
          isSimulating: true,
          activeRoleMode: role,
          selectedOrganizationId: orgId,
          selectedBranchId: branchId,
          selectedBranchIds: branchId === 'all' ? ['all'] : [branchId],
          simulatedOrgName: orgName,
          simulatedBranchName: branchName,
        }),

      exitSimulation: () =>
        set((state) => ({
          isSimulating: false,
          activeRoleMode: state.actualRole,
          simulatedOrgName: undefined,
          simulatedBranchName: undefined,
        })),

      updateSimulatedRole: (role) => set({ activeRoleMode: role }),

      updateSimulatedBranch: (branchId, branchName) =>
        set({
          selectedBranchId: branchId,
          selectedBranchIds: branchId === 'all' ? ['all'] : [branchId],
          simulatedBranchName: branchName,
        }),
    }),
    {
      name: 'optix-tenant-context',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        isSimulating: state.isSimulating,
        activeRoleMode: state.activeRoleMode,
        selectedOrganizationId: state.selectedOrganizationId,
        selectedBranchId: state.selectedBranchId,
        selectedBranchIds: state.selectedBranchIds,
        simulatedOrgName: state.simulatedOrgName,
        simulatedBranchName: state.simulatedBranchName,
      }),
    }
  )
);
