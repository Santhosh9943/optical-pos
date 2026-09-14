import { create } from 'zustand';

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
  // Simulated role for Super Admin testing / governance
  activeRoleMode: RoleMode;
  selectedOrganizationId: string;
  selectedBranchId: string | 'all';
  organizations: OrgOption[];
  branches: BranchOption[];
  isLoading: boolean;

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
}

export const useTenantStore = create<TenantState>((set) => ({
  actualRole: 'super_admin',
  activeRoleMode: 'super_admin',
  selectedOrganizationId: '00000000-0000-0000-0000-000000000001',
  selectedBranchId: 'all',
  organizations: [],
  branches: [],
  isLoading: false,

  setRoleMode: (mode) => set({ activeRoleMode: mode }),

  setSelectedOrganization: (orgId) =>
    set({ selectedOrganizationId: orgId, selectedBranchId: 'all' }),

  setSelectedBranch: (branchId) => set({ selectedBranchId: branchId }),

  setTenancyData: (data) =>
    set((state) => ({
      actualRole: data.actualRole,
      activeRoleMode: data.activeRoleMode || state.activeRoleMode || data.actualRole,
      selectedOrganizationId:
        data.selectedOrganizationId || state.selectedOrganizationId,
      selectedBranchId: data.selectedBranchId || state.selectedBranchId,
      organizations: data.organizations,
      branches: data.branches,
      isLoading: false,
    })),
}));
