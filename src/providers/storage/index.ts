// Object-storage abstraction. The app only depends on this interface, so swapping
// the local-disk driver for S3/GCS later touches nothing but this folder.
import { env } from "@/lib/env";
import { LocalStorage } from "./local";

export type Visibility = "public" | "private";

export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

export interface StorageProvider {
  /// Persist bytes under a namespaced key. Returns the canonical key.
  put(params: {
    key: string;
    data: Buffer;
    contentType: string;
    visibility: Visibility;
  }): Promise<StoredObject>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /// Build a namespaced key. Private objects live under a separate prefix and are
  /// never served from a public path.
  buildKey(visibility: Visibility, ...parts: string[]): string;
}

let instance: StorageProvider | null = null;

export function storage(): StorageProvider {
  if (instance) return instance;
  switch (env.STORAGE_PROVIDER) {
    case "local":
    default:
      instance = new LocalStorage(env.STORAGE_LOCAL_ROOT);
  }
  return instance;
}
