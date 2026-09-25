"use client";

import { useState } from "react";
import { processImage } from "@/lib/image/process";
import { uploadVariants } from "@/lib/image/upload";
import { mediaUrl } from "@/lib/media/keys";

export function PortraitField({ initialId }: { initialId: string }) {
  const [id, setId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      setId(await uploadVariants("site", await processImage(file)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm">Porträt (Über mich)</legend>
      {id && (
        // eslint-disable-next-line @next/next/no-img-element -- Bild kommt fertig skaliert aus R2
        <img src={mediaUrl("site", id, 800)} alt="Porträt-Vorschau" className="w-40 bg-mat p-2" />
      )}
      <input type="hidden" name="about_portrait_id" value={id} />
      <div className="flex gap-4 text-sm">
        <label className="cursor-pointer underline">
          Porträt wählen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        {id && (
          <button type="button" className="underline" onClick={() => setId("")}>
            Entfernen
          </button>
        )}
        {busy && <span className="text-stone">Wird hochgeladen …</span>}
        {error && (
          <span role="alert" className="text-signal">
            {error}
          </span>
        )}
      </div>
    </fieldset>
  );
}
