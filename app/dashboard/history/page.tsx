import { Suspense } from "react";
import HistoryClient from "./HistoryClient";
import { AnimatedLogo } from "@/components/ui/AnimatedLogo";

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AnimatedLogo size="md" className="mb-4" spinning />
          <p className="text-app-gray">Loading history...</p>
        </div>
      </div>
    }>
      <HistoryClient />
    </Suspense>
  );
}