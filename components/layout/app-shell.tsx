"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { Bell, LayoutDashboard, LogOut, Newspaper, ShieldCheck } from "lucide-react";
import type { AuthUser } from "@/lib/types";
import { getRoleLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AppShellProps {
  user: AuthUser;
  onLogout: () => Promise<void>;
  children: ReactNode;
}

export function AppShell({ user, onLogout, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-panel">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">NeoConnect</div>
              <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">staff voice intelligence</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/dashboard" className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
              <span className="inline-flex items-center gap-2"><LayoutDashboard className="size-4" /> Dashboard</span>
            </Link>
            <Link href="/public-hub" className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
              <span className="inline-flex items-center gap-2"><Newspaper className="size-4" /> Public Hub</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-right sm:block">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</div>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>

      <div className="fixed bottom-5 right-5 hidden rounded-full border border-white/10 bg-card/85 p-3 text-muted-foreground shadow-panel backdrop-blur lg:block">
        <Bell className="size-5" />
      </div>
    </div>
  );
}