import type {
  Icon,
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class CamoufoxApi implements ICredentialType {
  name = "camoufoxApi";
  displayName = "Camoufox API";
  documentationUrl =
    "https://github.com/FraserGrant/n8n-nodes-camoufox#credentials";
  icon: Icon = {
    light: "file:../nodes/Camoufox/camoufox.svg",
    dark: "file:../nodes/Camoufox/camoufox.svg",
  };
  properties: INodeProperties[] = [
    {
      displayName: "Service URL",
      name: "baseUrl",
      type: "string",
      default: "http://browser:9377",
      required: true,
      placeholder: "http://browser:9377",
      description:
        "Address of the Camofox REST service, reachable from n8n. This is not a Playwright WebSocket URL.",
    },
    {
      displayName: "Access Key",
      name: "apiKey",
      type: "string",
      typeOptions: { password: true },
      default: "",
      description:
        "The service CAMOFOX_ACCESS_KEY, if configured. Leave empty only for a trusted private service without access-key authentication.",
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: {
        Authorization:
          '={{ $credentials.apiKey ? "Bearer " + $credentials.apiKey : "" }}',
      },
    },
  };
  test: ICredentialTestRequest = {
    request: {
      baseURL: "={{$credentials.baseUrl}}",
      url: "/",
      method: "GET",
      timeout: 10_000,
    },
  };
}
