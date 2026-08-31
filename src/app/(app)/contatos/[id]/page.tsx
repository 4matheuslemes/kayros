import type { Metadata } from "next";
import { ContactDetailClient } from "./contact-detail-client";

export const metadata: Metadata = { title: "Ficha do Contato" };

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  return <ContactDetailClient contactId={params.id} />;
}
