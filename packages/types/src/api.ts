import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import {
  BuildSchema,
  ErrorSchema,
  NextBuildSchema,
  OkSchema,
  PageQuerySchema,
  ProjectPatchSchema,
  ProjectSchema,
  ProjectSummarySchema,
  ReleaseSchema,
  VersionPatchSchema,
  VersionSchema,
  VersionSummarySchema,
} from './schemas/downloads';

/**
 * The downloads API as data: every route `apps/api` serves, with its parameters and its
 * response. The API implements these and renders its OpenAPI document from them, and a
 * client types itself off `ApiContract` — one definition instead of three copies.
 */

const json = <T extends z.ZodType>(schema: T, description = 'OK') => ({
  description,
  content: { 'application/json': { schema } },
});

const error = (description: string) => json(ErrorSchema, description);

const missing = { 404: error('No such project, version, build or release') };
const denied = {
  401: error('Missing or unknown token'),
  403: error('The token belongs to another project'),
};
const invalid = { 400: error('A parameter, query or body did not validate') };

const param = (name: string, example: string) => z.string().openapi({ param: { name, in: 'path' }, example });

const project = (example: string) => param('project', example);
const versionKey = param('version', '26.2');
const buildNumber = z
  .string()
  .regex(/^\d+$/, 'Build number must be a positive integer')
  .openapi({ param: { name: 'build', in: 'path' }, example: '11' });
const tag = param('tag', '1.2.0');

const security = [{ publishToken: [] }];

const upload = (metadata: string) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: z.object({
        file: z.instanceof(File, { message: 'No file provided' }).openapi({ type: 'string', format: 'binary' }),
        metadata: z
          .string()
          .optional()
          .openapi({ description: `JSON: ${metadata}` }),
      }),
    },
  },
});

export const listProjects = createRoute({
  method: 'get',
  path: '/v1/projects',
  tags: ['Downloads'],
  summary: 'List projects',
  responses: { 200: json(z.array(ProjectSummarySchema)) },
});

export const getProject = createRoute({
  method: 'get',
  path: '/v1/projects/{project}',
  tags: ['Downloads'],
  summary: 'Get a project with its versions or its releases',
  request: { params: z.object({ project: project('divinemc') }) },
  responses: { 200: json(ProjectSchema), ...missing },
});

export const listVersions = createRoute({
  method: 'get',
  path: '/v1/builds/{project}',
  tags: ['Downloads'],
  summary: "List a versioned project's versions, newest first",
  request: { params: z.object({ project: project('divinemc') }) },
  responses: { 200: json(z.array(VersionSummarySchema)), ...missing },
});

export const getVersion = createRoute({
  method: 'get',
  path: '/v1/builds/{project}/{version}',
  tags: ['Downloads'],
  summary: 'Get a version with one page of its builds',
  request: {
    params: z.object({ project: project('divinemc'), version: versionKey }),
    query: PageQuerySchema,
  },
  responses: { 200: json(VersionSchema), ...invalid, ...missing },
});

export const getLatestBuild = createRoute({
  method: 'get',
  path: '/v1/builds/{project}/{version}/latest',
  tags: ['Downloads'],
  summary: 'Get the newest build of a version',
  request: { params: z.object({ project: project('divinemc'), version: versionKey }) },
  responses: { 200: json(BuildSchema), ...missing },
});

export const getBuild = createRoute({
  method: 'get',
  path: '/v1/builds/{project}/{version}/{build}',
  tags: ['Downloads'],
  summary: 'Get one build',
  request: { params: z.object({ project: project('divinemc'), version: versionKey, build: buildNumber }) },
  responses: { 200: json(BuildSchema), ...invalid, ...missing },
});

export const listReleases = createRoute({
  method: 'get',
  path: '/v1/releases/{project}',
  tags: ['Downloads'],
  summary: "List a release project's releases, newest first",
  request: { params: z.object({ project: project('nyx') }) },
  responses: { 200: json(z.array(ReleaseSchema)), ...missing },
});

export const getLatestRelease = createRoute({
  method: 'get',
  path: '/v1/releases/{project}/latest',
  tags: ['Downloads'],
  summary: 'Get the newest release',
  request: { params: z.object({ project: project('nyx') }) },
  responses: { 200: json(ReleaseSchema), ...missing },
});

export const getRelease = createRoute({
  method: 'get',
  path: '/v1/releases/{project}/{tag}',
  tags: ['Downloads'],
  summary: 'Get one release',
  request: { params: z.object({ project: project('nyx'), tag }) },
  responses: { 200: json(ReleaseSchema), ...missing },
});

