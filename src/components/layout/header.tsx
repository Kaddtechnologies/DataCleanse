"use client";

import React from "react";
import { Waves } from "lucide-react";

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
  return (
    <header className="bg-primary-gradient shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 md:py-6">
        {/* Row: Brand left, theme toggle right */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Waves className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-2xl font-bold title-gradient">DataCleanse</h1>
          </div>

          {/* Unobtrusive toggle */}
          <ThemeToggle />
        </div>

        {/* Subtitle */}
        <p className="mt-1 text-sm text-muted-foreground">
          Intelligent Customer Deduplication
        </p>
      </div>
    </header>
  );
}
