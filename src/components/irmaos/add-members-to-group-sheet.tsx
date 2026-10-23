"use client";

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { Plus, X, UserPlus, Users } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type {
  ServiceGroup,
  CongregationMember,
} from "@/lib/types/congregation";

interface AddMembersToGroupSheetProps {
  open: boolean;
  onClose: () => void;
  group: ServiceGroup | null;
  members: CongregationMember[];
  groups: ServiceGroup[];
  onSaved: (groupId: string, memberIds: string[]) => void;
}

export function AddMembersToGroupSheet({
  open,
  onClose,
  group,
  members,
  groups,
  onSaved,
}: AddMembersToGroupSheetProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedMemberIds([]);
      setSearch("");
      setDropdownOpen(false);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Candidates: active brothers, not self, not already in THIS group
  const availableCandidates = useMemo(() => {
    if (!group) return [];
    return members
      .filter((m) => m.active && !m.is_self && m.group_id !== group.id)
      .filter((m) => !selectedMemberIds.includes(m.id));
  }, [members, group, selectedMemberIds]);

  // Filtered by search
  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableCandidates;
    return availableCandidates.filter((m) => m.full_name.toLowerCase().includes(q));
  }, [availableCandidates, search]);

  const selectedMembers = useMemo(() => {
    return selectedMemberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean) as CongregationMember[];
  }, [members, selectedMemberIds]);

  const getGroupName = (groupId?: string | null) => {
    if (!groupId) return "Sem grupo";
    const found = groups.find((g) => g.id === groupId);
    return found ? found.name : "Outro grupo";
  };

  const handleSelect = (memberId: string) => {
    setSelectedMemberIds((prev) => [...prev, memberId]);
    setSearch("");
    setDropdownOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleRemove = (memberId: string) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setDropdownOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCandidates.length > 0) {
        handleSelect(filteredCandidates[0].id);
      }
      return;
    }
    if (e.key === "Backspace" && search === "" && selectedMemberIds.length > 0) {
      handleRemove(selectedMemberIds[selectedMemberIds.length - 1]);
    }
  };

  const handleConfirm = async () => {
    if (!group || selectedMemberIds.length === 0) return;
    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("congregation_members")
        .update({
          group_id: group.id,
          updated_at: new Date().toISOString(),
        })
        .in("id", selectedMemberIds);

      if (error) throw error;

      toast.success(
        selectedMemberIds.length === 1
          ? "Irmão adicionado ao grupo"
          : `${selectedMemberIds.length} irmãos adicionados ao grupo`
      );
      onSaved(group.id, selectedMemberIds);
      onClose();
    } catch (err) {
      console.error("Error adding members to group:", err);
      toast.error("Erro ao adicionar irmãos ao grupo.");
    } finally {
      setSaving(false);
    }
  };

  if (!group) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Adicionar irmãos a ${group.name}`}
      description="Selecione publicadores para alocar ou transferir para este grupo"
    >
      <div className="flex flex-col gap-4 mt-2">
        {/* Direct Tag Input Selector */}
        <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
          <label className="text-label text-[var(--ink)] flex items-center justify-between">
            <span>Buscar irmãos</span>
            {selectedMemberIds.length > 0 && (
              <span className="text-caption text-[var(--ink-muted)]">
                {selectedMemberIds.length} {selectedMemberIds.length === 1 ? "selecionado" : "selecionados"}
              </span>
            )}
          </label>

          {/* Input Box Container */}
          <div
            onClick={() => {
              inputRef.current?.focus();
              setDropdownOpen(true);
            }}
            className={cn(
              "w-full min-h-[44px] p-2 rounded-md font-sans flex flex-wrap items-center gap-1.5",
              "bg-[var(--surface)] border border-[var(--border)]",
              "text-[var(--ink)] transition-colors duration-150 cursor-text",
              "focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]"
            )}
          >
            {/* Selected Member Chips */}
            {selectedMembers.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 animate-in fade-in duration-100 select-none"
              >
                <span className="truncate max-w-[180px]">{m.full_name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(m.id);
                  }}
                  className="p-0.5 rounded-full hover:bg-[var(--primary)]/20 text-[var(--primary)] transition-colors cursor-pointer"
                  aria-label={`Remover ${m.full_name}`}
                >
                  <X size={13} />
                </button>
              </span>
            ))}

            {/* Direct Text Input */}
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedMemberIds.length === 0
                  ? "Digite para buscar irmãos..."
                  : "Digite para adicionar outro..."
              }
              className="flex-1 min-w-[150px] bg-transparent border-0 outline-none p-1 text-body-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] font-sans"
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            />
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div
              className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-lg max-h-[260px] overflow-y-auto divide-y divide-[var(--border)]/40 p-1 animate-in fade-in zoom-in-95 duration-100"
              role="listbox"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredCandidates.length === 0 ? (
                <div className="py-6 px-3 text-center text-body-sm text-[var(--ink-muted)] italic">
                  {availableCandidates.length === 0
                    ? "Todos os irmãos disponíveis já estão selecionados"
                    : `Nenhum irmão encontrado para "${search}"`}
                </div>
              ) : (
                filteredCandidates.map((m) => {
                  const currentGroup = getGroupName(m.group_id);
                  const isTransfer = !!m.group_id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m.id)}
                      className="w-full px-3 py-2.5 rounded-md text-left text-body-sm font-sans flex items-center justify-between transition-colors hover:bg-[var(--background)] text-[var(--ink)] cursor-pointer"
                      role="option"
                    >
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="truncate font-medium">{m.full_name}</span>
                        <div className="flex items-center gap-1.5 text-2xs text-[var(--ink-muted)] mt-0.5">
                          {isTransfer ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              (Atualmente em: {currentGroup})
                            </span>
                          ) : (
                            <span className="italic">(Sem grupo)</span>
                          )}
                          {m.appointment && (
                            <span>
                              · {m.appointment === "anciao" ? "Ancião" : "SM"}
                            </span>
                          )}
                        </div>
                      </div>
                      <Plus size={16} className="text-[var(--primary)] shrink-0 opacity-70" />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Selected count and prompt */}
        {selectedMemberIds.length > 0 && (
          <p className="text-caption text-[var(--ink-muted)] px-1">
            {selectedMemberIds.length === 1
              ? "1 irmão será alocado neste grupo."
              : `${selectedMemberIds.length} irmãos serão alocados neste grupo.`}{" "}
            Se algum irmão pertencia a outro grupo, ele será transferido automaticamente.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1"
            loading={saving}
            disabled={selectedMemberIds.length === 0}
            onClick={handleConfirm}
          >
            <UserPlus size={16} className="mr-1.5" />
            {selectedMemberIds.length > 0
              ? `Adicionar (${selectedMemberIds.length})`
              : "Adicionar"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
