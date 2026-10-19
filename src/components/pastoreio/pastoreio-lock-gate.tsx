"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Fingerprint, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PastoreioLockGateProps {
  onUnlock: () => void;
}

export function PastoreioLockGate({ onUnlock }: PastoreioLockGateProps) {
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
    const biometricsEnabled = typeof window !== "undefined" && localStorage.getItem("app_biometrics") === "true";
    setHasBiometrics(biometricsEnabled);

    if (biometricsEnabled) {
      handleUnlockWithBiometrics();
    }
  }, []);

  const handleUnlockWithBiometrics = async () => {
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (credential) {
        onUnlock();
      }
    } catch (e) {
      console.warn("Biometrics verification not completed:", e);
    }
  };

  const handlePinSubmit = async (pinToTest?: string) => {
    const pin = pinToTest ?? pinInput;
    if (pin.length !== 4) return;

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      if (hash === localStorage.getItem("app_pin_hash")) {
        setError(false);
        onUnlock();
      } else {
        setError(true);
        setPinInput("");
      }
    } catch (e) {
      console.error("PIN check failed:", e);
      setError(true);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center py-10 px-4 animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-5 max-w-xs w-full text-center">
        <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center shadow-sm">
          <ShieldCheck size={32} className="text-[var(--primary)]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-display font-semibold text-2xl text-[var(--ink)]">
            Acesso Confidencial
          </h2>
          <p className="text-body-sm text-[var(--ink-muted)]">
            Confirme seu PIN ou biometria para acessar o Registro de Pastoreio.
          </p>
        </div>

        <div className="flex gap-3 my-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-xl font-bold font-sans transition-colors ${
                pinInput[i]
                  ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)] shadow-xs"
                  : error
                  ? "border-red-500 bg-red-500/10 text-red-500"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {pinInput[i] ? "•" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-caption text-red-500 font-medium -mt-2 animate-shake">
            PIN incorreto. Tente novamente.
          </p>
        )}

        <Input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          maxLength={4}
          value={pinInput}
          onChange={(e) => {
            setError(false);
            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
            setPinInput(val);
            if (val.length === 4) {
              handlePinSubmit(val);
            }
          }}
          className="absolute opacity-0 -z-10"
          style={{ fontSize: "16px" }}
        />

        <div className="flex flex-col gap-2.5 w-full mt-2">
          <Button
            size="lg"
            className="w-full"
            disabled={pinInput.length !== 4}
            onClick={() => handlePinSubmit()}
          >
            <LogIn size={18} className="mr-2" />
            Desbloquear
          </Button>

          {hasBiometrics && (
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleUnlockWithBiometrics}
            >
              <Fingerprint size={18} className="mr-2 text-[var(--primary)]" />
              Usar Biometria
            </Button>
          )}

          <Link
            href="/perfil"
            className="text-body-sm text-[var(--ink-muted)] hover:text-[var(--ink)] inline-flex items-center justify-center gap-1.5 py-2 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao Perfil
          </Link>
        </div>
      </div>
    </div>
  );
}
