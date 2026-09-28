import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type RoleMode =
  | 'super_admin'
  | 'super_moderator'
  | 'super_viewer'
  | 'organizer'
  | 'moderator'
  | 'admin'
  | 'user'
  | 'viewer';

export interface BranchOption {
  id: string;
  name: string;
  organizationId: string;
  isActive: boolean;
}

export interface OrgOption {
  id: string;
  name: string;
  orgCode?: string | null;
  orgNumber?: number | null;
}

interface TenantState {
  // Actual authenticated role
  actualRole: RoleMode;
  // Active role (either native or simulated)
  activeRoleMode: RoleMode;
  selectedOrganizationId: string;
  selectedBranchId: string;
  selectedBranchIds: string[]; // Always [selectedBranchId] for single-store operational isolation
  activeOrgCode?: string | null;
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
  setSelectedBranch: (branchId: string) => void;
  setSelectedBranches?: (branchIds: string[]) => void;
  setTenancyData: (data: {
    actualRole: RoleMode;
    activeRoleMode?: RoleMode;
    selectedOrganizationId?: string;
    selectedBranchId?: string;
    organizations: OrgOption[];
    branches: BranchOption[];
    activeOrgCode?: string | null;
  }) => void;
  startSimulation: (params: {
    role: RoleMode;
    orgId: string;
    orgName: string;
    branchId: string;
    branchName: string;
  }) => void;
  exitSimulation: () => void;
  updateSimulatedRole: (role: RoleMode) => void;
  updateSimulatedBranch: (branchId: string, branchName: string) => void;
}

/**
 * Safely reads persisted tenant state synchronously from sessionStorage on initial client frame.
 * Prevents asynchronous rehydration gap while ensuring valid single-store UUID is loaded.
 */
function getInitialPersistedTenantState(): Partial<TenantState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('optix-tenant-context');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.state) {
        const state = parsed.state;
        // Guarantee selectedBranchId is never 'all'
        if (state.selectedBranchId === 'all') {
          state.selectedBranchId = '00000000-0000-0000-0000-000000000002';
        }
        return state;
      }
    }

    // Fallback: check localStorage for last active branch
    const savedBranch = localStorage.getItem('optix-last-active-branch');
    if (savedBranch && savedBranch !== 'all') {
      return {
        selectedBranchId: savedBranch,
        selectedBranchIds: [savedBranch],
      };
    }
  } catch (err) {
    console.warn('[TenantStore] Error reading initial storage:', err);
  }
  return {};
}

const savedInitialTenant = getInitialPersistedTenantState();

