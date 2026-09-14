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
  setTenancyData: (data: {
    actualRole: RoleMode;
    activeRoleMode?: RoleMode;
    selectedOrganizationId?: string;
    selectedBranchId?: string | 'all';
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
      organizations: [],
      branches: [],
      isLoading: false,

      isSimulating: false,
      simulatedOrgName: undefined,
      simulatedBranchName: undefined,

      setRoleMode: (mode) => set({ activeRoleMode: mode }),

      setSelectedOrganization: (orgId) =>
        set({ selectedOrganizationId: orgId, selectedBranchId: 'all' }),

      setSelectedBranch: (branchId) => set({ selectedBranchId: branchId }),

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
        simulatedOrgName: state.simulatedOrgName,
        simulatedBranchName: state.simulatedBranchName,
      }),
    }
  )
);
