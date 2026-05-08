"use client";

import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Banknote,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  Filter,
  HelpCircle,
  Home,
  Info,
  Landmark,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  Tractor,
  TrendingUp,
  Truck,
  User,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getPaymentErrorMessage,
  getPembayaranApiBaseUrl,
  pembayaranApi,
} from "@/lib/pembayaran/client";
import {
  canUseDevPaymentSessionOverride,
  clearDevPaymentSession,
  isPaymentUuid,
  readPaymentSession,
  saveDevPaymentSession,
  type PaymentSession,
} from "@/lib/pembayaran/session";
import {
  PAYMENT_HEADER_ROLES,
  USER_ROLES,
  isUserRole,
  type PaymentHeaderRole,
  type Payroll,
  type PayrollFilters,
  type PayrollStatus,
  type TopUpResponse,
  type UserRole,
  type WageConfig,
  type Wallet as WalletType,
} from "@/lib/pembayaran/types";

export type PaymentPageKind =
  | "dashboard"
  | "tarif"
  | "payroll"
  | "top-up"
  | "payroll-saya";

type Notice = {
  type: "success" | "error";
  message: string;
} | null;

type CreatePayrollForm = {
  userId: string;
  userRole: UserRole;
  kilogram: string;
  description: string;
};

type WageConfigForm = {
  buruhWagePerKg: string;
  supirTrukWagePerKg: string;
  mandorWagePerKg: string;
};

const SAWIT_DOLLAR_RATE = 10000;

const initialSession: PaymentSession = {
  userId: null,
  role: null,
  source: null,
};

const initialCreatePayrollForm: CreatePayrollForm = {
  userId: "",
  userRole: "BURUH",
  kilogram: "",
  description: "",
};

const initialWageConfigForm: WageConfigForm = {
  buruhWagePerKg: "",
  supirTrukWagePerKg: "",
  mandorWagePerKg: "",
};

