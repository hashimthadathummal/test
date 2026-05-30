import Link from "next/link";

export default function NotFound() {
  return (
    <main className="entry-shell">
      <section className="entry-panel">
        <div className="brand-mark">FT</div>
        <h1>Page not found</h1>
        <Link className="button primary" href="/">
          Back to issues
        </Link>
      </section>
    </main>
  );
}