export const nextBuild = createRoute({
  method: 'get',
  path: '/v1/publish/next/{project}/{version}',
  tags: ['Publishing'],
  summary: 'The number the next build of a version will take',
  description: 'Creates the version when it does not exist yet. Never cached.',
  security,
  request: { params: z.object({ project: project('divinemc'), version: versionKey }) },
  responses: { 200: json(NextBuildSchema), ...denied, ...missing },
});

export const publishBuild = createRoute({
  method: 'post',
  path: '/v1/publish/builds/{project}/{version}',
  tags: ['Publishing'],
  summary: 'Publish a build',
  description:
    'Multipart: `file` is the artifact, `metadata` a JSON object. Publishing the same number again replaces that named download and leaves the others alone, so a re-run of a failed upload is safe.',
  security,
  request: { params: z.object({ project: project('divinemc'), version: versionKey }), body: upload('PublishBuild') },
  responses: { 200: json(BuildSchema), ...invalid, ...denied, ...missing },
});

export const publishRelease = createRoute({
  method: 'post',
  path: '/v1/publish/releases/{project}/{tag}',
  tags: ['Publishing'],
  summary: 'Publish a release',
  security,
  request: { params: z.object({ project: project('nyx'), tag }), body: upload('PublishRelease') },
  responses: { 200: json(ReleaseSchema), ...invalid, ...denied, ...missing },
});

export const deleteRelease = createRoute({
  method: 'delete',
  path: '/v1/publish/releases/{project}/{tag}',
  tags: ['Publishing'],
  summary: 'Remove a release and the objects it published',
  security,
  request: { params: z.object({ project: project('nyx'), tag }) },
  responses: { 200: json(OkSchema), ...denied, ...missing },
});

export const patchProject = createRoute({
  method: 'patch',
  path: '/v1/publish/projects/{project}',
  tags: ['Publishing'],
  summary: "Change a project's name, description, repository or offered versions",
  security,
  request: {
    params: z.object({ project: project('divinemc') }),
    body: { content: { 'application/json': { schema: ProjectPatchSchema.openapi('ProjectPatch') } } },
  },
  responses: { 200: json(OkSchema), ...invalid, ...denied, ...missing },
});

export const patchVersion = createRoute({
  method: 'patch',
  path: '/v1/publish/versions/{project}/{version}',
  tags: ['Publishing'],
  summary: "Change a version's support status or Java floor",
  security,
  request: {
    params: z.object({ project: project('divinemc'), version: versionKey }),
    body: { content: { 'application/json': { schema: VersionPatchSchema.openapi('VersionPatch') } } },
  },
  responses: { 200: json(OkSchema), ...invalid, ...denied, ...missing },
});

export const deleteBuild = createRoute({
  method: 'delete',
  path: '/v1/publish/builds/{project}/{version}/{build}',
  tags: ['Publishing'],
  summary: 'Remove a build and the objects it published',
  security,
  request: { params: z.object({ project: project('divinemc'), version: versionKey, build: buildNumber }) },
  responses: { 200: json(OkSchema), ...invalid, ...denied, ...missing },
});

export const health = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Service'],
  summary: 'Liveness',
  responses: { 200: json(z.object({ status: z.literal('ok') })) },
});

export const location = createRoute({
  method: 'get',
  path: '/location',
  tags: ['Service'],
  summary: 'The edge location that served the request',
  responses: {
    200: json(z.object({ colo: z.string().nullable(), city: z.string().nullable(), country: z.string().nullable() })),
  },
});

declare const handler: never;

/**
 * The route table as a type, for `hc<ApiContract>` from `hono/client`. It is only ever
 * computed, never run: the API registers the same routes with real handlers.
 */
export type ApiContract = ReturnType<typeof contract>;

function contract(app: OpenAPIHono) {
  return app
    .openapi(listProjects, handler)
    .openapi(getProject, handler)
    .openapi(listVersions, handler)
    .openapi(getVersion, handler)
    .openapi(getLatestBuild, handler)
    .openapi(getBuild, handler)
    .openapi(listReleases, handler)
    .openapi(getLatestRelease, handler)
    .openapi(getRelease, handler)
    .openapi(nextBuild, handler)
    .openapi(publishBuild, handler)
    .openapi(publishRelease, handler)
    .openapi(deleteRelease, handler)
    .openapi(patchProject, handler)
    .openapi(patchVersion, handler)
    .openapi(deleteBuild, handler)
    .openapi(health, handler)
    .openapi(location, handler);
}
