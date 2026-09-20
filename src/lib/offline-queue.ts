"use client";

// A tiny localStorage-backed queue for status-update POSTs made while
// offline. Deliberately narrow — only for the therapist PWA's own
// button-tap actions, not a general offline framework. Never reports a
// queued action as "synced" until the request has actually succeeded.
const KEY = "lj-offline-queue";

interface QueuedRequest {
  id: string;
  url: string;
  body: unknown;
}

function readQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(queue));
}

export function queueLength(): number {
  return readQueue().length;
}

export function enqueue(url: string, body: unknown): void {
  const queue = readQueue();
  queue.push({ id: crypto.randomUUID(), url, body });
  writeQueue(queue);
}

/** Attempts every queued request in order; stops at the first failure so ordering is preserved. */
export async function flushQueue(): Promise<{ succeeded: number; remaining: number }> {
  const queue = readQueue();
  let succeeded = 0;
  while (queue.length > 0) {
    const [next] = queue;
    try {
      const res = await fetch(next.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next.body),
      });
      if (!res.ok) break;
      queue.shift();
      succeeded++;
    } catch {
      break;
    }
  }
  writeQueue(queue);
  return { succeeded, remaining: queue.length };
}
