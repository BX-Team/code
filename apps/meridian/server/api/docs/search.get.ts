export default eventHandler(async (event) => {
	const { q } = getQuery(event)

	if (!q || typeof q !== 'string' || !q.trim()) {
		return []
	}

	const sections = await queryCollectionSearchSections(event, 'docs')
	const term = q.trim().toLowerCase()

	return sections.filter((s: any) => {
		const inTitle = s.title?.toLowerCase().includes(term)
		const inContent = s.content?.toLowerCase().includes(term)
		const inTitles = s.titles?.some((t: string) => t.toLowerCase().includes(term))
		return inTitle || inContent || inTitles
	})
})