const statusTabs: Array<{ value: "ALL" | PayrollStatus; label: string }> = [
  { value: "ALL", label: "Semua" },
  { value: "ACCEPTED", label: "Disetujui" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Ditolak" },
];

export function PaymentExperience({ page }: { page: PaymentPageKind }) {
  const [session, setSession] = useState<PaymentSession>(initialSession);
  const [devSessionForm, setDevSessionForm] = useState<{
    userId: string;
    role: PaymentHeaderRole;
  }>({ userId: "", role: "ADMIN" });
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState("");

  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollError, setPayrollError] = useState("");
  const [appliedPayrollFilters, setAppliedPayrollFilters] =
    useState<PayrollFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PayrollStatus>(
    "ALL",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [createPayrollOpen, setCreatePayrollOpen] = useState(false);
  const [createPayrollForm, setCreatePayrollForm] = useState(
    initialCreatePayrollForm,
  );

  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [rejectPayroll, setRejectPayroll] = useState<Payroll | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [wageConfig, setWageConfig] = useState<WageConfig | null>(null);
  const [wageConfigForm, setWageConfigForm] = useState(initialWageConfigForm);
  const [wageConfigLoading, setWageConfigLoading] = useState(false);
  const [wageConfigError, setWageConfigError] = useState("");

  const [topUpUserId, setTopUpUserId] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("500");
  const [topUpResult, setTopUpResult] = useState<TopUpResponse | null>(null);

  const canUseDevSession = canUseDevPaymentSessionOverride();
  const isAdmin = session.role === "ADMIN";

  const loadWallet = useCallback(async () => {
    if (!isPaymentUuid(session.userId)) {
      setWallet(null);
      setWalletError("User aktif pembayaran harus UUID valid.");
      return;
    }

    setWalletLoading(true);
    setWalletError("");

    try {
      const data = await pembayaranApi.getMyWallet(session.userId);
      setWallet(data);
    } catch (error) {
      setWallet(null);
      setWalletError(getPaymentErrorMessage(error));
    } finally {
      setWalletLoading(false);
    }
  }, [session.userId]);

  const loadPayrolls = useCallback(async () => {
    if (page === "payroll-saya" && !isPaymentUuid(session.userId)) {
      setPayrolls([]);
      setPayrollError("User aktif pembayaran harus UUID valid.");
      return;
    }

    setPayrollLoading(true);
    setPayrollError("");

    try {
      const filters: PayrollFilters = { ...appliedPayrollFilters };

      if (page === "payroll-saya" && isPaymentUuid(session.userId)) {
        filters.userId = session.userId;
      }

      const data = await pembayaranApi.getPayroll(filters);
      setPayrolls(data);
    } catch (error) {
      setPayrolls([]);
      setPayrollError(getPaymentErrorMessage(error));
    } finally {
      setPayrollLoading(false);
    }
  }, [appliedPayrollFilters, page, session.userId]);

  const loadWageConfig = useCallback(async () => {
    setWageConfigLoading(true);
    setWageConfigError("");

    try {
      const data = await pembayaranApi.getWageConfig();
      setWageConfig(data);
      setWageConfigForm({
        buruhWagePerKg: String(data.buruhWagePerKg),
        supirTrukWagePerKg: String(data.supirTrukWagePerKg),
        mandorWagePerKg: String(data.mandorWagePerKg),
      });
    } catch (error) {
      setWageConfig(null);
      setWageConfigError(getPaymentErrorMessage(error));
    } finally {
      setWageConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    const nextSession = readPaymentSession();
    setSession(nextSession);
    setDevSessionForm({
      userId: nextSession.userId ?? "",
      role: nextSession.role ?? "ADMIN",
    });
  }, []);

  useEffect(() => {
    if (page !== "payroll" || typeof window === "undefined") {
      return;
    }

    const profileUserId = new URLSearchParams(window.location.search).get(
      "userId",
    );

    if (isPaymentUuid(profileUserId)) {
      setUserIdFilter(profileUserId);
      setAppliedPayrollFilters((previous) => ({
        ...previous,
        userId: profileUserId,
      }));
    }
  }, [page]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    void loadPayrolls();
  }, [loadPayrolls]);

  useEffect(() => {
    void loadWageConfig();
  }, [loadWageConfig]);

  useEffect(() => {
    setCreatePayrollForm((previous) => ({
      ...previous,
      userId: previous.userId || session.userId || "",
      userRole:
        previous.userRole ||
        (session.role && isUserRole(session.role) ? session.role : "BURUH"),
    }));
    setTopUpUserId((previous) => previous || session.userId || "");
  }, [session.role, session.userId]);

  const visiblePayrolls = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...payrolls]
      .filter((payroll) => {
        if (roleFilter && payroll.userRole !== roleFilter) {
          return false;
        }

        if (statusFilter !== "ALL" && payroll.status !== statusFilter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          payroll.userId.toLowerCase().includes(normalizedSearch) ||
          payroll.description.toLowerCase().includes(normalizedSearch) ||
          roleLabel(payroll.userRole).toLowerCase().includes(normalizedSearch)
        );
      })
      .sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      );
  }, [payrolls, roleFilter, searchTerm, statusFilter]);

  const contextPayrolls = useMemo(() => {
    if (page === "payroll-saya" && session.userId) {
      return payrolls.filter((payroll) => payroll.userId === session.userId);
    }

    return payrolls;
  }, [page, payrolls, session.userId]);

  const acceptedPayrolls = contextPayrolls.filter(
    (payroll) => payroll.status === "ACCEPTED",
  );
  const pendingPayrolls = contextPayrolls.filter(
    (payroll) => payroll.status === "PENDING",
  );
  const rejectedPayrolls = contextPayrolls.filter(
    (payroll) => payroll.status === "REJECTED",
  );
  const totalAcceptedAmount = acceptedPayrolls.reduce(
    (total, payroll) => total + payroll.amount,
    0,
  );
  const totalHarvestKg = acceptedPayrolls.reduce(
    (total, payroll) => total + payroll.kilogram,
    0,
  );
  const walletBalance = wallet?.balance ?? 0;

  async function refetchPaymentData() {
    await Promise.all([
      isPaymentUuid(session.userId) ? loadWallet() : Promise.resolve(),
      loadPayrolls(),
      loadWageConfig(),
    ]);
  }

  function refreshSession() {
    const nextSession = readPaymentSession();
    setSession(nextSession);
    setDevSessionForm({
      userId: nextSession.userId ?? "",
      role: nextSession.role ?? "ADMIN",
    });
    setNotice({
      type: "success",
      message: "Session pembayaran dimuat ulang.",
    });
  }

  function applyPayrollFilters(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const normalizedUserIdFilter = userIdFilter.trim();

    if (
      page === "payroll" &&
      normalizedUserIdFilter &&
      !isPaymentUuid(normalizedUserIdFilter)
    ) {
      setNotice({
        type: "error",
        message: "Filter User ID harus UUID valid.",
      });
      return;
    }

    setAppliedPayrollFilters({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      userId:
        page === "payroll" && normalizedUserIdFilter
          ? normalizedUserIdFilter
          : undefined,
      startDate: toIsoDateTime(startDate),
      endDate: toIsoDateTime(endDate),
    });
  }

  async function handleCreatePayroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isPaymentUuid(session.userId)) {
      setNotice({
        type: "error",
        message: "X-User-Id harus UUID valid untuk membuat payroll.",
      });
      return;
    }

    const kilogram = Number(createPayrollForm.kilogram);
    if (
      !isPaymentUuid(createPayrollForm.userId.trim()) ||
      !Number.isFinite(kilogram) ||
      kilogram <= 0
    ) {
      setNotice({
        type: "error",
        message: "User ID tujuan harus UUID valid dan kilogram harus positif.",
      });
      return;
    }

    await runAction("create-payroll", async () => {
      await pembayaranApi.createPayroll(session.userId as string, {
        userId: createPayrollForm.userId.trim(),
        userRole: createPayrollForm.userRole,
        kilogram,
        description: createPayrollForm.description.trim() || undefined,
      });
      setCreatePayrollOpen(false);
      setCreatePayrollForm({
        ...initialCreatePayrollForm,
        userId: session.userId ?? "",
        userRole:
          session.role && isUserRole(session.role) ? session.role : "BURUH",
      });
      setNotice({ type: "success", message: "Payroll berhasil dibuat." });
      await refetchPaymentData();
    });
  }

  async function handleApprovePayroll(payroll: Payroll) {
    if (!isAdmin) {
      setNotice({
        type: "error",
        message: "Aksi approve membutuhkan X-User-Role ADMIN.",
      });
      return;
    }

    await runAction(`approve-${payroll.id}`, async () => {
      await pembayaranApi.approvePayroll(payroll.id, session.role);
      setSelectedPayroll(null);
      setNotice({ type: "success", message: "Payroll berhasil disetujui." });
      await refetchPaymentData();
    });
  }

  async function handleRejectPayroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!rejectPayroll) {
      return;
    }

    if (!rejectionReason.trim()) {
      setNotice({
        type: "error",
        message: "Alasan penolakan wajib diisi.",
      });
      return;
    }

    await runAction(`reject-${rejectPayroll.id}`, async () => {
      await pembayaranApi.rejectPayroll(rejectPayroll.id, rejectionReason.trim());
      setRejectPayroll(null);
      setRejectionReason("");
      setNotice({ type: "success", message: "Payroll berhasil ditolak." });
      await refetchPaymentData();
    });
  }

  async function handleUpdateWageConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice({
        type: "error",
        message: "Update wage config membutuhkan X-User-Role ADMIN.",
      });
      return;
    }

    const payload = {
      buruhWagePerKg: Number(wageConfigForm.buruhWagePerKg),
      supirTrukWagePerKg: Number(wageConfigForm.supirTrukWagePerKg),
      mandorWagePerKg: Number(wageConfigForm.mandorWagePerKg),
    };

    if (
      !Number.isFinite(payload.buruhWagePerKg) ||
      !Number.isFinite(payload.supirTrukWagePerKg) ||
      !Number.isFinite(payload.mandorWagePerKg)
    ) {
      setNotice({
        type: "error",
        message: "Semua nilai wage config harus berupa angka.",
      });
      return;
    }

    await runAction("update-wage-config", async () => {
      const updated = await pembayaranApi.updateWageConfig(session.role, payload);
      setWageConfig(updated);
      setWageConfigForm({
        buruhWagePerKg: String(updated.buruhWagePerKg),
        supirTrukWagePerKg: String(updated.supirTrukWagePerKg),
        mandorWagePerKg: String(updated.mandorWagePerKg),
      });
      setNotice({ type: "success", message: "Tarif berhasil diperbarui." });
      await loadWageConfig();
    });
  }

  async function handleTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      setNotice({
        type: "error",
        message: "Top up membutuhkan X-User-Role ADMIN.",
      });
      return;
    }

    const amountSawitDollar = Number(topUpAmount);
    const amountRupiah = amountSawitDollar * SAWIT_DOLLAR_RATE;

    if (
      !isPaymentUuid(topUpUserId.trim()) ||
      amountSawitDollar <= 0 ||
      amountRupiah % 10000 !== 0
    ) {
      setNotice({
        type: "error",
        message:
          "User ID tujuan harus UUID valid dan nominal harus kelipatan 10000 rupiah.",
      });
      return;
    }

    await runAction("top-up", async () => {
      const result = await pembayaranApi.topUp(session.role, {
        userId: topUpUserId.trim(),
        amountRupiah,
      });
      setTopUpResult(result);
      setNotice({ type: "success", message: "Top up berhasil dibuat." });

      if (result.paymentUrl) {
        window.open(result.paymentUrl, "_blank", "noopener,noreferrer");
      }

      await refetchPaymentData();
    });
  }

  async function handleSaveDevSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isPaymentUuid(devSessionForm.userId.trim())) {
      setNotice({ type: "error", message: "User ID dev harus UUID valid." });
      return;
    }

    saveDevPaymentSession(devSessionForm.userId.trim(), devSessionForm.role);
    refreshSession();
  }

  function handleClearDevSession() {
    clearDevPaymentSession();
    refreshSession();
  }

  function resetWageForm() {
    if (!wageConfig) {
      setWageConfigForm(initialWageConfigForm);
      return;
    }

    setWageConfigForm({
      buruhWagePerKg: String(wageConfig.buruhWagePerKg),
      supirTrukWagePerKg: String(wageConfig.supirTrukWagePerKg),
      mandorWagePerKg: String(wageConfig.mandorWagePerKg),
    });
  }

  async function runAction(action: string, callback: () => Promise<void>) {
    setPendingAction(action);
    setNotice(null);

    try {
      await callback();
    } catch (error) {
      setNotice({
        type: "error",
        message: getPaymentErrorMessage(error),
      });
    } finally {
      setPendingAction(null);
    }
  }

  const pageContent =
    page === "dashboard" ? (
      <DashboardPage
        acceptedCount={acceptedPayrolls.length}
        onApprovePayroll={handleApprovePayroll}
        onOpenDetail={setSelectedPayroll}
        onOpenReject={(payroll) => {
          setRejectPayroll(payroll);
          setRejectionReason(payroll.rejectionReason ?? "");
        }}
        payrollError={payrollError}
        payrollLoading={payrollLoading}
        pendingAction={pendingAction}
        pendingCount={pendingPayrolls.length}
        payrolls={visiblePayrolls}
        rejectedCount={rejectedPayrolls.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        totalAcceptedAmount={totalAcceptedAmount}
        walletBalance={walletBalance}
        walletError={walletError}
        walletLoading={walletLoading}
      />
    ) : page === "tarif" ? (
      <TarifPage
        form={wageConfigForm}
        loading={wageConfigLoading}
        error={wageConfigError}
        onCancel={resetWageForm}
        onSubmit={handleUpdateWageConfig}
        pendingAction={pendingAction}
        setForm={setWageConfigForm}
        wageConfig={wageConfig}
      />
    ) : page === "payroll" ? (
      <PayrollAdminPage
        applyFilters={applyPayrollFilters}
        endDate={endDate}
        onApprovePayroll={handleApprovePayroll}
        onCreatePayroll={() => setCreatePayrollOpen(true)}
        onOpenDetail={setSelectedPayroll}
        onOpenReject={(payroll) => {
          setRejectPayroll(payroll);
          setRejectionReason(payroll.rejectionReason ?? "");
        }}
        payrollError={payrollError}
        payrollLoading={payrollLoading}
        payrolls={visiblePayrolls}
        pendingAction={pendingAction}
        pendingCount={pendingPayrolls.length}
        rejectedCount={rejectedPayrolls.length}
        roleFilter={roleFilter}
        searchTerm={searchTerm}
        setEndDate={setEndDate}
        setRoleFilter={setRoleFilter}
        setSearchTerm={setSearchTerm}
        setStartDate={setStartDate}
        setStatusFilter={setStatusFilter}
        setUserIdFilter={setUserIdFilter}
        startDate={startDate}
        statusFilter={statusFilter}
        totalAcceptedAmount={totalAcceptedAmount}
        totalAcceptedCount={acceptedPayrolls.length}
        userIdFilter={userIdFilter}
      />
    ) : page === "top-up" ? (
      <TopUpPage
        amount={topUpAmount}
        onAmountChange={setTopUpAmount}
        onSubmit={handleTopUp}
        pendingAction={pendingAction}
        result={topUpResult}
        setUserId={setTopUpUserId}
        userId={topUpUserId}
      />
    ) : (
      <PayrollSayaPage
        applyFilters={applyPayrollFilters}
        onStatusChange={setStatusFilter}
        endDate={endDate}
        onOpenDetail={setSelectedPayroll}
        payrollError={payrollError}
        payrollLoading={payrollLoading}
        payrolls={visiblePayrolls}
        setEndDate={setEndDate}
        setStartDate={setStartDate}
        startDate={startDate}
        statusFilter={statusFilter}
        totalAcceptedAmount={totalAcceptedAmount}
        totalHarvestKg={totalHarvestKg}
        walletBalance={walletBalance}
      />
    );

  return (
    <PaymentShell
      onCreatePayroll={() => setCreatePayrollOpen(true)}
      page={page}
      session={session}
    >
      {notice && <NoticeBar notice={notice} />}
      <SessionPanel
        canUseDevSession={canUseDevSession}
        devSessionForm={devSessionForm}
        onClear={handleClearDevSession}
        onSave={handleSaveDevSession}
        session={session}
        setDevSessionForm={setDevSessionForm}
      />
      {pageContent}

      {createPayrollOpen && (
        <CreatePayrollModal
          form={createPayrollForm}
          onClose={() => setCreatePayrollOpen(false)}
          onSubmit={handleCreatePayroll}
          pending={pendingAction === "create-payroll"}
          setForm={setCreatePayrollForm}
        />
      )}

      {selectedPayroll && (
        <PayrollDetailModal
          onApprove={handleApprovePayroll}
          onClose={() => setSelectedPayroll(null)}
          onReject={(payroll) => {
            setRejectPayroll(payroll);
            setRejectionReason(payroll.rejectionReason ?? "");
          }}
          payroll={selectedPayroll}
          pendingAction={pendingAction}
        />
      )}

      {rejectPayroll && (
        <RejectPayrollModal
          onClose={() => setRejectPayroll(null)}
          onSubmit={handleRejectPayroll}
          payroll={rejectPayroll}
          pending={pendingAction === `reject-${rejectPayroll.id}`}
          reason={rejectionReason}
          setReason={setRejectionReason}
        />
      )}
    </PaymentShell>
  );
}

