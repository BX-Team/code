import type { PublishEvent } from '@bx-team/types/schema/downloads';
import { sign } from '@bx-team/worker/signature';

/**
 * Tells the bot what was published. A failure is logged and swallowed: the artifact and
 * its row are already committed, and a missing Discord message is not worth a 500 that
 * would make a workflow retry the whole upload.
 */
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
