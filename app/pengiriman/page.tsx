"use client";

import { useState, useEffect } from "react";

interface Pengiriman {
    id?: string;
    nama: string;
    totalAngkutan: number;
}

export default function PengirimanPage() {
    const API_URL = "http://localhost:8084/api/pengiriman";

    const [dataList, setDataList] = useState<Pengiriman[]>([]);
    const [formData, setFormData] = useState<Pengiriman>({
        nama: "",
        totalAngkutan: 0,
    });
    const [isEditing, setIsEditing] = useState(false);

    const fetchData = async () => {
        try {
            const response = await fetch(API_URL);
            const result = await response.json();
            setDataList(result);
        } catch (error) {
            console.error(error);
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
            const method = isEditing ? "PUT" : "POST";
            const url = isEditing ? `${API_URL}/${formData.id}` : API_URL;

            const response = await fetch(url, {
                method: method,
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
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Yakin ingin menghapus data ini?")) return;
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const editData = (item: Pengiriman) => {
        setFormData(item);
        setIsEditing(true);
    };

    const resetForm = () => {
        setFormData({
            nama: "",
            totalAngkutan: 0,
        });
        setIsEditing(false);
    };

    return (
        <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
            <h2>Manajemen Pengiriman Sawit</h2>

            <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px", width: "400px" }}>
                <h3>{isEditing ? "Edit Data" : "Tambah Data Baru"}</h3>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

                    <input type="text" name="nama" placeholder="Nama" value={formData.nama} onChange={handleChange} required />
                    <input type="number" name="totalAngkutan" placeholder="Total Angkutan (Kg)" value={formData.totalAngkutan} onChange={handleChange} required />

                    <div style={{ display: "flex", gap: "10px" }}>
                        <button type="submit" style={{ background: "blue", color: "white", padding: "5px 10px" }}>
                            {isEditing ? "Update" : "Simpan"}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} style={{ background: "gray", color: "white", padding: "5px 10px" }}>
                                Batal
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                <tr style={{ background: "#eee" }}>
                    <th>ID (UUID)</th>
                    <th>Nama</th>
                    <th>Total Angkutan (Kg)</th>
                    <th>Aksi</th>
                </tr>
                </thead>
                <tbody>
                {dataList.map((item) => (
                    <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.nama}</td>
                        <td>{item.totalAngkutan}</td>
                        <td>
                            <button onClick={() => editData(item)} style={{ marginRight: "5px" }}>Edit</button>
                            <button onClick={() => handleDelete(item.id!)} style={{ background: "red", color: "white" }}>Hapus</button>
                        </td>
                    </tr>
                ))}
                {dataList.length === 0 && (
                    <tr>
                        <td colSpan={4} style={{ textAlign: "center" }}>Belum ada data pengiriman.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
}