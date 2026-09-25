import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p>404 · Seite nicht gefunden / Page not found</p>
        <p className="mt-6 text-sm">
          <Link href="/admin" className="underline">Zur Admin-Übersicht</Link>
        </p>
      </div>
    </main>
  );
}
