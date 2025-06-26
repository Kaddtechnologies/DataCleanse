"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface SectionContainerProps {
  children: React.ReactNode;
}

// Mobile Header Component
function MobileHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname === "/rules-sandbox") return "Business Rules Dashboard";
    if (pathname.includes("/library")) return "Rule Library";
    if (pathname.includes("/create")) return "Create Rule";
    if (pathname.includes("/templates")) return "Rule Templates";
    if (pathname.includes("/testing")) return "Testing";
    if (pathname.includes("/approvals")) return "Approvals";
    return "Rules Sandbox";
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-b border-slate-200/50 dark:border-slate-700/50 safe-area-inset-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="p-2 shrink-0"
            aria-label="Back to main application"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Business Rules Engine
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function SectionContainer({ children }: SectionContainerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen w-full">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto pb-20 safe-area-inset-bottom">
          <div className="p-4 space-y-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <SidebarInset className="flex flex-col min-h-screen">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}