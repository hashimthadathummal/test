"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, LockKeyhole, LogIn, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { Issue, IssueStatus } from "@/types/issue";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function AdminPage() {
  const [username, setUsername] = useState("ADMIN");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<IssueStatus | "all">("open");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Login failed");
      return;
    }

    sessionStorage.setItem("festie-admin-token", data.token);
    setToken(data.token);
  }

  async function loadIssues() {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (category !== "all") {
      params.set("category", category);
    }
    if (status !== "all") {
      params.set("status", status);
    }
    if (query.trim()) {
      params.set("q", query.trim());
    }

    try {
      const response = await fetch(`/api/issues?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load issues");
      }

      setIssues(data.issues);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load issues");
    } finally {
      setLoading(false);
    }
  }

  async function setIssueStatus(issueId: string, nextStatus: IssueStatus) {
    if (!token) {
      return;
    }

    setSavingId(issueId);
    setError("");

    try {
      const response = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update issue");
      }

      setIssues((current) => current.map((issue) => (issue._id === issueId ? data.issue : issue)));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update issue");
    } finally {
      setSavingId("");
    }
  }

  useEffect(() => {
    const storedToken = sessionStorage.getItem("festie-admin-token") || "";
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) {
      void loadIssues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, category, status]);

  if (!token) {
    return (
      <main className="entry-shell">
        <section className="entry-panel">
          <div className="brand-mark">
            <LockKeyhole size={24} />
          </div>
          <h1>Admin Panel</h1>
          <form className="entry-form" onSubmit={login}>
            <label htmlFor="username">Username</label>
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            <label htmlFor="password">Password</label>
            <div className="input-row">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <button type="submit" className="icon-button primary" aria-label="Login">
                <LogIn size={18} />
              </button>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Festie Testing</p>
          <h1>Admin Panel</h1>
        </div>
        <button
          type="button"
          className="button subtle"
          onClick={() => {
            sessionStorage.removeItem("festie-admin-token");
            setToken("");
          }}
        >
          <ShieldCheck size={18} />
          <span>Logout</span>
        </button>
      </header>

      <section className="admin-board">
        <div className="filters">
          <select className="compact-select" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>

          <select className="compact-select" value={status} onChange={(event) => setStatus(event.target.value as IssueStatus | "all")}>
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="cleared">Cleared</option>
          </select>

          <form
            className="search-form"
            onSubmit={(event) => {
              event.preventDefault();
              void loadIssues();
            }}
          >
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" />
          </form>

          <button type="button" className="button subtle" onClick={() => void loadIssues()} disabled={loading}>
            {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
            <span>Refresh</span>
          </button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="issue-list">
          {issues.map((issue) => (
            <article className="issue-card" key={issue._id}>
              <div className="issue-card-header">
                <div>
                  <p className="meta-line">
                    <span>{issue.category}</span>
                    <span>{issue.createdBy}</span>
                    <span>{formatDate(issue.createdAt)}</span>
                  </p>
                  <h2>{issue.title}</h2>
                </div>
                <span className={`status-badge ${issue.status}`}>
                  <CheckCircle2 size={15} />
                  {issue.status}
                </span>
              </div>

              {issue.description ? <p className="description">{issue.description}</p> : null}

              {issue.images.length ? (
                <div className="image-grid">
                  {issue.images.map((image) => (
                    <a href={image.url} target="_blank" rel="noreferrer" key={image.publicId} className="issue-image-link">
                      <Image src={image.url} alt={issue.title} width={220} height={150} className="issue-image" />
                    </a>
                  ))}
                </div>
              ) : null}

              <div className="admin-actions">
                {issue.status === "cleared" ? (
                  <button
                    type="button"
                    className="button subtle"
                    disabled={savingId === issue._id}
                    onClick={() => void setIssueStatus(issue._id, "open")}
                  >
                    {savingId === issue._id ? <Loader2 className="spin" size={16} /> : <RotateCcw size={16} />}
                    <span>Reopen</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button primary"
                    disabled={savingId === issue._id}
                    onClick={() => void setIssueStatus(issue._id, "cleared")}
                  >
                    {savingId === issue._id ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </article>
          ))}
          {!loading && !issues.length ? <div className="empty-state">No issues found.</div> : null}
        </div>
      </section>
    </main>
  );
}
