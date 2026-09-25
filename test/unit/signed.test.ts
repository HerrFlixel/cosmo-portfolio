import { describe, expect, it } from "vitest";
import { signPayload, verifyPayload } from "@/lib/auth/signed";

const SECRET = "signier-secret-mit-mindestens-32-zeichen";

describe("signPayload / verifyPayload", () => {
  it("returns the payload for a valid token", async () => {
    const token = await signPayload({ g: "abc", exp: 5 }, SECRET);
    expect(await verifyPayload(token, SECRET)).toEqual({ g: "abc", exp: 5 });
  });

  it("returns null for other secrets, tampering and garbage", async () => {
    const token = await signPayload({ g: "abc" }, SECRET);
    expect(await verifyPayload(token, "anderes-secret-mit-mindestens-32-zeichen")).toBeNull();
    const [, sig] = token.split(".");
    expect(await verifyPayload(`${btoa('{"g":"xyz"}').replace(/=+$/, "")}.${sig}`, SECRET)).toBeNull();
    for (const bad of [undefined, "", "a.b.c", "!!!.???"]) expect(await verifyPayload(bad, SECRET)).toBeNull();
  });
});