function PaymentShell({
  children,
  onCreatePayroll,
  page,
  session,
}: {
  children: React.ReactNode;
  onCreatePayroll: () => void;
  page: PaymentPageKind;
  session: PaymentSession;
}) {
  const isPayrollPage = page === "payroll";
  const profileName = session.userId
    ? formatUserLabel(session.userId)
    : "User Aktif";
  const profileRole = session.role
    ? session.role === "ADMIN"
      ? "Super Admin"
      : roleLabel(session.role)
    : "Role belum tersedia";

  return (
    <div className="payment-app">
      <MobileHeader page={page} />

      <aside className="payment-sidebar">
        <Link className="brand" href="/">
          <span className="brand-icon">
            <Tractor size={24} />
          </span>
          <span>
            <strong>MySawit</strong>
            <small>Admin Panel</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Navigasi pembayaran">
          <SidebarLink href="/" icon={<LayoutDashboard />} label="Dashboard" />
          <SidebarLink href="#" icon={<Users />} label="Manajemen Pengguna" />
          <SidebarLink href="#" icon={<Tractor />} label="Manajemen Kebun" />
          <SidebarLink
            href="/payroll"
            icon={<Banknote />}
            label="Manajemen Pembayaran"
            active={["dashboard", "payroll", "top-up", "payroll-saya"].includes(
              page,
            )}
          />
          <SidebarLink
            href="/tarif"
            icon={<Settings />}
            label="Pengaturan Tarif"
            active={page === "tarif"}
          />
        </nav>

        <div className="sidebar-footer">
          <a href="#" className="sidebar-footer-link">
            <HelpCircle size={22} />
            Bantuan
          </a>
          <a href="#" className="sidebar-footer-link logout">
            <LogOut size={22} />
            Keluar
          </a>
        </div>
      </aside>

      <div className="payment-main">
        <header className="topbar">
          <label className="top-search">
            <Search size={22} />
            <input
              placeholder={
                page === "tarif"
                  ? "Cari pengaturan..."
                  : page === "payroll" || page === "payroll-saya"
                    ? "Cari data payroll..."
                    : "Cari transaksi atau laporan..."
              }
            />
          </label>

          <div className="topbar-actions">
            <button aria-label="Notifikasi" className="icon-button" type="button">
              <Bell size={23} />
              <span className="notification-dot" />
            </button>
            <button aria-label="Wallet" className="icon-button" type="button">
              <CreditCard size={23} />
            </button>
            {isPayrollPage ? (
              <button className="primary-pill" type="button" onClick={onCreatePayroll}>
                <Plus size={18} />
                Buat Pembayaran
              </button>
            ) : (
              <Link className="primary-pill" href="/top-up">
                {page === "payroll-saya" && <Plus size={18} />}
                Buat Pembayaran
              </Link>
            )}
            <div className="profile-card">
              <span
                aria-hidden="true"
                className="avatar"
                style={{
                  backgroundImage: `url(${avatarUrl(session.userId ?? profileName)})`,
                }}
              />
              <span>
                <strong>{profileName}</strong>
                <small>{profileRole}</small>
              </span>
            </div>
          </div>
        </header>

        <main className={`content-shell page-${page}`}>{children}</main>
      </div>

      <MobileBottomNav page={page} />
    </div>
  );
}

function MobileHeader({ page }: { page: PaymentPageKind }) {
  const title = mobilePageTitle(page);
  const backHref = page === "dashboard" ? "/" : page === "top-up" ? "/" : "/";

  return (
    <header className="mobile-appbar">
      <Link
        aria-label={page === "top-up" ? "Tutup" : "Kembali"}
        className="mobile-appbar-icon"
        href={backHref}
      >
        {page === "top-up" ? <X size={26} /> : <ArrowLeft size={28} />}
      </Link>
      <h1>{title}</h1>
      <div className="mobile-appbar-action">
        {page === "tarif" ? (
          <button className="mobile-save-button" form="wage-config-form" type="submit">
            Simpan
          </button>
        ) : page === "payroll" ? (
          <button aria-label="Filter payroll" className="mobile-appbar-icon" type="button">
            <SlidersHorizontal size={25} />
          </button>
        ) : page === "dashboard" || page === "payroll-saya" ? (
          <button aria-label="Notifikasi" className="mobile-appbar-icon" type="button">
            <Bell size={25} />
            <span className="notification-dot" />
          </button>
        ) : null}
      </div>
    </header>
  );
}

function MobileBottomNav({ page }: { page: PaymentPageKind }) {
  const activePayroll = ["payroll", "payroll-saya", "top-up"].includes(page);

  return (
    <nav className={`mobile-bottom-nav page-${page}`} aria-label="Navigasi utama mobile">
      <Link className={page === "dashboard" ? "active" : ""} href="/">
        <Home size={25} />
        <span>Beranda</span>
      </Link>
      <a href="#">
        <Users size={25} />
        <span>Pengguna</span>
      </a>
      <a href="#">
        <Sprout size={25} />
        <span>Kebun</span>
      </a>
      <Link className={activePayroll ? "active" : ""} href="/payroll">
        <Banknote size={28} />
        <span>Payroll</span>
      </Link>
      <a href="#">
        <User size={25} />
        <span>Profil</span>
      </a>
    </nav>
  );
}

