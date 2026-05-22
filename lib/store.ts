import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CRMState {
  filterMode: 'all' | 'my_day';
  setFilterMode: (mode: 'all' | 'my_day') => void;
  sortOrder: 'recent' | 'alphabetical' | 'value';
  setSortOrder: (order: 'recent' | 'alphabetical' | 'value') => void;
  viewMode: 'kanban' | 'list';
  setViewMode: (mode: 'kanban' | 'list') => void;
  cardDensity: 'normal' | 'compact';
  setCardDensity: (density: 'normal' | 'compact') => void;
  columnWidth: number;
  setColumnWidth: (width: number) => void;
  isLoadingLeads: boolean;
  setIsLoadingLeads: (loading: boolean) => void;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set) => ({
      filterMode: 'all',
      setFilterMode: (mode) => set({ filterMode: mode }),
      sortOrder: 'recent',
      setSortOrder: (order) => set({ sortOrder: order }),
      viewMode: 'kanban',
      setViewMode: (mode) => set({ viewMode: mode }),
      cardDensity: 'normal',
      setCardDensity: (density) => set({ cardDensity: density }),
      columnWidth: 300,
      setColumnWidth: (width) => set({ columnWidth: width }),
      isLoadingLeads: false,
      setIsLoadingLeads: (loading) => set({ isLoadingLeads: loading }),
    }),
    {
      name: 'crm-storage',
      partialize: (state) => ({ 
        filterMode: state.filterMode,
        sortOrder: state.sortOrder,
        viewMode: state.viewMode,
        cardDensity: state.cardDensity,
        columnWidth: state.columnWidth
      }),
    }
  )
);
