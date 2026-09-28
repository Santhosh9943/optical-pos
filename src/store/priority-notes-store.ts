import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PriorityTier = 'high' | 'medium' | 'low';

export interface PriorityNote {
  id: string;
  text: string;
  priority: PriorityTier;
  completed: boolean;
  deleted: boolean;
  createdAt: number;
  branchId: string;
  branchName: string;
}

interface PriorityNotesState {
  notes: PriorityNote[];
  isOpen: boolean;
  isPinned: boolean;
  isBatchEditing: boolean;
  backupNotes: PriorityNote[];
  trashExpanded: boolean;
  drawerBranchFilter: string | 'all';

  // Drawer & Pin Layout
  setIsOpen: (isOpen: boolean) => void;
  toggleDrawer: () => void;
  setIsPinned: (isPinned: boolean) => void;
  togglePin: () => void;
  setTrashExpanded: (expanded: boolean) => void;
  toggleTrash: () => void;
  setDrawerBranchFilter: (filter: string | 'all') => void;

  // Single Note Actions
  addNote: (
    text: string,
    priority: PriorityTier,
    branchId?: string,
    branchName?: string
  ) => void;
  toggleComplete: (id: string) => void;
  updateNoteText: (id: string, text: string) => void;
  changePriority: (id: string, priority: PriorityTier) => void;
  changeNoteBranch: (id: string, branchId: string, branchName: string) => void;
  softDeleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  emptyTrash: (branchId?: string | 'all') => void;
  clearCompleted: (branchId?: string | 'all') => void;

  // Batch Edit Mode
  startBatchEdit: () => void;
  cancelBatchEdit: () => void;
  saveBatchEdit: (updatedNotes?: PriorityNote[]) => void;
  setNotes: (notes: PriorityNote[]) => void;
}

export const usePriorityNotesStore = create<PriorityNotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      isOpen: false,
      isPinned: false,
      isBatchEditing: false,
      backupNotes: [],
      trashExpanded: false,
      drawerBranchFilter: 'all',

      setIsOpen: (isOpen: boolean) => set({ isOpen }),
      toggleDrawer: () => set((state) => ({ isOpen: !state.isOpen })),

      setIsPinned: (isPinned: boolean) => set({ isPinned }),
      togglePin: () => set((state) => ({ isPinned: !state.isPinned })),

      setTrashExpanded: (trashExpanded: boolean) => set({ trashExpanded }),
      toggleTrash: () => set((state) => ({ trashExpanded: !state.trashExpanded })),

      setDrawerBranchFilter: (drawerBranchFilter: string | 'all') =>
        set({ drawerBranchFilter }),

      addNote: (
        text: string,
        priority: PriorityTier,
        branchId?: string,
        branchName?: string
      ) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const newNote: PriorityNote = {
          id: Date.now().toString(),
          text: trimmed,
          priority,
          completed: false,
          deleted: false,
          createdAt: Date.now(),
          branchId: branchId || 'all',
          branchName: branchName || 'General',
        };
        set((state) => ({
          notes: [newNote, ...state.notes],
        }));
      },

      toggleComplete: (id: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, completed: !note.completed } : note
          ),
        }));
      },

      updateNoteText: (id: string, text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, text: trimmed } : note
          ),
        }));
      },

      changePriority: (id: string, priority: PriorityTier) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, priority } : note
          ),
        }));
      },

      changeNoteBranch: (id: string, branchId: string, branchName: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, branchId, branchName } : note
          ),
        }));
      },

      softDeleteNote: (id: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, deleted: true } : note
          ),
        }));
      },

      restoreNote: (id: string) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, deleted: false } : note
          ),
        }));
      },

      emptyTrash: (targetBranchId?: string | 'all') => {
        set((state) => ({
          notes: state.notes.filter((note) => {
            if (!note.deleted) return true;
            // If targetBranchId is specified and not 'all', only delete trash for that branch
            if (targetBranchId && targetBranchId !== 'all') {
              return note.branchId !== targetBranchId;
            }
            return false;
          }),
          trashExpanded: false,
        }));
      },

      clearCompleted: (targetBranchId?: string | 'all') => {
        set((state) => ({
          notes: state.notes.map((note) => {
            if (!note.completed) return note;
            if (targetBranchId && targetBranchId !== 'all') {
              if (note.branchId === targetBranchId) {
                return { ...note, deleted: true };
              }
              return note;
            }
            return { ...note, deleted: true };
          }),
        }));
      },

      startBatchEdit: () => {
        const currentNotes = get().notes;
        set({
          isBatchEditing: true,
          backupNotes: JSON.parse(JSON.stringify(currentNotes)),
        });
      },

      cancelBatchEdit: () => {
        const backup = get().backupNotes;
        set({
          isBatchEditing: false,
          notes: backup.length > 0 ? backup : get().notes,
          backupNotes: [],
        });
      },

      saveBatchEdit: (updatedNotes?: PriorityNote[]) => {
        set((state) => ({
          isBatchEditing: false,
          notes: updatedNotes || state.notes,
          backupNotes: [],
        }));
      },

      setNotes: (notes: PriorityNote[]) => set({ notes }),
    }),
    {
      name: 'priority_notes_cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notes: state.notes.map((n) => ({
          ...n,
          branchId: n.branchId || 'all',
          branchName: n.branchName || 'General',
        })),
        isPinned: state.isPinned,
        drawerBranchFilter: state.drawerBranchFilter,
      }),
    }
  )
);
