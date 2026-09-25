import { describe, expect, it } from "vitest";
import { generateGalleryPassword } from "@/lib/galleries/password";

describe("generateGalleryPassword", () => {
  it("builds 'word-word-NN' from two different words", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateGalleryPassword();
      expect(password).toMatch(/^[a-z]{3,}-[a-z]{3,}-[1-9][0-9]$/);
      const [a, b] = password.split("-");
      expect(a).not.toBe(b);
    }
  });

  it("is deterministic with an injected random source", () => {
    expect(generateGalleryPassword(() => 0)).toBe(generateGalleryPassword(() => 0));
  });
});
