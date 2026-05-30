"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, CircleUserRound, Filter, Images, Loader2, LogIn, Plus, Search, UserRoundPen, X } from "lucide-react";
import { CATEGORIES, type IssueCategory } from "@/lib/categories";
import type { Issue, IssueStatus } from "@/types/issue";

type Scope = "mine" | "all";
type ImagePreview = {
  name: string;
  size: number;
  url: string;
};

const initialForm = {
  title: "",
  description: "",
  category: "other" as IssueCategory
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function Home() {
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [scope, setScope] = useState<Scope>("mine");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<IssueStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fileLabel = useMemo(() => {
    if (!files.length) {
      return "Images";
    }

    return `${files.length} selected`;
  }, [files.length]);

  useEffect(() => {
    const previews = files.map((file) => ({
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file)
    }));

    setImagePreviews(previews);

    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  async function loadIssues(currentName = name) {
    if (!currentName) {
      return;
    }

    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (scope === "mine") {
      params.set("owner", currentName);
    }
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

  useEffect(() => {
    const storedName = localStorage.getItem("festie-user-name") || "";
    setName(storedName);
    setDraftName(storedName);
  }, []);

  useEffect(() => {
    void loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, scope, category, status]);

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = draftName.trim();
    if (!cleanName) {
      setError("Enter your name to continue");
      return;
    }

    localStorage.setItem("festie-user-name", cleanName);
    setName(cleanName);
    setScope("mine");
    setError("");
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files || []).slice(0, 5));
  }

  function removeSelectedFile(index: number) {
    setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function submitIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name) {
      setError("Enter your name first");
      return;
    }

    setSubmitting(true);
    setError("");

    const body = new FormData();
    body.set("title", form.title);
    body.set("description", form.description);
    body.set("category", form.category);
    body.set("createdBy", name);
    files.forEach((file) => body.append("images", file));

    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        body
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not create issue");
      }

      setForm(initialForm);
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadIssues();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create issue");
    } finally {
      setSubmitting(false);
    }
  }

  if (!name) {
    return (
      <main className="entry-shell">
        <section className="entry-panel">
          <div className="brand-mark">
            <CircleUserRound size={26} />
          </div>
          <h1>Festie Testing</h1>
          <form onSubmit={submitName} className="entry-form">
            <label htmlFor="name">Name</label>
            <div className="input-row">
              <input
                id="name"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Enter your name"
                autoFocus
              />
              <button type="submit" className="icon-button primary" aria-label="Enter">
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
          <h1>Issues</h1>
        </div>
        <div className="user-pill">
          <CircleUserRound size={18} />
          <span>{name}</span>
          <button
            type="button"
            className="icon-button ghost"
            aria-label="Change name"
            title="Change name"
            onClick={() => {
              localStorage.removeItem("festie-user-name");
              setName("");
              setDraftName("");
            }}
          >
            <UserRoundPen size={16} />
          </button>
        </div>
      </header>

      <section className="workspace">
        <form className="issue-form" onSubmit={submitIssue}>
          <div className="section-heading">
            <h2>New Issue</h2>
            <button type="submit" className="button primary" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
              <span>{submitting ? "Adding" : "Add"}</span>
            </button>
          </div>

          <label htmlFor="title">Title</label>
          <input
            id="title"
            required
            maxLength={140}
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Short issue title"
          />

          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={form.description}
            maxLength={2000}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            placeholder="Optional details"
          />

          <div className="form-grid">
            <div>
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as IssueCategory }))}
              >
                {CATEGORIES.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="images">Images</label>
              <label className="file-control" htmlFor="images">
                <Images size={18} />
                <span>{fileLabel}</span>
              </label>
              <input ref={fileInputRef} id="images" className="sr-only" type="file" accept="image/*" multiple onChange={handleFiles} />
            </div>
          </div>

          {imagePreviews.length ? (
            <div className="selected-image-grid" aria-label="Selected image previews">
              {imagePreviews.map((preview, index) => (
                <div className="selected-image" key={`${preview.name}-${preview.size}-${index}`}>
                  <img src={preview.url} alt={preview.name} />
                  <button
                    type="button"
                    className="remove-image-button"
                    aria-label={`Remove ${preview.name}`}
                    title="Remove image"
                    onClick={() => removeSelectedFile(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </form>

        <section className="issue-list-zone">
          <div className="filters">
            <div className="segmented" aria-label="Issue scope">
              <button type="button" className={scope === "mine" ? "active" : ""} onClick={() => setScope("mine")}>
                Mine
              </button>
              <button type="button" className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>
                All
              </button>
            </div>

            <label className="select-shell">
              <Filter size={16} />
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {CATEGORIES.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

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
              {query ? (
                <button
                  type="button"
                  className="icon-button ghost"
                  aria-label="Clear search"
                  onClick={() => {
                    setQuery("");
                    setTimeout(() => void loadIssues(), 0);
                  }}
                >
                  <X size={14} />
                </button>
              ) : null}
            </form>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="list-header">
            <span>{loading ? "Loading" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}</span>
            <button type="button" className="button subtle" onClick={() => void loadIssues()} disabled={loading}>
              {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
              <span>Refresh</span>
            </button>
          </div>

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
                    <h3>{issue.title}</h3>
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
              </article>
            ))}
            {!loading && !issues.length ? <div className="empty-state">No issues found.</div> : null}
          </div>
        </section>
      </section>
    </main>
  );
}
