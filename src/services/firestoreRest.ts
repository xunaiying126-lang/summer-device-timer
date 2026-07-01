const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const householdId = import.meta.env.VITE_HOUSEHOLD_ID || "xu-family-summer-2026";

type FirestoreValue = {
  readonly stringValue?: string;
  readonly integerValue?: string;
};

type FirestoreDocument = {
  readonly fields?: Record<string, FirestoreValue>;
};

export class CloudSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudSyncError";
  }
}

export function isCloudConfigured(): boolean {
  return Boolean(apiKey && projectId);
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFirestoreValue(value: unknown): value is FirestoreValue {
  if (!isRecordValue(value)) {
    return false;
  }

  const stringValue = value.stringValue;
  const integerValue = value.integerValue;

  return (
    (stringValue === undefined || typeof stringValue === "string") &&
    (integerValue === undefined || typeof integerValue === "string")
  );
}

function isFirestoreDocument(value: unknown): value is FirestoreDocument {
  if (!isRecordValue(value)) {
    return false;
  }

  const fields = value.fields;
  if (fields === undefined) {
    return true;
  }

  if (!isRecordValue(fields)) {
    return false;
  }

  return Object.values(fields).every(isFirestoreValue);
}

function requireCloudConfig(): { readonly apiKey: string; readonly projectId: string } {
  if (!apiKey || !projectId) {
    throw new CloudSyncError("Firebase REST 同步未配置，当前为本地存储模式。");
  }

  return { apiKey, projectId };
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export function documentUrl(pathSegments: readonly string[]): string {
  const config = requireCloudConfig();
  const documentPath = pathSegments.map(encodeSegment).join("/");
  return `https://firestore.googleapis.com/v1/projects/${encodeSegment(
    config.projectId,
  )}/databases/(default)/documents/${documentPath}?key=${encodeURIComponent(config.apiKey)}`;
}

export function familyDocumentUrl(pathSegments: readonly string[]): string {
  return documentUrl(["families", householdId, ...pathSegments]);
}

export async function fetchJson(url: string, init?: RequestInit): Promise<unknown | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new CloudSyncError(`云同步请求失败：HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    return data;
  } catch (error: unknown) {
    if (error instanceof CloudSyncError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new CloudSyncError(error.message);
    }

    throw new CloudSyncError("云同步请求失败");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getPayload(document: unknown): string | null {
  if (!isFirestoreDocument(document)) {
    return null;
  }

  const payload = document.fields?.payload?.stringValue;
  return payload ?? null;
}

export function subscribePoll<T>(
  load: () => Promise<T>,
  serialize: (value: T) => string,
  onChange: (value: T) => void,
  onError: (error: Error) => void,
): () => void {
  let lastValue = "";
  let disposed = false;
  const tick = () => {
    void load()
      .then((value) => {
        if (disposed) {
          return;
        }

        const serialized = serialize(value);
        if (serialized !== lastValue) {
          lastValue = serialized;
          onChange(value);
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          onError(error instanceof Error ? error : new CloudSyncError("云同步轮询失败"));
        }
      });
  };

  tick();
  const intervalId = window.setInterval(tick, 2200);

  return () => {
    disposed = true;
    window.clearInterval(intervalId);
  };
}
