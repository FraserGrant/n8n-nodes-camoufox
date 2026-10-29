import {
  NodeConnectionTypes,
  type IExecuteFunctions,
  type INodeExecutionData,
  type INodeType,
  type INodeTypeDescription,
} from "n8n-workflow";
import { canvasSubtitle } from "./actions";
import { properties } from "./properties";
import { execute } from "./execute";

export class Camoufox implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Camoufox",
    name: "camoufox",
    icon: { light: "file:camoufox.svg", dark: "file:camoufox.svg" },
    group: ["transform"],
    version: 1,
    subtitle: canvasSubtitle,
    description: "Automate a shared Camoufox browser through the Camofox API",
    defaults: { name: "Camoufox" },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [{ name: "camoufoxApi", required: true }],
    usableAsTool: true,
    properties,
  };

  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return execute(this);
  }
}
