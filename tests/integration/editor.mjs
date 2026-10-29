import path from "node:path";
import { chromium, expect } from "@playwright/test";

export async function verifyEditor(baseUrl, cookie, workflowId, evidence) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    await context.addCookies(
      cookie.split("; ").map((entry) => {
        const separator = entry.indexOf("=");
        return {
          name: entry.slice(0, separator),
          value: entry.slice(separator + 1),
          domain: "127.0.0.1",
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        };
      }),
    );
    const page = await context.newPage();
    await page.goto(`${baseUrl}/workflow/${workflowId}`);
    await expect(page.getByText("Open Tab", { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText("Camoufox", { exact: true })).toBeVisible();
    const checklistClose = page.locator(
      '[data-test-id="suggested-actions-close"]',
    );
    if (await checklistClose.isVisible()) await checklistClose.click();
    await page.screenshot({
      path: path.join(evidence, "editor.png"),
      fullPage: true,
    });
  } finally {
    await browser.close();
  }
}
