export const useCreateProjectDialog = () => useState<boolean>('create-project-dialog', () => false);

export function openCreateProjectDialog() {
  useCreateProjectDialog().value = true;
}
