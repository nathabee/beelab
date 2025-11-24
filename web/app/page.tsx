// web/app/page.tsx 
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 

export default function Home() {
  const router = useRouter();       
  const [hello, setHello] = useState<string>("loading...");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState<string>("");
  const [me, setMe] = useState<any>(null);

  // fetch hello (unauthenticated) via Next.js server route
  useEffect(() => {
    fetch(`/api/hello`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Upstream ${r.status}`);
        const data = await r.json();
        setHello(`${data.message} (service: ${data.service})`);
      })
      .catch((e: any) => setHello(`Error: ${e?.message || e}`));
  }, []);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginMsg("...");
    setMe(null);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      setLoginMsg("Login failed");
      return;
    }
    setLoginMsg("Login OK");
    router.push("/dashboard");     
  };

  const fetchMe = async () => {
    setMe(null);
    const r = await fetch("/api/me", { cache: "no-store" });
    const data = await r.json();
    if (r.ok) setMe(data);
    else setMe({ error: data?.error || "unknown" });
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 700 }}>
      <h1>beelab web (Next.js)</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Hello</h2>
        <p>Backend says: <strong>{hello}</strong></p>
        <p><a href="/welcome">Welcome page</a></p>
      </section>

      <hr style={{ margin: "24px 0" }} />

      <section>
        <h2>Login</h2>
        <form onSubmit={doLogin} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
          <label>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ width: "100%" }}
            />
          </label>
          <button type="submit">Log in</button>
        </form>
        <p style={{ marginTop: 8 }}>{loginMsg}</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Who am I</h2>
        <button onClick={fetchMe}>Fetch /api/me</button>
        <pre style={{ background: "#f5f5f5", padding: 12, marginTop: 8 }}>
{JSON.stringify(me, null, 2)}
        </pre>
      </section>
    </main>
  );
}
