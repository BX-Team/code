import { db, projects } from '@bx-team/stratus';
import { and, eq } from 'drizzle-orm';

export default defineEventHandler(async event => {
	const session = await requireAuth(event);
	const id = getRouterParam(event, 'id');
	if (!id) throw createError({ statusCode: 400, message: 'Missing project id' });

	const [deleted] = await db
		.delete(projects)
		.where(and(eq(projects.id, id), eq(projects.ownerId, session.user.id)))
		.returning({ id: projects.id });

	if (!deleted) throw createError({ statusCode: 404, message: 'Project not found' });

	return { success: true };
});
