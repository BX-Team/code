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

export type Repository = z.infer<typeof RepositorySchema>;
export type User = z.infer<typeof UserSchema>;
export type PushEvent = z.infer<typeof PushEventSchema>;
export type PullRequestEvent = z.infer<typeof PullRequestEventSchema>;
export type IssuesEvent = z.infer<typeof IssuesEventSchema>;
export type IssueCommentEvent = z.infer<typeof IssueCommentEventSchema>;
export type ReleaseEvent = z.infer<typeof ReleaseEventSchema>;
