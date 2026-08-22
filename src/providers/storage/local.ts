import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { StorageProvider, StoredObject, Visibility } from "./index";

// Stores objects on the local filesystem under <root>/{public,private}/...
// Content-type is persisted in a sidecar .meta file so `get` can restore it.
export class LocalStorage implements StorageProvider {
  constructor(private root: string) {}

  buildKey(visibility: Visibility, ...parts: string[]): string {
    const safe = parts
      .filter(Boolean)
      .map((p) => p.replace(/[^a-zA-Z0-9._-]/g, "_"))
      .join("/");
    const rand = crypto.randomBytes(6).toString("hex");
    return `${visibility}/${safe}-${rand}`;
  }

  private absPath(key: string): string {
    // Prevent path traversal outside the storage root.
    const resolved = path.resolve(this.root, key);
    const rootResolved = path.resolve(this.root);
    if (!resolved.startsWith(rootResolved)) {
      throw new Error("Invalid storage key");
    }
    return resolved;
  }

  async put(params: {
    key: string;
    data: Buffer;
    contentType: string;
    visibility: Visibility;
  }): Promise<StoredObject> {
    const file = this.absPath(params.key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, params.data);
    await fs.writeFile(`${file}.meta`, JSON.stringify({ contentType: params.contentType }));
    return { key: params.key, contentType: params.contentType, size: params.data.length };
  }

  async get(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    try {
      const file = this.absPath(key);
      const data = await fs.readFile(file);
      let contentType = "application/octet-stream";
      try {
        const meta = JSON.parse(await fs.readFile(`${file}.meta`, "utf8"));
        contentType = meta.contentType ?? contentType;
      } catch {
        /* no sidecar; fall back */
      }
      return { data, contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const file = this.absPath(key);
      await fs.rm(file, { force: true });
      await fs.rm(`${file}.meta`, { force: true });
    } catch {
      /* ignore */
    }
  }
}
