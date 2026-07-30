export interface DocSearchSection {
  id: string;
  title: string;
  titles: string[];
  content: string;
  level: number;
}

let sectionsPromise: Promise<DocSearchSection[]> | null = null;

function loadSections(): Promise<DocSearchSection[]> {
  if (!sectionsPromise) {
    sectionsPromise = queryCollectionSearchSections('docs') as Promise<DocSearchSection[]>;
  }
  return sectionsPromise;
}

/** Client-side docs search over @nuxt/content's sections, fetched once and filtered locally. */
export async function searchDocs(query: string): Promise<DocSearchSection[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  const sections = await loadSections();
  return sections.filter(section => {
    const inTitle = section.title?.toLowerCase().includes(term);
    const inContent = section.content?.toLowerCase().includes(term);
    const inTitles = section.titles?.some(title => title.toLowerCase().includes(term));
    return inTitle || inContent || inTitles;
  });
}
