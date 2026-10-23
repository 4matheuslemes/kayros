"use client";

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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
  placeholder = "Digite o nome do acompanhante...",
  emptyText = "Nenhum irmão encontrado",
  disabled = false,
  className,
}: MemberComboboxProps) {
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
    if (app === "servo_ministerial") return "SM";
    return null;
  };

  const handleSelect = (member: MemberOption) => {
    onSelectMember(member);
    setSearch("");
    setOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSelectMember(null);
    setSearch("");
    setOpen(true);
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
        handleSelect(filteredMembers[0]);
      }
      return;
    }
    if (e.key === "Backspace" && search === "" && selectedMember) {
      handleClear();
    }
  };

  return (
    <div className={cn("flex flex-col gap-1.5 relative", className)} ref={containerRef}>
      <label className="text-label text-[var(--ink)] flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
        </span>
      </label>

      {/* Main Box - Direct Input */}
      <div
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
        className={cn(
          "w-full h-11 px-3.5 rounded-md font-sans flex items-center justify-between gap-2",
          "bg-[var(--surface)] border border-[var(--border)]",
          "text-[var(--ink)] transition-colors duration-150 cursor-text",
          "focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)]",
          error && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      >
        {selectedMember && !open && !search ? (
          /* Selected Member Display */
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="truncate font-medium text-body-sm text-[var(--ink)]">
              {selectedMember.full_name}
            </span>
            {selectedMember.appointment && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--ink-muted)] shrink-0">
                {selectedMember.appointment === "anciao" ? "Ancião" : "Servo ministerial"}
              </span>
            )}
          </div>
        ) : (
          /* Direct Input Field */
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
              selectedMember ? selectedMember.full_name : placeholder
            }
            className="w-full bg-transparent border-0 outline-none text-body-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] font-sans"
            aria-haspopup="listbox"
            aria-expanded={open}
          />
        )}

        {/* Clear or Dropdown Indicator */}
        <div className="flex items-center gap-1 shrink-0">
          {selectedMember && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-[var(--background)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              title="Limpar acompanhante"
              aria-label="Limpar acompanhante"
            >
              <X size={15} />
            </button>
          ) : (
            <ChevronsUpDown size={16} className="text-[var(--ink-muted)] pointer-events-none" />
          )}
        </div>
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
              {search.trim() ? `Nenhum irmão encontrado para "${search}"` : emptyText}
            </div>
          ) : (
            filteredMembers.map((m) => {
              const isSelected = selectedMemberId === m.id;
              const appLabel = formatAppointment(m.appointment);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
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
                        {appLabel === "Ancião" ? "Ancião" : "Servo ministerial"}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check size={16} className="text-[var(--primary)] shrink-0" />}
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
