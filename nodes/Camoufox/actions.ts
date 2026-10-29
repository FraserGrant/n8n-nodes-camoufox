export const actions = {
  back: {
    name: "Go Back",
    description: "Return to the previous page",
    action: "Go back in a tab",
  },
  checkConnection: {
    name: "Check Connection",
    description: "Check the browser service without opening a page",
    action: "Check the browser connection",
  },
  click: {
    name: "Click Element",
    description: "Click an element using a snapshot reference or CSS selector",
    action: "Click an element",
  },
  closeTab: {
    name: "Close Tab",
    description: "Close a single tab while retaining the browser session",
    action: "Close a tab",
  },
  forward: {
    name: "Go Forward",
    description: "Return to the next page in browsing history",
    action: "Go forward in a tab",
  },
  getImages: {
    name: "Get Images",
    description: "Read the images on the current page",
    action: "Get page images",
  },
  getLinks: {
    name: "Get Links",
    description: "Read the links on the current page",
    action: "Get page links",
  },
  getSnapshot: {
    name: "Get Snapshot",
    description: "Read accessible page content and current element references",
    action: "Get a page snapshot",
  },
  getTab: {
    name: "Get Tab",
    description: "Read the current URL and tab statistics",
    action: "Get a tab",
  },
  listTabs: {
    name: "List Tabs",
    description: "List open tabs for the selected browser user",
    action: "List tabs",
  },
  navigate: {
    name: "Navigate",
    description: "Open a URL in an existing tab",
    action: "Navigate a tab",
  },
  openTab: {
    name: "Open Tab",
    description: "Create a tab in a shared browser session",
    action: "Open a tab",
  },
  pressKey: {
    name: "Press Key",
    description: "Press a keyboard key in the current tab",
    action: "Press a key",
  },
  refresh: {
    name: "Refresh Page",
    description: "Reload the current page",
    action: "Refresh a page",
  },
  scroll: {
    name: "Scroll",
    description: "Scroll the page up or down",
    action: "Scroll a page",
  },
  selectOption: {
    name: "Select Option",
    description: "Select a native dropdown option by its visible label",
    action: "Select an option",
  },
  takeScreenshot: {
    name: "Take Screenshot",
    description: "Return a PNG image as an n8n binary file",
    action: "Take a screenshot",
  },
  typeText: {
    name: "Type Text",
    description: "Fill a field or type with keyboard events",
    action: "Type text",
  },
  waitForElement: {
    name: "Wait for Element",
    description: "Wait for a CSS selector to become visible",
    action: "Wait for an element",
  },
};

export type Operation = keyof typeof actions;
export const operationNames = Object.keys(actions);
export const tabOperations = operationNames.filter(
  (name) => !["checkConnection", "listTabs", "openTab"].includes(name),
);

export function isOperation(value: string): value is Operation {
  return Object.hasOwn(actions, value);
}

export const canvasSubtitle = `={{ (${JSON.stringify(Object.fromEntries(Object.entries(actions).map(([name, value]) => [name, value.name])))})[$parameter["operation"]] }}`;
