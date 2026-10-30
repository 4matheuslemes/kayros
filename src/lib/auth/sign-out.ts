import { getDb } from "@/lib/db/dexie";
import { createClient } from "@/lib/supabase/client";

/**
 * Logout seguro com limpeza profunda (Dexie, localStorage, caches do SW),
 * essencial em PWA / dispositivos compartilhados.
 * Retorna quando concluído; o chamador deve redirecionar para /login.
 */
export async function secureSignOut(): Promise<void> {
  try {
    await getDb().delete();
  } catch (e) {
    console.warn("Erro ao limpar banco local Dexie:", e);
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn("Erro ao limpar storage local:", e);
  }

  try {
    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("Erro ao limpar caches do Service Worker:", e);
  }

  try {
    await createClient().auth.signOut();
  } catch (e) {
    console.warn("Erro ao encerrar sessão:", e);
  }

  window.location.replace("/login");
}

