import { describe, expect, it } from "vitest";
import { hostPolicy, SITE_URL } from "@/lib/site";

describe("hostPolicy", () => {
  it("leitet www auf die Hauptdomain um, mit Pfad und Query", () => {
    expect(hostPolicy(new URL("https://www.cosmo-photos.de/ueber-mich?x=1"))).toEqual({
      redirect: `${SITE_URL}/ueber-mich?x=1`,
      indexable: false,
    });
  });

  it("nur die Hauptdomain ist indexierbar", () => {
    expect(hostPolicy(new URL("https://cosmo-photos.de/"))).toEqual({ redirect: null, indexable: true });
    expect(hostPolicy(new URL("https://cosmo-web.felix-vatterodt.workers.dev/"))).toEqual({ redirect: null, indexable: false });
    expect(hostPolicy(new URL("https://cosmo-web-preview.felix-vatterodt.workers.dev/floorball"))).toEqual({ redirect: null, indexable: false });
    expect(hostPolicy(new URL("http://localhost:8787/"))).toEqual({ redirect: null, indexable: false });
  });
});
