"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { AppHeader } from "@/components/layout/app-header";
import { ContactCard } from "@/components/contacts/contact-card";
import { ContactForm, type ContactFormData } from "@/components/contacts/contact-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContacts } from "@/lib/db/hooks";
import { getDb } from "@/lib/db/dexie";
import { enqueueSync } from "@/lib/db/sync";
import type { ContactStatus } from "@/lib/constants";

interface ContatosClientProps {
  userId: string;
}

export function ContatosClient({ userId }: ContatosClientProps) {
  const { contacts, loading, refresh } = useContacts(userId);
  const [newOpen, setNewOpen] = useState(false);
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

  return (
    <div className="flex flex-col gap-4">
      <AppHeader
        title="Contatos"
        right={
          <Button
            variant="primary"
            size="icon"
            onClick={() => setNewOpen(true)}
            aria-label="Novo contato"
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
              ? "Nenhum contato ainda"
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
                Adicionar contato
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden divide-y divide-[var(--border)]">
          {filtered.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </Card>
      )}

      {/* New contact drawer */}
      <Drawer
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Novo contato"
        description="Adicione os dados da pessoa"
      >
        <ContactForm onSubmit={handleCreate} loading={saving} />
      </Drawer>
    </div>
  );
}
