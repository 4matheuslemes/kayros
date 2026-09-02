"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Fingerprint, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState(false);

  const backgroundTimeRef = useRef<number | null>(null);

  // Parse PIN on mount
  useEffect(() => {
    const pinHash = localStorage.getItem("app_pin_hash");
    setHasPin(!!pinHash);
    setHasBiometrics(localStorage.getItem("app_biometrics") === "true");
  }, []);

  // Listen to visibility change
  useEffect(() => {
    if (!hasPin) return; // Completely disabled if no PIN

    const handleVisibilityChange = () => {
      if (document.hidden) {
        backgroundTimeRef.current = Date.now();
      } else {
        if (backgroundTimeRef.current) {
          const elapsed = Date.now() - backgroundTimeRef.current;
          if (elapsed > 30000) { // 30 seconds
            setLocked(true);
            setPinInput("");
            setError(false);
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [hasPin]);

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
        setLocked(false);
      }
    } catch (e) {
      console.error("Biometrics failed", e);
    }
  };

  // Attempt biometrics automatically when locking if available
  useEffect(() => {
    if (locked && hasBiometrics) {
      handleUnlockWithBiometrics();
    }
  }, [locked, hasBiometrics]);

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;
    const encoder = new TextEncoder();
    const data = encoder.encode(pinInput);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    if (hash === localStorage.getItem("app_pin_hash")) {
      setLocked(false);
      setError(false);
    } else {
      setError(true);
      setPinInput("");
    }
  };

  if (locked) {
    return (
      <div className="fixed inset-0 z-[100] bg-[var(--background)] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-6 max-w-xs w-full">
          <div className="w-16 h-16 bg-[var(--surface)] border border-[var(--border)] rounded-full flex items-center justify-center mb-4">
            <Lock size={32} className="text-[var(--primary)]" />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="font-display font-semibold text-2xl text-[var(--ink)]">App Bloqueado</h1>
            <p className="text-sm text-[var(--ink-muted)]">Digite seu PIN para acessar o Kairós</p>
          </div>

          <div className="flex gap-3 my-4">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`w-12 h-14 rounded-md border-2 flex items-center justify-center text-xl font-bold font-sans transition-colors ${
                  pinInput[i] 
                    ? 'border-[var(--primary)] text-[var(--primary)]' 
                    : error 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                {pinInput[i] ? "•" : ""}
              </div>
            ))}
          </div>

          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            autoFocus
            maxLength={4}
            value={pinInput}
            onChange={(e) => {
              setError(false);
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPinInput(val);
            }}
            className="absolute opacity-0 -z-10"
            style={{ fontSize: '16px' }} // Prevent iOS zoom
          />

          <Button
            size="lg"
            className="w-full"
            disabled={pinInput.length !== 4}
            onClick={handlePinSubmit}
          >
            <LogIn size={18} className="mr-2" />
            Desbloquear
          </Button>

          {hasBiometrics && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full mt-2"
              onClick={handleUnlockWithBiometrics}
            >
              <Fingerprint size={18} className="mr-2" />
              Usar Biometria
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
