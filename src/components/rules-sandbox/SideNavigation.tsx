"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard,
  BookOpen, 
  PlusCircle, 
  FileText, 
  TestTube, 
  CheckCircle,
  Cog,
  ChevronRight,
  Home,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Mobile Bottom Navigation Component
function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  
  const navigationItems = [
    {
      title: "Home",
      icon: LayoutDashboard,
      route: "/rules-sandbox",
      isActive: pathname === "/rules-sandbox"
    },
    {
      title: "Library",
      icon: BookOpen,
      route: "/rules-sandbox/library",
      isActive: pathname === "/rules-sandbox/library"
    },
    {
      title: "Create",
      icon: PlusCircle,
      route: "/rules-sandbox/create",
      isActive: pathname === "/rules-sandbox/create"
    },
    {
      title: "Templates",
      icon: FileText,
      route: "/rules-sandbox/templates",
      isActive: pathname === "/rules-sandbox/templates"
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/50 dark:border-slate-700/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-1 py-1 pb-safe">
        {navigationItems.map((item) => (
          <Button
            key={item.route}
            variant="ghost"
            size="sm"
            onClick={() => router.push(item.route)}
            className={`flex flex-col items-center space-y-1 min-w-0 flex-1 h-14 px-2 py-2 rounded-lg ${
              item.isActive
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="text-xs font-medium truncate">{item.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

export function SideNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { state } = useSidebar();

  const navigationItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      route: "/rules-sandbox",
      badge: null,
      description: "Overview and analytics"
    },
    {
      title: "Rule Library",
      icon: BookOpen,
      route: "/rules-sandbox/library",
      badge: "12",
      description: "Browse existing rules"
    },
    {
      title: "Create Rule",
      icon: PlusCircle,
      route: "/rules-sandbox/create",
      badge: null,
      description: "Build new rules"
    },
    {
      title: "Templates",
      icon: FileText,
      route: "/rules-sandbox/templates",
      badge: "8",
      description: "Pre-built templates"
    },
    {
      title: "Testing",
      icon: TestTube,
      route: "/rules-sandbox/testing",
      badge: null,
      description: "Validate rules"
    },
    {
      title: "Approvals",
      icon: CheckCircle,
      route: "/rules-sandbox/approvals",
      badge: "3",
      description: "Pending reviews"
    }
  ];

  const isActive = (route: string) => {
    if (route === "/rules-sandbox") {
      return pathname === route;
    }
    return pathname.startsWith(route);
  };

  // Show mobile bottom nav on mobile devices
  if (isMobile) {
    return <MobileBottomNav />;
  }

  return (
    <>
      <Sidebar className={`border-r border-slate-200/50 dark:border-slate-700/50 ${isMobile ? 'fixed inset-y-0 left-0 z-40 transform transition-transform duration-300' : ''}`}>
        <SidebarHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 border-b border-slate-200/10 dark:border-slate-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
                <Cog className="w-5 h-5 text-white" />
              </div>
              {state === "expanded" && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white tracking-wide">
                    Rules Sandbox
                  </span>
                  <span className="text-xs text-white/60 font-light">
                    Business Intelligence
                  </span>
                </div>
              )}
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {}}
                className="text-white hover:bg-white/10 p-1"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <SidebarMenu>
            {/* Main Application Link */}
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push("/")}
                className="mb-4 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/30 dark:border-slate-700/30"
                tooltip={state === "collapsed" ? "Back to Main App" : undefined}
              >
                <Home className="w-4 h-4" />
                {state === "expanded" && (
                  <>
                    <span className="font-medium">Back to Main App</span>
                    <ChevronRight className="w-3 h-3 ml-auto text-slate-400" />
                  </>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Navigation Items */}
            {navigationItems.map((item) => (
              <SidebarMenuItem key={item.route}>
                <SidebarMenuButton
                  isActive={isActive(item.route)}
                  onClick={() => router.push(item.route)}
                  className={`group transition-all duration-200 ${
                    isActive(item.route)
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                  }`}
                  tooltip={state === "collapsed" ? item.title : undefined}
                >
                  <item.icon className="w-4 h-4" />
                  {state === "expanded" && (
                    <>
                      <div className="flex flex-col items-start flex-1 min-w-0">
                        <span className="font-medium truncate">{item.title}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {item.description}
                        </span>
                      </div>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-slate-200/30 dark:border-slate-700/30">
          {state === "expanded" && (
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
              <p className="font-medium">Flowserve AI Platform</p>
              <p>Business Rules Engine</p>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}