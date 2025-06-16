"use client";

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SideNavigation } from "@/components/rules-sandbox/SideNavigation";
import { SectionContainer } from "@/components/rules-sandbox/SectionContainer";

interface RulesSandboxLayoutProps {
  children: React.ReactNode;
}

export default function RulesSandboxLayout({ children }: RulesSandboxLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <SidebarProvider defaultOpen={false}>
        <div className="flex min-h-screen w-full relative">
          <SideNavigation />
          <SectionContainer>
            {children}
          </SectionContainer>
        </div>
      </SidebarProvider>
    </div>
  );
}