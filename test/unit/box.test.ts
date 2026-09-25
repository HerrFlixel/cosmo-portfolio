import { describe, expect, it } from "vitest";
import { decryptText, encryptText } from "@/lib/crypto/box";

const SECRET = "galerie-secret-mit-mindestens-32-zeichen";

describe("encryptText / decryptText", () => {
  it("round-trips and uses a fresh IV each time", async () => {
    const a = await encryptText("rauch-hallen-47", SECRET);
    const b = await encryptText("rauch-hallen-47", SECRET);
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.")).toBe(true);
    expect(await decryptText(a, SECRET)).toBe("rauch-hallen-47");
  });

  it("fails with another secret or a tampered box", async () => {
    const box = await encryptText("geheim", SECRET);
    await expect(decryptText(box, "anderes-secret-mit-mindestens-32-zeichen")).rejects.toThrow();
    const i = box.length - 2; // vorletztes Zeichen: das letzte kann reine Füllbits tragen
    const tampered = box.slice(0, i) + (box[i] === "A" ? "B" : "A") + box.slice(i + 1);
    await expect(decryptText(tampered, SECRET)).rejects.toThrow();
    await expect(decryptText("kaputt", SECRET)).rejects.toThrow("Ungültiges Format.");
  });
});
