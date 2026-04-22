"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { restorePlan } from "./actions";

export function RestoreForm({ planId }: { planId: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await restorePlan(planId);
          toast.success("Plan restored");
          window.location.reload();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed");
        }
      }}
    >
      Make active
    </Button>
  );
}
