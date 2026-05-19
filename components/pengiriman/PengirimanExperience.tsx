"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  Sprout,
  Tractor,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getPengirimanErrorMessage, pengirimanApi } from "@/lib/pengiriman/client";
import {
  PENGIRIMAN_ROLES,
  STATUS_COLORS,
  STATUS_LABELS,
  isPengirimanRole,
  type AdminReviewDecision,
  type PengirimanRole,
  type Shipment,
  type ShipmentStatus,
} from "@/lib/pengiriman/types";

export type PengirimanPageKind = "list" | "detail" | "create";

type Notice = { type: "success" | "error"; message: string } | null;

/* ════════════════════════════════════════════════════════════════
   Main component
   ════════════════════════════════════════════════════════════════ */
export function PengirimanExperience({
  page,
  shipmentId,
}: {
  page: PengirimanPageKind;
  shipmentId?: string;
}) {
  /* ── dev identity ── */
  const [role, setRole] = useState<PengirimanRole>("MANDOR");
  const [userId, setUserId] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<string | null>(null);

  /* ── shipment list ── */
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | "">("");
  const [dateFilter, setDateFilter] = useState("");

  /* ── detail ── */
  const [detail, setDetail] = useState<Shipment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  /* ── create form ── */
  const [createForm, setCreateForm] = useState({ driverId: "", harvestIds: "" });

  /* ── mandor review ── */
  const [mandorRejectReason, setMandorRejectReason] = useState("");

  /* ── admin review ── */
  const [adminDecision, setAdminDecision] = useState<AdminReviewDecision>("APPROVE");
  const [adminWeight, setAdminWeight] = useState("");
  const [adminReason, setAdminReason] = useState("");

  const isAdmin = role === "ADMIN";
  const isMandor = role === "MANDOR";
  const isDriver = role === "SUPIR_TRUK";

  /* ── data loading ── */
  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters: Record<string, string> = {};
      if (isDriver) filters.driverId = userId;
      if (isMandor) filters.mandorId = userId;
      if (statusFilter) filters.status = statusFilter;
      if (dateFilter) filters.date = dateFilter;
      const data = await pengirimanApi.getShipments(filters);
      setShipments(data);
    } catch (e) {
      setError(getPengirimanErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [userId, role, statusFilter, dateFilter, isDriver, isMandor]);

  const loadDetail = useCallback(async () => {
    if (!shipmentId) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await pengirimanApi.getShipmentById(shipmentId);
      setDetail(data);
    } catch (e) {
      setDetailError(getPengirimanErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    if (page === "list" && userId) loadShipments();
  }, [page, userId, loadShipments]);

  useEffect(() => {
    if (page === "detail") loadDetail();
  }, [page, loadDetail]);

  /* ── actions ── */
  async function runAction(key: string, fn: () => Promise<void>) {
    setPending(key);
    try {
      await fn();
    } catch (e) {
      setNotice({ type: "error", message: getPengirimanErrorMessage(e) });
    } finally {
      setPending(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const ids = createForm.harvestIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) {
      setNotice({ type: "error", message: "Masukkan minimal 1 harvest ID." });
      return;
    }
    await runAction("create", async () => {
      await pengirimanApi.createShipment({
        mandorId: userId,
        driverId: createForm.driverId.trim(),
        harvestIds: ids,
      });
      setNotice({ type: "success", message: "Pengiriman berhasil dibuat!" });
      setCreateForm({ driverId: "", harvestIds: "" });
    });
  }

  async function handleDriverUpdate(id: string, newStatus: ShipmentStatus) {
    await runAction("driver-" + id, async () => {
      const updated = await pengirimanApi.updateDriverStatus(id, {
        driverId: userId,
        newStatus,
      });
      setDetail(updated);
      setNotice({ type: "success", message: `Status diubah ke ${STATUS_LABELS[newStatus]}.` });
    });
  }

  async function handleMandorApprove(id: string) {
    await runAction("mandor-approve", async () => {
      const updated = await pengirimanApi.reviewByMandor(id, {
        mandorId: userId,
        approved: true,
      });
      setDetail(updated);
      setNotice({ type: "success", message: "Pengiriman disetujui mandor." });
    });
  }

  async function handleMandorReject(id: string) {
    if (!mandorRejectReason.trim()) {
      setNotice({ type: "error", message: "Alasan penolakan wajib diisi." });
      return;
    }
    await runAction("mandor-reject", async () => {
      const updated = await pengirimanApi.reviewByMandor(id, {
        mandorId: userId,
        approved: false,
        rejectionReason: mandorRejectReason.trim(),
      });
      setDetail(updated);
      setMandorRejectReason("");
      setNotice({ type: "success", message: "Pengiriman ditolak mandor." });
    });
  }

  async function handleAdminReview(id: string) {
    await runAction("admin-review", async () => {
      const updated = await pengirimanApi.reviewByAdmin(id, {
        adminId: userId,
        decision: adminDecision,
        recognizedWeightKg: adminDecision === "PARTIAL_REJECT" ? Number(adminWeight) : undefined,
        rejectionReason: adminDecision !== "APPROVE" ? adminReason.trim() || undefined : undefined,
      });
      setDetail(updated);
      setNotice({ type: "success", message: "Review admin berhasil." });
    });
  }

  /* ── render helpers ── */
  const sorted = useMemo(
    () => [...shipments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [shipments],
  );

  /* ════════════════════════════════════════════════════════════════
     JSX
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="payment-app">
      {/* ── Sidebar ── */}
      <aside className="payment-sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon"><Tractor size={24} /></span>
          <span><strong>MySawit</strong><small>Pengiriman</small></span>
        </Link>

        <nav className="sidebar-nav" aria-label="Navigasi pengiriman">
          <SidebarLink href="/pengiriman" icon={<Truck />} label="Daftar Pengiriman" active={page === "list"} />
          {isMandor && (
            <SidebarLink href="/pengiriman/create" icon={<Plus />} label="Buat Pengiriman" active={page === "create"} />
          )}
          <SidebarLink href="#" icon={<LayoutDashboard />} label="Dashboard" />
          <SidebarLink href="#" icon={<Users />} label="Manajemen Pengguna" />
          <SidebarLink href="#" icon={<Sprout />} label="Manajemen Kebun" />
          <SidebarLink href="#" icon={<Settings />} label="Pengaturan" />
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="sidebar-footer-link"><HelpCircle size={22} /> Bantuan</a>
          <a href="#" className="sidebar-footer-link logout"><LogOut size={22} /> Keluar</a>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="payment-main">
        <header className="topbar">
          <label className="top-search">
            <Search size={22} />
            <input placeholder="Cari pengiriman..." readOnly />
          </label>
          <div className="topbar-actions">
            <button aria-label="Notifikasi" className="icon-button" type="button"><Bell size={23} /><span className="notification-dot" /></button>
            <button aria-label="Wallet" className="icon-button" type="button"><CreditCard size={23} /></button>
            <div className="profile-card">
              <span aria-hidden="true" className="avatar" style={{ backgroundImage: `url(https://api.dicebear.com/9.x/initials/svg?seed=${userId || role})` }} />
              <span><strong>{userId || "User"}</strong><small>{role}</small></span>
            </div>
          </div>
        </header>

        <div className="content-shell">
          {/* ── Dev Toolbar ── */}
          <div className="card" style={{ marginBottom: 24, padding: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
            <Settings size={18} />
            <strong style={{ fontSize: 14 }}>Dev Identity:</strong>
            <select value={role} onChange={(e) => { if (isPengirimanRole(e.target.value)) setRole(e.target.value); }} style={{ minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, padding: "0 10px" }}>
              {PENGIRIMAN_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} style={{ minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, padding: "0 10px", width: 260 }} />
          </div>

          {/* ── Notice ── */}
          {notice && (
            <div className={notice.type === "success" ? "notice success" : "notice error"} style={{ marginBottom: 20 }}>
              {notice.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {notice.message}
              <button type="button" onClick={() => setNotice(null)} style={{ marginLeft: "auto", background: "none", border: 0, cursor: "pointer" }}><X size={16} /></button>
            </div>
          )}

          {/* ── Page content ── */}
          {page === "list" && <ShipmentList shipments={sorted} loading={loading} error={error} statusFilter={statusFilter} setStatusFilter={setStatusFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} onRefresh={loadShipments} role={role} />}
          {page === "create" && <CreateShipmentPage form={createForm} setForm={setCreateForm} onSubmit={handleCreate} pending={pending === "create"} />}
          {page === "detail" && (
            <ShipmentDetailPage
              shipment={detail} loading={detailLoading} error={detailError}
              role={role} userId={userId} pending={pending}
              onDriverUpdate={handleDriverUpdate}
              onMandorApprove={handleMandorApprove} onMandorReject={handleMandorReject}
              mandorRejectReason={mandorRejectReason} setMandorRejectReason={setMandorRejectReason}
              onAdminReview={handleAdminReview} adminDecision={adminDecision} setAdminDecision={setAdminDecision}
              adminWeight={adminWeight} setAdminWeight={setAdminWeight} adminReason={adminReason} setAdminReason={setAdminReason}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-components
   ════════════════════════════════════════════════════════════════ */

function SidebarLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link className={`sidebar-link ${active ? "active" : ""}`} href={href}>
      {icon} {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, color: "#fff", background: STATUS_COLORS[status] }}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ── Shipment List ── */
function ShipmentList({
  shipments, loading, error, statusFilter, setStatusFilter, dateFilter, setDateFilter, onRefresh, role,
}: {
  shipments: Shipment[]; loading: boolean; error: string;
  statusFilter: ShipmentStatus | ""; setStatusFilter: (v: ShipmentStatus | "") => void;
  dateFilter: string; setDateFilter: (v: string) => void;
  onRefresh: () => void; role: PengirimanRole;
}) {
  return (
    <>
      <div className="page-title">
        <h1 className="page-heading">
          <Truck size={32} /> Daftar Pengiriman
        </h1>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
        <Filter size={18} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | "")} style={{ minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, padding: "0 10px" }}>
          <option value="">Semua Status</option>
          <option value="MEMUAT">Memuat</option>
          <option value="MENGIRIM">Mengirim</option>
          <option value="TIBA_DI_TUJUAN">Tiba di Tujuan</option>
          <option value="DISETUJUI_MANDOR">Disetujui Mandor</option>
          <option value="DITOLAK_MANDOR">Ditolak Mandor</option>
          <option value="DISETUJUI_ADMIN">Disetujui Admin</option>
          <option value="DITOLAK_ADMIN">Ditolak Admin</option>
          <option value="DITOLAK_PARSIAL_ADMIN">Ditolak Parsial</option>
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ minHeight: 38, border: "1px solid var(--line)", borderRadius: 6, padding: "0 10px" }} />
        <button className="solid-button" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Memuat..." : "Terapkan Filter"}
        </button>
      </div>

      {error && <div className="card empty-card" style={{ color: "var(--red)" }}>{error}</div>}
      {!error && !loading && shipments.length === 0 && <div className="card empty-card">Tidak ada pengiriman ditemukan. Pastikan User ID sudah diisi.</div>}

      <div className="payroll-card-list">
        {shipments.map((s) => (
          <Link key={s.id} href={`/pengiriman/${s.id}`} className="card my-payroll-item" style={{ gridTemplateColumns: "84px minmax(220px,1fr) minmax(140px,0.6fr) minmax(120px,0.4fr) 28px", textDecoration: "none" }}>
            <div className="payroll-day">
              <span>{new Date(s.createdAt).toLocaleDateString("id-ID", { weekday: "short" }).toUpperCase()}</span>
              <strong>{new Date(s.createdAt).getDate()}</strong>
            </div>
            <div className="payroll-copy">
              <h3 style={{ fontSize: 17 }}>{s.id.slice(0, 8)}...</h3>
              <p>Driver: {s.driverId.slice(0, 12)}… · Mandor: {s.mandorId.slice(0, 12)}…</p>
            </div>
            <div className="payroll-weight">
              <Package size={20} /> {s.totalWeightKg} kg
            </div>
            <div className="payroll-amount" style={{ justifyItems: "end" }}>
              <StatusBadge status={s.status} />
            </div>
            <ChevronRight className="item-chevron" size={20} />
          </Link>
        ))}
      </div>
    </>
  );
}

/* ── Create Shipment Page ── */
function CreateShipmentPage({ form, setForm, onSubmit, pending }: {
  form: { driverId: string; harvestIds: string };
  setForm: (f: { driverId: string; harvestIds: string }) => void;
  onSubmit: (e: FormEvent) => void; pending: boolean;
}) {
  return (
    <>
      <div className="page-title">
        <Link href="/pengiriman" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)", marginBottom: 12 }}>
          <ArrowLeft size={18} /> Kembali ke Daftar
        </Link>
        <h1 className="page-heading"><Plus size={32} /> Buat Pengiriman Baru</h1>
      </div>

      <div className="card" style={{ padding: 26 }}>
        <form className="modal-form" onSubmit={onSubmit}>
          <label>
            Driver ID
            <input required value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })} placeholder="UUID driver" />
          </label>
          <label>
            Harvest IDs (pisahkan dengan koma)
            <textarea required value={form.harvestIds} onChange={(e) => setForm({ ...form, harvestIds: e.target.value })} placeholder="harvest-id-1, harvest-id-2" />
          </label>
          <button className="solid-button full" type="submit" disabled={pending}>
            {pending ? "Membuat..." : "Buat Pengiriman"}
          </button>
        </form>
      </div>
    </>
  );
}

