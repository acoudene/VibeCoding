"use client";

import { useEffect, useState, useCallback } from "react";

interface Prefix {
  id: string;
  value: string;
  label?: string | null;
}

interface CallLog {
  id: string;
  rawNumber: string;
  normalized: string | null;
  decision: string;
  matchedPrefix: string | null;
  spam: boolean;
  createdAt: string;
}

export default function AdminPage() {
  const [prefixes, setPrefixes] = useState<Prefix[]>([]);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, l] = await Promise.all([
      fetch("/api/prefixes").then((r) => r.json()),
      fetch("/api/logs").then((r) => r.json()),
    ]);
    setPrefixes(p);
    setLogs(l);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addPrefix(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/prefixes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, label }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de l'ajout");
      return;
    }
    setValue("");
    setLabel("");
    await refresh();
  }

  async function removePrefix(id: string) {
    await fetch(`/api/prefixes/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1>Administration — Call Screening</h1>

      <section>
        <h2>Préfixes interdits</h2>
        <form onSubmit={addPrefix} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            aria-label="Préfixe"
            placeholder="ex. +33899 ou 0899"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="prefix-value"
            style={inputStyle}
          />
          <input
            aria-label="Libellé"
            placeholder="libellé (optionnel)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            data-testid="prefix-label"
            style={inputStyle}
          />
          <button type="submit" data-testid="prefix-add" style={btnStyle}>
            Ajouter
          </button>
        </form>
        {error && (
          <p data-testid="prefix-error" style={{ color: "#ff8080" }}>
            {error}
          </p>
        )}
        <table style={tableStyle} data-testid="prefix-table">
          <thead>
            <tr>
              <th style={thStyle}>Préfixe</th>
              <th style={thStyle}>Libellé</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {prefixes.map((p) => (
              <tr key={p.id} data-testid="prefix-row">
                <td style={tdStyle}>
                  <code>{p.value}</code>
                </td>
                <td style={tdStyle}>{p.label}</td>
                <td style={tdStyle}>
                  <button onClick={() => removePrefix(p.id)} style={smallBtn}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {prefixes.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={3}>
                  Aucun préfixe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Journal des appels</h2>
        <table style={tableStyle} data-testid="log-table">
          <thead>
            <tr>
              <th style={thStyle}>Numéro</th>
              <th style={thStyle}>Normalisé</th>
              <th style={thStyle}>Décision</th>
              <th style={thStyle}>Préfixe</th>
              <th style={thStyle}>Spam</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} data-testid="log-row">
                <td style={tdStyle}>{l.rawNumber}</td>
                <td style={tdStyle}>{l.normalized ?? "—"}</td>
                <td style={tdStyle}>
                  <span style={{ color: l.decision === "BLOCK" ? "#ff8080" : "#80ff9f" }}>
                    {l.decision}
                  </span>
                </td>
                <td style={tdStyle}>{l.matchedPrefix ?? "—"}</td>
                <td style={tdStyle}>{l.spam ? "🚫" : ""}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={5}>
                  Aucun appel journalisé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderRadius: 6,
  border: "1px solid #2b3551",
  background: "#121a30",
  color: "#e7ebf5",
};
const btnStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: 6,
  border: "none",
  background: "#3a63ff",
  color: "white",
  cursor: "pointer",
};
const smallBtn: React.CSSProperties = {
  ...btnStyle,
  padding: "0.25rem 0.6rem",
  background: "#7a2b3a",
};
const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "1rem",
};
const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #2b3551",
  padding: "0.5rem",
  color: "#9fb0d6",
};
const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #1a2238",
  padding: "0.5rem",
};
