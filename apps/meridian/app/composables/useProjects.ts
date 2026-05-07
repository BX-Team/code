export type Project = {
  id: string;
  name: string;
  slug: string;
  type: 'server' | 'plugin' | 'mod';
  description: string | null;
  createdAt: string;
};

export function useProjects() {
  return useFetch<Project[]>('/api/v3/projects', {
    key: 'v3-projects',
    default: () => [],
  });
}

export async function findProjectBySlug(slug: string) {
  const { data } = await useProjects();
  return computed(() => (data.value ?? []).find(p => p.slug === slug) ?? null);
}