function mobilePageTitle(page: PaymentPageKind) {
  switch (page) {
    case "dashboard":
      return "Wallet Saya";
    case "tarif":
      return "Pengaturan Tarif Upah";
    case "payroll":
      return "Manajemen Payroll";
    case "top-up":
      return "Top Up Saldo";
    case "payroll-saya":
      return "Payroll Saya";
    default:
      return "MySawit";
  }
}

function SidebarLink({
  active,
  href,
  icon,
  label,
}: {
  active?: boolean;
  href: string;
  icon: React.ReactElement;
  label: string;
}) {
  return (
    <Link className={`sidebar-link ${active ? "active" : ""}`} href={href}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function DashboardPage({
  acceptedCount,
  onApprovePayroll,
  onOpenDetail,
  onOpenReject,
  payrollError,
  payrollLoading,
  payrolls,
  pendingAction,
  pendingCount,
  rejectedCount,
  searchTerm,
  setSearchTerm,
  totalAcceptedAmount,
  walletBalance,
  walletError,
  walletLoading,
}: {
  acceptedCount: number;
  onApprovePayroll: (payroll: Payroll) => Promise<void>;
  onOpenDetail: (payroll: Payroll) => void;
  onOpenReject: (payroll: Payroll) => void;
  payrollError: string;
  payrollLoading: boolean;
  payrolls: Payroll[];
  pendingAction: string | null;
  pendingCount: number;
  rejectedCount: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  totalAcceptedAmount: number;
  walletBalance: number;
  walletError: string;
  walletLoading: boolean;
}) {
  return (
    <>
      <section className="mobile-wallet-view">
        <div className="mobile-balance-card">
          <span>Total Saldo Aktif</span>
          <strong>
            ${walletLoading ? "..." : formatSawitDollar(walletBalance)}
          </strong>
          <small>Setara {formatRupiah(walletBalance * SAWIT_DOLLAR_RATE)}</small>
          <Link className="mobile-topup-pill" href="/top-up">
            <Plus size={22} />
            Top Up Saldo
          </Link>
          <Sprout aria-hidden="true" className="mobile-balance-watermark" />
          {walletError && <p className="inline-error">{walletError}</p>}
        </div>

        <div className="mobile-wallet-metrics">
          <article>
            <TrendingUp size={20} />
            <span>Pengeluaran</span>
            <strong>{formatCompactRupiah(totalAcceptedAmount * SAWIT_DOLLAR_RATE)}</strong>
            <small>Bulan ini</small>
          </article>
          <article>
            <TrendingUp size={20} />
            <span>Top-Up</span>
            <strong>{formatCompactRupiah(walletBalance * SAWIT_DOLLAR_RATE)}</strong>
            <small>Bulan ini</small>
          </article>
        </div>

        <div className="mobile-section-heading">
          <h2>Riwayat Transaksi</h2>
          <Link href="/payroll">Lihat Semua</Link>
        </div>

        <div className="mobile-chip-row">
          <button className="active" type="button">Semua</button>
          <button type="button">Top-Up</button>
          <button type="button">Payroll Buruh</button>
          <button type="button">Operasional</button>
        </div>

        <ResponsivePayrollTable
          emptyText="Belum ada transaksi."
          loading={payrollLoading}
          error={payrollError}
          onApprovePayroll={onApprovePayroll}
          onOpenDetail={onOpenDetail}
          onOpenReject={onOpenReject}
          payrolls={payrolls.slice(0, 4)}
          pendingAction={pendingAction}
          showActionsAsMenu
        />
      </section>

      <div className="desktop-payment-view">
        <section className="dashboard-hero-grid">
          <div className="balance-card">
            <div className="balance-card-top">
              <span className="balance-kicker">
                <Landmark size={28} />
                Saldo Dompet Admin
              </span>
              <span className="status-chip green">Aktif</span>
            </div>
            <div className="balance-value">
              <span>$</span>
              {walletLoading ? "..." : formatSawitDollar(walletBalance)}
            </div>
            <p>
              Setara <strong>{formatRupiah(walletBalance * SAWIT_DOLLAR_RATE)}</strong>
              <Info size={15} />
            </p>
            {walletError && <p className="inline-error">{walletError}</p>}
            <div className="hero-actions">
              <Link className="white-action" href="/top-up">
                <PlusCircle size={24} />
                Top Up Saldo
              </Link>
              <Link className="outline-action" href="/payroll">
                <Send size={24} />
                Kirim Dana
              </Link>
            </div>
          </div>

          <div className="side-stat-stack">
            <MetricCard
              description="65% dari limit anggaran operasional"
              icon={<TrendingUp />}
              progress={65}
              title="Total Pengeluaran Bulan Ini"
              value={formatRupiah(totalAcceptedAmount * SAWIT_DOLLAR_RATE)}
              variant="peach"
            />
            <MetricCard
              description="Selesaikan sekarang"
              icon={<UserPlus />}
              title="Pembayaran Payroll Tertunda"
              value={`${pendingCount} Laporan`}
              variant="mint"
            />
          </div>
        </section>

        <section className="panel transaction-panel">
          <div className="panel-toolbar">
            <h2>Riwayat Transaksi</h2>
            <div className="toolbar-controls">
              <div className="segmented">
                <button className="active" type="button">
                  Semua
                </button>
                <button type="button">Top-Up</button>
                <button type="button">Payroll</button>
              </div>
              <label className="date-pill">
                <Search size={16} />
                <input
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>
              <button className="square-button" type="button">
                <Filter size={21} />
              </button>
            </div>
          </div>

          <ResponsivePayrollTable
            emptyText="Tidak ada transaksi pembayaran."
            loading={payrollLoading}
            error={payrollError}
            onApprovePayroll={onApprovePayroll}
            onOpenDetail={onOpenDetail}
            onOpenReject={onOpenReject}
            payrolls={payrolls.slice(0, 4)}
            pendingAction={pendingAction}
            showActionsAsMenu
          />

          <div className="table-footer">
            <span>
              Menampilkan 1-{Math.min(4, payrolls.length)} dari {payrolls.length} transaksi
            </span>
            <Pagination />
          </div>

          <div className="dashboard-counts">
            <span>{acceptedCount} selesai</span>
            <span>{pendingCount} menunggu</span>
            <span>{rejectedCount} ditolak</span>
          </div>
        </section>
      </div>
    </>
  );
}

function TarifPage({
  error,
  form,
  loading,
  onCancel,
  onSubmit,
  pendingAction,
  setForm,
  wageConfig,
}: {
  error: string;
  form: WageConfigForm;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pendingAction: string | null;
  setForm: React.Dispatch<React.SetStateAction<WageConfigForm>>;
  wageConfig: WageConfig | null;
}) {
  const simulationWeight = 50;
  const buruhWage = Number(form.buruhWagePerKg) || 0;
  const supirWage = Number(form.supirTrukWagePerKg) || 0;
  const mandorWage = Number(form.mandorWagePerKg) || 0;

  return (
    <section>
      <PageTitle
        description="Kelola standar upah operasional untuk menjaga efisiensi produksi kebun."
        title="Pengaturan Tarif Upah"
      />

      <div className="formula-banner">
        <span className="round-icon dark">
          <Info size={22} />
        </span>
        <div>
          <p>Formula Perhitungan</p>
          <strong>Upah dihitung berdasarkan total berat panen (Kg) dikalikan dengan tarif peran masing-masing.</strong>
          <span>
            Perubahan akan berlaku untuk periode payroll berikutnya.
          </span>
        </div>
      </div>

      {loading && <p className="muted-state">Memuat tarif...</p>}
      {error && <p className="error-state">{error}</p>}

      <form className="wage-grid" id="wage-config-form" onSubmit={onSubmit}>
        <WageCard
          icon={<Briefcase />}
          label="Buruh"
          name="buruhWagePerKg"
          setForm={setForm}
          value={form.buruhWagePerKg}
        />
        <WageCard
          icon={<Truck />}
          label="Supir"
          name="supirTrukWagePerKg"
          setForm={setForm}
          value={form.supirTrukWagePerKg}
        />
        <WageCard
          icon={<Sprout />}
          label="Mandor"
          name="mandorWagePerKg"
          setForm={setForm}
          value={form.mandorWagePerKg}
        />

        <div className="wage-simulation-card">
          <h2>Simulasi Upah</h2>
          <p>Perkiraan biaya berdasarkan input tarif saat ini</p>
          <dl>
            <div>
              <dt>Contoh Berat Panen</dt>
              <dd>{simulationWeight} Kg</dd>
            </div>
            <div>
              <dt>Estimasi Upah Buruh</dt>
              <dd>{formatRupiah(buruhWage * simulationWeight)}</dd>
            </div>
            <div>
              <dt>Total Operasional (B+S+M)</dt>
              <dd>{formatRupiah((buruhWage + supirWage + mandorWage) * simulationWeight)}</dd>
            </div>
          </dl>
        </div>

        <div className="form-actions wide">
          <button className="ghost-button" type="button" onClick={onCancel}>
            Batal
          </button>
          <button className="solid-button" disabled={pendingAction === "update-wage-config"} type="submit">
            {pendingAction === "update-wage-config" ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>

      {wageConfig && (
        <p className="muted-state">Terakhir diperbarui {formatDate(wageConfig.updatedAt)}</p>
      )}

      <PlantationBanner>
        Visualisasi data upah terintegrasi secara langsung dengan laporan harian TBS
        (Tandan Buah Segar) di seluruh lokasi perkebunan.
      </PlantationBanner>
    </section>
  );
}

function PayrollAdminPage({
  applyFilters,
  endDate,
  onApprovePayroll,
  onCreatePayroll,
  onOpenDetail,
  onOpenReject,
  payrollError,
  payrollLoading,
  payrolls,
  pendingAction,
  pendingCount,
  rejectedCount,
  roleFilter,
  searchTerm,
  setEndDate,
  setRoleFilter,
  setSearchTerm,
  setStartDate,
  setStatusFilter,
  setUserIdFilter,
  startDate,
  statusFilter,
  totalAcceptedAmount,
  totalAcceptedCount,
  userIdFilter,
}: {
  applyFilters: (event?: FormEvent<HTMLFormElement>) => void;
  endDate: string;
  onApprovePayroll: (payroll: Payroll) => Promise<void>;
  onCreatePayroll: () => void;
  onOpenDetail: (payroll: Payroll) => void;
  onOpenReject: (payroll: Payroll) => void;
  payrollError: string;
  payrollLoading: boolean;
  payrolls: Payroll[];
  pendingAction: string | null;
  pendingCount: number;
  rejectedCount: number;
  roleFilter: UserRole | "";
  searchTerm: string;
  setEndDate: (value: string) => void;
  setRoleFilter: (value: UserRole | "") => void;
  setSearchTerm: (value: string) => void;
  setStartDate: (value: string) => void;
  setStatusFilter: (value: "ALL" | PayrollStatus) => void;
  setUserIdFilter: (value: string) => void;
  startDate: string;
  statusFilter: "ALL" | PayrollStatus;
  totalAcceptedAmount: number;
  totalAcceptedCount: number;
  userIdFilter: string;
}) {
  return (
    <section>
      <PageTitle
        description="Kelola dan verifikasi pembayaran upah panen untuk seluruh unit operasional kebun."
        title="Manajemen Payroll"
      />

      <div className="admin-metric-grid">
        <MetricBox
          accent="+12 Hari Ini"
          icon={<Archive />}
          label="Total Pending"
          value={`${pendingCount} Transaksi`}
          variant="peach"
        />
        <MetricBox
          accent="94% Target"
          icon={<CheckCircle2 />}
          label="Disetujui Bulan Ini"
          value={`${totalAcceptedCount} Payroll`}
          variant="mint"
        />
        <MetricBox
          accent="-2% MoM"
          icon={<XCircle />}
          label="Ditolak Bulan Ini"
          value={`${rejectedCount} Laporan`}
          variant="red"
        />
        <MetricBox
          accent="Anggaran Aman"
          icon={<Banknote />}
          label="Pengeluaran Bulan Ini"
          value={`$ ${formatSawitDollar(totalAcceptedAmount)}`}
          variant="soft"
        />
      </div>

      <section className="panel payroll-panel">
        <form className="payroll-filters" onSubmit={applyFilters}>
          <label className="filter-input">
            <Search size={17} />
            <input
              placeholder="Cari nama penerima..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <label className="filter-input user-id-filter">
            <Users size={17} />
            <input
              placeholder="Filter User ID profil..."
              value={userIdFilter}
              onChange={(event) => setUserIdFilter(event.target.value)}
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as UserRole | "")}
          >
            <option value="">Semua Role</option>
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "ALL" | PayrollStatus)
            }
          >
            {statusTabs.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <label className="date-mini">
            <CalendarDays size={16} />
            <input
              aria-label="Tanggal mulai"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <span>-</span>
            <input
              aria-label="Tanggal akhir"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <button className="outline-download" type="submit">
            Terapkan
          </button>
          <button className="outline-download" type="button">
            <Download size={17} />
            Ekspor Laporan
          </button>
        </form>

        <ResponsivePayrollTable
          emptyText="Tidak ada data payroll."
          error={payrollError}
          loading={payrollLoading}
          onApprovePayroll={onApprovePayroll}
          onOpenDetail={onOpenDetail}
          onOpenReject={onOpenReject}
          payrolls={payrolls}
          pendingAction={pendingAction}
        />

        <div className="table-footer">
          <span>Menampilkan 1-{Math.min(4, payrolls.length)} dari {payrolls.length} transaksi</span>
          <Pagination active={1} />
        </div>
      </section>

      <button
        aria-label="Buat payroll baru"
        className="mobile-fab"
        type="button"
        onClick={onCreatePayroll}
      >
        <Plus size={36} />
      </button>
    </section>
  );
}

