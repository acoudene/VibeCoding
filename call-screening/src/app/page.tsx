import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1>📵 Call Screening</h1>
      <p>
        Filtrage des appels entrants par liste noire de préfixes. Les appels dont le
        préfixe est interdit sont renvoyés en messagerie et marqués comme spam.
      </p>
      <p>
        <Link href="/admin" style={{ color: "#7aa2ff" }}>
          → Administration (préfixes &amp; journal)
        </Link>
      </p>
      <h2>API</h2>
      <ul>
        <li>
          <code>POST /api/calls/incoming</code> — évalue un appel (
          <code>{`{ from }`}</code>)
        </li>
        <li>
          <code>GET/POST /api/prefixes</code>, <code>DELETE /api/prefixes/:id</code>
        </li>
        <li>
          <code>GET /api/logs</code> — journal des appels
        </li>
        <li>
          <code>POST /api/twilio/voice</code> — webhook Twilio (TwiML)
        </li>
      </ul>
    </main>
  );
}
