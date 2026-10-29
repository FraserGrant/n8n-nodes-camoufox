import { NodeOperationError, type IExecuteFunctions } from "n8n-workflow";
import type { ParameterReader } from "./request-plan";

export function parametersFor(
  context: IExecuteFunctions,
  itemIndex: number,
): ParameterReader {
  const invalid = (name: string): never => {
    throw new NodeOperationError(
      context.getNode(),
      `Check the ${name} parameter.`,
      { itemIndex },
    );
  };
  return {
    text(name, allowEmpty = false) {
      const value = context.getNodeParameter(name, itemIndex);
      if (typeof value !== "string" || (!allowEmpty && value.trim() === ""))
        return invalid(name);
      return value;
    },
    number(name, minimum, maximum) {
      const value = context.getNodeParameter(name, itemIndex);
      if (
        typeof value !== "number" ||
        !Number.isSafeInteger(value) ||
        value < minimum ||
        value > maximum
      )
        return invalid(name);
      return value;
    },
    boolean(name) {
      const value = context.getNodeParameter(name, itemIndex);
      if (typeof value !== "boolean") return invalid(name);
      return value;
    },
  };
}

export function requestTimeout(
  context: IExecuteFunctions,
  itemIndex: number,
): number {
  const value = context.getNodeParameter(
    "options.requestTimeout",
    itemIndex,
    120_000,
  );
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1000 &&
    value <= 180_000
  )
    return value;
  throw new NodeOperationError(
    context.getNode(),
    "Request Timeout must be between 1000 and 180000 milliseconds.",
    { itemIndex },
  );
}
