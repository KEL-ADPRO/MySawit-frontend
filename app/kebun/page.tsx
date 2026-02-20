"use client";

import { useState, useEffect } from "react";

interface Kebun {
    id?: string;
    nama: string;
}

export default function KebunPage() {
    const API_URL = "http://localhost:8082/api/kebun";

    const [dataList, setDataList] = useState<Kebun[]>([]);
    const [formData, setFormData] = useState<Kebun>({
        nama: "",
    });

    const fetchData = async () => {
        try {
            const response = await fetch(API_URL);
            const result = await response.json();
            setDataList(result);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                fetchData();
                resetForm();
            } else {
                alert("Gagal menyimpan data!");
            }
        } catch (error) {
            console.error("Error saving data:", error);
        }
    };

    const resetForm = () => {
        setFormData({
            nama: "",
        });
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h2>Manajemen Kebun Sawit</h2>

            <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px", width: "400px" }}>
                <h3>Tambah Data Kebun Baru</h3>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

                    <input
                        type="text"
                        name="nama"
                        placeholder="Nama Kebun"
                        value={formData.nama}
                        onChange={handleChange}
                        required
                    />

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button type="submit" style={{ background: "blue", color: "white", padding: "5px 10px", border: "none", cursor: "pointer" }}>
                            Simpan
                        </button>
                    </div>
                </form>
            </div>

            <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                <tr style={{ background: "#000000" }}>
                    <th>ID (UUID)</th>
                    <th>Nama Kebun</th>
                </tr>
                </thead>
                <tbody>
                {dataList.map((item) => (
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.nama}</td>
                    </tr>
                ))}
                {dataList.length === 0 && (
                    <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>Belum ada data kebun.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}