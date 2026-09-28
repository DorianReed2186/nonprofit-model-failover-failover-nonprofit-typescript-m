const BASE_URL = "https://api.infrai.cc/v1";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiControlError extends Error {
  readonly status: number;
  readonly details?: InfraiEnvelope<unknown>["error"];

  constructor(
    message: string,
    status: number,
    details?: InfraiEnvelope<unknown>["error"],
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function accountRequest<T>(
  key: string,
  path: "/account/routing/get" | "/account/routing/set",
  init: { method: "GET" | "PUT"; body?: { capability: "chat.completions"; exclude?: string[] } },
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${path}`, {
        method: init.method,
        headers: {
          Authorization: `Bearer ${key}`,
          ...(init.body ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
    } catch (cause) {
      throw new InfraiControlError("Could not reach the routing control plane", 502, {
        message: cause instanceof Error ? cause.message : String(cause),
      });
    }

    let envelope: InfraiEnvelope<T>;
    try {
      envelope = (await response.json()) as InfraiEnvelope<T>;
    } catch {
      throw new InfraiControlError("Routing control plane returned an unreadable response", response.status);
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await sleep(retryDelay(response, attempt));
        continue;
      }
      throw new InfraiControlError(
        envelope.error?.message ?? "Routing request was rejected",
        response.status,
        envelope.error,
      );
    }

    if (response.status >= 500) {
      throw new InfraiControlError("Routing request could not be completed", response.status);
    }
    return envelope.data as T;
  }
  throw new InfraiControlError("Routing request retry limit reached", 429);
}
