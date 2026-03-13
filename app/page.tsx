import Link from "next/link";
import { ArrowRight, ChartColumnBig, MessagesSquare, Newspaper, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pillars = [
  {
    title: "Complaint intake",
    description: "Structured submissions with anonymous reporting, file uploads, tracking IDs, and case ownership.",
    icon: MessagesSquare
  },
  {
    title: "Public accountability hub",
    description: "Quarterly digest, impact tracking, and searchable minutes archive for transparent follow-through.",
    icon: Newspaper
  },
  {
    title: "Polling and analytics",
    description: "One-vote staff polls plus hotspot dashboards for management and secretariat teams.",
    icon: ChartColumnBig
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-panel">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">NeoConnect</div>
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">full stack challenge build</div>
          </div>
        </div>
        <Button asChild>
          <Link href="/login">Launch app</Link>
        </Button>
      </header>

      <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-primary">
            Staff feedback operating system
          </div>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-semibold leading-tight sm:text-6xl">
            Safe reporting, visible action, and automatic escalation when response windows are missed.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Built for the NeoConnect use case with Next.js, Express, MongoDB, JWT auth, Tailwind, and shadcn-style components.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button asChild size="lg">
              <Link href="/login">
                Sign in <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/public-hub">View public hub</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(180deg,rgba(249,115,22,0.12),rgba(15,23,42,0.15))]">
          <CardHeader>
            <CardTitle>Demo access</CardTitle>
            <CardDescription>Seeded accounts cover all four roles after running the seed script.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-200/90">
            <p>Staff: staff@neoconnect.local</p>
            <p>Secretariat: secretariat@neoconnect.local</p>
            <p>Case Manager: manager@neoconnect.local</p>
            <p>Admin: admin@neoconnect.local</p>
            <p className="pt-2 text-primary">Password for all demo users: Password123!</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 pb-16 md:grid-cols-3">
        {pillars.map((pillar) => (
          <Card key={pillar.title}>
            <CardHeader>
              <pillar.icon className="size-5 text-primary" />
              <CardTitle>{pillar.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{pillar.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}