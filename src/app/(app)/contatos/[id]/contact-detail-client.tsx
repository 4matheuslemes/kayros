"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, MapPin, BookOpen, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitTimeline } from "@/components/contacts/visit-timeline";
import { VisitFormSheet } from "@/components/contacts/visit-form-sheet";
import { ContactForm, type ContactFormData } from "@/components/contacts/contact-form";
import { Drawer } from "@/components/ui/drawer";
import { useContact } from "@/lib/db/hooks";
import { getDb } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import type { ContactStatus } from "@/lib/constants";

export function ContactDetailClient({ contactId }: { contactId: string }) {
  const router = useRouter();
  const { contact, visits, loading, refresh } = useContact(contactId);
  const [visitOpen, setVisitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEdit = async (data: ContactFormData) => {
    if (!contact) return;
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();
    const updated = {
      ...contact,
      name:      data.name,
      address:   data.address ?? "",
      phone:     data.phone ?? "",
      interests: data.interests ?? "",
      status:    data.status as ContactStatus,
      updated_at: now,
      synced: false,
    };
    try {
      await db.contacts.put(updated);
      await enqueueSync("contacts", contact.id, "UPDATE", updated);
      toast.success("Contato atualizado");
      await refresh();
      setEditOpen(false);
    } catch (err) {
      toast.error("Erro ao atualizar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    if (!confirm(`Excluir ${contact.name}? Essa ação não pode ser desfeita.`)) return;
    const db = getDb();
    try {
      await db.contacts.delete(contactId);
      await enqueueSync("contacts", contactId, "DELETE", {});
      toast.success(`${contact.name} removido`);
      router.push("/contatos");
    } catch (err) {
      toast.error("Erro ao excluir.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--ink-muted)] font-sans text-sm">
        Carregando…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-40 text-[var(--ink-muted)] font-sans text-sm">
        Contato não encontrado.
      </div>
    );
  }

  const initials = contact.name
    .split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-1.5 -ml-2 text-[var(--ink-muted)]"
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)} aria-label="Editar">
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Excluir" className="text-red-500 hover:text-red-600">
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-display font-semibold text-xl flex-shrink-0 ${
          contact.status === "estudo_ativo"
            ? "bg-[var(--success)]/15 text-[var(--success)]"
            : "bg-[var(--primary)]/10 text-[var(--primary)]"
        }`}>
          {initials}
        </div>
        <div>
          <h1 className="font-display font-semibold text-xl text-[var(--ink)]">
            {contact.name}
          </h1>
          <Badge
            variant={contact.status === "estudo_ativo" ? "success" : "default"}
            className="mt-1"
          >
            {contact.status === "estudo_ativo" ? (
              <><BookOpen size={10} /> Estudo ativo</>
            ) : (
              "Revisita"
            )}
          </Badge>
        </div>
      </div>

      {/* Info card */}
      {(contact.address || contact.phone || contact.interests) && (
        <Card>
          <div className="flex flex-col gap-3">
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="flex items-center gap-3 text-body-sm text-[var(--ink)] hover:text-[var(--primary)] transition-colors"
              >
                <Phone size={16} className="text-[var(--ink-muted)]" />
                {contact.phone}
              </a>
            )}
            {contact.address && (
              <div className="flex items-start gap-3">
                <MapPin size={16} className="flex-shrink-0 mt-0.5 text-[var(--ink-muted)]" />
                <span className="text-body-sm text-[var(--ink)]">{contact.address}</span>
              </div>
            )}
            {contact.interests && (
              <div>
                <p className="text-caption text-[var(--ink-muted)] mb-1">Interesses</p>
                <p className="text-body-sm text-[var(--ink)]">{contact.interests}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Visit history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-subheading text-[var(--ink)]">Histórico de visitas</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setVisitOpen(true)}
            id="btn-new-visit"
          >
            <Plus size={16} />
            Registrar visita
          </Button>
        </div>
        <VisitTimeline visits={visits} />
      </div>

      <VisitFormSheet
        open={visitOpen}
        onClose={() => setVisitOpen(false)}
        contactId={contactId}
        onSaved={refresh}
      />

      <Drawer open={editOpen} onClose={() => setEditOpen(false)} title="Editar contato">
        <ContactForm
          defaultValues={contact}
          onSubmit={handleEdit}
          loading={saving}
          submitLabel="Salvar alterações"
        />
      </Drawer>
    </div>
  );
}
