import type { PublishEvent } from '@bx-team/types/schema/downloads';
import { sign } from '@bx-team/worker/signature';

/** A failure is only logged: the build is committed, and a 500 would make the workflow retry the upload. */
export async function announcePublish(url: string, secret: string, event: PublishEvent): Promise<void> {
  if (!url || !secret) return;

  const body = JSON.stringify(event);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Signature': await sign(secret, body),
      },
      body,
    });
    if (!response.ok) console.error(`Publish announcement rejected with ${response.status}`);
  } catch (error) {
    console.error('Failed to announce publish', error);
  }
}