/* ── Shipment Detail Page ── */
function ShipmentDetailPage({
  shipment, loading, error, role, userId, pending,
  onDriverUpdate, onMandorApprove, onMandorReject, mandorRejectReason, setMandorRejectReason,
  onAdminReview, adminDecision, setAdminDecision, adminWeight, setAdminWeight, adminReason, setAdminReason,
}: {
  shipment: Shipment | null; loading: boolean; error: string;
  role: PengirimanRole; userId: string; pending: string | null;
  onDriverUpdate: (id: string, s: ShipmentStatus) => void;
  onMandorApprove: (id: string) => void; onMandorReject: (id: string) => void;
  mandorRejectReason: string; setMandorRejectReason: (v: string) => void;
  onAdminReview: (id: string) => void; adminDecision: AdminReviewDecision; setAdminDecision: (v: AdminReviewDecision) => void;
  adminWeight: string; setAdminWeight: (v: string) => void; adminReason: string; setAdminReason: (v: string) => void;
}) {
  if (loading) return <div className="card empty-card">Memuat detail pengiriman...</div>;
  if (error) return <div className="card empty-card" style={{ color: "var(--red)" }}>{error}</div>;
  if (!shipment) return <div className="card empty-card">Pengiriman tidak ditemukan.</div>;

  const s = shipment;
  const isDriver = role === "SUPIR_TRUK";
  const isMandor = role === "MANDOR";
  const isAdmin = role === "ADMIN";

  return (
    <>
      <div className="page-title">
        <Link href="/pengiriman" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--muted)", marginBottom: 12 }}>
          <ArrowLeft size={18} /> Kembali
        </Link>
        <h1 className="page-heading"><Eye size={32} /> Detail Pengiriman</h1>
      </div>

      {/* ── Info Cards ── */}
      <div className="card" style={{ padding: 26, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ color: "var(--muted)", fontSize: 13 }}>ID Pengiriman</div>
            <strong style={{ fontSize: 18 }}>{s.id}</strong>
          </div>
          <StatusBadge status={s.status} />
        </div>

        <dl className="detail-list">
          <div><dt>Driver ID</dt><dd>{s.driverId}</dd></div>
          <div><dt>Mandor ID</dt><dd>{s.mandorId}</dd></div>
          <div><dt>Total Berat</dt><dd><strong>{s.totalWeightKg} kg</strong></dd></div>
          <div><dt>Berat Diakui</dt><dd>{s.recognizedWeightKg != null ? `${s.recognizedWeightKg} kg` : "—"}</dd></div>
          <div><dt>Harvest IDs</dt><dd>{s.harvestIds.join(", ") || "—"}</dd></div>
          <div><dt>Dibuat</dt><dd>{new Date(s.createdAt).toLocaleString("id-ID")}</dd></div>
          {s.mandorReviewedAt && <div><dt>Review Mandor</dt><dd>{new Date(s.mandorReviewedAt).toLocaleString("id-ID")}</dd></div>}
          {s.adminReviewedAt && <div><dt>Review Admin</dt><dd>{new Date(s.adminReviewedAt).toLocaleString("id-ID")}</dd></div>}
        </dl>

        {s.rejectionReason && (
          <div className="reject-reason" style={{ marginTop: 20, borderRadius: 8, margin: "20px 0 0" }}>
            <strong>Alasan Penolakan:</strong> {s.rejectionReason}
          </div>
        )}
      </div>

      {/* ── Driver Actions ── */}
      {isDriver && s.status === "MEMUAT" && (
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px" }}>Aksi Driver</h2>
          <button className="solid-button" disabled={!!pending} onClick={() => onDriverUpdate(s.id, "MENGIRIM")}>
            {pending?.startsWith("driver") ? "Memproses..." : "Mulai Mengirim →"}
          </button>
        </div>
      )}
      {isDriver && s.status === "MENGIRIM" && (
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px" }}>Aksi Driver</h2>
          <button className="solid-button" disabled={!!pending} onClick={() => onDriverUpdate(s.id, "TIBA_DI_TUJUAN")}>
            {pending?.startsWith("driver") ? "Memproses..." : "Konfirmasi Tiba di Tujuan ✓"}
          </button>
        </div>
      )}

      {/* ── Mandor Actions ── */}
      {isMandor && s.status === "TIBA_DI_TUJUAN" && (
        <div className="card" style={{ padding: 26, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 14px" }}>Review Mandor</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <button className="solid-button" disabled={!!pending} onClick={() => onMandorApprove(s.id)}>
              <CheckCircle2 size={16} /> Setujui
            </button>
          </div>
          <div className="modal-form">
            <label>
              Alasan Penolakan
              <textarea value={mandorRejectReason} onChange={(e) => setMandorRejectReason(e.target.value)} placeholder="Wajib diisi jika menolak" />
            </label>
            <button className="danger-button" disabled={!!pending} onClick={() => onMandorReject(s.id)}>
              <XCircle size={16} /> Tolak
            </button>
          </div>
        </div>
      )}

      {/* ── Admin Actions ── */}
      {isAdmin && s.status === "DISETUJUI_MANDOR" && (
        <div className="card" style={{ padding: 26 }}>
          <h2 style={{ margin: "0 0 14px" }}>Review Admin</h2>
          <div className="modal-form">
            <label>
              Keputusan
              <select value={adminDecision} onChange={(e) => setAdminDecision(e.target.value as AdminReviewDecision)}>
                <option value="APPROVE">Setujui</option>
                <option value="REJECT">Tolak</option>
                <option value="PARTIAL_REJECT">Tolak Parsial</option>
              </select>
            </label>
            {adminDecision === "PARTIAL_REJECT" && (
              <label>
                Berat Diakui (kg)
                <input type="number" step="0.01" value={adminWeight} onChange={(e) => setAdminWeight(e.target.value)} placeholder="Contoh: 125" />
              </label>
            )}
            {adminDecision !== "APPROVE" && (
              <label>
                Alasan
                <textarea value={adminReason} onChange={(e) => setAdminReason(e.target.value)} placeholder="Alasan penolakan" />
              </label>
            )}
            <button className="solid-button full" disabled={!!pending} onClick={() => onAdminReview(s.id)}>
              {pending === "admin-review" ? "Memproses..." : "Kirim Review"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
