/**
 * Hand-authored OpenAPI 3.1 document for the public Atlas (downloads) API served at
 * api.bxteam.org. It describes the read surface consumers rely on to fetch project,
 * version and build metadata, plus the bearer-protected publish endpoints used by CI.
 * Rendered as a browser reference at /reference via Scalar.
 */

const errorResponse = {
  type: 'object',
  properties: {
    ok: { type: 'boolean', example: false },
    error: { type: 'string', example: 'Not Found' },
    message: { type: 'string', example: "Project 'purpur' not found" },
  },
  required: ['ok', 'error', 'message'],
} as const;

const download = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'purpur-1.21.4-2200.jar' },
    checksums: {
      type: 'object',
      properties: { sha256: { type: 'string' } },
      required: ['sha256'],
    },
    size: { type: 'integer', example: 52428800 },
    url: { type: 'string', format: 'uri' },
  },
  required: ['name', 'checksums', 'size', 'url'],
} as const;

const build = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 2200 },
    time: { type: 'string', format: 'date-time' },
    channel: { type: 'string', enum: ['ALPHA', 'BETA', 'STABLE'] },
    commits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sha: { type: 'string' },
          message: { type: 'string' },
          time: { type: 'string', format: 'date-time' },
        },
        required: ['sha', 'message', 'time'],
      },
    },
    downloads: { type: 'object', additionalProperties: download },
  },
  required: ['id', 'time', 'channel', 'commits', 'downloads'],
} as const;

const version = {
  type: 'object',
  properties: {
    version: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '1.21.4' },
        java: {
          type: 'object',
          properties: {
            version: {
              type: 'object',
              properties: { minimum: { type: 'integer', example: 21 } },
            },
          },
        },
        support: {
          type: 'object',
          properties: { status: { type: 'string', enum: ['SUPPORTED', 'DEPRECATED', 'UNSUPPORTED'] } },
          required: ['status'],
        },
      },
      required: ['id', 'support'],
    },
    builds: { type: 'array', items: { type: 'integer' } },
  },
  required: ['version', 'builds'],
} as const;

const project = {
  type: 'object',
  properties: {
    project: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'purpur' },
        name: { type: 'string', example: 'Purpur' },
        description: { type: 'string' },
        latestVersion: { type: 'string' },
        experimentalVersion: { type: 'string' },
      },
      required: ['id', 'name'],
    },
    version_groups: {
      type: 'object',
      additionalProperties: { type: 'array', items: { type: 'string' } },
      example: { '1.21': ['1.21.4', '1.21.3'], '1.20': ['1.20.6'] },
    },
  },
  required: ['project', 'version_groups'],
} as const;

const projectParam = {
  name: 'project',
  in: 'path',
  required: true,
  description: 'Project key, e.g. `purpur`.',
  schema: { type: 'string' },
} as const;

const versionParam = {
  name: 'version',
  in: 'path',
  required: true,
  description: 'Version key, e.g. `1.21.4`.',
  schema: { type: 'string' },
} as const;

const notFound = {
  description: 'Resource not found',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
} as const;

export function openApiDocument(origin: string) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BX Team API',
      version: '1.0.0',
      description:
        'Public API for BX Team downloads (Atlas). Browse projects, their Minecraft ' +
        'version groups, and per-version builds with checksummed download artifacts.',
      license: { name: 'AGPL-3.0-only', url: 'https://www.gnu.org/licenses/agpl-3.0.html' },
    },
    servers: [{ url: origin }],
    tags: [
      { name: 'Atlas', description: 'Project, version and build metadata for downloads.' },
      { name: 'Meta', description: 'Service metadata.' },
    ],
    paths: {
      '/atlas/projects': {
        get: {
          tags: ['Atlas'],
          summary: 'List projects',
          operationId: 'listProjects',
          responses: {
            200: {
              description: 'All projects with their grouped versions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { projects: { type: 'array', items: { $ref: '#/components/schemas/Project' } } },
                    required: ['projects'],
                  },
                },
              },
            },
          },
        },
      },
      '/atlas/projects/{project}': {
        get: {
          tags: ['Atlas'],
          summary: 'Get a project',
          operationId: 'getProject',
          parameters: [projectParam],
          responses: {
            200: {
              description: 'Project with its grouped versions',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Project' } } },
            },
            404: notFound,
          },
        },
      },
      '/atlas/projects/{project}/versions': {
        get: {
          tags: ['Atlas'],
          summary: 'List a project’s versions',
          operationId: 'listVersions',
          parameters: [projectParam],
          responses: {
            200: {
              description: 'Every version of the project with its build numbers',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Version' } },
                },
              },
            },
            404: notFound,
          },
        },
      },
      '/atlas/projects/{project}/versions/{version}': {
        get: {
          tags: ['Atlas'],
          summary: 'Get a version',
          operationId: 'getVersion',
          parameters: [projectParam, versionParam],
          responses: {
            200: {
              description: 'A single version with its build numbers',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Version' } } },
            },
            404: notFound,
          },
        },
      },
      '/atlas/projects/{project}/versions/{version}/builds': {
        get: {
          tags: ['Atlas'],
          summary: 'List builds for a version',
          operationId: 'listBuilds',
          parameters: [
            projectParam,
            versionParam,
            {
              name: 'channel',
              in: 'query',
              required: false,
              description: 'Filter by release channel.',
              schema: { type: 'string', enum: ['ALPHA', 'BETA', 'STABLE'] },
            },
          ],
          responses: {
            200: {
              description: 'Builds newest-first',
              content: {
                'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Build' } } },
              },
            },
            404: notFound,
          },
        },
      },
      '/atlas/projects/{project}/versions/{version}/builds/latest': {
        get: {
          tags: ['Atlas'],
          summary: 'Get the latest build',
          operationId: 'getLatestBuild',
          parameters: [projectParam, versionParam],
          responses: {
            200: {
              description: 'The highest-numbered build for the version',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Build' } } },
            },
            404: notFound,
          },
        },
      },
      '/atlas/projects/{project}/versions/{version}/builds/{build}': {
        get: {
          tags: ['Atlas'],
          summary: 'Get a build',
          operationId: 'getBuild',
          parameters: [
            projectParam,
            versionParam,
            {
              name: 'build',
              in: 'path',
              required: true,
              description: 'Build number.',
              schema: { type: 'integer' },
            },
          ],
          responses: {
            200: {
              description: 'A single build',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Build' } } },
            },
            404: notFound,
          },
        },
      },
      '/location': {
        get: {
          tags: ['Meta'],
          summary: 'Edge location that served the request',
          operationId: 'getLocation',
          responses: {
            200: {
              description: 'Cloudflare colo and coarse geolocation for the caller',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      colo: { type: 'string', nullable: true, example: 'WAW' },
                      city: { type: 'string', nullable: true, example: 'Warsaw' },
                      country: { type: 'string', nullable: true, example: 'PL' },
                    },
                    required: ['colo', 'city', 'country'],
                  },
                },
              },
            },
          },
        },
      },
      '/health': {
        get: {
          tags: ['Meta'],
          summary: 'Health check',
          operationId: 'health',
          responses: {
            200: {
              description: 'Service is up',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string', example: 'ok' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Error: errorResponse,
        Download: download,
        Build: build,
        Version: version,
        Project: project,
      },
    },
  };
}
