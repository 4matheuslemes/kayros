"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { AppHeader } from "@/components/layout/app-header";
import { SwipeableContactRow } from "@/components/contacts/swipeable-contact-row";
import { ContactForm, type ContactFormData } from "@/components/contacts/contact-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContacts } from "@/lib/db/hooks";
import { getDb, type Contact } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import type { ContactStatus } from "@/lib/constants";

interface ContatosClientProps {
  userId: string;
}

export function ContatosClient({ userId }: ContatosClientProps) {
  const { contacts, loading, refresh } = useContacts(userId);
  const [newOpen, setNewOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | ContactStatus>("todos");

  const filtered = useMemo(() => {
    return contacts
      .filter((c) => filter === "todos" || c.status === filter)
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  }, [contacts, query, filter]);

  const handleCreate = async (data: ContactFormData) => {
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();
    const contact = {
      id: uuidv4(),
      user_id: userId,
      name: data.name,
      address: data.address ?? "",
      phone: data.phone ?? "",
      interests: data.interests ?? "",
      status: data.status as ContactStatus,
      created_at: now,
      updated_at: now,
      synced: false,
    };

    try {
      await db.contacts.add(contact);
      await enqueueSync("contacts", contact.id, "INSERT", contact);
      toast.success(`${data.name} adicionado`);
      await refresh();
      setNewOpen(false);
    } catch (err) {
      toast.error("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data: ContactFormData) => {
    if (!editingContact) return;
    setSaving(true);
    const db = getDb();
    const now = new Date().toISOString();
    const updated = {
      ...editingContact,
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
      await enqueueSync("contacts", editingContact.id, "UPDATE", updated);
      toast.success("Interessado atualizado");
      await refresh();
      setEditingContact(null);
    } catch (err) {
      toast.error("Erro ao atualizar. Tente novamente.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingContactId) return;
    try {
      const db = getDb();
      await db.contacts.delete(deletingContactId);
      await enqueueSync("contacts", deletingContactId, "DELETE", {});
      refresh();
      toast.success("Interessado removido");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir.");
    } finally {
      setDeletingContactId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Interessados"
        right={
          <Button
            variant="primary"
            size="icon"
            onClick={() => setNewOpen(true)}
            aria-label="Novo interessado"
            id="btn-new-contact"
          >
            <Plus size={20} />
          </Button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-[var(--ink-muted)]" />
        <Input
          placeholder="Buscar por nome…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          id="contact-search"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {(["todos", "revisita", "estudo_ativo"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium border transition-all ${
              filter === f
                ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                : "bg-[var(--surface)] border-[var(--border)] text-[var(--ink-muted)]"
            }`}
          >
            {f === "todos" ? "Todos" : f === "revisita" ? "Revisitas" : "Estudos"}
            <span className="ml-1.5 opacity-60">
              {f === "todos"
                ? contacts.length
                : contacts.filter((c) => c.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title={
            contacts.length === 0
              ? "Nenhum interessado ainda"
              : "Nenhum resultado encontrado"
          }
          description={
            contacts.length === 0
              ? "Toque em + para adicionar a primeira revisita ou estudo"
              : "Tente ajustar o filtro ou a busca"
          }
          action={
            contacts.length === 0 ? (
              <Button variant="primary" onClick={() => setNewOpen(true)} id="btn-empty-new-contact">
                <Plus size={16} />
                Adicionar interessado
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((contact) => (
            <SwipeableContactRow
              key={contact.id}
              contact={contact}
              onEdit={setEditingContact}
              onDelete={(e, id) => setDeletingContactId(id)}
            />
          ))}
        </div>
      )}

      {/* New contact drawer */}
      <Drawer
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Novo interessado"
        description="Adicione os dados da pessoa"
      >
        <ContactForm onSubmit={handleCreate} loading={saving} />
      </Drawer>

      {/* Edit contact drawer */}
      <Drawer
        open={!!editingContact}
        onClose={() => setEditingContact(null)}
        title="Editar interessado"
      >
        <ContactForm 
          defaultValues={editingContact || undefined} 
          onSubmit={handleEdit} 
          loading={saving} 
          submitLabel="Salvar alterações" 
        />
      </Drawer>

      {/* Delete contact drawer */}
      <Drawer
        open={!!deletingContactId}
        onClose={() => setDeletingContactId(null)}
        title="Excluir interessado"
        description="Esta ação não pode ser desfeita. Tem certeza que deseja apagar esta pessoa?"
      >
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={confirmDelete} variant="destructive" className="w-full" size="lg">
            <Trash2 className="mr-2 h-4 w-4" />
            Sim, excluir
          </Button>
          <Button onClick={() => setDeletingContactId(null)} variant="secondary" className="w-full" size="lg">
            Cancelar
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
