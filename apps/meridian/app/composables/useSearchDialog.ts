export const useSearchDialogOpen = () => useState<boolean>('search-dialog', () => false);

export function openSearchDialog() {
  useSearchDialogOpen().value = true;
}
