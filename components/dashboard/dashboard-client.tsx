"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ClipboardList, Eye, EyeOff, FilePlus2, Shield, Vote } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import {
  CASE_CATEGORIES,
  CASE_SEVERITIES,
  CASE_STATUSES,
  type AnalyticsSummary,
  type AppCase,
  type AuthUser,
  type DigestEntry,
  type ImpactItem,
  type MinuteItem,
  type Poll,
  type UserRole
} from "@/lib/types";
import { formatDate, formatDateTime, getRoleLabel, getStatusTone } from "@/lib/utils";

interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  active: boolean;
}

interface SubmissionFormState {
  category: (typeof CASE_CATEGORIES)[number];
  department: string;
  location: string;
  severity: (typeof CASE_SEVERITIES)[number];
  description: string;
  anonymous: boolean;
  attachment: File | null;
}

const chartPalette = ["#f97316", "#fb7185", "#38bdf8", "#22c55e", "#eab308"];

export function DashboardClient() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [cases, setCases] = useState<AppCase[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [digest, setDigest] = useState<DigestEntry[]>([]);
  const [impact, setImpact] = useState<ImpactItem[]>([]);
  const [minutes, setMinutes] = useState<MinuteItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [caseManagers, setCaseManagers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState("");

  const [submissionForm, setSubmissionForm] = useState<SubmissionFormState>({
    category: CASE_CATEGORIES[0],
    department: user?.department || "",
    location: "",
    severity: CASE_SEVERITIES[1],
    description: "",
    anonymous: false,
    attachment: null as File | null
  });
  const [pollForm, setPollForm] = useState({ question: "", options: "" });
  const [digestForm, setDigestForm] = useState({ title: "", summary: "", quarter: "Q1 2026" });
  const [impactForm, setImpactForm] = useState({ raised: "", actionTaken: "", changeDelivered: "", department: "" });
  const [minuteForm, setMinuteForm] = useState({ title: "", document: null as File | null });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "staff" as UserRole, department: "" });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setSubmissionForm((current) => ({ ...current, department: current.department || user.department || "" }));
  }, [user]);

  const loadDashboard = async (currentUser: AuthUser) => {
    setError("");

    try {
      const [caseData, pollData, digestData, impactData, minuteData] = await Promise.all([
        apiRequest<AppCase[]>("/api/cases"),
        apiRequest<Poll[]>("/api/polls"),
        apiRequest<DigestEntry[]>("/api/hub/digest"),
        apiRequest<ImpactItem[]>("/api/hub/impact"),
        apiRequest<MinuteItem[]>("/api/hub/minutes")
      ]);

      setCases(caseData);
      setPolls(pollData);
      setDigest(digestData);
      setImpact(impactData);
      setMinutes(minuteData);

      if (currentUser.role === "secretariat" || currentUser.role === "admin") {
        const [analyticsData, caseManagerData] = await Promise.all([
          apiRequest<AnalyticsSummary>("/api/cases/analytics/summary"),
          apiRequest<AdminUserSummary[]>("/api/admin/users?role=case_manager")
        ]);
        setAnalytics(analyticsData);
        setCaseManagers(caseManagerData.filter((entry) => entry.active));
      } else {
        setAnalytics(null);
        setCaseManagers([]);
      }

      if (currentUser.role === "admin") {
        const allUsers = await apiRequest<AdminUserSummary[]>("/api/admin/users");
        setUsers(allUsers);
      } else {
        setUsers([]);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load the dashboard.");
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadDashboard(user);
  }, [user]);

  const summaryCards = useMemo(() => {
    return [
      {
        label: user?.role === "staff" ? "My submissions" : "Visible cases",
        value: cases.length,
        icon: ClipboardList
      },
      {
        label: "Open cases",
        value: cases.filter((caseItem) => caseItem.status !== "Resolved").length,
        icon: AlertTriangle
      },
      {
        label: "Active polls",
        value: polls.length,
        icon: Vote
      },
      {
        label: user?.role === "admin" ? "Managed users" : "Digest stories",
        value: user?.role === "admin" ? users.length : digest.length,
        icon: user?.role === "admin" ? Shield : FilePlus2
      }
    ];
  }, [cases, digest.length, polls.length, user?.role, users.length]);

  const handleSubmission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("submission");
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("category", submissionForm.category);
      formData.append("department", submissionForm.department);
      formData.append("location", submissionForm.location);
      formData.append("severity", submissionForm.severity);
      formData.append("description", submissionForm.description);
      formData.append("anonymous", String(submissionForm.anonymous));

      if (submissionForm.attachment) {
        formData.append("attachment", submissionForm.attachment);
      }

      await apiRequest<AppCase>("/api/cases", { method: "POST", body: formData });
      setSuccess("Complaint submitted with a new tracking ID.");
      setSubmissionForm({
        category: CASE_CATEGORIES[0],
        department: user?.department || "",
        location: "",
        severity: CASE_SEVERITIES[1],
        description: "",
        anonymous: false,
        attachment: null
      });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Submission failed.");
    } finally {
      setBusy("");
    }
  };

  const assignCase = async (caseId: string, assigneeId: string) => {
    setBusy(`assign-${caseId}`);
    setError("");

    try {
      await apiRequest(`/api/cases/${caseId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId })
      });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Assignment failed.");
    } finally {
      setBusy("");
    }
  };

  const updateCaseStatus = async (caseId: string) => {
    const status = statusDrafts[caseId] || "In Progress";
    const note = noteDrafts[caseId] || undefined;
    setBusy(`status-${caseId}`);
    setError("");

    try {
      await apiRequest(`/api/cases/${caseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note })
      });
      setNoteDrafts((current) => ({ ...current, [caseId]: "" }));
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Status update failed.");
    } finally {
      setBusy("");
    }
  };

  const voteOnPoll = async (pollId: string, optionIndex: number) => {
    setBusy(`poll-${pollId}`);
    setError("");

    try {
      await apiRequest(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex })
      });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Vote could not be recorded.");
    } finally {
      setBusy("");
    }
  };

  const createPoll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create-poll");
    setError("");
    try {
      await apiRequest("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pollForm.question,
          options: pollForm.options
            .split("\n")
            .map((entry) => entry.trim())
            .filter(Boolean)
        })
      });
      setPollForm({ question: "", options: "" });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Poll creation failed.");
    } finally {
      setBusy("");
    }
  };

  const createDigestEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create-digest");
    setError("");

    try {
      await apiRequest("/api/hub/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(digestForm)
      });
      setDigestForm({ title: "", summary: "", quarter: "Q1 2026" });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish digest entry.");
    } finally {
      setBusy("");
    }
  };

  const createImpactItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create-impact");
    setError("");

    try {
      await apiRequest("/api/hub/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(impactForm)
      });
      setImpactForm({ raised: "", actionTaken: "", changeDelivered: "", department: "" });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish impact item.");
    } finally {
      setBusy("");
    }
  };

  const uploadMinute = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("upload-minute");
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", minuteForm.title);
      if (minuteForm.document) {
        formData.append("document", minuteForm.document);
      }

      await apiRequest("/api/hub/minutes", { method: "POST", body: formData });
      setMinuteForm({ title: "", document: null });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload minutes.");
    } finally {
      setBusy("");
    }
  };

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create-user");
    setError("");

    try {
      await apiRequest("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm)
      });
      setUserForm({ name: "", email: "", password: "", role: "staff", department: "" });
      if (user) {
        await loadDashboard(user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create user.");
    } finally {
      setBusy("");
    }
  };

  if (loading || !user) {
    return <div className="py-20 text-center text-muted-foreground">Loading NeoConnect...</div>;
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
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.3),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.86))] p-8 shadow-panel">
          <div className="absolute inset-0 bg-grid-fade bg-grid-fade opacity-60" />
          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <Badge className="border-primary/30 bg-primary/15 text-primary">{getRoleLabel(user.role)} workspace</Badge>
              <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
                Transparent case handling, visible outcomes, and faster escalation when response windows slip.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-200/80">
                NeoConnect centralises complaints, public impact reporting, staff polling, and management analytics in one operating surface.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {summaryCards.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <item.icon className="size-5 text-primary" />
                  <div className="mt-6 text-3xl font-semibold">{item.value}</div>
                  <div className="mt-2 text-sm text-slate-300">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle>Case overview</CardTitle>
              <CardDescription>Track every complaint from submission to closure with assignee and response detail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cases.length === 0 ? <p className="text-sm text-muted-foreground">No cases available for this account yet.</p> : null}
              {cases.map((caseItem) => (
                <div key={caseItem.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.28em] text-primary">{caseItem.trackingId}</div>
                      <h3 className="mt-2 font-display text-xl">{caseItem.category} / {caseItem.department}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{caseItem.description}</p>
                    </div>
                    <Badge className={getStatusTone(caseItem.status)}>{caseItem.status}</Badge>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-4">
                    <div>Severity: <span className="text-foreground">{caseItem.severity}</span></div>
                    <div>Location: <span className="text-foreground">{caseItem.location}</span></div>
                    <div>Assigned: <span className="text-foreground">{caseItem.assignedToName || "Unassigned"}</span></div>
                    <div>Created: <span className="text-foreground">{formatDate(caseItem.createdAt)}</span></div>
                  </div>

                  {caseItem.attachmentUrl ? (
                    <a href={caseItem.attachmentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-primary underline-offset-4 hover:underline">
                      View attachment
                    </a>
                  ) : null}

                  {(user.role === "secretariat" || user.role === "admin") && caseManagers.length > 0 ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                      <Select value={assignmentDrafts[caseItem.id] ?? caseItem.assignedToId ?? ""} onChange={(event) => setAssignmentDrafts((current) => ({ ...current, [caseItem.id]: event.target.value }))}>
                        <option value="">Assign to case manager</option>
                        {caseManagers.map((manager) => (
                          <option key={manager.id} value={manager.id}>{manager.name}</option>
                        ))}
                      </Select>
                      <Button
                        variant="secondary"
                        disabled={busy === `assign-${caseItem.id}` || !(assignmentDrafts[caseItem.id] ?? caseItem.assignedToId)}
                        onClick={() => void assignCase(caseItem.id, assignmentDrafts[caseItem.id] ?? caseItem.assignedToId ?? "")}
                      >
                        Assign
                      </Button>
                    </div>
                  ) : null}

                  {(user.role === "case_manager" || user.role === "secretariat" || user.role === "admin") ? (
                    <div className="mt-5 grid gap-3 lg:grid-cols-[220px_1fr_auto]">
                      <Select value={statusDrafts[caseItem.id] || caseItem.status} onChange={(event) => setStatusDrafts((current) => ({ ...current, [caseItem.id]: event.target.value }))}>
                        {CASE_STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </Select>
                      <Input
                        placeholder="Add a note with the status update"
                        value={noteDrafts[caseItem.id] || ""}
                        onChange={(event) => setNoteDrafts((current) => ({ ...current, [caseItem.id]: event.target.value }))}
                      />
                      <Button onClick={() => void updateCaseStatus(caseItem.id)} disabled={busy === `status-${caseItem.id}`}>Update</Button>
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-2">
                    {caseItem.notes.map((note) => (
                      <div key={note.id || `${caseItem.id}-${note.createdAt}`} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{note.authorName}</span>
                          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="mt-2 text-muted-foreground">{note.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {user.role === "staff" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Submit feedback or complaint</CardTitle>
                  <CardDescription>Anonymous reporting and file uploads are supported. Every case receives a tracking ID.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleSubmission}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select id="category" value={submissionForm.category} onChange={(event) => setSubmissionForm((current) => ({ ...current, category: event.target.value as (typeof CASE_CATEGORIES)[number] }))}>
                          {CASE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">Severity</Label>
                        <Select id="severity" value={submissionForm.severity} onChange={(event) => setSubmissionForm((current) => ({ ...current, severity: event.target.value as (typeof CASE_SEVERITIES)[number] }))}>
                          {CASE_SEVERITIES.map((severity) => (
                            <option key={severity} value={severity}>{severity}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Input id="department" value={submissionForm.department} onChange={(event) => setSubmissionForm((current) => ({ ...current, department: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" value={submissionForm.location} onChange={(event) => setSubmissionForm((current) => ({ ...current, location: event.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={submissionForm.description} onChange={(event) => setSubmissionForm((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="attachment">Photo or PDF</Label>
                      <Input id="attachment" type="file" accept="image/*,.pdf" onChange={(event) => setSubmissionForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <div>
                        <div className="text-sm font-medium">Submit anonymously</div>
                        <div className="text-xs text-muted-foreground">Hide your name from case views while still keeping the case traceable.</div>
                      </div>
                      <Switch checked={submissionForm.anonymous} onCheckedChange={(checked) => setSubmissionForm((current) => ({ ...current, anonymous: checked }))} />
                    </div>
                    <Button className="w-full" type="submit" disabled={busy === "submission"}>Submit case</Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Staff polls</CardTitle>
                <CardDescription>Vote once per poll. Results become visible immediately after voting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {polls.map((poll) => (
                  <div key={poll.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="font-medium">{poll.question}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">Created by {poll.createdByName}</div>
                    <div className="mt-4 space-y-2">
                      {poll.options.map((option, index) => {
                        const percentage = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                        return (
                          <div key={option.label} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                              <span>{option.label}</span>
                              <span className="text-muted-foreground">{option.votes} votes</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                            </div>
                            {user.role === "staff" && !poll.hasVoted ? (
                              <Button className="mt-3" variant="outline" size="sm" onClick={() => void voteOnPoll(poll.id, index)} disabled={busy === `poll-${poll.id}`}>
                                Vote for this option
                              </Button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {(user.role === "secretariat" || user.role === "admin") && analytics ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department open case heat</CardTitle>
                <CardDescription>Departments with the most unresolved complaints.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.departmentCounts}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                    <XAxis dataKey="department" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 18 }} />
                    <Bar dataKey="count" fill="#f97316" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status distribution</CardTitle>
                <CardDescription>Current case volume by lifecycle stage.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusCounts}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                      labelLine={false}
                    >
                      {analytics.statusCounts.map((entry, index) => (
                        <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 18 }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category breakdown</CardTitle>
                <CardDescription>Complaint volume by issue type.</CardDescription>
              </CardHeader>
              <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.categoryCounts} layout="vertical">
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={90} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 18 }} />
                    <Bar dataKey="value" fill="#38bdf8" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hotspot flags</CardTitle>
                <CardDescription>Departments with 5 or more open complaints in the same category.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.hotspots.length === 0 ? <p className="text-sm text-muted-foreground">No hotspots triggered yet.</p> : null}
                {analytics.hotspots.map((hotspot) => (
                  <div key={`${hotspot.department}-${hotspot.category}`} className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                    <div className="font-medium text-rose-100">{hotspot.department}</div>
                    <div className="mt-1 text-sm text-rose-100/80">{hotspot.category} is trending with {hotspot.count} open cases.</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {(user.role === "secretariat" || user.role === "admin") ? (
          <section className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Create poll</CardTitle>
                <CardDescription>Question plus one option per line.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createPoll}>
                  <div className="space-y-2">
                    <Label htmlFor="poll-question">Question</Label>
                    <Input id="poll-question" value={pollForm.question} onChange={(event) => setPollForm((current) => ({ ...current, question: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="poll-options">Options</Label>
                    <Textarea id="poll-options" value={pollForm.options} onChange={(event) => setPollForm((current) => ({ ...current, options: event.target.value }))} />
                  </div>
                  <Button className="w-full" type="submit" disabled={busy === "create-poll"}>Publish poll</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quarterly digest</CardTitle>
                <CardDescription>Summarise resolved complaints and visible change.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createDigestEntry}>
                  <Input placeholder="Digest title" value={digestForm.title} onChange={(event) => setDigestForm((current) => ({ ...current, title: event.target.value }))} />
                  <Input placeholder="Quarter e.g. Q1 2026" value={digestForm.quarter} onChange={(event) => setDigestForm((current) => ({ ...current, quarter: event.target.value }))} />
                  <Textarea placeholder="Summary" value={digestForm.summary} onChange={(event) => setDigestForm((current) => ({ ...current, summary: event.target.value }))} />
                  <Button className="w-full" type="submit" disabled={busy === "create-digest"}>Publish digest</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact and minutes</CardTitle>
                <CardDescription>Keep the public hub current with evidence and meeting records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-3" onSubmit={createImpactItem}>
                  <Input placeholder="What was raised" value={impactForm.raised} onChange={(event) => setImpactForm((current) => ({ ...current, raised: event.target.value }))} />
                  <Input placeholder="Action taken" value={impactForm.actionTaken} onChange={(event) => setImpactForm((current) => ({ ...current, actionTaken: event.target.value }))} />
                  <Input placeholder="What changed" value={impactForm.changeDelivered} onChange={(event) => setImpactForm((current) => ({ ...current, changeDelivered: event.target.value }))} />
                  <Input placeholder="Department" value={impactForm.department} onChange={(event) => setImpactForm((current) => ({ ...current, department: event.target.value }))} />
                  <Button className="w-full" type="submit" disabled={busy === "create-impact"}>Add impact item</Button>
                </form>

                <form className="space-y-3" onSubmit={uploadMinute}>
                  <Input placeholder="Minutes title" value={minuteForm.title} onChange={(event) => setMinuteForm((current) => ({ ...current, title: event.target.value }))} />
                  <Input type="file" accept="application/pdf" onChange={(event) => setMinuteForm((current) => ({ ...current, document: event.target.files?.[0] || null }))} />
                  <Button className="w-full" type="submit" disabled={busy === "upload-minute"}>Upload minutes PDF</Button>
                </form>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {user.role === "admin" ? (
          <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
            <Card>
              <CardHeader>
                <CardTitle>Create user</CardTitle>
                <CardDescription>Admin-managed account creation with role assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={createUser}>
                  <Input placeholder="Full name" value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
                  <Input placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
                  <div className="relative">
                    <Input type={showUserPassword ? "text" : "password"} placeholder="Temporary password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} className="pr-11" />
                    <button type="button" onClick={() => setShowUserPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                      {showUserPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <Select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}>
                    <option value="staff">Staff</option>
                    <option value="secretariat">Secretariat</option>
                    <option value="case_manager">Case Manager</option>
                    <option value="admin">Admin</option>
                  </Select>
                  <Input placeholder="Department" value={userForm.department} onChange={(event) => setUserForm((current) => ({ ...current, department: event.target.value }))} />
                  <Button className="w-full" type="submit" disabled={busy === "create-user"}>Create user</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User directory</CardTitle>
                <CardDescription>Current application accounts and their assigned access levels.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {users.map((managedUser) => (
                  <div key={managedUser.id} className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">{managedUser.name}</div>
                      <div className="text-sm text-muted-foreground">{managedUser.email}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="border-white/10 bg-black/10 text-foreground">{getRoleLabel(managedUser.role)}</Badge>
                      <Badge className={managedUser.active ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100" : "border-slate-400/20 bg-slate-500/10 text-slate-100"}>
                        {managedUser.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Public hub highlights</CardTitle>
              <CardDescription>Resolved issues and action tracking published for staff visibility.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {digest.slice(0, 2).map((entry) => (
                <div key={entry.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.28em] text-primary">{entry.quarter}</div>
                  <div className="mt-2 font-display text-xl">{entry.title}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{entry.summary}</p>
                </div>
              ))}
              {impact.slice(0, 2).map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.28em] text-primary">{item.department}</div>
                  <p className="mt-3 text-sm text-muted-foreground">Raised</p>
                  <p>{item.raised}</p>
                  <p className="mt-3 text-sm text-muted-foreground">Action taken</p>
                  <p>{item.actionTaken}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minutes archive</CardTitle>
              <CardDescription>Most recent uploaded meeting records.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {minutes.map((item) => (
                <a key={item.id} href={item.documentUrl} target="_blank" rel="noreferrer" className="block rounded-3xl border border-white/10 bg-white/5 p-4 transition hover:border-primary/40 hover:bg-white/10">
                  <div className="font-medium">{item.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.uploadedByName} • {formatDate(item.createdAt)}</div>
                </a>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}