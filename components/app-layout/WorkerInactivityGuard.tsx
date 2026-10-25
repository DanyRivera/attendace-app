"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/actions/auth";

export const WORKER_LAST_ACTIVE_STORAGE_KEY = "tc_worker_last_active_at";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 5 * 1000;

export function resetWorkerActivityTimestamp(): void {
  try {
    window.localStorage.setItem(
      WORKER_LAST_ACTIVE_STORAGE_KEY,
      String(Date.now()),
    );
  } catch {
    // Ignora errores de almacenamiento en modo privado restringido.
  }
}

export function clearWorkerActivityTimestamp(): void {
  try {
    window.localStorage.removeItem(WORKER_LAST_ACTIVE_STORAGE_KEY);
  } catch {
    // Ignora errores de almacenamiento.
  }
}

function readLastActiveTimestamp(): number | null {
  try {
    const raw = window.localStorage.getItem(WORKER_LAST_ACTIVE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export default function WorkerInactivityGuard() {
  const timeoutRef = useRef<number | null>(null);
  const lastRecordedRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  useEffect(() => {
    const clearScheduledTimeout = () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const triggerInactivityLogout = async () => {
      if (isLoggingOutRef.current) {
        return;
      }

      isLoggingOutRef.current = true;
      clearScheduledTimeout();
      clearWorkerActivityTimestamp();

      try {
        await logout();
      } catch {
        window.location.replace("/login");
      }
    };

    const evaluateAndSchedule = () => {
      if (isLoggingOutRef.current) {
        return;
      }

      const now = Date.now();
      const storedTimestamp = readLastActiveTimestamp();

      if (storedTimestamp === null) {
        lastRecordedRef.current = now;
        resetWorkerActivityTimestamp();
        clearScheduledTimeout();
        timeoutRef.current = window.setTimeout(
          () => void triggerInactivityLogout(),
          INACTIVITY_TIMEOUT_MS,
        );
        return;
      }

      const elapsed = now - storedTimestamp;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        void triggerInactivityLogout();
        return;
      }

      const remaining = Math.max(INACTIVITY_TIMEOUT_MS - elapsed, 0);
      clearScheduledTimeout();
      timeoutRef.current = window.setTimeout(
        () => void triggerInactivityLogout(),
        remaining,
      );
    };

    const handleUserActivity = () => {
      if (isLoggingOutRef.current) {
        return;
      }

      const now = Date.now();
      const storedTimestamp = readLastActiveTimestamp();

      if (
        storedTimestamp !== null &&
        now - storedTimestamp >= INACTIVITY_TIMEOUT_MS
      ) {
        void triggerInactivityLogout();
        return;
      }

      if (now - lastRecordedRef.current < ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastRecordedRef.current = now;
      resetWorkerActivityTimestamp();
      clearScheduledTimeout();
      timeoutRef.current = window.setTimeout(
        () => void triggerInactivityLogout(),
        INACTIVITY_TIMEOUT_MS,
      );
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      evaluateAndSchedule();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === WORKER_LAST_ACTIVE_STORAGE_KEY) {
        evaluateAndSchedule();
      }
    };

    evaluateAndSchedule();

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
      "scroll",
      "mousemove",
    ];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    }

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearScheduledTimeout();

      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleUserActivity);
      }

      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null;
}
