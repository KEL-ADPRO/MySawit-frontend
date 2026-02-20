"use client";
import { useEffect, useState } from "react";

export default function PembayaranPage() {
  const API_URL = "/api/pembayaran";

  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState("hello");
  const [last, setLast] = useState<any>(null);

  async function fetchCount() {
    const res = await fetch(`${API_URL}/db-ping/count`, { cache: "no-store" });
    const data = await res.json();
    setCount(Number(data.count ?? 0));
  }

  async function ping() {
    const res = await fetch(`${API_URL}/db-ping?msg=${encodeURIComponent(msg)}`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();
    setLast(data);
    await fetchCount();
  }

  useEffect(() => {
    fetchCount();
  }, []);

  return (
      <div style={{ padding: 20 }}>
        <h2>Manajemen Pembayaran - Test</h2>
        <p>Row count: {count}</p>

        <input value={msg} onChange={(e) => setMsg(e.target.value)} />
        <button onClick={ping} style={{ marginLeft: 8 }}>POST db-ping</button>

        {last && <pre>{JSON.stringify(last, null, 2)}</pre>}
      </div>
  );
}