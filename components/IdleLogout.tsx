"use client";

import { useEffect } from "react";

const IDLE_MS = 30 * 60 * 1000;
const STORAGE_KEY = "pd_last_activity";

export default function IdleLogout() {
  useEffect(() => {
    let lastActivity = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let validator: ReturnType<typeof setInterval>;
    let finishing = false;

    const finish = async () => {
      if (finishing) return;
      finishing = true;
      try {
        localStorage.removeItem(STORAGE_KEY);
        await fetch("/api/auth/logout", { method: "POST", keepalive: true });
      } catch {
        // La sesión también caduca en el servidor aunque el navegador esté sin red.
      }
      location.replace("/");
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(finish, Math.max(0, IDLE_MS - (Date.now() - lastActivity)));
    };

    const activity = () => {
      const now = Date.now();
      if (now - lastActivity < 15000) return;
      lastActivity = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // El temporizador local sigue funcionando si el almacenamiento está deshabilitado.
      }
      schedule();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        lastActivity = Number(event.newValue) || Date.now();
        schedule();
      }
      if (event.key === STORAGE_KEY && !event.newValue) finish();
    };

    const onVisibility = () => {
      if (!document.hidden && Date.now() - lastActivity >= IDLE_MS) finish();
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, activity, { passive: true }));
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    schedule();

    validator = setInterval(async () => {
      if (document.hidden || finishing) return;
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (response.status === 401) finish();
      } catch {
        // No se cierra una sesión por un corte de red puntual.
      }
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(validator);
      events.forEach((event) => window.removeEventListener(event, activity));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