function TopUpPage({
  amount,
  onAmountChange,
  onSubmit,
  pendingAction,
  result,
  setUserId,
  userId,
}: {
  amount: string;
  onAmountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pendingAction: string | null;
  result: TopUpResponse | null;
  setUserId: (value: string) => void;
  userId: string;
}) {
  const amountSawitDollar = Number(amount) || 0;
  const amountRupiah = amountSawitDollar * SAWIT_DOLLAR_RATE;
  const appendAmountInput = (value: string) => {
    if (value === "." && amount.includes(".")) {
      return;
    }

    onAmountChange(amount === "0" ? value : `${amount}${value}`);
  };
  const deleteAmountInput = () => {
    onAmountChange(amount.length <= 1 ? "0" : amount.slice(0, -1));
  };

  return (
    <section className="topup-page">
      <Link className="back-link" href="/">
        <ArrowLeft size={24} />
        Kembali ke Ringkasan
      </Link>

      <form className="mobile-topup-view" onSubmit={onSubmit}>
        <label className="mobile-user-target">
          User ID tujuan
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="UUID user tujuan"
          />
        </label>

        <div className="mobile-topup-amount">
          <strong>
            <span>$</span>
            {formatSawitDollar(amountSawitDollar)}
          </strong>
          <small>≈ {formatRupiah(amountRupiah)}</small>
        </div>

        <div className="amount-presets mobile-presets">
          {[50, 100, 500, 1000].map((preset) => (
            <button
              className={Number(amount) === preset ? "selected" : ""}
              key={preset}
              type="button"
              onClick={() => onAmountChange(String(preset))}
            >
              $ {preset}
            </button>
          ))}
        </div>

        <div className="exchange-box mobile-exchange">
          <Info size={24} />
          <span>
            <strong>Nilai Tukar Saat Ini</strong>
            1 SawitDollar = Rp 10.000
          </span>
        </div>

        <div className="mobile-keypad" aria-label="Keypad nominal top up">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
            <button key={key} type="button" onClick={() => appendAmountInput(key)}>
              {key}
            </button>
          ))}
          <button aria-label="Hapus angka" type="button" onClick={deleteAmountInput}>
            <XCircle size={24} />
          </button>
        </div>

        <button
          className="payment-submit mobile-payment-submit"
          disabled={pendingAction === "top-up"}
          type="submit"
        >
          {pendingAction === "top-up" ? "Memproses..." : "Lanjut ke Pembayaran"}
          <span />
        </button>

        {result?.paymentUrl && (
          <a className="payment-url" href={result.paymentUrl} rel="noreferrer" target="_blank">
            Buka link pembayaran
          </a>
        )}
      </form>

      <div className="topup-grid">
        <div>
          <form className="panel topup-card" id="topup-form-desktop" onSubmit={onSubmit}>
            <h1>Isi Saldo SawitDollar</h1>
            <p>Tambahkan saldo untuk mempermudah transaksi operasional kebun Anda.</p>

            <label className="stack-label">
              User ID tujuan
              <input
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="UUID user tujuan"
              />
            </label>

            <label className="stack-label">
              Jumlah Top-Up
              <span className="money-input">
                <span>$</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => onAmountChange(event.target.value)}
                />
              </span>
            </label>

            <div className="amount-presets">
              {[50, 100, 500, 1000].map((preset) => (
                <button
                  className={Number(amount) === preset ? "selected" : ""}
                  key={preset}
                  type="button"
                  onClick={() => onAmountChange(String(preset))}
                >
                  ${preset}
                </button>
              ))}
            </div>

            <div className="exchange-box">
              <Info size={24} />
              <span>
                <strong>Informasi Kurs</strong>
                1 SawitDollar = Rp 10.000
              </span>
            </div>
          </form>

          <PlantationBanner compact>
            Transparansi Biaya
            <br />
            Setiap transaksi dicatat secara real-time dengan kurs tetap untuk
            kestabilan finansial kebun Anda.
          </PlantationBanner>
        </div>

        <aside className="panel summary-card">
          <h2>Ringkasan Pembayaran</h2>
          <dl>
            <div>
              <dt>Nominal Top-Up</dt>
              <dd>${formatSawitDollar(amountSawitDollar)}</dd>
            </div>
            <div>
              <dt>Biaya Layanan</dt>
              <dd className="free">FREE</dd>
            </div>
            <div>
              <dt>Kurs Konversi</dt>
              <dd>@ Rp 10.000</dd>
            </div>
          </dl>
          <div className="payment-total">
            <span>Total Pembayaran</span>
            <strong>{formatRupiah(amountRupiah)}</strong>
          </div>
          <button
            className="payment-submit"
            disabled={pendingAction === "top-up"}
            form="topup-form-desktop"
            type="submit"
          >
            {pendingAction === "top-up" ? "Memproses..." : "Lanjut ke Pembayaran"}
            <span />
          </button>
          <p className="secure-copy">Pembayaran aman melalui gateway Xendit</p>
          <div className="trust-icons">
            <ShieldCheck />
            <Landmark />
            <ShieldCheck />
          </div>
          {result?.paymentUrl && (
            <a className="payment-url" href={result.paymentUrl} rel="noreferrer" target="_blank">
              Buka link pembayaran
            </a>
          )}
        </aside>
      </div>
    </section>
  );
}

