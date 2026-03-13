"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api";
import type { DigestEntry, ImpactItem, MinuteItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function PublicHubClient() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [minutesSearch, setMinutesSearch] = useState("");
  const [digest, setDigest] = useState<DigestEntry[]>([]);
  const [impact, setImpact] = useState<ImpactItem[]>([]);
  const [minutes, setMinutes] = useState<MinuteItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const loadHub = async () => {
      try {
        const [digestData, impactData, minuteData] = await Promise.all([
          apiRequest<DigestEntry[]>("/api/hub/digest"),
          apiRequest<ImpactItem[]>("/api/hub/impact"),
          apiRequest<MinuteItem[]>(`/api/hub/minutes${minutesSearch ? `?q=${encodeURIComponent(minutesSearch)}` : ""}`)
        ]);
        setDigest(digestData);
        setImpact(impactData);
        setMinutes(minuteData);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load the public hub.");
      }
    };

    void loadHub();
  }, [minutesSearch, user]);

  if (loading || !user) {
    return <div className="py-20 text-center text-muted-foreground">Loading public hub...</div>;
  }

  return (
    <AppShell
      user={user}
      onLogout={async () => {
        await logout();
        router.push("/login");
      }}
    >
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Quarterly digest</CardTitle>
              <CardDescription>Resolved cases translated into visible operational change.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {digest.map((entry) => (
                <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="mb-2 text-xs uppercase tracking-[0.28em] text-primary">{entry.quarter}</div>
                  <h3 className="font-display text-xl">{entry.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{entry.summary}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minutes archive</CardTitle>
              <CardDescription>Search uploaded PDFs from JCC and management meetings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search minutes" value={minutesSearch} onChange={(event) => setMinutesSearch(event.target.value)} />
              </div>
              <div className="space-y-3">
                {minutes.map((item) => (
                  <a
                    key={item.id}
                    href={item.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-primary/40 hover:bg-white/10"
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">Uploaded by {item.uploadedByName} on {formatDate(item.createdAt)}</div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Impact tracking</CardTitle>
            <CardDescription>What staff raised, what management changed, and where the effect showed up.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {impact.map((item) => (
              <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.28em] text-primary">{item.department}</div>
                <p className="mt-3 text-sm text-muted-foreground">Raised</p>
                <p className="text-sm">{item.raised}</p>
                <p className="mt-4 text-sm text-muted-foreground">Action taken</p>
                <p className="text-sm">{item.actionTaken}</p>
                <p className="mt-4 text-sm text-muted-foreground">What changed</p>
                <p className="text-sm">{item.changeDelivered}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      </div>
    </AppShell>
  );
}