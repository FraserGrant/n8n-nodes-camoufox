import type { INodeProperties } from "n8n-workflow";
import { actions, tabOperations } from "./actions";

function textField(
  name: string,
  displayName: string,
  operations: string[],
  extra: Partial<INodeProperties> = {},
): INodeProperties {
  return {
    displayName,
    name,
    type: "string",
    default: "",
    required: true,
    displayOptions: { show: { operation: operations } },
    ...extra,
  };
}

const targetedActions = ["click", "typeText", "selectOption"];

export const properties: INodeProperties[] = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    noDataExpression: true,
    default: "openTab",
    options: Object.entries(actions)
      .map(([value, details]) => ({ value, ...details }))
      .toSorted((left, right) => left.name.localeCompare(right.name)),
  },
  textField(
    "userId",
    "Browser User ID",
    Object.keys(actions).filter((name) => name !== "checkConnection"),
    {
      default: '={{ $json.userId || "n8n" }}',
      description:
        "Stable browser identity that owns the cookies and tabs. Reuse this value to share a signed-in session.",
    },
  ),
  textField("tabId", "Tab ID", tabOperations, {
    default: "={{ $json.tabId }}",
    description: "The tab returned by Open Tab or List Tabs",
  }),
  textField("sessionKey", "Session Name", ["openTab"], {
    default: "n8n",
    description: "Group related tabs under the same session name",
  }),
  textField("url", "URL", ["openTab", "navigate"], {
    placeholder: "https://example.com",
    description: "The full HTTP or HTTPS URL to open",
  }),
  {
    displayName: "Find Element By",
    name: "targetType",
    type: "options",
    default: "selector",
    displayOptions: { show: { operation: targetedActions } },
    options: [
      {
        name: "CSS Selector",
        value: "selector",
        description: 'A selector such as #email or button[type="submit"]',
      },
      {
        name: "Snapshot Reference",
        value: "ref",
        description:
          "A current element reference from Get Snapshot, such as e3",
      },
    ],
  },
  textField("target", "Element", targetedActions, {
    placeholder: "#email",
    description:
      "CSS selector or current snapshot reference, depending on Find Element By",
  }),
  textField("text", "Text", ["typeText"], {
    required: false,
    description:
      "Text to enter. Fill Field replaces existing text; Keyboard appends using key events.",
  }),
  {
    displayName: "Typing Mode",
    name: "typingMode",
    type: "options",
    default: "fill",
    displayOptions: { show: { operation: ["typeText"] } },
    options: [
      { name: "Fill Field", value: "fill" },
      { name: "Keyboard", value: "keyboard" },
    ],
  },
  textField("key", "Key", ["pressKey"], {
    default: "Enter",
    placeholder: "Enter",
    description: "A Playwright key name, such as Enter, Escape or Control+A",
  }),
  textField("option", "Option Label", ["selectOption"], {
    description: "The visible option label to select, such as Green",
  }),
  {
    displayName: "Direction",
    name: "direction",
    type: "options",
    default: "down",
    displayOptions: { show: { operation: ["scroll"] } },
    options: [
      { name: "Down", value: "down" },
      { name: "Up", value: "up" },
    ],
  },
  {
    displayName: "Distance (Pixels)",
    name: "amount",
    type: "number",
    default: 600,
    typeOptions: { minValue: 1, maxValue: 100_000 },
    displayOptions: { show: { operation: ["scroll"] } },
  },
  textField("selector", "CSS Selector", ["waitForElement"], {
    placeholder: "#results",
    description: "Wait until this element is visible",
  }),
  {
    displayName: "Wait Timeout (Ms)",
    name: "waitTimeout",
    type: "number",
    default: 10_000,
    typeOptions: { minValue: 1, maxValue: 120_000 },
    displayOptions: { show: { operation: ["waitForElement"] } },
  },
  {
    displayName: "Full Page",
    name: "fullPage",
    type: "boolean",
    default: false,
    displayOptions: { show: { operation: ["takeScreenshot"] } },
    description:
      "Whether to capture the whole page rather than only the viewport",
  },
  textField(
    "binaryPropertyName",
    "Put Output File in Field",
    ["takeScreenshot"],
    {
      default: "data",
      description: "The binary field to hold the screenshot",
    },
  ),
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    placeholder: "Add Option",
    default: {},
    options: [
      {
        displayName: "Request Timeout (Ms)",
        name: "requestTimeout",
        type: "number",
        default: 120_000,
        typeOptions: { minValue: 1000, maxValue: 180_000 },
        description: "Maximum time to wait for one browser API request",
      },
      {
        displayName: "Snapshot Offset",
        name: "snapshotOffset",
        type: "number",
        default: 0,
        typeOptions: { minValue: 0 },
        displayOptions: { show: { "/operation": ["getSnapshot"] } },
        description: "Continue a truncated snapshot using its nextOffset value",
      },
    ],
  },
];
