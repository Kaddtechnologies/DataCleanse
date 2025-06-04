"use client";

import React from "react";

import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";

/**
 * Tiny theme toggle switch that sits at far-right of the header
 * without disrupting the existing layout.  It re-uses the shared
 * <Switch> primitive for full keyboard accessibility.
 */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center">
      <span className="sr-only">Toggle dark mode</span>
      <Switch
        aria-label="Toggle dark mode"
        checked={theme === "dark"}
        onCheckedChange={toggleTheme}
        className="h-5 w-9"
      />
    </div>
  );
}

export function AppHeader() {
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? "/flowserve_logo_white.svg" : "/flowserve_logo_white.svg";

  return (
    <header className="bg-primary-gradient shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 md:py-6">
        {/* Row: Brand left, theme toggle right */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={logoSrc}
              alt="Flowserve Logo"
              height={45}
              className="h-8 w-auto"
            />
            {/* <h1 className="text-2xl font-bold title-gradient">
              Flowserve AI Data Cleanser
            </h1> */}
          </div>

          {/* Unobtrusive toggle */}
          <ThemeToggle />
        </div>

        {/* Subtitle */}
        <p className="mt-1 text-sm text-accent-foreground">
          Intelligent ERP Data Cleanser
        </p>
      </div>
    </header>
  );
}
