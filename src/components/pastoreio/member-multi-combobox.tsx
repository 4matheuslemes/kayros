"use client";

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
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
  disabled = false,
  className,
}: MemberMultiComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Selected member objects
  const selectedMembers = useMemo(() => {
    return selectedMemberIds
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean) as MemberOption[];
  }, [members, selectedMemberIds]);

  // Available members (excluding already selected ones)
  const availableMembers = useMemo(() => {
    return members.filter((m) => !selectedMemberIds.includes(m.id));
  }, [members, selectedMemberIds]);

  // Filtered available members based on current query
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableMembers;
    return availableMembers.filter((m) => m.full_name.toLowerCase().includes(q));
  }, [availableMembers, search]);

  const formatAppointment = (app?: string | null) => {
    if (app === "anciao") return "Ancião";
    if (app === "servo_ministerial") return "SM";
    return null;
  };

  const handleSelect = (memberId: string) => {
    onToggleMember(memberId);
    setSearch("");
    setOpen(true);
    // Keep focus in input for immediate continuation
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredMembers.length > 0) {
        handleSelect(filteredMembers[0].id);
      }
      return;
    }
    if (e.key === "Backspace" && search === "" && selectedMemberIds.length > 0) {
      onRemoveMember(selectedMemberIds[selectedMemberIds.length - 1]);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5 relative", className)} ref={containerRef}>
      <label className="text-label text-[var(--ink)] flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
        </span>
        {selectedMemberIds.length > 0 && (
          <span className="text-caption text-[var(--ink-muted)]">
            {selectedMemberIds.length} {selectedMemberIds.length === 1 ? "selecionado" : "selecionados"}
          </span>
        )}
      </label>

      {/* Main Container acting as direct input */}
      <div
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
        className={cn(
          "w-full min-h-[44px] p-2 rounded-md font-sans flex flex-wrap items-center gap-1.5",
          "bg-[var(--surface)] border border-[var(--border)]",
          "text-[var(--ink)] transition-colors duration-150 cursor-text",
          "focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]",
          error && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {/* Selected Member Chips */}
        {selectedMembers.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 animate-in fade-in duration-100 select-none"
          >
            <span className="truncate max-w-[180px]">{m.full_name}</span>
            {m.appointment && (
              <span className="text-[10px] opacity-75 shrink-0">
                ({formatAppointment(m.appointment)})
              </span>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMember(m.id);
                inputRef.current?.focus();
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
          disabled={disabled}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedMemberIds.length === 0
              ? "Digite para buscar irmãos..."
              : "Digite para adicionar outro..."
          }
          className="flex-1 min-w-[140px] bg-transparent border-0 outline-none p-1 text-body-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] font-sans"
          aria-haspopup="listbox"
          aria-expanded={open}
        />
      </div>

      {/* Dropdown Menu */}
      {open && !disabled && (
        <div
          className="absolute z-50 top-[calc(100%+4px)] left-0 right-0 rounded-lg bg-[var(--surface)] border border-[var(--border)] shadow-lg max-h-[260px] overflow-y-auto divide-y divide-[var(--border)]/40 p-1 animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredMembers.length === 0 ? (
            <div className="py-6 px-3 text-center text-body-sm text-[var(--ink-muted)] italic">
              {availableMembers.length === 0
                ? "Todos os irmãos disponíveis já foram adicionados"
                : `Nenhum irmão encontrado para "${search}"`}
            </div>
          ) : (
            filteredMembers.map((m) => {
              const appLabel = formatAppointment(m.appointment);
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
                    {appLabel && (
                      <span className="text-[11px] text-[var(--ink-muted)]">
                        {appLabel === "Ancião" ? "Ancião" : "Servo ministerial"}
                      </span>
                    )}
                  </div>
                  <Plus size={16} className="text-[var(--primary)] shrink-0 opacity-70" />
                </button>
              );
            })
          )}
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
