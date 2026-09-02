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
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [step, setStep] = useState<"create" | "confirm">("create");

  useEffect(() => {
    setHasPin(!!localStorage.getItem("app_pin_hash"));
    setHasBiometrics(localStorage.getItem("app_biometrics") === "true");

    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setBiometricsAvailable(available));
    }
  }, []);

  const handleTogglePin = () => {
    if (hasPin) {
      localStorage.removeItem("app_pin_hash");
      localStorage.removeItem("app_biometrics");
      setHasPin(false);
      setHasBiometrics(false);
      toast.success("Trava de acesso desativada");
    } else {
      setStep("create");
      setPinInput("");
      setPinConfirm("");
      setPinModalOpen(true);
    }
  };

  const handleSavePin = async () => {
    if (pinInput.length !== 4) return;
    if (step === "create") {
      setStep("confirm");
    } else {
      if (pinInput === pinConfirm) {
        const hash = await hashPin(pinInput);
        localStorage.setItem("app_pin_hash", hash);
        setHasPin(true);
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
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Shield size={16} className="text-[var(--primary)]" />
          <h2 className="text-subheading text-[var(--ink)]">Segurança</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">Trava de Acesso (PIN)</p>
              <p className="text-caption text-[var(--ink-muted)]">Exigir senha ao voltar para o app</p>
            </div>
            <button
              onClick={handleTogglePin}
              className={`w-11 h-6 rounded-full transition-colors relative ${hasPin ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${hasPin ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {hasPin && biometricsAvailable && (
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">Desbloqueio por Biometria</p>
                <p className="text-caption text-[var(--ink-muted)]">Face ID / Touch ID / Digital</p>
              </div>
              <button
                onClick={handleToggleBiometrics}
                className={`w-11 h-6 rounded-full transition-colors relative ${hasBiometrics ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${hasBiometrics ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          )}
        </div>
      </Card>

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
