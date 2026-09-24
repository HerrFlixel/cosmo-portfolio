import { describe, expect, it } from "vitest";
import { assertBindings } from "@/lib/bindings";

describe("assertBindings", () => {
  it("passes when all required bindings exist", () => {
    const env = { DB: {}, MEDIA: {} } as unknown as Partial<CloudflareEnv>;
    expect(() => assertBindings(env, ["DB", "MEDIA"])).not.toThrow();
  });

  it("names every missing binding and where to fix it", () => {
    expect(() => assertBindings({} as Partial<CloudflareEnv>, ["DB", "MEDIA"])).toThrow(
      "Missing Cloudflare binding(s): DB, MEDIA – check wrangler.jsonc for this environment.",
    );
  });

  it("names only the missing one", () => {
    const env = { DB: {} } as unknown as Partial<CloudflareEnv>;
    expect(() => assertBindings(env, ["DB", "MEDIA"])).toThrow(/binding\(s\): MEDIA –/);
  });
});
