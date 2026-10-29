import type { IDataObject, IHttpRequestMethods } from "n8n-workflow";
import type { Operation } from "./actions";

export interface ParameterReader {
  text(name: string, allowEmpty?: boolean): string;
  number(name: string, minimum: number, maximum: number): number;
  boolean(name: string): boolean;
}

export interface RequestPlan {
  method: IHttpRequestMethods;
  path: string;
  query: IDataObject;
  body?: IDataObject;
  userId?: string;
  tabId?: string;
  sessionKey?: string;
  requireExistingTab?: boolean;
}

export function httpUrl(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== ""
  ) {
    throw new Error("Use an HTTP or HTTPS URL without embedded credentials.");
  }
  return url.href;
}

function elementTarget(parameters: ParameterReader): IDataObject {
  const targetType = parameters.text("targetType");
  const target = parameters.text("target");
  if (targetType === "selector") return { selector: target };
  if (targetType === "ref") return { ref: target.replace(/^@/, "") };
  throw new Error(
    "Select CSS Selector or Snapshot Reference to identify the element.",
  );
}

export function planRequest(
  operation: Operation,
  parameters: ParameterReader,
): RequestPlan {
  if (operation === "checkConnection")
    return { method: "GET", path: "/", query: {} };
  const userId = parameters.text("userId");
  if (operation === "listTabs")
    return { method: "GET", path: "/tabs", query: { userId }, userId };
  if (operation === "openTab") {
    const sessionKey = parameters.text("sessionKey");
    return {
      method: "POST",
      path: "/tabs",
      query: {},
      body: { userId, sessionKey, url: httpUrl(parameters.text("url")) },
      userId,
      sessionKey,
    };
  }

  const tabId = parameters.text("tabId");
  const path = `/tabs/${encodeURIComponent(tabId)}`;
  const read = (suffix: string): RequestPlan => ({
    method: "GET",
    path: path + suffix,
    query: { userId },
    userId,
    tabId,
  });
  const write = (suffix: string, body: IDataObject = {}): RequestPlan => ({
    method: "POST",
    path: path + suffix,
    query: {},
    body: { userId, ...body },
    userId,
    tabId,
  });

  switch (operation) {
    case "getSnapshot": {
      return read("/snapshot");
    }
    case "getTab": {
      return read("/stats");
    }
    case "getLinks": {
      return read("/links");
    }
    case "getImages": {
      return read("/images");
    }
    case "takeScreenshot": {
      return {
        ...read("/screenshot"),
        query: { userId, fullPage: parameters.boolean("fullPage") },
      };
    }
    case "closeTab": {
      return { ...read(""), method: "DELETE" };
    }
    case "navigate": {
      return {
        ...write("/navigate", { url: httpUrl(parameters.text("url")) }),
        requireExistingTab: true,
      };
    }
    case "back": {
      return write("/back");
    }
    case "forward": {
      return write("/forward");
    }
    case "refresh": {
      return write("/refresh");
    }
    case "click": {
      return write("/click", elementTarget(parameters));
    }
    case "typeText": {
      const mode = parameters.text("typingMode");
      if (!["fill", "keyboard"].includes(mode))
        throw new Error("Select Fill Field or Keyboard for Typing Mode.");
      return write("/type", {
        ...elementTarget(parameters),
        text: parameters.text("text", true),
        mode,
      });
    }
    case "pressKey": {
      return write("/press", { key: parameters.text("key") });
    }
    case "selectOption": {
      return write("/select", {
        ...elementTarget(parameters),
        option: parameters.text("option"),
      });
    }
    case "scroll": {
      const direction = parameters.text("direction");
      if (!["up", "down"].includes(direction))
        throw new Error("Choose Up or Down for Direction.");
      return write("/scroll", {
        direction,
        amount: parameters.number("amount", 1, 100_000),
      });
    }
    case "waitForElement": {
      return write("/wait", {
        selector: parameters.text("selector"),
        timeout: parameters.number("waitTimeout", 1, 120_000),
      });
    }
  }
}
