import React, { useCallback, useEffect, useState } from "react";
import { Home, Users, Receipt, Package } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { fetchMyMemberships, fetchPatients, fetchInventory, fetchInvoices } from "./lib/api";
import { Spinner, BottomNav } from "./components/shared/ui";
import AuthScreen from "./components/AuthScreen";
import BranchOnboarding from "./components/BranchOnboarding";
import TopBar from "./components/layout/TopBar";
import HomeTab from "./components/HomeTab";
import PatientsTab from "./components/patients/PatientsTab";
import InventoryTab from "./components/inventory/InventoryTab";
import BillingTab from "./components/billing/BillingTab";

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
  if (memberships.length === 0) return <BranchOnboarding onCreated={handleBranchCreated} />;

  const current = memberships.find((m) => m.branch_id === currentBranchId) || memberships[0];

  return (
    <ShopApp
      key={current.branch_id}
      branch={current.branches}
      role={current.role}
      memberships={memberships}
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
  const isOwner = role === "owner";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, inv, invc] = await Promise.all([fetchPatients(branch.id), fetchInventory(branch.id), fetchInvoices(branch.id)]);
        setPatients(p);
        setInventory(inv);
        setInvoices(invc);
      } catch (e) {
        setPatients([]);
        setInventory([]);
        setInvoices([]);
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
          {tab === "home" && <HomeTab patients={patients} inventory={inventory} invoices={invoices} setTab={setTab} />}
          {tab === "patients" && (
            <PatientsTab patients={patients} setPatients={setPatients} branchId={branch.id} isOwner={isOwner} shopInfo={branch} invoices={invoices} />
          )}
          {tab === "billing" && (
            <BillingTab
              patients={patients}
              setPatients={setPatients}
              inventory={inventory}
              setInventory={setInventory}
              invoices={invoices}
              setInvoices={setInvoices}
              branchId={branch.id}
              shopInfo={branch}
            />
          )}
          {tab === "inventory" && <InventoryTab inventory={inventory} setInventory={setInventory} branchId={branch.id} isOwner={isOwner} />}
        </div>
        <BottomNav tabs={tabs} active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
