// web/app/dashboard/page.tsx (example)
"use client";

import { useEffect, useState } from "react";

type Field = { field_id: number; name: string; short_name: string; description?: string };
type Farm  = { farm_id: number; name: string; fields: Field[] };

export default function Dashboard() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | "">("");
  const [fieldId, setFieldId] = useState<number | "">("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/farms", { cache: "no-store", credentials: "include" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.detail || data?.error || "Failed to load farms");
        setFarms(data);
      })
      .catch((e: any) => setError(e?.message || "unknown error"));
  }, []);

  const currentFarm = farms.find(f => f.farm_id === farmId);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Welcome</h1>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <label>
          Farm
          <select
            value={farmId}
            onChange={(e) => { setFarmId(e.target.value ? Number(e.target.value) : ""); setFieldId(""); }}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="">-- choose a farm --</option>
            {farms.map((f) => (
              <option key={f.farm_id} value={f.farm_id}>{f.name}</option>
            ))}
          </select>
        </label>

        <label>
          Field
          <select
            value={fieldId}
            onChange={(e) => setFieldId(e.target.value ? Number(e.target.value) : "")}
            disabled={!currentFarm}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="">{currentFarm ? "-- choose a field --" : "select a farm first"}</option>
            {currentFarm?.fields.map((fld) => (
              <option key={fld.field_id} value={fld.field_id}>
                {fld.name} ({fld.short_name})
              </option>
            ))}
          </select>
        </label>
      </div>
    </main>
  );
}
