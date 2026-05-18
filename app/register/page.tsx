"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuthBaseUrl } from "@/lib/authApi";
import { saveSession } from "@/lib/session";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    role: "BURUH",
    nomorSertifMandor: "",
  });
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${getAuthBaseUrl()}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { token, userId, name, role } = result.data;

        saveSession({ token, userId: userId.toString(), role, name });

        setMessage("Registrasi berhasil!");
        router.push("/login");
      } else {
        setMessage("Registrasi gagal: " + (result.message || "Coba lagi."));
      }
    } catch (error) {
      console.error(error);
      setMessage("Error: Tidak dapat terhubung ke server.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Registrasi</h2>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", width: "300px" }}>
        <input name="name" type="text" placeholder="Nama Lengkap" value={formData.name} onChange={handleChange} required />
        <input name="username" type="text" placeholder="Username" value={formData.username} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        <select name="role" value={formData.role} onChange={handleChange}>
          <option value="BURUH">BURUH</option>
          <option value="MANDOR">MANDOR</option>
          <option value="SUPIR">SUPIR</option>
        </select>
        {formData.role === "MANDOR" && (
          <input name="nomorSertifMandor" type="text" placeholder="Nomor Sertifikasi Mandor" value={formData.nomorSertifMandor} onChange={handleChange} required />
        )}
        <button type="submit">Daftar</button>
      </form>

      <p>Sudah punya akun? <Link href="/login">Masuk</Link></p>
    </div>
  );
}