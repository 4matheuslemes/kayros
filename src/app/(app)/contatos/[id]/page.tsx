import type { Metadata } from "next";
import { ContactDetailClient } from "./contact-detail-client";

export const metadata: Metadata = { title: "Ficha do Contato" };

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailClient contactId={id} />;
}
