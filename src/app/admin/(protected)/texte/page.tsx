import type { Metadata } from "next";
import { getDb } from "@/lib/env";
import { getSettings } from "@/lib/settings/repo";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Texte & Links" };

export default async function SettingsPage() {
  const settings = await getSettings(getDb());
  return (
    <div>
      <h1 className="font-display text-5xl">Texte &amp; Links</h1>
      <p className="mt-4 max-w-xl text-sm text-stone">
        Leere Felder werden auf der Website ausgeblendet oder durch Standardtexte ersetzt. Rechtstexte gern aus einem Generator einfügen.
      </p>
      <div className="mt-10">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
