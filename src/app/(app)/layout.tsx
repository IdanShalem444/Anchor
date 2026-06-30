"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/nav/NavBar";
import { DesktopNotifier } from "@/components/DesktopNotifier";
import { AssessmentCheckIn } from "@/components/AssessmentCheckIn";
import { BillingHost } from "@/components/billing/BillingHost";
import { Splash } from "@/components/Splash";
import { useAuth, useCurrentUser } from "@/store/auth";
import { useData } from "@/store/data";
import { useMounted } from "@/lib/hooks";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useCurrentUser();
  const sessionResolved = useAuth((s) => s.sessionResolved);
  const mounted = useMounted();
  const router = useRouter();
  const touchStreak = useData((s) => s.touchStreak);

  useEffect(() => {
    if (mounted && sessionResolved && !user) router.replace("/");
  }, [mounted, sessionResolved, user, router]);

  useEffect(() => {
    if (mounted && user) touchStreak();
  }, [mounted, user, touchStreak]);

  if (!mounted || !sessionResolved || !user) return <Splash />;

  return (
    <div className="relative min-h-dvh">
      <NavBar />
      <DesktopNotifier />
      <AssessmentCheckIn />
      <BillingHost />
      <div className="pt-[88px]">{children}</div>
    </div>
  );
}
