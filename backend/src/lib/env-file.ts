import fs from "node:fs/promises";
import path from "node:path";

function quoteEnvValue(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}

async function fileExists(filepath: string) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

async function resolveEnvFilePath() {
  const candidates = [
    process.env.ENV_FILE_PATH,
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../../.env")
  ].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || path.resolve(process.cwd(), ".env");
}

function upsertEnvLines(raw: string, values: Record<string, string>) {
  const pending = new Map(Object.entries(values));
  const lines = raw ? raw.split(/\r?\n/) : [];
  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) {
      return line;
    }

    const key = match[1];
    if (!pending.has(key)) {
      return line;
    }

    const value = pending.get(key) || "";
    pending.delete(key);
    return `${key}=${quoteEnvValue(value)}`;
  });

  if (pending.size > 0 && nextLines.length > 0 && nextLines[nextLines.length - 1] !== "") {
    nextLines.push("");
  }

  for (const [key, value] of pending) {
    nextLines.push(`${key}=${quoteEnvValue(value)}`);
  }

  return `${nextLines.join("\n").replace(/\n*$/, "")}\n`;
}

export async function updateRootEnvFile(values: Record<string, string>) {
  const envPath = await resolveEnvFilePath();
  await fs.mkdir(path.dirname(envPath), { recursive: true });

  let raw = "";
  try {
    raw = await fs.readFile(envPath, "utf8");
  } catch {
    raw = "";
  }

  const next = upsertEnvLines(raw, values);
  await fs.writeFile(envPath, next, "utf8");

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}
