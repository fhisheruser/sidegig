import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const audienceProfileSchema = z.object({
  goal: z.enum(["find_customers", "hire_marketers"]),
  business: z.string().trim().min(1).max(120),
  industry: z.string().trim().min(1).max(120),
  audience: z.string().trim().min(1).max(160),
  geography: z.string().trim().max(120).optional(),
  offer: z.string().trim().max(300).optional()
});

export type AudienceProfile = z.infer<typeof audienceProfileSchema>;

export interface ProfileStore {
  get(): Promise<AudienceProfile | null>;
  set(profile: AudienceProfile): Promise<void>;
}

export class FileProfileStore implements ProfileStore {
  private readonly path: string;

  constructor(path = process.env.CONET_PROFILE_PATH || join(homedir(), ".conet", "audience-profile.json")) {
    this.path = path;
  }

  async get(): Promise<AudienceProfile | null> {
    try {
      const contents = await readFile(this.path, "utf8");
      return audienceProfileSchema.parse(JSON.parse(contents));
    } catch (error) {
      if (isFileNotFound(error)) {
        return null;
      }

      throw new Error(`Could not read the saved audience profile at ${this.path}: ${errorMessage(error)}`);
    }
  }

  async set(profile: AudienceProfile): Promise<void> {
    const temporaryPath = `${this.path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(temporaryPath, `${JSON.stringify(profile, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      await rename(temporaryPath, this.path);
    } catch (error) {
      throw new Error(`Could not save the audience profile at ${this.path}: ${errorMessage(error)}`);
    }
  }
}

function isFileNotFound(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
