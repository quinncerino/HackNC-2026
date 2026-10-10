import "dotenv/config";

import { config as loadEnvironment } from "dotenv";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import express, { type NextFunction, type Request, type Response } from "express";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";

const scaffoldEnvironment = loadEnvironment({
  path: new URL("../../nicetry/.env", import.meta.url),
}).parsed ?? {};
const backendEnvironment = loadEnvironment({
  path: new URL("../../backend/.env", import.meta.url),
}).parsed ?? {};

function configuredValue(primary: string | undefined, fallback: string | undefined) {
  if (primary && !primary.startsWith("replace-with-")) return primary;
  return fallback;
}

const projectId = configuredValue(process.env.SPECTRUM_PROJECT_ID, scaffoldEnvironment.PROJECT_ID);
const projectSecret = configuredValue(
  process.env.SPECTRUM_PROJECT_SECRET,
  scaffoldEnvironment.PROJECT_SECRET,
);
const internalToken = backendEnvironment.NICE_TRY_INTERNAL_TOKEN;
const apiUrl = process.env.NICE_TRY_API_URL ?? "http://127.0.0.1:5000";
const port = Number(process.env.PORT ?? 5051);
const photonApiToken = process.env.PHOTON_API_TOKEN;
const photonCli = fileURLToPath(new URL("../node_modules/.bin/photon", import.meta.url));
const execFileAsync = promisify(execFile);

if (!projectId || !projectSecret) {
  throw new Error(
    "Set SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET, or keep the generated nicetry/.env file",
  );
}
if (!internalToken) {
  throw new Error("Set NICE_TRY_INTERNAL_TOKEN to the same value used by Flask");
}
const activeProjectId = projectId;

const spectrum = await Spectrum({
  projectId: activeProjectId,
  projectSecret,
  providers: [imessage.config()],
});
const im = imessage(spectrum);
const server = express();

server.use(express.json({ limit: "32kb" }));

function authorize(request: Request, response: Response, next: NextFunction) {
  if (request.headers.authorization !== `Bearer ${internalToken}`) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

server.get("/health", (_request, response) => {
  response.json({ status: "ok", provider: "imessage" });
});

type PhotonUser = {
  id?: string;
  phoneNumber?: string;
  assignedPhoneNumber?: string | null;
};

async function runPhotonCli(args: string[]) {
  const tokenArgs = photonApiToken ? ["--token", photonApiToken] : [];
  const { stdout } = await execFileAsync(
    photonCli,
    [...args, "--project", activeProjectId, ...tokenArgs, "--json"],
    { timeout: 20_000, maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(stdout) as unknown;
}

async function ensurePhotonUser(firstName: string, phoneNumber: string) {
  const listed = await runPhotonCli(["spectrum", "users", "ls"]);
  const users = Array.isArray(listed)
    ? listed
    : typeof listed === "object" && listed !== null && Array.isArray((listed as { users?: unknown }).users)
      ? (listed as { users: PhotonUser[] }).users
      : [];
  const existing = (users as PhotonUser[]).find((user) => user.phoneNumber === phoneNumber);
  if (existing?.assignedPhoneNumber) return existing;

  const participantId = createHash("sha256")
    .update(`${activeProjectId}:${phoneNumber}`)
    .digest("hex")
    .slice(0, 16);
  if (!existing) {
    await runPhotonCli([
      "spectrum",
      "users",
      "add",
      "--first-name",
      firstName,
      "--last-name",
      "Participant",
      "--email",
      `nicetry+${participantId}@example.com`,
      "--phone",
      phoneNumber,
    ]);
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    const refreshed = await runPhotonCli(["spectrum", "users", "ls"]);
    const refreshedUsers = Array.isArray(refreshed)
      ? refreshed as PhotonUser[]
      : typeof refreshed === "object"
          && refreshed !== null
          && Array.isArray((refreshed as { users?: unknown }).users)
        ? (refreshed as { users: PhotonUser[] }).users
        : [];
    const registered = refreshedUsers.find((user) => user.phoneNumber === phoneNumber);
    if (registered?.assignedPhoneNumber) return registered;
  }

  throw new Error("Photon registered the participant but did not assign an iMessage line yet");
}

server.post("/outreach", authorize, async (request, response) => {
  const { firstName, phoneNumber } = request.body as Record<string, unknown>;
  if (typeof firstName !== "string" || typeof phoneNumber !== "string") {
    response.status(400).json({ error: "firstName and phoneNumber are required" });
    return;
  }

  try {
    const registeredUser = await ensurePhotonUser(firstName, phoneNumber);
    response.json({
      requiresOptIn: true,
      optInPhoneNumber: registeredUser.assignedPhoneNumber,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Could not prepare iMessage conversation";
    const cliError = error as { stderr?: unknown };
    const cliDetail = typeof cliError.stderr === "string" ? cliError.stderr : "";
    console.error("Could not prepare iMessage conversation", detail);
    if (detail.includes("did not assign an iMessage line yet")) {
      response.status(503).json({
        error: "Photon is still assigning an iMessage line. Wait a moment and try again.",
      });
      return;
    }
    if (detail.includes("ENOENT")) {
      response.status(503).json({
        error: "Photon user registration is unavailable. Install the Photon CLI.",
      });
      return;
    }
    if (/unauthorized|authentication required|log in/i.test(`${detail}\n${cliDetail}`)) {
      response.status(503).json({
        error: "Photon user registration needs an authenticated CLI session or PHOTON_API_TOKEN.",
      });
      return;
    }
    if (/failed to add user|shared_user_create_failed/i.test(`${detail}\n${cliDetail}`)) {
      response.status(502).json({
        error: "Photon could not automatically register this participant.",
      });
      return;
    }
    response.status(502).json({ error: "Photon could not prepare the iMessage training" });
  }
});

async function listenForMessages() {
  for await (const [space, message] of spectrum.messages) {
    if (!imessage.is(message) || message.content.type !== "text") continue;

    const phoneNumber = message.sender?.id;
    if (!phoneNumber) continue;

    try {
      const apiResponse = await fetch(`${apiUrl.replace(/\/$/, "")}/api/imessage/event`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${internalToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          spaceId: space.id,
          text: message.content.text,
        }),
      });
      const result = await apiResponse.json() as { reply?: string; error?: string };
      if (!apiResponse.ok || !result.reply) {
        throw new Error(result.error ?? "Nice Try API did not return a reply");
      }
      await space.responding(async () => {
        await space.send(result.reply!);
      });
    } catch (error) {
      console.error("Failed to handle incoming iMessage", error);
      await space.send("Nice Try hit a temporary error. Reply again in a moment or text STOP.");
    }
  }
}

server.listen(port, "127.0.0.1", () => {
  console.log(`Nice Try Spectrum service listening on http://127.0.0.1:${port}`);
});

listenForMessages().catch((error) => {
  console.error("Spectrum message loop stopped", error);
  process.exitCode = 1;
});

async function shutdown() {
  await spectrum.stop();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
