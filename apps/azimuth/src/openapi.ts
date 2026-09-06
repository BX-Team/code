/** Hand-authored because the surface is small and stable; `/docs/api` renders it. */
export function openApiDocument(origin: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BX Team API',
      version: '1.0.0',
      description:
        'Downloads for every BX Team project. Reads are public and credential-less; publishing takes a project token. Every download URL points straight at the bucket, so this API is never in the path of a file.',
      license: { name: 'AGPL-3.0-only', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'Downloads', description: 'Projects, versions, builds and releases.' },
      { name: 'Publishing', description: 'What a release workflow calls. Bearer token, one project each.' },
      { name: 'Mojang', description: 'Username lookups, proxied so a static page can make them.' },
      { name: 'Service', description: 'Health and edge location.' },
    ],
    paths: {
      '/v1/projects': {
        get: {
          tags: ['Downloads'],
          summary: 'List projects',
          responses: ok({ type: 'array', items: ref('ProjectSummary') }),
        },
      },
      '/v1/projects/{project}': {
        get: {
          tags: ['Downloads'],
          summary: 'Get a project with its versions or its releases',
          parameters: [path('project', 'divinemc')],
          responses: { ...ok(ref('Project')), ...missing() },
        },
      },
      '/v1/builds/{project}': {
        get: {
          tags: ['Downloads'],
          summary: "List a versioned project's versions, newest first",
          parameters: [path('project', 'divinemc')],
          responses: { ...ok({ type: 'array', items: ref('VersionSummary') }), ...missing() },
        },
      },
      '/v1/builds/{project}/{version}': {
        get: {
          tags: ['Downloads'],
          summary: 'Get a version with one page of its builds',
          parameters: [
            path('project', 'divinemc'),
            path('version', '26.2'),
            query('limit', { type: 'integer', minimum: 1, maximum: 200, default: 50 }, 'Builds per page.'),
            query('after', { type: 'integer' }, 'Builds strictly older than this number.'),
          ],
          responses: { ...ok(ref('Version')), ...missing() },
        },
      },
      '/v1/builds/{project}/{version}/latest': {
        get: {
          tags: ['Downloads'],
          summary: 'Get the newest build of a version',
          parameters: [path('project', 'divinemc'), path('version', '26.2')],
          responses: { ...ok(ref('Build')), ...missing() },
        },
      },
      '/v1/builds/{project}/{version}/{build}': {
        get: {
          tags: ['Downloads'],
          summary: 'Get one build',
          parameters: [path('project', 'divinemc'), path('version', '26.2'), path('build', '11')],
          responses: { ...ok(ref('Build')), ...missing() },
        },
      },
      '/v1/releases/{project}': {
        get: {
          tags: ['Downloads'],
          summary: "List a release project's releases, newest first",
          parameters: [path('project', 'nyx')],
          responses: { ...ok({ type: 'array', items: ref('Release') }), ...missing() },
        },
      },
      '/v1/releases/{project}/latest': {
        get: {
          tags: ['Downloads'],
          summary: 'Get the newest release',
          parameters: [path('project', 'nyx')],
          responses: { ...ok(ref('Release')), ...missing() },
        },
      },
      '/v1/releases/{project}/{tag}': {
        get: {
          tags: ['Downloads'],
          summary: 'Get one release',
          parameters: [path('project', 'nyx'), path('tag', '1.2.0')],
          responses: { ...ok(ref('Release')), ...missing() },
        },
      },
      '/v1/publish/next/{project}/{version}': {
        get: {
          tags: ['Publishing'],
          summary: 'The number the next build of a version will take',
          description: 'Creates the version when it does not exist yet. Never cached.',
          security: [{ publishToken: [] }],
          parameters: [path('project', 'divinemc'), path('version', '26.2')],
          responses: {
            ...ok({
              type: 'object',
              properties: { project: { type: 'string' }, version: { type: 'string' }, next: { type: 'integer' } },
            }),
            ...denied(),
          },
        },
      },
      '/v1/publish/builds/{project}/{version}': {
        post: {
          tags: ['Publishing'],
          summary: 'Publish a build',
          description:
            'Multipart: `file` is the artifact, `metadata` a JSON object. Publishing the same number again replaces that named download and leaves the others alone, so a re-run of a failed upload is safe.',
          security: [{ publishToken: [] }],
          parameters: [path('project', 'divinemc'), path('version', '26.2')],
          requestBody: upload('PublishBuild'),
          responses: { ...ok(ref('Build')), ...denied(), ...missing() },
        },
      },
      '/v1/publish/releases/{project}/{tag}': {
        post: {
          tags: ['Publishing'],
          summary: 'Publish a release',
          security: [{ publishToken: [] }],
          parameters: [path('project', 'nyx'), path('tag', '1.2.0')],
          requestBody: upload('PublishRelease'),
          responses: { ...ok(ref('Release')), ...denied(), ...missing() },
        },
        delete: {
          tags: ['Publishing'],
          summary: 'Remove a release and the objects it published',
          security: [{ publishToken: [] }],
          parameters: [path('project', 'nyx'), path('tag', '1.2.0')],
          responses: { ...ok(ref('Ok')), ...denied(), ...missing() },
        },
      },
      '/v1/publish/projects/{project}': {
        patch: {
          tags: ['Publishing'],
          summary: "Change a project's name, description, repository or offered versions",
          security: [{ publishToken: [] }],
          parameters: [path('project', 'divinemc')],
          requestBody: json('ProjectPatch'),
          responses: { ...ok(ref('Ok')), ...denied(), ...missing() },
        },
      },
      '/v1/publish/versions/{project}/{version}': {
        patch: {
          tags: ['Publishing'],
          summary: "Change a version's support status or Java floor",
          security: [{ publishToken: [] }],
          parameters: [path('project', 'divinemc'), path('version', '26.2')],
          requestBody: json('VersionPatch'),
          responses: { ...ok(ref('Ok')), ...denied(), ...missing() },
        },
      },
      '/v1/publish/builds/{project}/{version}/{build}': {
        delete: {
          tags: ['Publishing'],
          summary: 'Remove a build and the objects it published',
          security: [{ publishToken: [] }],
          parameters: [path('project', 'divinemc'), path('version', '26.2'), path('build', '11')],
          responses: { ...ok(ref('Ok')), ...denied(), ...missing() },
        },
      },
      '/v1/mojang/profile/{username}': {
        get: {
          tags: ['Mojang'],
          summary: 'Look a Minecraft username up with Mojang',
          description:
            'Answers with the account UUID and its skin. Proxied because the browser cannot reach Mojang cross-origin and the rate limit counts source IPs, not callers.',
          parameters: [path('username', 'NONPLAYT')],
          responses: { ...ok(ref('MojangProfile')), ...missing() },
        },
      },
      '/health': {
        get: { tags: ['Service'], summary: 'Liveness', responses: ok({ type: 'object' }) },
      },
      '/location': {
        get: {
          tags: ['Service'],
          summary: 'The edge location that served the request',
          responses: ok({ type: 'object' }),
        },
      },
    },
    components: {
      securitySchemes: {
        publishToken: { type: 'http', scheme: 'bearer', description: 'A publish token, valid for one project.' },
      },
      schemas: {
        Ok: { type: 'object', properties: { ok: { type: 'boolean' } } },
        Error: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', const: false },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        Download: {
          type: 'object',
          description: 'A published file. `url` points at the bucket, never at this API.',
          properties: {
            name: { type: 'string', examples: ['divinemc-26.2-11.jar'] },
            size: { type: 'integer' },
            sha256: { type: 'string' },
            url: { type: 'string', format: 'uri' },
          },
        },
        MojangProfile: {
          type: 'object',
          description: 'An account as Mojang has it. The offline UUID is not here: it is derived from the name alone.',
          properties: {
            id: { type: 'string', format: 'uuid', examples: ['b83f209c-be04-4258-8165-90d4a747d91b'] },
            name: { type: 'string', examples: ['NONPLAYT'] },
            skin: { type: ['string', 'null'], format: 'uri' },
            cape: { type: ['string', 'null'], format: 'uri' },
            model: { type: 'string', enum: ['classic', 'slim'] },
          },
        },
        Commit: {
          type: 'object',
          properties: {
            sha: { type: 'string' },
            summary: { type: 'string' },
            at: { type: 'string', format: 'date-time' },
          },
        },
        ProjectSummary: {
          type: 'object',
          properties: {
            key: { type: 'string', examples: ['divinemc'] },
            name: { type: 'string', examples: ['DivineMC'] },
            kind: { type: 'string', enum: ['versioned', 'release'] },
            description: nullable({ type: 'string' }),
            repo: nullable({ type: 'string' }),
            latest: nullable({ type: 'string' }),
            experimental: nullable({ type: 'string' }),
            updated_at: nullable({ type: 'string', format: 'date-time' }),
          },
        },
        Project: {
          allOf: [
            ref('ProjectSummary'),
            {
              type: 'object',
              description: '`kind` says which half is present; the other is absent rather than null.',
              properties: {
                versions: { type: 'array', items: { type: 'string' } },
                version_groups: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
                releases: { type: 'array', items: { type: 'string' } },
              },
            },
          ],
        },
        VersionSummary: {
          type: 'object',
          properties: {
            version: { type: 'string', examples: ['26.2'] },
            support: { type: 'string', enum: ['supported', 'deprecated', 'unsupported'] },
            java_min: nullable({ type: 'integer' }),
            latest_build: nullable({ type: 'integer' }),
            build_count: { type: 'integer' },
          },
        },
        Version: {
          allOf: [
            ref('VersionSummary'),
            {
              type: 'object',
              properties: {
                builds: {
                  type: 'object',
                  properties: {
                    items: { type: 'array', items: ref('Build') },
                    next: nullable({ type: 'string' }),
                  },
                },
              },
            },
          ],
        },
        Build: {
          type: 'object',
          properties: {
            build: { type: 'integer' },
            project: { type: 'string' },
            version: { type: 'string' },
            channel: { type: 'string', enum: ['alpha', 'beta', 'stable'] },
            created_at: { type: 'string', format: 'date-time' },
            commit: nullable({ type: 'string' }),
            commits: { type: 'array', items: ref('Commit') },
            downloads: { type: 'object', additionalProperties: ref('Download') },
          },
        },
        Release: {
          type: 'object',
          properties: {
            tag: { type: 'string' },
            project: { type: 'string' },
            channel: { type: 'string', enum: ['alpha', 'beta', 'stable'] },
            created_at: { type: 'string', format: 'date-time' },
            commit: nullable({ type: 'string' }),
            notes: nullable({ type: 'string' }),
            commits: { type: 'array', items: ref('Commit') },
            downloads: { type: 'object', additionalProperties: ref('Download') },
          },
        },
        PublishBuild: {
          type: 'object',
          description: 'Omitting `build` takes the next number after the newest one.',
          properties: {
            build: { type: 'integer', minimum: 1 },
            channel: { type: 'string', enum: ['alpha', 'beta', 'stable'], default: 'stable' },
            commit: nullable({ type: 'string' }),
            commits: { type: 'array', items: ref('Commit') },
            name: { type: 'string', default: 'application', description: 'Key the file takes in `downloads`.' },
          },
        },
        PublishRelease: {
          type: 'object',
          properties: {
            channel: { type: 'string', enum: ['alpha', 'beta', 'stable'], default: 'stable' },
            commit: nullable({ type: 'string' }),
            commits: { type: 'array', items: ref('Commit') },
            notes: nullable({ type: 'string' }),
            name: { type: 'string', default: 'application' },
          },
        },
        ProjectPatch: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: nullable({ type: 'string' }),
            repo: nullable({ type: 'string' }),
            latest: nullable({ type: 'string' }),
            experimental: nullable({ type: 'string' }),
          },
        },
        VersionPatch: {
          type: 'object',
          properties: {
            support: { type: 'string', enum: ['supported', 'deprecated', 'unsupported'] },
            java_min: nullable({ type: 'integer' }),
          },
        },
      },
    },
  };
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const nullable = (schema: Record<string, unknown>) => ({ ...schema, nullable: true });

const path = (name: string, example: string) => ({
  name,
  in: 'path',
  required: true,
  schema: { type: 'string' },
  examples: { default: { value: example } },
});

const query = (name: string, schema: Record<string, unknown>, description: string) => ({
  name,
  in: 'query',
  required: false,
  description,
  schema,
});

const ok = (schema: Record<string, unknown>) => ({
  200: { description: 'OK', content: { 'application/json': { schema } } },
});

const missing = () => ({
  404: { description: 'No such project, version, build or release', content: errorContent() },
});

const denied = () => ({
  401: { description: 'Missing or unknown token', content: errorContent() },
  403: { description: 'The token belongs to another project', content: errorContent() },
});

const errorContent = () => ({ 'application/json': { schema: ref('Error') } });

const json = (schema: string) => ({
  required: true,
  content: { 'application/json': { schema: ref(schema) } },
});

const upload = (schema: string) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: { type: 'string', format: 'binary' },
          metadata: { type: 'string', description: `JSON: ${schema}` },
        },
      },
    },
  },
});
