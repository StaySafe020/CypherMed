"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

export default function DashboardRedirect() {
  const router = useRouter();
  const { profile } = useUserStore();

  useEffect(() => {
    if (!profile) {
      router.replace("/connect");
    } else if (profile.role === "patient") {
      router.replace("/dashboard/patient");
    } else {
      router.replace("/dashboard/provider");
    }
  }, [profile, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] text-sm text-[#6d7d75]">
      Opening your workspace...
    </main>
  );
}
