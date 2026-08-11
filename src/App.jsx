import React, { useCallback, useEffect, useState } from "react";
import { Home, Users, Receipt, Package, AlertTriangle } from "lucide-react";
import { supabase, supabaseConfigError } from "./lib/supabaseClient";
import { fetchMyMemberships, fetchPatients, fetchInventory, fetchInvoices, fetchInvoicePayments, fetchAppointments, signOut } from "./lib/api";
import { Spinner, BottomNav } from "./components/shared/ui";
import AuthScreen from "./components/AuthScreen";
import ShopAccessGate from "./components/ShopAccessGate";
import TopBar from "./components/layout/TopBar";
import HomeTab from "./components/HomeTab";
import PatientsTab from "./components/patients/PatientsTab";
import InventoryTab from "./components/inventory/InventoryTab";
import BillingTab from "./components/billing/BillingTab";

function AccessRevokedScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 text-center">
        <div className="bg-warnSoft rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={22} className="text-warn" />
        </div>
        <h1 className="font-display text-base font-bold text-ink mb-1">Access disabled</h1>
        <p className="text-xs text-slate mb-4">This shop's access has been disabled by the app owner. Contact them if you think this is a mistake.</p>
        <button onClick={() => signOut()} className="text-xs font-medium text-slate">Sign out</button>
      </div>
    </div>
  );
}

function ConfigErrorScreen({ message }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 bg-paper font-sans">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 text-center">
        <div className="bg-warnSoft rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={22} className="text-warn" />
        </div>
        <h1 className="font-display text-base font-bold text-ink mb-1">Setup required</h1>
        <p className="text-xs text-slate">{message}</p>
      </div>
    </div>
  );
}

export default function OpticalShopApp() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [membershipsLoading, setMembershipsLoading] = useState(false);
  const [memberships, setMemberships] = useState([]);
  const [currentBranchId, setCurrentBranchId] = useState(null);

  const loadMemberships = useCallback(async () => {
    setMembershipsLoading(true);
    try {
      const rows = await fetchMyMemberships();
      setMemberships(rows);
      const stored = localStorage.getItem("optishop_branch");
      const stillValid = stored && rows.some((r) => r.branch_id === stored);
      setCurrentBranchId(stillValid ? stored : rows[0]?.branch_id || null);
    } catch (e) {
      setMemberships([]);
    }
    setMembershipsLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setMemberships([]);
        setCurrentBranchId(null);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadMemberships();
  }, [session, loadMemberships]);

  if (supabaseConfigError) return <ConfigErrorScreen message={supabaseConfigError} />;

  const switchBranch = (branchId) => {
    setCurrentBranchId(branchId);
    try {
      localStorage.setItem("optishop_branch", branchId);
    } catch (e) {
      /* localStorage unavailable */
    }
  };

  const handleBranchCreated = (branch) => {
    const newMembership = { role: "owner", branch_id: branch.id, branches: branch };
    setMemberships((prev) => [...prev, newMembership]);
    switchBranch(branch.id);
  };

  if (checking) return <Spinner />;
  if (!session) return <AuthScreen />;
  if (membershipsLoading) return <Spinner label="Loading your shop…" />;
  if (memberships.length === 0) return <ShopAccessGate onCreated={handleBranchCreated} onJoined={loadMemberships} />;

  // A branch the admin has disabled (revoked) still shows up as a
  // membership row, but its `branches` embed is filtered out by RLS --
  // filter those out here instead of crashing on a null branch below.
  const usableMemberships = memberships.filter((m) => m.branches);
  if (usableMemberships.length === 0) return <AccessRevokedScreen />;

  const current = usableMemberships.find((m) => m.branch_id === currentBranchId) || usableMemberships[0];

  return (
    <ShopApp
      key={current.branch_id}
      branch={current.branches}
      role={current.role}
      memberships={usableMemberships}
      onSwitchBranch={switchBranch}
      onBranchCreated={handleBranchCreated}
      onBranchUpdated={(updated) =>
        setMemberships((prev) => prev.map((m) => (m.branch_id === updated.id ? { ...m, branches: updated } : m)))
      }
    />
  );
}

function ShopApp({ branch, role, memberships, onSwitchBranch, onBranchCreated, onBranchUpdated }) {
  const [tab, setTab] = useState("home");
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const isOwner = role === "owner";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, inv, invc, pay, appts] = await Promise.all([
          fetchPatients(branch.id),
          fetchInventory(branch.id),
          fetchInvoices(branch.id),
          fetchInvoicePayments(branch.id),
          fetchAppointments(branch.id),
        ]);
        setPatients(p);
        setInventory(inv);
        setInvoices(invc);
        setPayments(pay);
        setAppointments(appts);
      } catch (e) {
        setPatients([]);
        setInventory([]);
        setInvoices([]);
        setPayments([]);
        setAppointments([]);
      }
      setLoading(false);
    })();
  }, [branch.id]);

  if (loading) return <Spinner label="Loading your shop…" />;

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "patients", label: "Patients", icon: Users },
    { id: "billing", label: "Billing", icon: Receipt },
    { id: "inventory", label: "Stock", icon: Package },
  ];

  return (
    <div className="min-h-screen w-full flex justify-center bg-paper font-sans">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-paper">
        <TopBar
          shopInfo={branch}
          onBranchUpdated={onBranchUpdated}
          isOwner={isOwner}
          branchId={branch.id}
          memberships={memberships}
          onSwitchBranch={onSwitchBranch}
          onBranchCreated={onBranchCreated}
        />
        <div className="flex-1 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: "touch" }}>
          {tab === "home" && <HomeTab patients={patients} inventory={inventory} invoices={invoices} appointments={appointments} setTab={setTab} />}
          {tab === "patients" && (
            <PatientsTab
              patients={patients}
              setPatients={setPatients}
              branchId={branch.id}
              isOwner={isOwner}
              shopInfo={branch}
              invoices={invoices}
              appointments={appointments}
              setAppointments={setAppointments}
            />
          )}
          {tab === "billing" && (
            <BillingTab
              patients={patients}
              setPatients={setPatients}
              inventory={inventory}
              setInventory={setInventory}
              invoices={invoices}
              setInvoices={setInvoices}
              payments={payments}
              setPayments={setPayments}
              branchId={branch.id}
              isOwner={isOwner}
              shopInfo={branch}
            />
          )}
          {tab === "inventory" && <InventoryTab inventory={inventory} setInventory={setInventory} branchId={branch.id} isOwner={isOwner} />}
        </div>
        <p className="text-center text-[10px] text-slate py-1.5 bg-card border-t border-border">© {new Date().getFullYear()} Kulbhushan Sachdeva</p>
        <BottomNav tabs={tabs} active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
