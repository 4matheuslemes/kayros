"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronsUpDown, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MemberOption {
  id: string;
  full_name: string;
  appointment?: string | null;
  service_status?: string;
}

interface MemberComboboxProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  members: MemberOption[];
  selectedMemberId: string | null;
  onSelectMember: (member: MemberOption | null) => void;
  allowCustom?: boolean;
  customOptionLabel?: string;
  isCustomSelected?: boolean;
  onSelectCustom?: () => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function MemberCombobox({
  label,
  hint,
  error,
  required,
  members,
  selectedMemberId,
  onSelectMember,
  allowCustom = false,
  customOptionLabel = "Outra pessoa (digitar nome)",
  isCustomSelected = false,
  onSelectCustom,
  placeholder = "Selecione um irmão...",
  emptyText = "Nenhum irmão encontrado",
  disabled = false,
  className,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [members, selectedMemberId]);

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

  return (
    <div className={cn("flex flex-col gap-1.5 relative", className)} ref={containerRef}>
      <label className="text-label text-[var(--ink)] flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
        </span>
      </label>

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full h-11 px-3.5 rounded-md text-base font-sans flex items-center justify-between text-left",
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
        <span className="truncate flex items-center gap-2">
          {selectedMember ? (
            <>
              <span className="font-medium text-[var(--ink)]">{selectedMember.full_name}</span>
              {selectedMember.appointment && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--ink-muted)]">
                  {formatAppointment(selectedMember.appointment)}
                </span>
              )}
            </>
          ) : isCustomSelected ? (
            <span className="italic text-[var(--ink)] flex items-center gap-1.5">
              <UserPlus size={15} className="text-[var(--primary)] shrink-0" />
              <span>{customOptionLabel}</span>
            </span>
          ) : (
            <span className="text-[var(--ink-muted)]">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {(selectedMember || isCustomSelected) && !disabled ? (
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMember(null);
                setSearch("");
              }}
              className="p-1 rounded-full hover:bg-[var(--background)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
              title="Limpar seleção"
            >
              <X size={15} />
            </div>
          ) : (
            <ChevronsUpDown size={16} className="text-[var(--ink-muted)]" />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[300px]">
          {/* Search Header */}
          <div className="p-2 border-b border-[var(--border)] bg-[var(--background)]/60 flex items-center gap-2">
            <Search size={16} className="text-[var(--ink-muted)] shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full bg-transparent text-body-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]/40 p-1" role="listbox">
            {/* Custom option (if allowed, e.g. "Outra pessoa (digitar nome)") */}
            {allowCustom && (
              <button
                type="button"
                onClick={() => {
                  onSelectCustom?.();
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 rounded-md text-left text-body-sm font-sans flex items-center justify-between transition-colors cursor-pointer",
                  isCustomSelected
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium"
                    : "hover:bg-[var(--background)] text-[var(--ink)]"
                )}
              >
                <span className="flex items-center gap-2">
                  <UserPlus size={15} className="text-[var(--primary)] shrink-0" />
                  <span>{customOptionLabel}</span>
                </span>
                {isCustomSelected && <Check size={16} className="text-[var(--primary)] shrink-0" />}
              </button>
            )}

            {filteredMembers.length === 0 ? (
              <div className="py-6 px-3 text-center text-body-sm text-[var(--ink-muted)] italic">
                {emptyText}
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedMemberId === m.id;
                const appLabel = formatAppointment(m.appointment);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMember(m);
                      setOpen(false);
                    }}
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
