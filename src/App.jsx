import React, { useCallback, useEffect, useState } from "react";
import { Home, Users, Receipt, Package, AlertTriangle } from "lucide-react";
import { supabase, supabaseConfigError } from "./lib/supabaseClient";
import { fetchMyMemberships, fetchPatients, fetchInventory, fetchInvoices, fetchInvoicePayments, fetchAppointments, fetchBranchCategories, signOut } from "./lib/api";
import { Spinner, BottomNav } from "./components/shared/ui";
import AuthScreen from "./components/AuthScreen";
import ShopAccessGate from "./components/ShopAccessGate";
import TopBar from "./components/layout/TopBar";
import Sidebar from "./components/layout/Sidebar";
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

// Some Android OEM skins (Vivo/Oppo/Xiaomi in particular) are far more
// aggressive than stock Android about killing a backgrounded installed
// PWA to reclaim memory -- not just for a native file picker, but for
// switching to another app, or sometimes even the screen just dimming.
// Chrome then reloads the page fresh on return, wiping all in-memory
// state including which tab was open. That reload itself can't be
// prevented from here, but landing back on whatever tab you were using
// (instead of always Home) makes it far less disorienting. localStorage
// (not sessionStorage) is used specifically because this kind of
// OS-level process kill can also tear down session storage on some of
// these skins -- localStorage survives that reliably, same as the login
// session already does.
const ACTIVE_TAB_KEY = "optishop_active_tab";

function ShopApp({ branch, role, memberships, onSwitchBranch, onBranchCreated, onBranchUpdated }) {
  const [tab, setTabState] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_TAB_KEY) || "home";
    } catch {
      return "home";
    }
  });
  const setTab = (t) => {
    setTabState(t);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, t);
    } catch {
      /* localStorage unavailable -- tab just won't survive a reload */
    }
  };
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newInvoicePatientId, setNewInvoicePatientId] = useState(null);
  const isOwner = role === "owner";

  // "Generate bill" from a patient's detail view jumps to Billing with that
  // patient already picked for the new invoice, instead of the usual
  // walk-in default.
  const generateBillFor = (patientId) => {
    setNewInvoicePatientId(patientId);
    setTab("billing");
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, inv, invc, pay, appts, cats] = await Promise.all([
          fetchPatients(branch.id),
          fetchInventory(branch.id),
          fetchInvoices(branch.id),
          fetchInvoicePayments(branch.id),
          fetchAppointments(branch.id),
          fetchBranchCategories(branch.id),
        ]);
        setPatients(p);
        setInventory(inv);
        setInvoices(invc);
        setPayments(pay);
        setAppointments(appts);
        setCategories(cats);
      } catch (e) {
        setPatients([]);
        setInventory([]);
        setInvoices([]);
        setPayments([]);
        setAppointments([]);
        setCategories([]);
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
    <div className="h-dvh w-full flex justify-center bg-paper md:bg-ink/[0.03] font-sans overflow-hidden">
      <div className="w-full max-w-md md:max-w-5xl xl:max-w-6xl h-full flex relative md:shadow-xl md:shadow-black/5">
        <Sidebar tabs={tabs} active={tab} onChange={setTab} shopInfo={branch} />
        <div className="flex-1 min-w-0 min-h-0 flex flex-col relative bg-paper">
          <TopBar
            shopInfo={branch}
            onBranchUpdated={onBranchUpdated}
            isOwner={isOwner}
            branchId={branch.id}
            memberships={memberships}
            onSwitchBranch={onSwitchBranch}
            onBranchCreated={onBranchCreated}
          />
          <div className="flex-1 min-h-0 overflow-y-auto pb-4 md:pb-6" style={{ WebkitOverflowScrolling: "touch" }}>
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
                onGenerateBill={generateBillFor}
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
                prefillPatientId={newInvoicePatientId}
                onPrefillConsumed={() => setNewInvoicePatientId(null)}
              />
            )}
            {tab === "inventory" && (
              <InventoryTab
                inventory={inventory}
                setInventory={setInventory}
                categories={categories}
                setCategories={setCategories}
                branchId={branch.id}
                isOwner={isOwner}
                shopName={branch.name}
              />
            )}
          </div>
          <p className="text-center text-[10px] text-slate py-1.5 bg-card border-t border-border">© {new Date().getFullYear()} Kulbhushan Sachdeva</p>
          <div className="md:hidden">
            <BottomNav tabs={tabs} active={tab} onChange={setTab} />
          </div>
        </div>
      </div>
    </div>
  );
}