function PayrollSayaPage({
  applyFilters,
  endDate,
  onStatusChange,
  onOpenDetail,
  payrollError,
  payrollLoading,
  payrolls,
  setEndDate,
  setStartDate,
  startDate,
  statusFilter,
  totalAcceptedAmount,
  totalHarvestKg,
  walletBalance,
}: {
  applyFilters: (event?: FormEvent<HTMLFormElement>) => void;
  endDate: string;
  onStatusChange: (value: "ALL" | PayrollStatus) => void;
  onOpenDetail: (payroll: Payroll) => void;
  payrollError: string;
  payrollLoading: boolean;
  payrolls: Payroll[];
  setEndDate: (value: string) => void;
  setStartDate: (value: string) => void;
  startDate: string;
  statusFilter: "ALL" | PayrollStatus;
  totalAcceptedAmount: number;
  totalHarvestKg: number;
  walletBalance: number;
}) {
  const targetKg = 1250;
  const targetPercentage = Math.min(100, Math.round((totalHarvestKg / targetKg) * 100));

  return (
    <section>
      <div className="breadcrumb">Dashboard <span>›</span> Payroll Saya</div>
      <h1 className="page-heading">Payroll Saya</h1>

      <div className="my-payroll-summary">
        <div className="income-card">
          <span>SALDO WALLET</span>
          <div className="income-main">
            <strong>${formatSawitDollar(walletBalance)}</strong>
            <em>SawitDollar</em>
            <i />
            <strong>{formatRupiah(walletBalance * SAWIT_DOLLAR_RATE)}</strong>
          </div>
          <div className="income-sub">
            <span>
              Bulan Ini <strong>${formatSawitDollar(totalAcceptedAmount)}</strong>
            </span>
            <span>
              Berat Panen <strong>{formatKg(totalHarvestKg)}</strong>
          </span>
          <button type="button">Tarik Saldo</button>
        </div>
        </div>
        <div className="bank-card">
          <span className="bank-icon">
            <Landmark size={42} />
          </span>
          <h2>Status Bank</h2>
          <p>Bank Mandiri (**** 8829)</p>
          <span className="status-chip green">Terverifikasi</span>
        </div>
      </div>

      <form className="my-filter-card" onSubmit={applyFilters}>
        <label className="date-mini my-date-filter">
          <CalendarDays size={16} />
          <input
            aria-label="Tanggal mulai payroll saya"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <span>-</span>
          <input
            aria-label="Tanggal akhir payroll saya"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
        <div className="status-tabs">
          {statusTabs.map((status) => (
            <button
              className={statusFilter === status.value ? "active" : ""}
              key={status.value}
              type="button"
              onClick={() => onStatusChange(status.value)}
            >
              {status.label.replace("Semua Status", "Semua Status")}
            </button>
          ))}
        </div>
        <button className="outline-download" type="submit">
          Terapkan Filter
        </button>
        <button className="outline-download" type="button">
          <Download size={17} />
          Unduh Laporan
        </button>
      </form>

      {payrollLoading && <p className="muted-state">Memuat payroll...</p>}
      {payrollError && <p className="error-state">{payrollError}</p>}

      <div className="payroll-card-list">
        {payrolls.length === 0 && !payrollLoading && (
          <div className="empty-card">Belum ada payroll untuk ditampilkan.</div>
        )}
        {payrolls.map((payroll) => (
          <MyPayrollItem key={payroll.id} payroll={payroll} onOpenDetail={onOpenDetail} />
        ))}
      </div>

      <div className="target-card">
        <span>Target Panen</span>
        <strong>{targetPercentage}%</strong>
        <small>{formatKg(totalHarvestKg)}/{formatKg(targetKg)}</small>
      </div>

      <button className="load-more" type="button">
        <RefreshCw size={16} />
        Muat Data Sebelumnya
      </button>
    </section>
  );
}

function MetricCard({
  description,
  icon,
  progress,
  title,
  value,
  variant,
}: {
  description: string;
  icon: React.ReactElement;
  progress?: number;
  title: string;
  value: string;
  variant: string;
}) {
  return (
    <article className="metric-card">
      <span className={`metric-icon ${variant}`}>{icon}</span>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
      </div>
      {progress !== undefined && (
        <div className="metric-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <small>{description}</small>
    </article>
  );
}

function MetricBox({
  accent,
  icon,
  label,
  value,
  variant,
}: {
  accent: string;
  icon: React.ReactElement;
  label: string;
  value: string;
  variant: string;
}) {
  return (
    <article className="metric-box">
      <div className="metric-box-top">
        <span className={`metric-icon ${variant}`}>{icon}</span>
        <strong>{accent}</strong>
      </div>
      <p>{label}</p>
      <h3>{value}</h3>
    </article>
  );
}

function WageCard({
  icon,
  label,
  name,
  setForm,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  name: keyof WageConfigForm;
  setForm: React.Dispatch<React.SetStateAction<WageConfigForm>>;
  value: string;
}) {
  const numericValue = Number(value) || 0;

  return (
    <article className="wage-card">
      <div className="wage-card-top">
        <span className="wage-title">
          <span className="metric-icon mint">{icon}</span>
          <strong>{label}</strong>
        </span>
        <span className="role-badge">Rp {formatNumber(numericValue)}/Kg</span>
      </div>
      <label>
        Tarif Per Kilogram
        <span className="rupiah-input">
          Rp
          <input
            inputMode="numeric"
            value={value}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                [name]: event.target.value,
              }))
            }
          />
        </span>
      </label>
    </article>
  );
}

