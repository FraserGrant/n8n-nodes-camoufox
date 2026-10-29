import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const browserImage =
  "ghcr.io/jo-inc/camofox-browser@sha256:9477a7b64305c86973a8cf5abf0f406dbcd7dab3bb8a8832fa1c3a6e534f5070";
export const defaultN8nImage =
  "docker.n8n.io/n8nio/n8n@sha256:bcb4e4917141f4a5249c8eadf2776d347f4c2ede75adfbbc82064826af9a8ead";

export function docker(...args) {
  return execFileSync("docker", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 600000,
  });
}

export async function startServices() {
  const id = `fg-camoufox-nodes-${randomBytes(5).toString("hex")}`;
  const label = `com.frasergrant.n8n-node-test=${id}`;
  const evidence = path.resolve(".local", id);
  const artifact = path.resolve(evidence, "artifact");
  const containers = [];
  const network = `${id}-network`;
  const volume = `${id}-n8n-data`;
  const n8nImage = process.env.N8N_TEST_IMAGE ?? defaultN8nImage;
  await mkdir(artifact, { recursive: true });
  const pack = JSON.parse(
    execFileSync("npm", ["pack", "--json", "--pack-destination", artifact], {
      encoding: "utf8",
    }),
  );
  const tarball = pack[0].filename;
  if (
    pack[0].files.some((file) =>
      /(^|\/)(tests|\.local|node_modules)\//.test(file.path),
    )
  )
    throw new Error("The npm archive includes development-only files.");
  await copyFile(
    path.join(artifact, tarball),
    path.resolve(".local/package.tgz"),
  );
  docker("network", "create", "--label", label, network);
  docker("volume", "create", "--label", label, volume);
  async function cleanup() {
    for (const container of containers.toReversed()) {
      try {
        await writeFile(
          path.join(evidence, `${container}.log`),
          docker("logs", container),
        );
        docker("rm", "--force", container);
      } catch (error) {
        console.error(
          `Could not clean test container ${container}: ${error.message}`,
        );
      }
    }
    docker("volume", "rm", volume);
    docker("network", "rm", network);
  }
  function create(role, args) {
    const name = `${id}-${role}`;
    docker(
      "create",
      "--name",
      name,
      "--label",
      label,
      "--network",
      network,
      "--network-alias",
      role,
      ...args,
    );
    containers.push(name);
    return name;
  }
  try {
    console.info(
      "Installing the npm tarball into fresh n8n community-package storage",
    );
    const installer = create("install", [
      "--entrypoint",
      "sh",
      "-v",
      `${volume}:/home/node/.n8n`,
      "-v",
      `${artifact}:/artifact:ro`,
      n8nImage,
      "-c",
      `mkdir -p /home/node/.n8n/nodes && cd /home/node/.n8n/nodes && npm install --omit=dev --ignore-scripts --legacy-peer-deps --no-audit --no-fund /artifact/${tarball}`,
    ]);
    docker("start", "--attach", installer);
    const code = docker(
      "inspect",
      "--format",
      "{{.State.ExitCode}}",
      installer,
    ).trim();
    if (code !== "0")
      throw new Error("The npm package failed to install into n8n.");
    const fixture = create("fixture", [
      "--entrypoint",
      "node",
      "-v",
      `${path.resolve("tests/integration")}:/fixture:ro`,
      browserImage,
      "/fixture/site.cjs",
    ]);
    const browser = create("browser", [
      "--entrypoint",
      "node",
      "--shm-size",
      "1g",
      "--memory",
      "2g",
      "-e",
      "CAMOFOX_ACCESS_KEY=integration-test-key",
      "-e",
      "CAMOFOX_CRASH_REPORT_ENABLED=false",
      "-e",
      "ENABLE_VNC=0",
      browserImage,
      "server.js",
    ]);
    const n8n = create("n8n", [
      "-p",
      "127.0.0.1::5678",
      "-v",
      `${volume}:/home/node/.n8n`,
      "-e",
      "N8N_DIAGNOSTICS_ENABLED=false",
      "-e",
      "N8N_VERSION_NOTIFICATIONS_ENABLED=false",
      "-e",
      "N8N_PERSONALIZATION_ENABLED=false",
      "-e",
      "N8N_SECURE_COOKIE=false",
      "-e",
      "N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true",
      "-e",
      "N8N_COMMUNITY_PACKAGES_ENABLED=true",
      "-e",
      "N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true",
      "-e",
      "EXECUTIONS_DATA_SAVE_ON_SUCCESS=all",
      n8nImage,
    ]);
    for (const name of [fixture, browser, n8n]) docker("start", name);
    const port = docker("port", n8n, "5678/tcp").trim().split(":").at(-1);
    return {
      id,
      evidence,
      baseUrl: `http://127.0.0.1:${port}`,
      cleanup,
      n8n,
      browser,
      n8nImage,
      packageFiles: pack[0].files,
      resources: { containers, volume, network },
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
