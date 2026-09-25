import { notFound } from "next/navigation";

// Unbekannte Admin-Pfade bleiben im Admin (gestaltete admin/not-found) und landen nie im [locale]-Baum.
export default function AdminMissingPage() {
  notFound();
}
