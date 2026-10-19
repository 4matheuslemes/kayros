"use client";

import { useState, useEffect } from "react";
import { Lock, Fingerprint, Shield, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export function SecuritySettings() {
  const [hasPin, setHasPin] = useState(false);
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [step, setStep] = useState<"create" | "confirm">("create");

  useEffect(() => {
    const pin = !!localStorage.getItem("app_pin_hash");
    setHasPin(pin);
    setIsLockEnabled(pin && localStorage.getItem("app_lock_enabled") !== "false");
    setHasBiometrics(localStorage.getItem("app_biometrics") === "true");

    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometricsAvailable(available));
    }
  }, []);

  const handleTogglePin = () => {
    if (hasPin) {
      if (isLockEnabled) {
        localStorage.setItem("app_lock_enabled", "false");
        setIsLockEnabled(false);
        toast.success("Trava geral desativada (PIN mantido para áreas sensíveis)");
      } else {
        localStorage.setItem("app_lock_enabled", "true");
        setIsLockEnabled(true);
        toast.success("Trava de acesso ativada");
      }
    } else {
      setStep("create");
      setPinInput("");
      setPinConfirm("");
      setPinModalOpen(true);
    }
  };

  const handleRemovePin = () => {
    localStorage.removeItem("app_pin_hash");
    localStorage.removeItem("app_lock_enabled");
    localStorage.removeItem("app_biometrics");
    setHasPin(false);
    setIsLockEnabled(false);
    setHasBiometrics(false);
    toast.success("PIN removido com sucesso");
  };

  const handleSavePin = async () => {
    if (pinInput.length !== 4) return;
    if (step === "create") {
      setStep("confirm");
    } else {
      if (pinInput === pinConfirm) {
        const hash = await hashPin(pinInput);
        localStorage.setItem("app_pin_hash", hash);
        localStorage.setItem("app_lock_enabled", "true");
        setHasPin(true);
        setIsLockEnabled(true);
        setPinModalOpen(false);
        toast.success("PIN configurado com sucesso");
      } else {
        toast.error("Os PINs não coincidem");
        setPinConfirm("");
      }
    }
  };

  const handleToggleBiometrics = async () => {
    if (hasBiometrics) {
      localStorage.removeItem("app_biometrics");
      setHasBiometrics(false);
      toast.success("Desbloqueio por biometria desativado");
    } else {
      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Kairós", id: window.location.hostname },
            user: {
              id: new Uint8Array(16),
              name: "user",
              displayName: "Usuário do Kairós",
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
            timeout: 60000,
          },
        });

        if (credential) {
          localStorage.setItem("app_biometrics", "true");
          setHasBiometrics(true);
          toast.success("Biometria ativada com sucesso");
        }
      } catch (e) {
        console.error(e);
        toast.error("Falha ao configurar biometria");
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 hover:bg-[var(--background)] transition-colors">
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-[var(--ink-muted)]" />
          <div className="text-left">
            <span className="text-body-sm text-[var(--ink)] block leading-tight">Trava de Acesso (PIN)</span>
            <span className="text-caption text-[var(--ink-muted)] mt-0.5 block">Exigir senha ao abrir o app</span>
          </div>
        </div>
        <button
          onClick={handleTogglePin}
          className={`w-11 h-6 rounded-full transition-colors relative shadow-inner ${isLockEnabled ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform duration-200 ease-out ${isLockEnabled ? 'translate-x-5' : 'translate-x-0.5'} top-0.5`} />
        </button>
      </div>

      {hasPin && (
        <div className="flex items-center justify-between px-5 py-2 bg-[var(--surface)] border-t border-[var(--border)] text-caption">
          <button
            type="button"
            onClick={() => {
              setStep("create");
              setPinInput("");
              setPinConfirm("");
              setPinModalOpen(true);
            }}
            className="text-[var(--primary)] font-medium hover:underline"
          >
            Alterar PIN
          </button>
          <button
            type="button"
            onClick={handleRemovePin}
            className="text-red-500 font-medium hover:underline"
          >
            Remover PIN
          </button>
        </div>
      )}

      {hasPin && biometricsAvailable && (
        <div className="flex items-center justify-between px-5 py-4 hover:bg-[var(--background)] transition-colors">
          <div className="flex items-center gap-3">
            <Fingerprint size={16} className="text-[var(--ink-muted)]" />
            <div className="text-left">
              <span className="text-body-sm text-[var(--ink)] block leading-tight">Biometria</span>
              <span className="text-caption text-[var(--ink-muted)] mt-0.5 block">Face ID / Touch ID</span>
            </div>
          </div>
          <button
            onClick={handleToggleBiometrics}
            className={`w-11 h-6 rounded-full transition-colors relative shadow-inner ${hasBiometrics ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full absolute shadow-sm transition-transform duration-200 ease-out ${hasBiometrics ? 'translate-x-5' : 'translate-x-0.5'} top-0.5`} />
          </button>
        </div>
      )}

      <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>
              {step === "create" ? "Criar PIN de acesso" : "Confirme seu PIN"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <Lock size={32} className="text-[var(--primary)] mb-2" />
            
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => {
                const val = step === "create" ? pinInput[i] : pinConfirm[i];
                return (
                  <div key={i} className={`w-12 h-14 rounded-md border-2 flex items-center justify-center text-xl font-bold font-sans ${val ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
                    {val ? "•" : ""}
                  </div>
                );
              })}
            </div>

            <Input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              maxLength={4}
              value={step === "create" ? pinInput : pinConfirm}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                if (step === "create") {
                  setPinInput(val);
                } else {
                  setPinConfirm(val);
                }
              }}
              className="absolute opacity-0 -z-10"
              style={{ fontSize: '16px' }} // Prevent iOS zoom
            />

            <Button
              className="w-full mt-4"
              disabled={step === "create" ? pinInput.length !== 4 : pinConfirm.length !== 4}
              onClick={handleSavePin}
            >
              {step === "create" ? "Avançar" : "Salvar PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
