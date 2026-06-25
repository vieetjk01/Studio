"use client";

import { usePathname } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";
import StudioFooterNav from "@/components/StudioFooterNav";
import StudioShell from "@/components/StudioShell";
import type { Profile } from "@/lib/types";

type StudioTier = "none" | "booking" | "full";

/**
 * Chooses the dashboard chrome per route:
 *  - studio routes (Photographer+/Studio) → the mstudo green sidebar shell
 *  - everything else → the standard top-nav header + centered main
 * Done client-side so we can branch on the current pathname.
 */
export default function DashboardChrome({
  profile,
  kind,
  tier,
  role,
  showFooter,
  children,
}: {
  profile: Profile;
  kind: "app" | "img" | "admin";
  tier: StudioTier;
  role: string;
  showFooter: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Use the studio shell (green sidebar) for all studio workspace paths.
  // Also pull in adjacent pages (site builder, upgrade, settings) when the
  // user has a studio tier so they stay in the same design context.
  const isStudio =
    pathname.startsWith("/dashboard/studio") ||
    pathname.startsWith("/dashboard/galleries") ||
    (tier !== "none" && (
      pathname.startsWith("/dashboard/site") ||
      pathname.startsWith("/dashboard/upgrade") ||
      pathname.startsWith("/dashboard/settings")
    ));

  if (isStudio && tier !== "none") {
    return (
      <StudioShell profile={profile} tier={tier} role={role}>
        {children}
      </StudioShell>
    );
  }

  return (
    <>
      <DashboardHeader profile={profile} kind={kind} />
      <main className={`mx-auto max-w-6xl px-6 py-8 md:px-10${showFooter ? " pb-24" : ""}`}>
        {children}
      </main>
      {showFooter && <StudioFooterNav tier={tier} role={role} />}
    </>
  );
}
