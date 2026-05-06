import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

export type CheckProcessingOptions = {
  excludeQuotes: boolean;
  excludeBiblio: boolean;
  excludeMatches: string;
};

type CheckProcessingOptionsFile = Record<string, CheckProcessingOptions>;

function getOptionsFilePath() {
  return path.resolve(path.dirname(config.runtimeSettingsFile), "check-processing-options.json");
}

async function ensureOptionsFile() {
  const filePath = getOptionsFilePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify({}, null, 2), "utf8");
  }
}

async function readOptionsFile(): Promise<CheckProcessingOptionsFile> {
  await ensureOptionsFile();
  const raw = await fs.readFile(getOptionsFilePath(), "utf8");

  try {
    return raw.trim() ? (JSON.parse(raw) as CheckProcessingOptionsFile) : {};
  } catch {
    return {};
  }
}

async function writeOptionsFile(data: CheckProcessingOptionsFile) {
  await ensureOptionsFile();
  await fs.writeFile(getOptionsFilePath(), JSON.stringify(data, null, 2), "utf8");
}

export function defaultCheckProcessingOptions(): CheckProcessingOptions {
  return {
    excludeQuotes: true,
    excludeBiblio: true,
    excludeMatches: ""
  };
}

export async function getCheckProcessingOptions(checkRequestId: string): Promise<CheckProcessingOptions> {
  const current = await readOptionsFile();
  return {
    ...defaultCheckProcessingOptions(),
    ...(current[checkRequestId] || {})
  };
}

export async function saveCheckProcessingOptions(
  checkRequestId: string,
  options: Partial<CheckProcessingOptions>
): Promise<CheckProcessingOptions> {
  const current = await readOptionsFile();
  const normalized = {
    ...defaultCheckProcessingOptions(),
    ...(current[checkRequestId] || {}),
    ...options,
    excludeMatches: (options.excludeMatches ?? current[checkRequestId]?.excludeMatches ?? "").trim()
  };

  await writeOptionsFile({
    ...current,
    [checkRequestId]: normalized
  });

  return normalized;
}
