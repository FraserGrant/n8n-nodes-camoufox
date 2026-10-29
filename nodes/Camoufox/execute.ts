import {
  NodeOperationError,
  type IExecuteFunctions,
  type INodeExecutionData,
} from "n8n-workflow";
import { isOperation } from "./actions";
import { parametersFor, requestTimeout } from "./parameters";
import { planRequest } from "./request-plan";
import { executeRequest, serviceUrl } from "./transport";

export async function execute(
  context: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
  const input = context.getInputData();
  const results: INodeExecutionData[] = [];
  const credentials = await context.getCredentials("camoufoxApi");
  let baseUrl: string;
  try {
    baseUrl = serviceUrl(credentials.baseUrl);
  } catch {
    throw new NodeOperationError(
      context.getNode(),
      "Set a valid HTTP(S) Service URL without embedded credentials, query parameters or a fragment.",
    );
  }
  for (const [itemIndex] of input.entries()) {
    try {
      const parameters = parametersFor(context, itemIndex);
      const operation = parameters.text("operation");
      if (!isOperation(operation))
        throw new NodeOperationError(
          context.getNode(),
          "Choose a supported Camoufox operation.",
          { itemIndex },
        );
      const plan = planRequest(operation, parameters);
      if (operation === "getSnapshot") {
        const offset = context.getNodeParameter(
          "options.snapshotOffset",
          itemIndex,
          0,
        );
        if (
          typeof offset !== "number" ||
          !Number.isSafeInteger(offset) ||
          offset < 0
        )
          throw new NodeOperationError(
            context.getNode(),
            "Snapshot Offset must be a non-negative integer.",
            { itemIndex },
          );
        plan.query.offset = offset;
      }
      results.push(
        await executeRequest(
          context,
          operation,
          plan,
          baseUrl,
          requestTimeout(context, itemIndex),
          itemIndex,
        ),
      );
    } catch (error) {
      const message =
        error instanceof NodeOperationError
          ? error.message
          : "Check the action parameters and the browser response.";
      if (!context.continueOnFail())
        throw new NodeOperationError(context.getNode(), message, { itemIndex });
      results.push({
        json: { error: message },
        pairedItem: { item: itemIndex },
      });
    }
  }
  return [results];
}
