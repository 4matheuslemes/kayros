"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, UserPlus, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberOption } from "./member-combobox";

interface MemberMultiComboboxProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  members: MemberOption[];
  selectedMemberIds: string[];
  onToggleMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
  otherPeople: string[];
  onAddOtherPerson: (name: string) => void;
  onRemoveOtherPerson: (index: number) => void;
  disabled?: boolean;
  className?: string;
}

export function MemberMultiCombobox({
  label,
  hint,
  error,
  required,
  members,
  selectedMemberIds,
  onToggleMember,
  onRemoveMember,
  otherPeople,
  onAddOtherPerson,
  onRemoveOtherPerson,
  disabled = false,
  className,
}: MemberMultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [customName, setCustomName] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingCustom(false);
        setCustomName("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open && !addingCustom) {
      setSearch("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open, addingCustom]);

  // Focus custom input when adding custom
  useEffect(() => {
    if (addingCustom) {
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 50);
    }
  }, [addingCustom]);

  const selectedMembers = useMemo(() => {
    return selectedMemberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean) as MemberOption[];
  }, [members, selectedMemberIds]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.full_name.toLowerCase().includes(q));
  }, [members, search]);

  const formatAppointment = (app?: string | null) => {
    if (app === "anciao") return "Ancião";
    if (app === "servo_ministerial") return "Servo ministerial";
    return null;
  };

  const handleAddCustom = () => {
    const trimmed = customName.trim();
    if (trimmed) {
      onAddOtherPerson(trimmed);
      setCustomName("");
      setAddingCustom(false);
      setSearch("");
    }
  };

  const totalSelected = selectedMemberIds.length + otherPeople.length;

  return (
    <div className={cn("flex flex-col gap-2 relative", className)} ref={containerRef}>
      <label className="text-label text-[var(--ink)] flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
        </span>
      </label>

      {/* Selected Chips */}
      {totalSelected > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-1">
          {selectedMembers.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 animate-in fade-in duration-100"
            >
              <span>{m.full_name}</span>
              {m.appointment && (
                <span className="text-[10px] opacity-75">
                  ({m.appointment === "anciao" ? "Ancião" : "SM"})
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveMember(m.id)}
                className="p-0.5 rounded-full hover:bg-[var(--primary)]/20 text-[var(--primary)] transition-colors cursor-pointer"
                aria-label={`Remover ${m.full_name}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}

          {otherPeople.map((name, idx) => (
            <span
              key={`other-${idx}-${name}`}
              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-[var(--background)] text-[var(--ink)] border border-[var(--border)] animate-in fade-in duration-100"
            >
              <span className="italic">{name}</span>
              <span className="text-[10px] text-[var(--ink-muted)]">(externo)</span>
              <button
                type="button"
                onClick={() => onRemoveOtherPerson(idx)}
                className="p-0.5 rounded-full hover:bg-black/10 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                aria-label={`Remover ${name}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full min-h-[44px] px-3.5 py-2 rounded-md text-base font-sans flex items-center justify-between text-left",
          "bg-[var(--surface)] border border-[var(--border)]",
          "text-[var(--ink)] transition-colors duration-150",
          "focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "cursor-pointer"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-body-sm text-[var(--ink-muted)]">
          {totalSelected === 0
            ? "Buscar irmão ou adicionar outra pessoa..."
            : "Adicionar mais pessoas..."}
        </span>
        <ChevronsUpDown size={16} className="text-[var(--ink-muted)] shrink-0 ml-2" />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[320px]">
          {/* Custom Person Input Row */}
          {addingCustom ? (
            <div className="p-2.5 border-b border-[var(--border)] bg-[var(--background)]/80 flex flex-col gap-2">
              <span className="text-caption font-medium text-[var(--ink)]">
                Nome da pessoa que não está na lista de irmãos:
              </span>
              <div className="flex items-center gap-2">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustom();
                    }
                  }}
                  placeholder="Ex: Maria (esposa), João (filho)..."
                  className="flex-1 h-9 px-2.5 rounded-md bg-[var(--surface)] border border-[var(--border)] text-body-sm text-[var(--ink)] outline-none focus:border-[var(--primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!customName.trim()}
                  className="h-9 px-3 rounded-md bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  Adicionar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingCustom(false);
                    setCustomName("");
                  }}
                  className="h-9 px-2 rounded-md hover:bg-black/5 text-[var(--ink-muted)] text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 border-b border-[var(--border)] bg-[var(--background)]/60 flex items-center gap-2">
              <Search size={16} className="text-[var(--ink-muted)] shrink-0 ml-1" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar irmão por nome..."
                className="w-full bg-transparent text-body-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none font-sans"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Action to trigger custom name adding */}
          {!addingCustom && (
            <button
              type="button"
              onClick={() => setAddingCustom(true)}
              className="w-full px-3 py-2.5 border-b border-[var(--border)] text-left text-body-sm font-sans flex items-center justify-between hover:bg-[var(--background)] text-[var(--primary)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 font-medium">
                <UserPlus size={16} className="shrink-0" />
                <span>Adicionar outra pessoa (digitar nome)</span>
              </span>
              <Plus size={15} />
            </button>
          )}

          {/* Members List */}
          <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]/40 p-1" role="listbox">
            {filteredMembers.length === 0 ? (
              <div className="py-6 px-3 text-center text-body-sm text-[var(--ink-muted)] italic">
                Nenhum irmão encontrado
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id);
                const appLabel = formatAppointment(m.appointment);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onToggleMember(m.id)}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-md text-left text-body-sm font-sans flex items-center justify-between transition-colors cursor-pointer",
                      isSelected
                        ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                        : "hover:bg-[var(--background)] text-[var(--ink)]"
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{m.full_name}</span>
                      {appLabel && (
                        <span className="text-[11px] text-[var(--ink-muted)]">
                          {appLabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={16} className="text-[var(--primary)] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error ? (
        <p className="text-caption text-red-500" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-caption text-[var(--ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
