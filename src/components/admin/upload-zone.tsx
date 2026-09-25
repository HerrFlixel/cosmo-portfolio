"use client";

import { useState } from "react";
import { HttpError } from "@/lib/http-error";
import { createTaskQueue } from "@/lib/task-queue";

type Status = "waiting" | "running" | "done" | "error";
type Item = { key: string; file: File; status: Status; error?: string };

/** Höchstens 3 Bilder gleichzeitig verarbeiten (Speicher: ein 45-MP-Foto belegt ~180 MB) – auch bei mehreren Drops. */
const PARALLEL = 3;
const STATUS_TEXT: Record<Status, string> = { waiting: "Wartet", running: "Wird verarbeitet …", done: "Fertig", error: "Fehler" };
// Nur echte Bilder; versteckte Dateien (.DS_Store, ._-Metadaten von exFAT-Platten) gelten als übersprungen.
const isImage = (file: File) => file.type.startsWith("image/") && !file.name.startsWith(".");

/** Liest Dateien aus einem Drop, auch aus (verschachtelten) Ordnern. Muss synchron im Drop-Event starten. */
function filesFromDrop(transfer: DataTransfer): Promise<File[]> {
  const entries = [...transfer.items]
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => !!entry);
  if (entries.length === 0) return Promise.resolve([...transfer.files]);

  const files: File[] = [];
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      files.push(await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject)));
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
        if (batch.length === 0) break;
        for (const child of batch) await walk(child);
      }
    }
  };
  return (async () => {
    for (const entry of entries) await walk(entry);
    return files;
  })();
}

export function UploadZone({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [queue] = useState(() => createTaskQueue(PARALLEL));

  const setStatus = (key: string, status: Status, error?: string) =>
    setItems((all) => all.map((item) => (item.key === key ? { ...item, status, error } : item)));

  async function run(item: Item) {
    setStatus(item.key, "waiting");
    await queue(async () => {
      setStatus(item.key, "running");
      try {
        await onUpload(item.file);
        setStatus(item.key, "done");
      } catch (error) {
        if (error instanceof HttpError && error.status === 401) setSessionExpired(true);
        setStatus(item.key, "error", error instanceof Error ? error.message : "Upload fehlgeschlagen.");
      }
    });
  }

  function addFiles(files: File[]) {
    const images = files.filter(isImage);
    setSkipped(files.length - images.length);
    const added: Item[] = images.map((file) => ({ key: crypto.randomUUID(), file, status: "waiting" }));
    setItems((all) => [...all, ...added]);
    for (const item of added) void run(item);
  }

  function retryFailed() {
    setSessionExpired(false);
    for (const item of items) if (item.status === "error") void run(item);
  }

  const failed = items.filter((item) => item.status === "error").length;

  return (
    <section aria-label="Upload">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void filesFromDrop(event.dataTransfer).then(addFiles);
        }}
        className={`grid place-items-center border border-dashed p-10 text-center text-sm ${dragOver ? "border-ink bg-mat" : "border-ink/30"}`}
      >
        <p>Bilder oder einen Ordner hierher ziehen oder</p>
        <div className="mt-2 flex gap-6">
          <label className="cursor-pointer underline">
            Bilder hinzufügen
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) => {
                if (event.target.files) addFiles([...event.target.files]);
                event.target.value = "";
              }}
            />
          </label>
          <label className="cursor-pointer underline">
            Ordner wählen
            <input
              type="file"
              multiple
              className="sr-only"
              {...({ webkitdirectory: "" } as Record<string, string>)}
              onChange={(event) => {
                if (event.target.files) addFiles([...event.target.files]);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {skipped > 0 && (
        <p data-testid="upload-skipped" className="mt-3 text-sm text-stone">
          {skipped === 1 ? "1 Datei übersprungen (kein Bild)." : `${skipped} Dateien übersprungen (kein Bild).`}
        </p>
      )}

      {sessionExpired && (
        <p data-testid="upload-session" role="alert" className="mt-3 text-sm text-signal">
          Anmeldung abgelaufen.{" "}
          <a href="/admin/login" target="_blank" rel="noopener" className="underline">
            Neu anmelden
          </a>{" "}
          (neues Fenster), danach „Alle fehlgeschlagenen erneut versuchen“.
        </p>
      )}

      {failed > 0 && (
        <button type="button" className="mt-3 text-sm underline" onClick={retryFailed}>
          Alle fehlgeschlagenen erneut versuchen
        </button>
      )}

      {items.length > 0 && (
        <ul aria-label="Upload-Warteschlange" className="mt-4 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.key} data-testid="upload-item" data-status={item.status} className="flex flex-wrap gap-3">
              <span className="font-label">{item.file.webkitRelativePath || item.file.name}</span>
              <span className={item.status === "error" ? "text-signal" : "text-stone"}>
                {STATUS_TEXT[item.status]}
                {item.error ? `: ${item.error}` : ""}
              </span>
              {item.status === "error" && (
                <button type="button" className="underline" onClick={() => void run(item)}>
                  Erneut versuchen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
