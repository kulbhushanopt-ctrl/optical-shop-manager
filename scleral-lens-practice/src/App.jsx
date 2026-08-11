import React, { useEffect, useState } from "react";
import { Users, Package, Receipt, AlertTriangle } from "lucide-react";
import { supabase, supabaseConfigError } from "./lib/supabaseClient";
import { fetchPatients, fetchLensOrders, fetchInvoices } from "./lib/api";
import { Spinner, BottomNav } from "./components/shared/ui";
import AuthScreen from "./components/AuthScreen";
import TopBar from "./components/layout/TopBar";
import PatientsTab from "./components/patients/PatientsTab";
import OrdersTab from "./components/orders/OrdersTab";
import BillingTab from "./components/billing/BillingTab";

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

export default function LensPracticeApp() {
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (supabaseConfigError) return <ConfigErrorScreen message={supabaseConfigError} />;
  if (checking) return <Spinner />;
  if (!session) return <AuthScreen />;

  return <PracticeApp key={session.user.id} />;
}

function PracticeApp() {
  const [tab, setTab] = useState("patients");
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, o, i] = await Promise.all([fetchPatients(), fetchLensOrders(), fetchInvoices()]);
        setPatients(p);
        setOrders(o);
        setInvoices(i);
      } catch (e) {
        setPatients([]);
        setOrders([]);
        setInvoices([]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spinner label="Loading your practice…" />;

  const tabs = [
    { id: "patients", label: "Patients", icon: Users },
    { id: "orders", label: "Orders", icon: Package },
    { id: "billing", label: "Billing", icon: Receipt },
  ];

  return (
    <div className="min-h-screen w-full flex justify-center bg-paper font-sans">
      <div className="w-full max-w-md min-h-screen flex flex-col relative bg-paper">
        <TopBar />
        <div className="flex-1 overflow-y-auto pb-24" style={{ WebkitOverflowScrolling: "touch" }}>
          {tab === "patients" && <PatientsTab patients={patients} setPatients={setPatients} />}
          {tab === "orders" && <OrdersTab orders={orders} setOrders={setOrders} patients={patients} />}
          {tab === "billing" && <BillingTab invoices={invoices} setInvoices={setInvoices} patients={patients} />}
        </div>
        <BottomNav tabs={tabs} active={tab} onChange={setTab} />
      </div>
    </div>
  );
}
