"use client";

import { useActionState } from "react";
import { formatDateInput } from "@/lib/format";
import type { Gallery } from "@/lib/galleries/repo";
import { updateGalleryAction, type ActionState } from "./actions";

const control = "mt-1 block w-full border border-ink/20 bg-paper px-3 py-2";

export function GallerySettings({ gallery }: { gallery: Gallery }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateGalleryAction.bind(null, gallery.id), {});
  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        Titel
        <input name="title" defaultValue={gallery.title} maxLength={120} className={control} />
      </label>
      <label className="block text-sm">
        Kurzname
        <input name="slug" defaultValue={gallery.slug} maxLength={60} className={control} />
      </label>
      <label className="block text-sm">
        Datum
        <input name="shootDate" type="date" defaultValue={gallery.shootDate ?? ""} className={control} />
      </label>
      <label className="block text-sm">
        Online bis
        <input name="expiresAt" type="date" defaultValue={gallery.expiresAt ? formatDateInput(gallery.expiresAt) : ""} className={control} />
      </label>
      <label className="flex items-center gap-2 self-end text-sm">
        <input name="unlimited" type="checkbox" defaultChecked={gallery.expiresAt === null} /> Unbegrenzt online
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="bg-ink px-6 py-2 text-paper disabled:opacity-60">
          Einstellungen speichern
        </button>
        {state.ok && <p role="status" className="text-sm">Gespeichert.</p>}
        {state.error && <p role="alert" className="text-sm text-signal">{state.error}</p>}
      </div>
    </form>
  );
}
