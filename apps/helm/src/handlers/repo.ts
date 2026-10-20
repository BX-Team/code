import type { Repository } from '@bx-team/types/schema/github';
import type { RepoRef } from '../release/pull';

export function repoRef(repository: Repository): RepoRef {
  return { full: repository.full_name, owner: repository.owner.login, defaultBranch: repository.default_branch };
}
