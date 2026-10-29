import type { IDataObject } from "n8n-workflow";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry));
  return (
    isRecord(value) && Object.values(value).every((entry) => isJsonValue(entry))
  );
}

export function isJsonObject(value: unknown): value is IDataObject {
  return (
    isRecord(value) && Object.values(value).every((entry) => isJsonValue(entry))
  );
}

export function responseObject(value: unknown): IDataObject {
  if (!isJsonObject(value))
    throw new Error("The browser service returned an invalid JSON object.");
  if (
    value.ok === false ||
    value.success === false ||
    typeof value.error === "string"
  ) {
    throw new Error(
      "The browser service could not complete this action. Take a fresh snapshot and check the target.",
    );
  }
  return value;
}

export function errorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  for (const candidate of [error.statusCode, error.httpCode, error.status]) {
    const status =
      typeof candidate === "string" ? Number(candidate) : candidate;
    if (
      typeof status === "number" &&
      Number.isSafeInteger(status) &&
      status >= 100 &&
      status <= 599
    )
      return status;
  }
  return isRecord(error.response) ? errorStatus(error.response) : undefined;
}

export function serviceErrorMessage(error: unknown): string {
  switch (errorStatus(error)) {
    case 401:
    case 403: {
      return "The browser service rejected the access key. Check the Camoufox API credential.";
    }
    case 404: {
      return "The tab is no longer available. Use List Tabs or Open Tab to choose a current tab.";
    }
    case 409:
    case 422: {
      return "The page or element reference changed. Get a fresh snapshot before retrying this action.";
    }
    case 429: {
      return "The browser service is busy or has reached its tab limit. Wait or close an unused tab.";
    }
    case undefined:
    default: {
      return "The browser request failed. Check the service connection, target and request timeout.";
    }
  }
}
