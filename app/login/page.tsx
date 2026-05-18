"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthBaseUrl } from "@/lib/authApi";
import { saveSession } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    e?.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${getAuthBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { token, userId, name, role } = result.data;

        saveSession({ token, userId: userId.toString(), role, name });

        setMessage("Login berhasil! Selamat datang, " + name);

        // Route based on role
        if (role === "MANDOR") {
          router.push("/harvest/pending");
        } else {
          router.push("/harvest/submit");
        }
      } else {
        setMessage("Login gagal: " + (result.message || "Email atau password salah."));
      }
    } catch (error) {
      console.error(error);
      setMessage("Error: Tidak dapat terhubung ke server.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Login</h2>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px" }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="button" onClick={handleSubmit}>Masuk</button>
      </form>

      <p>Belum punya akun? <Link href="/register">Daftar</Link></p>
    </div>
  );
}