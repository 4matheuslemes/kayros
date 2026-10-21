"use client";

import { useState, useEffect, useMemo } from "react";
import { Presentation, Search, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  talks_access: boolean;
}

export function TalksAccessSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        cache: "no-store",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao carregar lista de usuários");
      }
      const data: AdminUser[] = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar usuários";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggle = async (user: AdminUser, nextEnabled: boolean) => {
    const previousUsers = [...users];
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, talks_access: nextEnabled } : u))
    );
    setUpdatingId(user.id);

    try {
      const res = await fetch("/api/admin/talks-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          enabled: nextEnabled,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao atualizar permissão");
      }

      const displayName = user.full_name || user.email;
      toast.success(
        nextEnabled
          ? `Acesso a Discursos liberado para ${displayName}`
          : `Acesso a Discursos desativado para ${displayName}`
      );
    } catch (err: unknown) {
      // Revert optimistic update
      setUsers(previousUsers);
      const msg = err instanceof Error ? err.message : "Falha ao atualizar acesso";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Presentation size={18} className="text-[var(--primary)]" />
          <h2 className="text-subheading text-[var(--ink)]">Acesso a Discursos</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={fetchUsers}
          disabled={loading}
          className="w-8 h-8 text-[var(--ink-muted)] hover:text-[var(--ink)]"
          title="Recarregar usuários"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <p className="text-body-sm text-[var(--ink-muted)] mb-4">
        Controle individualmente quais publicadores têm acesso ao módulo de Discursos.
      </p>

      {users.length > 5 && (
        <div className="relative mb-3">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuário por nome ou e-mail..."
            className="pl-9 h-9 text-body-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3.5 bg-[var(--surface)] animate-pulse">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-[var(--border)] rounded" />
                <div className="h-3 w-44 bg-[var(--border)] rounded" />
              </div>
              <div className="w-11 h-6 bg-[var(--border)] rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-6 bg-red-500/10 border border-red-500/20 rounded-lg text-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-body-sm text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
          <Button variant="secondary" size="sm" onClick={fetchUsers} className="mt-1">
            Tentar novamente
          </Button>
        </div>
      ) : users.length === 0 ? (
        <div className="p-6 border border-[var(--border)] rounded-lg text-center text-body-sm text-[var(--ink-muted)]">
          Nenhum usuário cadastrado além do administrador.
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-6 border border-[var(--border)] rounded-lg text-center text-body-sm text-[var(--ink-muted)]">
          Nenhum usuário encontrado para &quot;{query}&quot;.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)] border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface)]">
          {filteredUsers.map((user) => {
            const isUpdating = updatingId === user.id;
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-3.5 hover:bg-[var(--background)]/50 transition-colors gap-3"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-body-sm font-medium text-[var(--ink)] truncate">
                    {user.full_name || "Sem nome cadastrado"}
                  </span>
                  <span className="text-caption text-[var(--ink-muted)] truncate">
                    {user.email}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={user.talks_access}
                  disabled={isUpdating}
                  onClick={() => handleToggle(user, !user.talks_access)}
                  aria-label={`Permitir acesso a Discursos para ${user.full_name || user.email}`}
                  className={`w-11 h-6 rounded-full transition-colors relative shadow-inner shrink-0 ${
                    user.talks_access ? "bg-[var(--success)]" : "bg-[var(--border)]"
                  } ${isUpdating ? "opacity-60 cursor-wait" : ""}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform duration-200 ease-out ${
                      user.talks_access ? "translate-x-5" : "translate-x-0.5"
                    } top-0.5`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
