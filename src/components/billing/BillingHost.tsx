"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { onBlock, onUsage, onOffline, type EntitlementBlock } from "@/lib/billing/signals";
import { UpgradeModal } from "./UpgradeModal";

// Global billing host: shows the upgrade modal on plan blocks (limit reached /
// feature locked) and a gentle toast as a user approaches their monthly limit.
export function BillingHost() {
  const [block, setBlock] = useState<EntitlementBlock | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => onBlock((b) => setBlock(b)), []);

  useEffect(
    () =>
      onUsage((u) => {
        // Warn once they cross ~80% (but not when they've hit the cap — the
        // block modal covers that).
        if (u.limit > 0 && u.used >= Math.ceil(u.limit * 0.8) && u.used < u.limit) {
          setToast(`${u.used} of ${u.limit} AI generations used this month`);
        }
      }),
    []
  );

  useEffect(
    () =>
      onOffline(() =>
        setToast("AI was busy — showing an offline draft. Regenerate in a moment for the full model.")
      ),
    []
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <>
      <UpgradeModal block={block} onClose={() => setBlock(null)} />
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-5 left-1/2 z-[90] flex -translate-x-1/2 items-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg"
          >
            <TriangleAlert size={15} className="shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