export const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000001';
export const DEFAULT_BRANCH_ID =
  (savedInitialTenant.selectedBranchId && savedInitialTenant.selectedBranchId !== 'all'
    ? savedInitialTenant.selectedBranchId
    : '00000000-0000-0000-0000-000000000002');

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      actualRole: (savedInitialTenant.actualRole as RoleMode) || 'super_admin',
      activeRoleMode: (savedInitialTenant.activeRoleMode as RoleMode) || 'super_admin',
      selectedOrganizationId:
        savedInitialTenant.selectedOrganizationId || '00000000-0000-0000-0000-000000000001',
      selectedBranchId: DEFAULT_BRANCH_ID,
      selectedBranchIds: [DEFAULT_BRANCH_ID],
      organizations: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Optix Vision Care' },
      ],
      branches: [
        {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Main Branch',
          organizationId: '00000000-0000-0000-0000-000000000001',
          isActive: true,
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          name: 'Downtown Flagship',
          organizationId: '00000000-0000-0000-0000-000000000001',
          isActive: true,
        },
      ],
      isLoading: false,

      isSimulating: savedInitialTenant.isSimulating || false,
      simulatedOrgName: savedInitialTenant.simulatedOrgName,
      simulatedBranchName: savedInitialTenant.simulatedBranchName,

      setRoleMode: (mode) => set({ activeRoleMode: mode }),

      setSelectedOrganization: (orgId) =>
        set((state) => {
          const orgBranches = state.branches.filter((b) => b.organizationId === orgId);
          const firstBranchId = orgBranches[0]?.id || DEFAULT_BRANCH_ID;
          return {
            selectedOrganizationId: orgId,
            selectedBranchId: firstBranchId,
            selectedBranchIds: [firstBranchId],
          };
        }),

      setSelectedBranch: (branchId) => {
        if (typeof window !== 'undefined' && branchId && branchId !== 'all') {
          try {
            localStorage.setItem('optix-last-active-branch', branchId);
          } catch {}
        }
        set({
          selectedBranchId: branchId,
          selectedBranchIds: [branchId],
        });
      },

      setSelectedBranches: (branchIds) =>
        set((state) => {
          const targetId = branchIds && branchIds.length > 0 && branchIds[0] !== 'all'
            ? branchIds[0]
            : (state.branches[0]?.id || DEFAULT_BRANCH_ID);
          if (typeof window !== 'undefined' && targetId && targetId !== 'all') {
            try {
              localStorage.setItem('optix-last-active-branch', targetId);
            } catch {}
          }
          return {
            selectedBranchId: targetId,
            selectedBranchIds: [targetId],
          };
        }),

      setTenancyData: (data) =>
        set((state) => {
          // If simulating, do not let background fetches clobber the active simulated role or org
          if (state.isSimulating) {
            return {
              actualRole: data.actualRole,
              organizations: data.organizations,
              branches: data.branches,
              isLoading: false,
            };
          }

          // Available branches and organizations from new tenancy context
          const availableBranchIds = new Set(data.branches.map((b) => b.id));
          const availableOrgIds = new Set(data.organizations.map((o) => o.id));

          let finalOrgId = data.selectedOrganizationId || state.selectedOrganizationId;
          if (data.actualRole !== 'super_admin' || !availableOrgIds.has(state.selectedOrganizationId)) {
            finalOrgId = data.selectedOrganizationId || data.organizations[0]?.id || DEFAULT_ORG_ID;
          }

          // Retain current branch selection if it's still valid in available branches
          let finalBranchId = state.selectedBranchId;
          if (!finalBranchId || finalBranchId === 'all' || !availableBranchIds.has(finalBranchId)) {
            // Check localStorage
            let storedLastBranch: string | null = null;
            if (typeof window !== 'undefined') {
              try {
                storedLastBranch = localStorage.getItem('optix-last-active-branch');
              } catch {}
            }

            if (storedLastBranch && availableBranchIds.has(storedLastBranch)) {
              finalBranchId = storedLastBranch;
            } else {
              finalBranchId =
                (data.selectedBranchId && data.selectedBranchId !== 'all' && availableBranchIds.has(data.selectedBranchId)
                  ? data.selectedBranchId
                  : data.branches[0]?.id) || DEFAULT_BRANCH_ID;
            }
          }

          const activeOrg = data.organizations.find((o) => o.id === finalOrgId);
          const activeOrgCode = activeOrg?.orgCode || (activeOrg?.orgNumber ? `OPT-${activeOrg.orgNumber}` : null);

          return {
            actualRole: data.actualRole,
            activeRoleMode: data.activeRoleMode || state.activeRoleMode || data.actualRole,
            selectedOrganizationId: finalOrgId,
            selectedBranchId: finalBranchId,
            selectedBranchIds: [finalBranchId],
            activeOrgCode,
            organizations: data.organizations,
            branches: data.branches,
            isLoading: false,
          };
        }),

      startSimulation: ({ role, orgId, orgName, branchId, branchName }) => {
        const cleanBranchId = branchId === 'all' ? DEFAULT_BRANCH_ID : branchId;
        set({
          isSimulating: true,
          activeRoleMode: role,
          selectedOrganizationId: orgId,
          selectedBranchId: cleanBranchId,
          selectedBranchIds: [cleanBranchId],
          simulatedOrgName: orgName,
          simulatedBranchName: branchName,
        });
      },

      exitSimulation: () =>
        set((state) => ({
          isSimulating: false,
          activeRoleMode: state.actualRole,
          simulatedOrgName: undefined,
          simulatedBranchName: undefined,
        })),

      updateSimulatedRole: (role) => set({ activeRoleMode: role }),

      updateSimulatedBranch: (branchId, branchName) => {
        const cleanBranchId = branchId === 'all' ? DEFAULT_BRANCH_ID : branchId;
        set({
          selectedBranchId: cleanBranchId,
          selectedBranchIds: [cleanBranchId],
          simulatedBranchName: branchName,
        });
      },
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