function ResponsivePayrollTable({
  emptyText,
  error,
  loading,
  onApprovePayroll,
  onOpenDetail,
  onOpenReject,
  payrolls,
  pendingAction,
  showActionsAsMenu,
}: {
  emptyText: string;
  error: string;
  loading: boolean;
  onApprovePayroll: (payroll: Payroll) => Promise<void>;
  onOpenDetail: (payroll: Payroll) => void;
  onOpenReject: (payroll: Payroll) => void;
  payrolls: Payroll[];
  pendingAction: string | null;
  showActionsAsMenu?: boolean;
}) {
  if (loading) {
    return <p className="muted-state">Memuat data payroll...</p>;
  }

  if (error) {
    return <p className="error-state">{error}</p>;
  }

  return (
    <>
      <div className={`mobile-payroll-cards ${showActionsAsMenu ? "transaction" : "admin"}`}>
        {payrolls.length === 0 && <div className="empty-card">{emptyText}</div>}
        {payrolls.map((payroll) => (
          <button
            className={`mobile-payroll-card ${statusClass(payroll.status)}`}
            key={payroll.id}
            type="button"
            onClick={() => onOpenDetail(payroll)}
          >
            <span
              aria-hidden="true"
              className="mobile-card-avatar"
              style={
                showActionsAsMenu
                  ? undefined
                  : { backgroundImage: `url(${avatarUrl(payroll.userId)})` }
              }
            >
              {showActionsAsMenu &&
                (payroll.amount >= 0 ? <Banknote size={25} /> : <CreditCard size={25} />)}
            </span>
            <span className="mobile-card-copy">
              <strong>
                {showActionsAsMenu
                  ? payroll.description || `Payroll ${roleLabel(payroll.userRole)}`
                  : formatUserLabel(payroll.userId)}
              </strong>
              <small>
                {formatDate(payroll.createdAt)}
                {showActionsAsMenu ? ` • ${formatTime(payroll.createdAt).replace(" WIB", "")}` : ""}
              </small>
              {!showActionsAsMenu && (
                <em>
                  <Sprout size={17} />
                  {formatKg(payroll.kilogram)}
                </em>
              )}
            </span>
            <span className="mobile-card-side">
              <strong>{payroll.status === "ACCEPTED" ? "+" : "-"}$ {formatSawitDollar(payroll.amount)}</strong>
              <small className={`status-pill ${statusClass(payroll.status)}`}>
                {statusLabel(payroll.status)}
              </small>
            </span>
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="payment-table">
          <thead>
            <tr>
              <th>
                <input aria-label="Pilih semua" type="checkbox" />
              </th>
              <th>Nama Penerima</th>
              <th>Tanggal</th>
              <th>Kilogram</th>
              <th>Upah (SawitDollar)</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.length === 0 && (
              <tr>
                <td colSpan={7}>{emptyText}</td>
              </tr>
            )}
            {payrolls.map((payroll) => (
              <tr key={payroll.id}>
                <td>
                  <input aria-label={`Pilih payroll ${payroll.id}`} type="checkbox" />
                </td>
                <td>
                  <div className="person-cell">
                    <span
                      aria-hidden="true"
                      className="avatar"
                      style={{ backgroundImage: `url(${avatarUrl(payroll.userId)})` }}
                    />
                    <span>
                      <strong>{formatUserLabel(payroll.userId)}</strong>
                      <small>{roleLabel(payroll.userRole)}</small>
                    </span>
                  </div>
                </td>
                <td>{formatDate(payroll.createdAt)}</td>
                <td>{formatKg(payroll.kilogram)}</td>
                <td>
                  <strong>$ {formatSawitDollar(payroll.amount)}</strong>
                  <small>{formatRupiah(payroll.amount * SAWIT_DOLLAR_RATE)}</small>
                </td>
                <td>
                  <span className={`status-pill ${statusClass(payroll.status)}`}>
                    {statusLabel(payroll.status)}
                  </span>
                </td>
                <td>
                  {showActionsAsMenu ? (
                    <button
                      aria-label="Lihat detail"
                      className="icon-only"
                      type="button"
                      onClick={() => onOpenDetail(payroll)}
                    >
                      <MoreVertical />
                    </button>
                  ) : payroll.status === "PENDING" ? (
                    <div className="row-actions">
                      <button
                        aria-label="Setujui payroll"
                        className="approve"
                        disabled={pendingAction === `approve-${payroll.id}`}
                        type="button"
                        onClick={() => void onApprovePayroll(payroll)}
                      >
                        <Check />
                      </button>
                      <button
                        aria-label="Tolak payroll"
                        className="reject"
                        type="button"
                        onClick={() => onOpenReject(payroll)}
                      >
                        <X />
                      </button>
                    </div>
                  ) : (
                    <button
                      aria-label="Lihat detail"
                      className="icon-only"
                      type="button"
                      onClick={() => onOpenDetail(payroll)}
                    >
                      <Eye />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MyPayrollItem({
  onOpenDetail,
  payroll,
}: {
  onOpenDetail?: (payroll: Payroll) => void;
  payroll: Payroll;
}) {
  const rejected = payroll.status === "REJECTED";
  const day = new Date(payroll.createdAt);

  return (
    <article
      className={`my-payroll-item ${rejected ? "rejected" : ""} ${onOpenDetail ? "clickable" : ""}`}
      role={onOpenDetail ? "button" : undefined}
      tabIndex={onOpenDetail ? 0 : undefined}
      onClick={() => onOpenDetail?.(payroll)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetail?.(payroll);
        }
      }}
    >
      <div className="payroll-day">
        <span>{day.toLocaleDateString("id-ID", { month: "short" })}</span>
        <strong>{Number.isNaN(day.getTime()) ? "--" : day.getDate()}</strong>
      </div>
      <div className="payroll-copy">
        <span className={`status-pill ${statusClass(payroll.status)}`}>
          {statusLabel(payroll.status)}
        </span>
        <small>{formatTime(payroll.createdAt)}</small>
        <h3>{payroll.description || `Payroll ${roleLabel(payroll.userRole)}`}</h3>
        <p>Lokasi: Kebun Sawit Sejahtera III</p>
      </div>
      <div className="payroll-weight">
        <Archive size={24} />
        <span>{formatKg(payroll.kilogram)} sawit dipanen</span>
      </div>
      <div className="payroll-amount">
        <strong>$ {formatSawitDollar(payroll.amount)}</strong>
        <span>{formatRupiah(payroll.amount * SAWIT_DOLLAR_RATE)}</span>
      </div>
      <ChevronRight className="item-chevron" />
      {rejected && payroll.rejectionReason && (
        <p className="reject-reason">Alasan: {payroll.rejectionReason}</p>
      )}
    </article>
  );
}

function CreatePayrollModal({
  form,
  onClose,
  onSubmit,
  pending,
  setForm,
}: {
  form: CreatePayrollForm;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  setForm: React.Dispatch<React.SetStateAction<CreatePayrollForm>>;
}) {
  return (
    <Modal title="Buat Pembayaran Payroll" onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
        <label>
          User ID penerima
          <input
            placeholder="UUID penerima"
            value={form.userId}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, userId: event.target.value }))
            }
          />
        </label>
        <label>
          Role penerima
          <select
            value={form.userRole}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                userRole: event.target.value as UserRole,
              }))
            }
          >
            {USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kilogram
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.kilogram}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                kilogram: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Deskripsi
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                description: event.target.value,
              }))
            }
          />
        </label>
        <button className="solid-button full" disabled={pending} type="submit">
          {pending ? "Menyimpan..." : "Simpan Payroll"}
        </button>
      </form>
    </Modal>
  );
}

