import {
  NodeOperationError,
  type IDataObject,
  type IExecuteFunctions,
  type IHttpRequestOptions,
  type INodeExecutionData,
} from "n8n-workflow";
import type { Operation } from "./actions";
import type { RequestPlan } from "./request-plan";
import { httpUrl } from "./request-plan";
import { responseObject, serviceErrorMessage } from "./response";

export function serviceUrl(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error("Set the Service URL in the Camoufox API credential.");
  const url = new URL(httpUrl(value));
  if (url.search !== "" || url.hash !== "")
    throw new Error(
      "The Service URL must not include query parameters or a fragment.",
    );
  return url.href.replace(/\/$/, "");
}

export async function sendRequest(
  context: IExecuteFunctions,
  options: IHttpRequestOptions,
  itemIndex: number,
): Promise<unknown> {
  try {
    const response: unknown =
      await context.helpers.httpRequestWithAuthentication.call(
        context,
        "camoufoxApi",
        options,
      );
    return response;
  } catch (error) {
    // Upstream request errors can include headers and bodies. Keep them out of saved executions.
    throw new NodeOperationError(
      context.getNode(),
      serviceErrorMessage(error),
      { itemIndex },
    );
  }
}

export function requestContext(plan: RequestPlan): IDataObject {
  return {
    ...(plan.userId !== undefined && { userId: plan.userId }),
    ...(plan.tabId !== undefined && { tabId: plan.tabId }),
    ...(plan.sessionKey !== undefined && { sessionKey: plan.sessionKey }),
  };
}

export async function executeRequest(
  context: IExecuteFunctions,
  operation: Operation,
  plan: RequestPlan,
  baseUrl: string,
  timeout: number,
  itemIndex: number,
): Promise<INodeExecutionData> {
  if (plan.requireExistingTab === true) {
    responseObject(
      await sendRequest(
        context,
        {
          method: "GET",
          url: `${baseUrl}/tabs/${encodeURIComponent(plan.tabId ?? "")}/stats`,
          qs: { userId: plan.userId },
          json: true,
          timeout,
        },
        itemIndex,
      ),
    );
  }
  const options: IHttpRequestOptions = {
    method: plan.method,
    url: baseUrl + plan.path,
    qs: plan.query,
    ...(plan.body !== undefined && { body: plan.body }),
    json: operation !== "takeScreenshot",
    timeout,
    // Redirecting the API request could disclose its access key to another service.
    disableFollowRedirect: true,
  };
  const json = requestContext(plan);
  if (operation === "takeScreenshot") {
    const response = await sendRequest(
      context,
      { ...options, encoding: "arraybuffer" },
      itemIndex,
    );
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (
      !Buffer.isBuffer(response) ||
      !response.subarray(0, 8).equals(signature)
    ) {
      throw new NodeOperationError(
        context.getNode(),
        "The browser service did not return a PNG screenshot.",
        { itemIndex },
      );
    }
    const property = context.getNodeParameter("binaryPropertyName", itemIndex);
    if (typeof property !== "string" || !/^[\w-]+$/.test(property))
      throw new NodeOperationError(
        context.getNode(),
        "Choose a valid output file field name.",
        { itemIndex },
      );
    const binary = await context.helpers.prepareBinaryData(
      response,
      "screenshot.png",
      "image/png",
    );
    return {
      json: { ...json, mimeType: "image/png", fileName: "screenshot.png" },
      binary: { [property]: binary },
      pairedItem: { item: itemIndex },
    };
  }
  const response = responseObject(
    await sendRequest(context, options, itemIndex),
  );
  if (
    response.navigationOk === false ||
    (typeof response.httpStatus === "number" && response.httpStatus >= 400)
  ) {
    throw new NodeOperationError(
      context.getNode(),
      "The destination returned an HTTP error page. Inspect the URL and website before continuing.",
      { itemIndex },
    );
  }
  return { json: { ...response, ...json }, pairedItem: { item: itemIndex } };
}
