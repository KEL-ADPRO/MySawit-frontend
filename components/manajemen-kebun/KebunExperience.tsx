"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Filter,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  Truck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { kebunApi, getKebunErrorMessage } from "@/lib/kebun/client";
import {
  KEBUN_VIEWER_ROLES,
  isKebunViewerRole,
  type Kebun,
  type KebunAssignment,
  type KebunCoordinate,
  type KebunUpsertPayload,
  type KebunViewerRole,
} from "@/lib/kebun/types";

export type KebunPageKind = "list" | "detail" | "create" | "edit";

type Notice = { type: "success" | "error"; message: string } | null;
type CoordinateForm = { latitude: string; longitude: string };
type KebunFormState = {
  nama: string;
  kode: string;
  luas: string;
  koordinatTitikUjung: CoordinateForm[];
};

const EMPTY_FORM: KebunFormState = {
  nama: "",
  kode: "",
  luas: "",
  koordinatTitikUjung: Array.from({ length: 4 }, () => ({ latitude: "", longitude: "" })),
};

const roleLabels: Record<KebunViewerRole, string> = {
  ADMIN: "Admin Utama",
  MANDOR: "Mandor",
  SUPIR_TRUK: "Supir Truk",
  BURUH: "Buruh",
};

function KebunExperience({ page, kebunId }: { page: KebunPageKind; kebunId?: string }) {
  const router = useRouter();

  const [notice, setNotice] = useState<Notice>(null);
  const [viewerRole, setViewerRole] = useState<KebunViewerRole>("ADMIN");
  const [viewerUserId, setViewerUserId] = useState("");
  const [search, setSearch] = useState("");

  const [kebuns, setKebuns] = useState<Kebun[]>([]);
  const [kebunsLoading, setKebunsLoading] = useState(false);
  const [kebunsError, setKebunsError] = useState("");

  const [detail, setDetail] = useState<Kebun | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [supirSearch, setSupirSearch] = useState("");
  const [mandorId, setMandorId] = useState("");
  const [supirId, setSupirId] = useState("");

  const [form, setForm] = useState<KebunFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const isAdmin = viewerRole === "ADMIN";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") ?? "");
    const roleParam = params.get("role");
    if (roleParam && isKebunViewerRole(roleParam)) {
      setViewerRole(roleParam);
    }
    const userIdParam = params.get("userId");
    if (userIdParam) {
      setViewerUserId(userIdParam);
    }
  }, []);

  const loadKebuns = useCallback(async () => {
    setKebunsLoading(true);
    setKebunsError("");

    try {
      const data = await kebunApi.getKebuns();
      setKebuns(normalizeKebunList(data));
    } catch (error) {
      setKebuns([]);
      setKebunsError(getKebunErrorMessage(error));
    } finally {
      setKebunsLoading(false);
    }
  }, []);

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      setDetailError("");

      try {
        const data = await kebunApi.getKebunById(id);
        const kebun = normalizeKebun(data);
        setDetail(kebun);
        setMandorId(kebun.mandor?.userId ?? kebun.mandor?.id ?? "");
        setSupirId("");
        setSupirSearch("");
        if (page === "edit") {
          setForm(formFromKebun(kebun));
        }
      } catch (error) {
        setDetail(null);
        setDetailError(getKebunErrorMessage(error));
      } finally {
        setDetailLoading(false);
      }
    },
    [page],
  );

  useEffect(() => {
    if (page === "list") {
      void loadKebuns();
      return;
    }

    if (page === "detail" || page === "edit") {
      if (!kebunId) {
        setDetailError("ID kebun tidak ditemukan.");
        return;
      }

      void loadDetail(kebunId);
    }
  }, [page, kebunId, loadDetail, loadKebuns]);

  const visibleKebuns = useMemo(() => {
    return kebuns
      .filter((kebun) => kebunVisibleForRole(kebun, viewerRole, viewerUserId))
      .filter((kebun) => {
        const needle = search.trim().toLowerCase();
        if (!needle) return true;
        // Only search by id or name (tone down the filter)
        return [kebun.id, kebun.nama].some((value) => value.toLowerCase().includes(needle));
      })
      .sort((left, right) => left.nama.localeCompare(right.nama));
  }, [kebuns, search, viewerRole, viewerUserId]);

  const listStats = useMemo(() => {
    const assigned = visibleKebuns.filter((kebun) => kebun.mandor || kebun.supirTruks.length > 0).length;
    const noMandor = visibleKebuns.filter((kebun) => !kebun.mandor).length;
    const supirCount = visibleKebuns.reduce((total, kebun) => total + kebun.supirTruks.length, 0);

    return { total: visibleKebuns.length, assigned, noMandor, supirCount };
  }, [visibleKebuns]);

  const selectedKebun = detail;
  const filteredSupir = useMemo(() => {
    if (!selectedKebun) return [];

    const needle = supirSearch.trim().toLowerCase();
    return selectedKebun.supirTruks.filter((person) => {
      if (!needle) return true;
      return [person.nama, person.id, person.userId ?? ""].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [selectedKebun, supirSearch]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateForm(form, page);
    setFormErrors(validation.errors);

    if (!validation.payload) {
      setNotice({ type: "error", message: "Periksa kembali isian kebun." });
      return;
    }

    setPendingAction("save");
    setNotice(null);

    try {
      if (page === "edit" && kebunId) {
        const updated = await kebunApi.updateKebun(kebunId, validation.payload);
        const kebun = normalizeKebun(updated);
        setNotice({ type: "success", message: "Kebun berhasil diperbarui." });
        router.push(`/kebun-detail/${kebun.id}`);
        return;
      }

      const created = await kebunApi.createKebun(validation.payload);
      const kebun = normalizeKebun(created);
      setNotice({ type: "success", message: "Kebun berhasil dibuat." });
      router.push(`/kebun-detail/${kebun.id}`);
    } catch (error) {
      setNotice({ type: "error", message: getKebunErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAssignMandor() {
    if (!selectedKebun) return;
    if (!mandorId.trim()) {
      setNotice({ type: "error", message: "Masukkan ID mandor terlebih dahulu." });
      return;
    }

    setPendingAction("assign-mandor");
    setNotice(null);

    try {
      const updated = await kebunApi.assignMandor(selectedKebun.id, mandorId.trim());
      const kebun = normalizeKebun(updated);
      setDetail(kebun);
      setMandorId(kebun.mandor?.userId ?? kebun.mandor?.id ?? mandorId.trim());
      setNotice({ type: "success", message: "Mandor berhasil ditugaskan." });
    } catch (error) {
      setNotice({ type: "error", message: getKebunErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleAssignSupir() {
    if (!selectedKebun) return;
    if (!supirId.trim()) {
      setNotice({ type: "error", message: "Masukkan ID supir terlebih dahulu." });
      return;
    }

    setPendingAction("assign-supir");
    setNotice(null);

    try {
      const updated = await kebunApi.assignSupir(selectedKebun.id, supirId.trim());
      const kebun = normalizeKebun(updated);
      setDetail(kebun);
      setSupirId("");
      setNotice({ type: "success", message: "Supir Truk berhasil ditugaskan." });
    } catch (error) {
      setNotice({ type: "error", message: getKebunErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRemoveSupir(supir: KebunAssignment) {
    if (!selectedKebun) return;
    if (!window.confirm(`Copot supir ${supir.nama} dari kebun ini?`)) return;

    setPendingAction(`remove-${supir.id}`);
    setNotice(null);

    try {
      const updated = await kebunApi.removeSupir(selectedKebun.id, supir.id);
      setDetail(normalizeKebun(updated));
      setNotice({ type: "success", message: "Supir Truk berhasil dicopot." });
    } catch (error) {
      setNotice({ type: "error", message: getKebunErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeleteKebun() {
    if (!selectedKebun) return;
    if (!window.confirm(`Hapus kebun ${selectedKebun.nama}?`)) return;

    setPendingAction("delete");
    setNotice(null);

    try {
      await kebunApi.deleteKebun(selectedKebun.id);
      setNotice({ type: "success", message: "Kebun berhasil dihapus." });
      router.push("/kebun");
    } catch (error) {
      setNotice({ type: "error", message: getKebunErrorMessage(error) });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="payment-app">
      <aside className="payment-sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sprout size={26} />
          </div>
          <div>
            <strong>Kebun Sawit</strong>
            <small>Manajemen kebun BurhanSawit</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link className={`sidebar-link ${page === "list" ? "active" : ""}`} href="/kebun">
            <Users />
            <span>Daftar Kebun</span>
          </Link>
          <Link className={`sidebar-link ${page === "create" ? "active" : ""}`} href="/kebun-create">
            <Plus />
            <span>Buat Kebun</span>
          </Link>
          {selectedKebun ? (
            <Link className={`sidebar-link ${page === "detail" ? "active" : ""}`} href={`/kebun-detail/${selectedKebun.id}`}>
              <Eye />
              <span>Detail Kebun</span>
            </Link>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-link">
            <ShieldCheck />
            <span>{isAdmin ? "Akses Admin Utama" : "Akses sesuai penugasan"}</span>
          </div>
          <div className="sidebar-footer-link">
            <Truck />
            <span>{roleLabels[viewerRole]}</span>
          </div>
        </div>
      </aside>

      <main className="payment-main">
        <header className="topbar">
          <div className="top-search">
            <Search size={20} />
            {page === "list" ? (
              <input
                aria-label="Cari kebun"
                placeholder="Cari berdasarkan ID atau nama kebun"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            ) : (
              <div>
                <strong>
                  {page === "detail" ? "Detail Kebun" : page === "edit" ? "Edit Kebun" : "Tambah Kebun"}
                </strong>
                <small>{selectedKebun?.id ?? kebunId ?? "Kebun baru"}</small>
              </div>
            )}
          </div>

          <div className="topbar-actions">
            {page === "list" ? (
              <Link className="primary-pill" href="/kebun-create">
                <Plus />
                <span>Tambah Kebun</span>
              </Link>
            ) : (
              <Link className="white-action" href="/kebun">
                <ArrowLeft />
                <span>Kembali</span>
              </Link>
            )}

            <div className="profile-card">
              <div>
                <strong>{roleLabels[viewerRole]}</strong>
                <small>{viewerUserId.trim() || "Masukkan ID pengguna untuk simulasi akses"}</small>
              </div>
            </div>
          </div>
        </header>

        <div className="content-shell">
          {notice ? <div className={`notice-bar ${notice.type}`}>{notice.message}</div> : null}

          {page === "list" ? (
            <>
              <section className="page-title">
                <h1>Manajemen Kebun Sawit</h1>
                <p>
                  Admin Utama dapat mengelola semua kebun. Role lain hanya melihat
                  kebun yang terhubung dengan ID pengguna mereka.
                </p>
              </section>

              <section className="session-panel">
                <Sprout size={20} />
                <p>
                  Ubah role dan ID pengguna untuk melihat kebun yang sesuai dengan
                  penugasan. Jika role bukan Admin, data akan difilter berdasarkan
                  Mandor atau Supir Truk yang cocok.
                </p>
                <form onSubmit={(event) => event.preventDefault()}>
                  <select value={viewerRole} onChange={(event) => setViewerRole(event.target.value as KebunViewerRole)}>
                    {KEBUN_VIEWER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={viewerUserId}
                    onChange={(event) => setViewerUserId(event.target.value)}
                    placeholder="ID pengguna"
                    aria-label="ID pengguna aktif"
                  />
                </form>
              </section>

              <section className="admin-metric-grid">
                <MetricBox icon={<Users size={22} />} label="Kebun terlihat" value={String(listStats.total)} />
                <MetricBox icon={<CheckCircle2 size={22} />} label="Sudah terikat" value={String(listStats.assigned)} />
                <MetricBox icon={<XCircle size={22} />} label="Tanpa mandor" value={String(listStats.noMandor)} />
                <MetricBox icon={<Truck size={22} />} label="Total supir" value={String(listStats.supirCount)} />
              </section>

              <section className="panel">
                <div className="panel-toolbar">
                  <div>
                    <h2>Daftar kebun</h2>
                    <p className="breadcrumb">Search dapat dilakukan lewat ID atau nama kebun.</p>
                  </div>
                  <div className="toolbar-controls">
                    <div className="filter-input">
                      <Filter size={18} />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Cari ID / nama kebun"
                        aria-label="Filter kebun"
                      />
                    </div>
                    <button className="white-action" type="button" onClick={() => void loadKebuns()} disabled={kebunsLoading}>
                      <Settings />
                      <span>{kebunsLoading ? "Memuat..." : "Muat ulang"}</span>
                    </button>
                  </div>
                </div>

                {kebunsError ? <div className="error-state">{kebunsError}</div> : null}
                {kebunsLoading ? (
                  <div className="empty-card">Memuat daftar kebun...</div>
                ) : visibleKebuns.length === 0 ? (
                  <div className="empty-card">Belum ada kebun yang cocok dengan filter saat ini.</div>
                ) : (
                  <div className="table-scroll">
                    <table className="payment-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Kode</th>
                          <th>Nama Kebun</th>
                          <th>Luas</th>
                          <th>Status</th>
                          <th>Assignment</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleKebuns.map((kebun) => (
                          <tr key={kebun.id}>
                            <td>
                              <strong>{kebun.id}</strong>
                              <small>id kebun</small>
                            </td>
                            <td>{kebun.kode}</td>
                            <td>
                              <strong>{kebun.nama}</strong>
                              <small>{formatCoordinateSummary(kebun.koordinatTitikUjung)}</small>
                            </td>
                            <td>{formatHectare(kebun.luas)}</td>
                            <td>
                              {kebun.mandor ? (
                                <span className="status-pill success">Terikat mandor</span>
                              ) : (
                                <span className="status-pill danger">Belum ada mandor</span>
                              )}
                            </td>
                            <td>
                              <strong>{kebun.mandor?.nama ?? "—"}</strong>
                              <small>{kebun.supirTruks.length} supir truk</small>
                            </td>
                            <td>
                              <div className="row-actions">
                                <Link className="icon-only" href={`/kebun-detail/${kebun.id}`} aria-label={`Buka detail ${kebun.nama}`}>
                                  <Eye size={18} />
                                </Link>
                                {isAdmin ? (
                                  <Link className="icon-only" href={`/kebun-edit/${kebun.id}`} aria-label={`Edit ${kebun.nama}`}>
                                    <Settings size={18} />
                                  </Link>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          ) : null}

          {page === "detail" ? (
            detailLoading ? (
              <div className="empty-card">Memuat detail kebun...</div>
            ) : detailError ? (
              <div className="error-state">{detailError}</div>
            ) : selectedKebun ? (
              <>
                <section className="page-title">
                  <h1>{selectedKebun.nama}</h1>
                  <p>
                    Detail kebun menampilkan identitas kebun, koordinat, mandor, dan
                    daftar Supir Truk yang terhubung.
                  </p>
                </section>

                <div className="dashboard-hero-grid">
                  <section className="balance-card">
                    <div className="balance-card-top">
                      <div className="balance-kicker">
                        <Sprout size={26} />
                        <span>Kebun Sawit</span>
                      </div>
                      <span className={`status-chip ${selectedKebun.mandor ? "green" : ""}`}>
                        {selectedKebun.mandor ? "Aktif" : "Belum terikat"}
                      </span>
                    </div>
                    <div className="balance-value">
                      <strong>{selectedKebun.kode}</strong>
                    </div>
                    <p>
                      <strong>ID:</strong> {selectedKebun.id}
                    </p>
                    <p>
                      <strong>Luas:</strong> {formatHectare(selectedKebun.luas)}
                    </p>
                    <p>
                      <strong>Titik koordinat:</strong> {selectedKebun.koordinatTitikUjung.length} titik
                    </p>

                    <div className="hero-actions">
                      {isAdmin ? (
                        <>
                          <Link className="white-action" href={`/kebun-edit/${selectedKebun.id}`}>
                            <Settings />
                            <span>Edit kebun</span>
                          </Link>
                          <button className="outline-action" type="button" onClick={handleDeleteKebun} disabled={pendingAction === "delete"}>
                            <XCircle />
                            <span>{pendingAction === "delete" ? "Menghapus..." : "Hapus kebun"}</span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </section>

                  <aside className="side-stat-stack">
                    <section className="metric-card">
                      <div className="metric-box-top">
                        <div className="metric-icon mint">
                          <Users size={24} />
                        </div>
                        <span className="role-badge">Mandor</span>
                      </div>
                      <p>Penugasan mandor kebun</p>
                      <strong>{selectedKebun.mandor?.nama ?? "Belum ada mandor"}</strong>
                      <small>{selectedKebun.mandor?.userId ?? selectedKebun.mandor?.id ?? "Tidak ada ID mandor"}</small>
                    </section>

                    <section className="metric-card">
                      <div className="metric-box-top">
                        <div className="metric-icon peach">
                          <Truck size={24} />
                        </div>
                        <span className="role-badge">Supir</span>
                      </div>
                      <p>Supir Truk terhubung</p>
                      <strong>{selectedKebun.supirTruks.length}</strong>
                      <small>Supir yang dapat difilter dan dicopot dari kebun ini</small>
                    </section>
                  </aside>
                </div>

                <section className="panel" style={{ marginBottom: 30 }}>
                  <div className="panel-toolbar">
                    <div>
                      <h2>Informasi kebun</h2>
                      <p className="breadcrumb">
                        Kode kebun tidak bisa diubah saat edit. Overlapping tetap divalidasi backend.
                      </p>
                    </div>
                  </div>

                  <div className="table-scroll">
                    <table className="payment-table">
                      <tbody>
                        <tr>
                          <td>Kode kebun</td>
                          <td>{selectedKebun.kode}</td>
                        </tr>
                        <tr>
                          <td>Nama kebun</td>
                          <td>{selectedKebun.nama}</td>
                        </tr>
                        <tr>
                          <td>Luas</td>
                          <td>{formatHectare(selectedKebun.luas)}</td>
                        </tr>
                        <tr>
                          <td>Koordinat</td>
                          <td>{formatDetailedCoordinateList(selectedKebun.koordinatTitikUjung)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <div className="dashboard-hero-grid">
                  <section className="panel">
                    <div className="panel-toolbar">
                      <div>
                        <h2>Penugasan Mandor</h2>
                        <p className="breadcrumb">Mandor hanya bisa mengawasi satu kebun pada satu waktu.</p>
                      </div>
                    </div>
                    <div className="modal-form" style={{ padding: 30 }}>
                      <label>
                        ID Mandor
                        <input value={mandorId} onChange={(event) => setMandorId(event.target.value)} placeholder="Masukkan ID mandor" />
                      </label>
                      <button className="solid-button full" type="button" onClick={() => void handleAssignMandor()} disabled={pendingAction === "assign-mandor"}>
                        <UserPlus />
                        <span>{pendingAction === "assign-mandor" ? "Menugaskan..." : "Tugaskan Mandor"}</span>
                      </button>
                    </div>
                  </section>

                  <section className="panel">
                    <div className="panel-toolbar">
                      <div>
                        <h2>Daftar Supir Truk</h2>
                        <p className="breadcrumb">Filter nama supir, lalu copot atau tambahkan penugasan.</p>
                      </div>
                    </div>
                    <div className="modal-form" style={{ padding: 30, borderBottom: "1px solid var(--line)" }}>
                      <label>
                        Cari supir
                        <input value={supirSearch} onChange={(event) => setSupirSearch(event.target.value)} placeholder="Cari nama supir" />
                      </label>
                      <label>
                        ID Supir
                        <input value={supirId} onChange={(event) => setSupirId(event.target.value)} placeholder="Masukkan ID supir" />
                      </label>
                      <button className="solid-button full" type="button" onClick={() => void handleAssignSupir()} disabled={pendingAction === "assign-supir"}>
                        <UserPlus />
                        <span>{pendingAction === "assign-supir" ? "Menugaskan..." : "Tugaskan Supir"}</span>
                      </button>
                    </div>

                    {filteredSupir.length === 0 ? (
                      <div className="empty-card" style={{ margin: 0, border: 0, boxShadow: "none" }}>
                        Belum ada supir truk terhubung ke kebun ini.
                      </div>
                    ) : (
                      <div className="detail-list" style={{ padding: 30 }}>
                        {filteredSupir.map((supir) => (
                          <div key={supir.id}>
                            <dt>{supir.nama}</dt>
                            <dd style={{ marginTop: 6 }}>
                              <div className="row-actions" style={{ justifyContent: "space-between" }}>
                                <span>{supir.userId ?? supir.id}</span>
                                {isAdmin ? (
                                  <button
                                    className="reject"
                                    type="button"
                                    onClick={() => void handleRemoveSupir(supir)}
                                    disabled={pendingAction === `remove-${supir.id}`}
                                  >
                                    {pendingAction === `remove-${supir.id}` ? "Mencopot..." : "Copot"}
                                  </button>
                                ) : null}
                              </div>
                            </dd>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <section className="formula-banner compact">
                  <div className="round-icon dark">
                    <CheckCircle2 size={26} />
                  </div>
                  <div>
                    <p>Aturan bisnis utama</p>
                    <strong>
                      Semua aksi mandor dan supir hanya valid jika mereka sudah ditempatkan pada kebun.
                    </strong>
                    <span>
                      Admin juga dapat memastikan setiap supir dan mandor tetap berada di kebun yang sesuai.
                    </span>
                  </div>
                </section>
              </>
            ) : (
              <div className="empty-card">Detail kebun tidak tersedia.</div>
            )
          ) : null}

          {page === "create" || page === "edit" ? (
            detailLoading && page === "edit" ? (
              <div className="empty-card">Memuat data kebun untuk diedit...</div>
            ) : detailError && page === "edit" ? (
              <div className="error-state">{detailError}</div>
            ) : (
              <>
                <section className="page-title">
                  <h1>{page === "create" ? "Tambah Kebun Baru" : "Edit Kebun"}</h1>
                  <p>
                    Lengkapi nama, kode unik, luas, dan empat titik koordinat kebun.
                    Backend tetap menjadi sumber validasi untuk overlap.
                  </p>
                </section>

                <div className="topup-grid" style={{ gridTemplateColumns: "minmax(0, 1.5fr) minmax(320px, 0.9fr)" }}>
                  <section className="panel topup-card">
                    <h1>{page === "create" ? "Form Kebun Baru" : "Form Edit Kebun"}</h1>
                    <form className="modal-form" onSubmit={(event) => void handleSave(event)}>
                      <label>
                        Nama Kebun
                        <input value={form.nama} onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))} placeholder="Contoh: Kebun Sei Putih" />
                        {formErrors.nama ? <span className="inline-error">{formErrors.nama}</span> : null}
                      </label>

                      <label>
                        Kode Unik Kebun
                        {page === "create" ? (
                          <small className="muted">(akan dibuat oleh layanan)</small>
                        ) : (
                          <input
                            value={form.kode}
                            onChange={(event) => setForm((prev) => ({ ...prev, kode: event.target.value }))}
                            placeholder="Contoh: KBN-SP-001"
                            disabled={page === "edit"}
                          />
                        )}
                        {formErrors.kode ? <span className="inline-error">{formErrors.kode}</span> : null}
                      </label>

                      <label>
                        Luas (hektare)
                        <input type="number" step="0.01" min="0" value={form.luas} onChange={(event) => setForm((prev) => ({ ...prev, luas: event.target.value }))} placeholder="Contoh: 125.5" />
                        {formErrors.luas ? <span className="inline-error">{formErrors.luas}</span> : null}
                      </label>

                      <div>
                        <div className="panel-toolbar" style={{ minHeight: 0, padding: 0, borderBottom: 0, marginBottom: 18 }}>
                          <div>
                            <h2>Koordinat titik ujung</h2>
                            <p className="breadcrumb">Masukkan 4 titik koordinat dalam urutan searah bidang kebun.</p>
                          </div>
                        </div>

                        <div className="coordinate-grid">
                          {form.koordinatTitikUjung.map((point, index) => (
                            <div className="coordinate-point" key={index}>
                              <strong>Titik {index + 1}</strong>
                              <div className="coordinate-grid" style={{ marginTop: 12 }}>
                                <label>
                                  Latitude
                                  <input
                                    type="number"
                                    step="any"
                                    value={point.latitude}
                                    onChange={(event) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        koordinatTitikUjung: prev.koordinatTitikUjung.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, latitude: event.target.value } : item,
                                        ),
                                      }))
                                    }
                                    placeholder="0"
                                  />
                                </label>
                                <label>
                                  Longitude
                                  <input
                                    type="number"
                                    step="any"
                                    value={point.longitude}
                                    onChange={(event) =>
                                      setForm((prev) => ({
                                        ...prev,
                                        koordinatTitikUjung: prev.koordinatTitikUjung.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, longitude: event.target.value } : item,
                                        ),
                                      }))
                                    }
                                    placeholder="0"
                                  />
                                </label>
                              </div>
                              {formErrors[`koordinatTitikUjung.${index}`] ? (
                                <span className="inline-error">{formErrors[`koordinatTitikUjung.${index}`]}</span>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {formErrors.koordinatTitikUjung ? <span className="inline-error">{formErrors.koordinatTitikUjung}</span> : null}
                      </div>

                      <div className="form-actions wide">
                        <Link className="ghost-button" href="/kebun">
                          Batal
                        </Link>
                        <button className="solid-button" type="submit" disabled={pendingAction === "save"}>
                          <span>{pendingAction === "save" ? "Menyimpan..." : page === "create" ? "Simpan Kebun" : "Perbarui Kebun"}</span>
                        </button>
                      </div>
                    </form>
                  </section>

                  <aside className="summary-card">
                    <h2>Ringkasan kebun</h2>
                    <p>
                      Kode kebun tidak bisa diubah saat edit. Penugasan mandor dan supir tetap dilakukan dari halaman detail.
                    </p>

                    <dl>
                      <div>
                        <dt>Status form</dt>
                        <dd>{page === "create" ? "Kebun baru" : "Memperbarui kebun"}</dd>
                      </div>
                      <div>
                        <dt>Jumlah titik</dt>
                        <dd>{form.koordinatTitikUjung.length} titik</dd>
                      </div>
                      <div>
                        <dt>Luas input</dt>
                        <dd>{form.luas || "0"} ha</dd>
                      </div>
                      <div>
                        <dt>Nama kebun</dt>
                        <dd>{form.nama || "Belum diisi"}</dd>
                      </div>
                    </dl>

                    <div className="payment-total">
                      <span>Format yang disarankan</span>
                      <strong>[(Lat, Long) x 4 titik]</strong>
                    </div>

                    <p className="secure-copy">
                      Simpan data dengan urutan titik yang konsisten agar backend bisa memvalidasi bentuk kebun dan overlap dengan benar.
                    </p>
                  </aside>
                </div>
              </>
            )
          ) : null}
        </div>
      </main>
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <section className="metric-box">
      <div className="metric-box-top">
        <div className="metric-icon soft">{icon}</div>
      </div>
      <p>{label}</p>
      <h3>{value}</h3>
    </section>
  );
}

function validateForm(form: KebunFormState, page: KebunPageKind): { payload: KebunUpsertPayload | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const nama = form.nama.trim();
  const kode = form.kode.trim();
  const luas = Number(form.luas);

  if (!nama) errors.nama = "Nama kebun wajib diisi.";
  // Kode is optional now (backend generates it on create)
  if (Number.isNaN(luas) || luas <= 0) errors.luas = "Luas kebun harus berupa angka positif.";

  const coordinates = form.koordinatTitikUjung
    .map((point, index) => {
      if (!point.latitude.trim() || !point.longitude.trim()) {
        errors[`koordinatTitikUjung.${index}`] = "Semua titik koordinat wajib diisi.";
        return null;
      }

      const latitude = Number(point.latitude);
      const longitude = Number(point.longitude);
      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        errors[`koordinatTitikUjung.${index}`] = "Koordinat harus berupa angka.";
        return null;
      }

      return { latitude, longitude };
    })
    .filter(Boolean) as KebunCoordinate[];

  if (coordinates.length !== 4) {
    errors.koordinatTitikUjung = "Kebun sawit wajib memiliki tepat 4 titik koordinat.";
  }

  const duplicate = new Set(coordinates.map((point) => `${point.latitude}:${point.longitude}`));
  if (duplicate.size !== coordinates.length) {
    errors.koordinatTitikUjung = "Koordinat titik tidak boleh sama.";
  }

  if (Object.keys(errors).length > 0) {
    return { payload: null, errors };
  }

  // Build payload and omit kode if empty (backend will assign it)
  const payload: KebunUpsertPayload = {
    nama,
    luas,
    koordinatTitikUjung: coordinates,
  } as KebunUpsertPayload;

  if (kode) (payload as any).kode = kode;

  return { payload, errors };
}

function formFromKebun(kebun: Kebun): KebunFormState {
  const points = kebun.koordinatTitikUjung.slice(0, 4);
  while (points.length < 4) points.push({ latitude: 0, longitude: 0 });

  return {
    nama: kebun.nama,
    kode: kebun.kode,
    luas: String(kebun.luas),
    koordinatTitikUjung: points.map((point) => ({ latitude: String(point.latitude), longitude: String(point.longitude) })),
  };
}

function kebunVisibleForRole(kebun: Kebun, role: KebunViewerRole, userId: string) {
  if (role === "ADMIN" || !userId.trim()) return true;
  if (role === "MANDOR") return kebun.mandor?.userId === userId || kebun.mandor?.id === userId;
  if (role === "SUPIR_TRUK") return kebun.supirTruks.some((person) => person.userId === userId || person.id === userId);
  return false;
}

function normalizeKebunList(value: unknown): Kebun[] {
  if (Array.isArray(value)) return value.map(normalizeKebun);

  // Common wrappers from backends: { data: [...] } / { items: [...] } / { results: [...] } / { kebuns: [...] }
  if (isRecord(value)) {
    const candidates = [value.data, value.items, value.results, value.kebuns, value.list];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate.map(normalizeKebun);
    }
  }

  return [];
}

function normalizeKebun(value: unknown): Kebun {
  const record = isRecord(value) ? value : {};
  return {
    id: readString(record, ["id", "kebunId", "uuid"]),
    nama: readString(record, ["nama", "namaKebun", "name"]),
    kode: readString(record, ["kode", "kodeKebun", "code"]),
    luas: readNumber(record, ["luas", "luasHektare", "area"]),
    koordinatTitikUjung: readCoordinates(record),
    mandor: readAssignment(record, ["mandor", "mandorAssignment", "mandorData"], "mandor"),
    supirTruks: readAssignments(record, ["supirTruks", "supirTrucks", "supirList", "supirAssignments"]),
  };
}

function readCoordinates(record: Record<string, unknown>) {
  const value = record.koordinatTitikUjung ?? record.coordinates ?? record.points ?? record.titikUjung;
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (Array.isArray(item) && item.length >= 2) {
        return { latitude: Number(item[0]), longitude: Number(item[1]) };
      }

      if (isRecord(item)) {
        return {
          latitude: Number(item.latitude ?? item.lat ?? item[0]),
          longitude: Number(item.longitude ?? item.lng ?? item.lon ?? item[1]),
        };
      }

      return null;
    })
    .filter((item): item is KebunCoordinate => item !== null) as KebunCoordinate[];
}

function readAssignment(record: Record<string, unknown>, keys: string[], rolePrefix: string): KebunAssignment | null {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      const id = readOptionalString(value, ["id", "userId", `${rolePrefix}Id`, "uuid"]);
      const nama = readOptionalString(value, ["nama", "name", `${rolePrefix}Nama`]) ?? id ?? "";
      if (!id && !nama) return null;
      return { id: id ?? nama, nama, userId: id ?? undefined };
    }
  }

  const id = readOptionalString(record, [`${rolePrefix}Id`, "userId"]);
  const nama = readOptionalString(record, [`${rolePrefix}Nama`, "nama"]);
  if (!id && !nama) return null;
  return { id: id ?? nama ?? "", nama: nama ?? id ?? "", userId: id ?? undefined };
}

function readAssignments(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) continue;

    return value
      .map((item, index): KebunAssignment | null => {
        if (isRecord(item)) {
          const id = readOptionalString(item, ["id", "userId", "supirId", "mandorId", "uuid"]);
          const nama = readOptionalString(item, ["nama", "name"]) ?? id ?? `Data-${index + 1}`;
          return { id: id ?? nama, nama, userId: id ?? undefined };
        }

        if (typeof item === "string") {
          return { id: item, nama: item, userId: item };
        }

        return null;
      })
      .filter((item): item is KebunAssignment => item !== null) as KebunAssignment[];
  }

  return [];
}

function readString(record: Record<string, unknown>, keys: string[]) {
  return readOptionalString(record, keys) ?? "";
}

function readOptionalString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return 0;
}

function formatHectare(value: number) {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value)} ha`;
}

function formatCoordinateSummary(points: KebunCoordinate[]) {
  if (points.length === 0) return "Belum ada koordinat";
  return `${points.length} titik koordinat`;
}

function formatDetailedCoordinateList(points: KebunCoordinate[]) {
  if (points.length === 0) return "Belum ada koordinat";
  return points
    .map(
      (point, index) =>
        `${index + 1}. (${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(point.latitude)}, ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(point.longitude)})`,
    )
    .join(" • ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default KebunExperience;