function PayrollDetailModal({
  onApprove,
  onClose,
  onReject,
  payroll,
  pendingAction,
}: {
  onApprove: (payroll: Payroll) => Promise<void>;
  onClose: () => void;
  onReject: (payroll: Payroll) => void;
  payroll: Payroll;
  pendingAction: string | null;
}) {
  const grossAmount = payroll.amount / 0.9;
  const qualityAdjustment = grossAmount - payroll.amount;

  return (
    <Modal title="Detail Payroll" onClose={onClose}>
      <div className="mobile-detail-profile">
        <span
          aria-hidden="true"
          className="avatar"
          style={{ backgroundImage: `url(${avatarUrl(payroll.userId)})` }}
        />
        <div>
          <h3>{formatUserLabel(payroll.userId)}</h3>
          <p>
            <span className="status-chip green">{roleLabel(payroll.userRole)}</span>
            PR-{payroll.id.slice(0, 8)}
          </p>
        </div>
      </div>

      <div className="mobile-detail-status">
        <span>Status Pengajuan</span>
        <strong className={`status-pill ${statusClass(payroll.status)}`}>
          {statusLabel(payroll.status)}
        </strong>
      </div>

      <div className="mobile-detail-amount">
        <span>Upah Final</span>
        <strong>
          {formatRupiah(payroll.amount * SAWIT_DOLLAR_RATE)}
          <em>(${formatSawitDollar(payroll.amount)})</em>
        </strong>
      </div>

      <dl className="detail-list">
        <div>
          <dt>Penerima</dt>
          <dd>{formatUserLabel(payroll.userId)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{statusLabel(payroll.status)}</dd>
        </div>
        <div>
          <dt>Kilogram</dt>
          <dd>{formatKg(payroll.kilogram)}</dd>
        </div>
        <div>
          <dt>Upah</dt>
          <dd>$ {formatSawitDollar(payroll.amount)}</dd>
        </div>
        <div>
          <dt>Deskripsi</dt>
          <dd>{payroll.description || "-"}</dd>
        </div>
        <div>
          <dt>Alasan penolakan</dt>
          <dd>{payroll.rejectionReason || "-"}</dd>
        </div>
      </dl>
      <div className="mobile-calculation-card">
        <h3>Rincian Perhitungan</h3>
        <dl>
          <div>
            <dt>Tarif Dasar (per Kg)</dt>
            <dd>{formatRupiah((payroll.amount * SAWIT_DOLLAR_RATE) / Math.max(payroll.kilogram, 1))}</dd>
          </div>
          <div>
            <dt>Total Hasil Panen</dt>
            <dd>{formatKg(payroll.kilogram)}</dd>
          </div>
          <div>
            <dt>Subtotal Bruto</dt>
            <dd>{formatRupiah(grossAmount * SAWIT_DOLLAR_RATE)}</dd>
          </div>
          <div>
            <dt>Faktor Kualitas (90%)</dt>
            <dd>- {formatRupiah(qualityAdjustment * SAWIT_DOLLAR_RATE)}</dd>
          </div>
          <div>
            <dt>Total Bersih</dt>
            <dd>{formatRupiah(payroll.amount * SAWIT_DOLLAR_RATE)}</dd>
          </div>
        </dl>
      </div>
      <div className="mobile-description-card">
        <span>Deskripsi</span>
        <p>{payroll.description || "Tidak ada deskripsi tambahan."}</p>
      </div>
      {payroll.status === "PENDING" && (
        <div className="modal-actions">
          <button
            className="solid-button"
            disabled={pendingAction === `approve-${payroll.id}`}
            type="button"
            onClick={() => void onApprove(payroll)}
          >
            Approve
          </button>
          <button className="danger-button" type="button" onClick={() => onReject(payroll)}>
            Reject
          </button>
        </div>
      )}
    </Modal>
  );
}

function RejectPayrollModal({
  onClose,
  onSubmit,
  payroll,
  pending,
  reason,
  setReason,
}: {
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  payroll: Payroll;
  pending: boolean;
  reason: string;
  setReason: (value: string) => void;
}) {
  return (
    <Modal title="Tolak Payroll" onClose={onClose}>
      <form className="modal-form" onSubmit={onSubmit}>
        <p className="muted-state">
          Tolak payroll untuk {formatUserLabel(payroll.userId)} sebesar{" "}
          <strong>$ {formatSawitDollar(payroll.amount)}</strong>.
        </p>
        <label>
          Alasan penolakan
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <button className="danger-button full" disabled={pending} type="submit">
          {pending ? "Menolak..." : "Reject Payroll"}
        </button>
      </form>
    </Modal>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="Tutup modal" type="button" onClick={onClose}>
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PageTitle({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <header className="page-title">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function PlantationBanner({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`plantation-banner ${compact ? "compact" : ""}`}>
      <p>{children}</p>
    </div>
  );
}

function NoticeBar({ notice }: { notice: Exclude<Notice, null> }) {
  return <div className={`notice-bar ${notice.type}`}>{notice.message}</div>;
}

function SessionPanel({
  canUseDevSession,
  devSessionForm,
  onClear,
  onSave,
  session,
  setDevSessionForm,
}: {
  canUseDevSession: boolean;
  devSessionForm: { userId: string; role: PaymentHeaderRole };
  onClear: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  session: PaymentSession;
  setDevSessionForm: React.Dispatch<
    React.SetStateAction<{ userId: string; role: PaymentHeaderRole }>
  >;
}) {
  if (isPaymentUuid(session.userId) && session.role) {
    return null;
  }

  return (
    <div className="session-panel">
      <Info size={20} />
      <p>
        Session pembayaran belum lengkap atau User ID bukan UUID. Production
        akan memakai auth/session existing; mode dev bisa isi fallback di bawah.
      </p>
      {canUseDevSession && (
        <form onSubmit={onSave}>
          <input
            placeholder="Dev User ID"
            value={devSessionForm.userId}
            onChange={(event) =>
              setDevSessionForm((previous) => ({
                ...previous,
                userId: event.target.value,
              }))
            }
          />
          <select
            value={devSessionForm.role}
            onChange={(event) =>
              setDevSessionForm((previous) => ({
                ...previous,
                role: event.target.value as PaymentHeaderRole,
              }))
            }
          >
            {PAYMENT_HEADER_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button type="submit">Simpan</button>
          <button type="button" onClick={onClear}>
            Clear
          </button>
        </form>
      )}
    </div>
  );
}

function Pagination({ active = 1 }: { active?: number }) {
  return (
    <div className="pagination">
      <button type="button">
        <ChevronLeft size={18} />
      </button>
      {[1, 2, 3].map((page) => (
        <button className={active === page ? "active" : ""} key={page} type="button">
          {page}
        </button>
      ))}
      <button type="button">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function toIsoDateTime(value: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatSawitDollar(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatCompactRupiah(value: number) {
  if (Math.abs(value) >= 1000000) {
    return `Rp ${formatSawitDollar(value / 1000000)}M`;
  }

  if (Math.abs(value) >= 1000) {
    return `Rp ${formatSawitDollar(value / 1000)}rb`;
  }

  return formatRupiah(value);
}

function formatKg(value: number) {
  return `${formatNumber(value)} Kg`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return `${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)} WIB`;
}

function formatUserLabel(userId: string) {
  return `User ${userId.slice(0, 8)}`;
}

function avatarUrl(seed: string) {
  return `https://i.pravatar.cc/96?u=${encodeURIComponent(seed)}`;
}

function roleLabel(role: string) {
  switch (role) {
    case "BURUH":
      return "Pemanen";
    case "SUPIR_TRUK":
      return "Supir";
    case "MANDOR":
      return "Mandor";
    case "ADMIN":
      return "Super Admin";
    default:
      return role;
  }
}

function statusLabel(status: PayrollStatus) {
  switch (status) {
    case "ACCEPTED":
      return "Selesai";
    case "PENDING":
      return "Menunggu";
    case "REJECTED":
      return "Ditolak";
    default:
      return status;
  }
}

function statusClass(status: PayrollStatus) {
  switch (status) {
    case "ACCEPTED":
      return "success";
    case "PENDING":
      return "waiting";
    case "REJECTED":
      return "danger";
    default:
      return "";
  }
}

export function PaymentApiDebug() {
  return <span hidden>{getPembayaranApiBaseUrl()}</span>;
}
