import type { ApiContract } from '@bx-team/types/api';
import type { Download } from '@bx-team/types/schema/downloads';
import { type ClientResponse, hc, parseResponse } from 'hono/client';
import { RESOURCES } from '../config/resources';

export type {
  Build,
  Channel,
  Commit,
  Download,
  Project,
  ProjectSummary,
  Release,
} from '@bx-team/types/schema/downloads';

/**
 * `no-cache` matters on the read-back after a publish: the API edge-caches its public
 * GETs, and an announcement must not describe the build before this one.
 */
const api = hc<ApiContract>(RESOURCES.api, {
  headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
}).v1;

/** The body of a 200, or null for anything else — a missing project is not an error here. */
async function body<R extends ClientResponse<unknown>>(request: Promise<R>) {
  const response = await request;
  return response.ok ? await parseResponse(response) : null;
}

export function listProjects() {
  return body(api.projects.$get());
}

export function getProject(project: string) {
  return body(api.projects[':project'].$get({ param: { project } }));
}

export function getBuild(project: string, version: string, build: number) {
  return body(api.builds[':project'][':version'][':build'].$get({ param: { project, version, build: String(build) } }));
}

export function getLatestBuild(project: string, version: string) {
  return body(api.builds[':project'][':version'].latest.$get({ param: { project, version } }));
}

export function getRelease(project: string, tag: string) {
  return body(api.releases[':project'][':tag'].$get({ param: { project, tag } }));
}

export function getLatestRelease(project: string) {
  return body(api.releases[':project'].latest.$get({ param: { project } }));
}

/** A publish uploads whatever its workflow handed over: `application` when there is one. */
export function primaryDownload(downloads: Record<string, Download>): Download | undefined {
  return downloads.application ?? Object.values(downloads)[0];
}
