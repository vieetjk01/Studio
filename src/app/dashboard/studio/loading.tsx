import PageSkeleton from "@/components/PageSkeleton";

// Covers /dashboard/studio and every nested studio route that doesn't define
// its own loading.tsx (bookings, clients, pricing, production, reports, team,
// board, payroll, equipment, crew, staff, ranking, messages, templates…).
export default function Loading() {
  return <PageSkeleton />;
}
