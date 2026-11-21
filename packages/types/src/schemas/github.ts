import { z } from 'zod';

/** The subset of GitHub App webhook payloads the bot acts on; unknown fields are dropped. */
const RepositorySchema = z.object({
  name: z.string(),
  full_name: z.string(),
  html_url: z.string(),
  default_branch: z.string(),
  owner: z.object({ login: z.string() }),
});

const UserSchema = z.object({
  login: z.string(),
  type: z.string(),
  avatar_url: z.string().optional(),
  html_url: z.string().optional(),
});

const InstallationSchema = z.object({ id: z.number().int() });

const base = {
  repository: RepositorySchema,
  installation: InstallationSchema,
  sender: UserSchema,
};

export const PushEventSchema = z.object({
  ...base,
  ref: z.string(),
  deleted: z.boolean().default(false),
  compare: z.string().optional(),
  commits: z.array(z.object({ id: z.string(), message: z.string(), url: z.string() })).default([]),
});

export const PullRequestEventSchema = z.object({
  ...base,
  action: z.string(),
  /** Present on `edited`; only the fields that changed. */
  changes: z.object({ title: z.object({ from: z.string() }).optional() }).optional(),
  pull_request: z.object({
    number: z.number().int(),
    node_id: z.string(),
    title: z.string(),
    body: z.string().nullish(),
    html_url: z.string(),
    merged: z.boolean().nullish(),
    merged_by: UserSchema.nullish(),
    merge_commit_sha: z.string().nullish(),
    user: UserSchema,
    head: z.object({ ref: z.string(), sha: z.string() }),
    base: z.object({ ref: z.string() }),
  }),
});

export const IssuesEventSchema = z.object({
  ...base,
  action: z.string(),
  issue: z.object({
    node_id: z.string(),
    body: z.string().nullish(),
    state_reason: z.string().nullish(),
    user: UserSchema,
  }),
});

export const IssueCommentEventSchema = z.object({
  ...base,
  action: z.string(),
  issue: z.object({
    number: z.number().int(),
    pull_request: z.object({}).nullish(),
  }),
  comment: z.object({
    id: z.number().int(),
    body: z.string(),
    user: UserSchema,
  }),
});

export const ReleaseEventSchema = z.object({
  ...base,
  action: z.string(),
  release: z.object({
    name: z.string().nullish(),
    tag_name: z.string(),
    html_url: z.string(),
    body: z.string().nullish(),
    draft: z.boolean(),
    prerelease: z.boolean(),
    author: UserSchema.nullish(),
  }),
});

export const WorkflowRunEventSchema = z.object({
  ...base,
  action: z.string(),
  workflow_run: z.object({
    id: z.number().int(),
    workflow_id: z.number().int(),
    name: z.string().nullish(),
    html_url: z.string(),
    /** The tag name, for a run started by a tag push. */
    head_branch: z.string().nullish(),
    head_sha: z.string(),
    event: z.string(),
    conclusion: z.string().nullish(),
    run_attempt: z.number().int().default(1),
    /** Empty for a pull request from a fork. */
    pull_requests: z.array(z.object({ number: z.number().int() })).default([]),
    head_repository: z.object({ owner: z.object({ login: z.string() }) }).nullish(),
  }),
});

/** A release as the REST API lists it (`GET /repos/{owner}/{repo}/releases`) — what the site shows for a project published only on GitHub. */
export const RestReleaseSchema = z.object({
  tag_name: z.string(),
  name: z.string().nullish(),
  body: z.string().nullish(),
  html_url: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  assets: z.array(
    z.object({
      name: z.string(),
      size: z.number().int(),
      browser_download_url: z.string(),
    }),
  ),
});

export const RestReleaseListSchema = z.array(RestReleaseSchema);

/** A recursive tree (`GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1`) — how the site finds a skill's files. */
export const RestTreeSchema = z.object({
  truncated: z.boolean(),
  tree: z.array(z.object({ path: z.string(), type: z.string() })),
});

/** The path of the bot's anonymous download of a pull request's artifact: `/artifacts/{owner}/{repo}/{id}`. */
export const ArtifactPathSchema = z.object({
  owner: z.string().regex(/^[\w.-]+$/),
  repo: z.string().regex(/^[\w.-]+$/),
  id: z.coerce.number().int().positive(),
});

export type Repository = z.infer<typeof RepositorySchema>;
export type User = z.infer<typeof UserSchema>;
export type PushEvent = z.infer<typeof PushEventSchema>;
export type PullRequestEvent = z.infer<typeof PullRequestEventSchema>;
export type IssuesEvent = z.infer<typeof IssuesEventSchema>;
export type IssueCommentEvent = z.infer<typeof IssueCommentEventSchema>;
export type ReleaseEvent = z.infer<typeof ReleaseEventSchema>;
export type WorkflowRunEvent = z.infer<typeof WorkflowRunEventSchema>;
export type RestRelease = z.infer<typeof RestReleaseSchema>;
