/** Unlinked operations page: presentation is role-gated here and every action remains server-side admin-gated. */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

function formatPrice(priceSen: number, currency: string) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency === "MYR" ? "MYR" : currency, maximumFractionDigits: 0 }).format(priceSen / 100);
}

export default function AdminOperations() {
  const { user, loading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const catalog = trpc.catalog.list.useQuery(undefined, { enabled: isAdmin });
  const testCatalog = trpc.test.catalog.useQuery(undefined, { enabled: isAdmin });
  const [adminProductId, setAdminProductId] = useState("gemini-bot-ea");
  const [adminMessage, setAdminMessage] = useState("");
  const [testReceiptNo, setTestReceiptNo] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [providerInspection, setProviderInspection] = useState("");
  const [isCreatingLiveTestBill, setIsCreatingLiveTestBill] = useState(false);
  const adminUpload = trpc.admin.uploadPackage.useMutation({
    onSuccess: () => setAdminMessage("Package stored securely. Eligible customers can now see the release in their library."),
    onError: error => setAdminMessage(error.message),
  });
  const prepareLiveTest = trpc.test.prepareLiveProduct.useMutation({
    onSuccess: ({ name }) => {
      setTestMessage(`${name} is ready. It remains hidden from public purchase options and contains only a protected test receipt file.`);
      testCatalog.refetch();
    },
    onError: error => setTestMessage(error.message),
  });
  const simulateNoChargePurchase = trpc.test.simulateNoChargePurchase.useMutation({
    onSuccess: ({ productName, expiresAt }) => setTestMessage(`No-charge simulation completed for ${productName}. No ToyyibPay settlement occurred. A test-only entitlement is active until ${new Date(expiresAt).toLocaleString()}.`),
    onError: error => setTestMessage(error.message),
  });
  const providerInspectionQuery = trpc.test.inspectProvider.useQuery(undefined, { enabled: false, retry: false });
  const claimTestPurchase = trpc.test.claimPermanentRm1Fallback.useMutation({
    onSuccess: ({ productName }) => {
      setTestMessage(`${productName} receipt is verified. Bind a dummy MT5 account in the customer library to complete the isolated test.`);
      setTestReceiptNo("");
    },
    onError: error => setTestMessage(error.message),
  });

  const createLiveTestCheckout = async () => {
    setIsCreatingLiveTestBill(true);
    setTestMessage("Creating the callback-enabled RM1 test bill…");
    try {
      const response = await fetch("/api/owner/rm1/initiate", { method: "POST", credentials: "include", headers: { Accept: "application/json" } });
      const raw = await response.text();
      type Rm1InitiationResponse = { ok?: boolean; checkoutUrl?: string; error?: { message?: string } };
      let payload: Rm1InitiationResponse | undefined;
      try { payload = JSON.parse(raw) as Rm1InitiationResponse; } catch { throw new Error(`The payment route returned an unexpected ${response.headers.get("content-type") ?? "response"}. No bill was created.`); }
      if (!response.ok || !payload?.ok || !payload.checkoutUrl) throw new Error(payload?.error?.message ?? "The RM1 test bill could not be initialized. No payment was created.");
      setTestMessage("A callback-enabled one-time RM1 test bill was created. Verify RM1.00 on ToyyibPay before choosing to pay.");
      window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "The RM1 test bill could not be initialized. No payment was created.");
    } finally {
      setIsCreatingLiveTestBill(false);
    }
  };

  const uploadRelease = async (file: File) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("Unable to read the selected file"));
      reader.readAsDataURL(file);
    });
    setAdminMessage("Uploading protected release…");
    adminUpload.mutate({ productId: adminProductId, displayName: file.name.replace(/\.ex5$/i, "").replace(/[-_]/g, " "), fileName: file.name, base64 });
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#17201f] text-[#f4f0e8]"><Loader2 className="animate-spin" size={30} /></div>;
  if (!isAuthenticated) return <AccessState title="Sign in required" detail="Administrator operations require an authenticated account." action="Sign in" onClick={startLogin} />;
  if (!isAdmin) return <AccessState title="Administrator access required" detail="This operations area is not available to your account." action="Return to customer portal" href="/portal" />;

  return (
    <div className="min-h-screen bg-[#17201f] px-5 py-10 text-[#f4f0e8] lg:px-10 lg:py-14">
      <main className="mx-auto max-w-[1120px]">
        <a href="/portal" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#c7d1cb] hover:text-[#e5a631]"><ArrowLeft size={14} /> Customer portal</a>
        <section className="mt-7 border-b border-white/15 pb-8"><p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#e5a631]">Restricted administrator operations</p><h1 className="mt-4 font-display text-5xl tracking-[-.06em]">Release and test desk.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d1cb]">These controls are deliberately separated from the customer portal. Every action also requires server-side administrator authorization.</p></section>

        <section className="mt-8 rounded-[1.5rem] border border-[#e5a631]/50 bg-white/5 p-6 shadow-[7px_7px_0_#e5a631] lg:p-8"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#e5a631]">RM1 isolated test</p><div className="mt-4 grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><h2 className="font-display text-4xl tracking-[-.05em]">Payment test bench.</h2><p className="mt-4 text-sm leading-7 text-[#c7d1cb]">Use only for the isolated RM1 receipt file. It never exposes a production EA package.</p></div>{testCatalog.data?.[0] ? <div><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#e5a631]">Ready: {testCatalog.data[0].name} · {formatPrice(testCatalog.data[0].priceSen, testCatalog.data[0].currency)}</p><div className="mt-4 flex flex-col gap-3"><div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => void createLiveTestCheckout()} disabled={isCreatingLiveTestBill} className="button-primary !bg-[#e5a631] !text-[#17201f]">{isCreatingLiveTestBill ? <Loader2 className="animate-spin" size={16} /> : "Create callback test bill"} <ArrowRight size={16} /></button>{testCatalog.data[0].directCheckoutUrl && <a href={testCatalog.data[0].directCheckoutUrl} target="_blank" rel="noreferrer" className="button-outline !border-[#e5a631]/70 !text-[#f4f0e8]">Open RM1 fallback bill <ArrowRight size={16} /></a>}</div><form className="flex min-w-0 flex-1 gap-2" onSubmit={event => { event.preventDefault(); if (testReceiptNo.trim()) claimTestPurchase.mutate({ receiptNo: testReceiptNo.trim() }); }}><input value={testReceiptNo} onChange={event => setTestReceiptNo(event.target.value)} placeholder="Test invoice / settlement reference" className="h-11 min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-3 text-sm text-[#17201f] outline-none focus:border-[#e5a631]" /><button type="submit" disabled={!testReceiptNo.trim() || claimTestPurchase.isPending} className="button-outline !border-[#e5a631]/70 !text-[#f4f0e8] disabled:opacity-50">{claimTestPurchase.isPending ? <Loader2 className="animate-spin" size={16} /> : "Verify"}</button></form></div></div> : <button type="button" onClick={() => prepareLiveTest.mutate()} disabled={prepareLiveTest.isPending} className="button-primary !bg-[#e5a631] !text-[#17201f]">{prepareLiveTest.isPending ? <Loader2 className="animate-spin" size={16} /> : "Prepare isolated RM1 test"}</button>}</div>{testMessage && <p className="mt-5 rounded-xl border border-[#e5a631]/30 bg-white/10 p-3 text-sm leading-6 text-[#f4f0e8]">{testMessage}</p>}</section>

        <section className="mt-6 rounded-[1.25rem] border border-[#0eafa7]/40 bg-[#0eafa7]/10 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#0eafa7]">No-charge simulation</p><p className="mt-2 max-w-3xl text-sm leading-6 text-[#d7e1dc]">Creates a short-lived test-only entitlement; it sends no ToyyibPay request and never unlocks a production EA package.</p></div><button type="button" onClick={() => simulateNoChargePurchase.mutate()} disabled={simulateNoChargePurchase.isPending} className="button-outline shrink-0 !border-[#0eafa7]/70 !text-[#f4f0e8] disabled:opacity-50">{simulateNoChargePurchase.isPending ? <Loader2 className="animate-spin" size={16} /> : "Run no-charge simulation"}</button></div></section>

        <section className="mt-6 rounded-[1.25rem] border border-white/15 bg-white/5 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#e5a631]">Gateway inspection</p><p className="mt-2 text-sm leading-6 text-[#c7d1cb]">Sends deliberately incomplete data to ToyyibPay and returns sanitized response metadata only.</p></div><button type="button" onClick={() => void providerInspectionQuery.refetch().then(result => setProviderInspection(result.data ? JSON.stringify(result.data, null, 2) : result.error?.message ?? "Inspection request failed"))} disabled={providerInspectionQuery.isFetching} className="button-outline !border-[#e5a631]/70 !text-[#f4f0e8] disabled:opacity-50">{providerInspectionQuery.isFetching ? <Loader2 className="animate-spin" size={16} /> : "Inspect provider response"}</button></div>{providerInspection && <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-[#d7e1dc]">{providerInspection}</pre>}</section>

        <section className="mt-6 rounded-[1.25rem] border border-[#0eafa7]/40 bg-[#0eafa7]/10 p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[#0eafa7]">Gmail sender</p><p className="mt-2 max-w-3xl text-sm leading-6 text-[#d7e1dc]">Authorize the administrator mailbox once to allow verified-purchase activation emails.</p></div><a href="/api/gmail/oauth/start" className="button-outline shrink-0 !border-[#0eafa7]/70 !text-[#f4f0e8]">Authorize Gmail sender <ArrowRight size={16} /></a></div></section>

        <section className="mt-6 rounded-[1.5rem] bg-[#fbf9f4] p-7 text-[#17201f] shadow-[7px_7px_0_#0e716e]"><div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Protected release desk</p><h2 className="mt-3 font-display text-4xl tracking-[-.05em]">Add a package file.</h2><p className="mt-5 max-w-sm text-sm leading-7 text-[#586662]">Only customers with a verified active entitlement receive a signed download link.</p></div><div className="rounded-[1.5rem] border border-[#17201f]/15 bg-[#d7e1dc] p-6"><label className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">Product library</label><select value={adminProductId} onChange={event => setAdminProductId(event.target.value)} className="mt-3 h-12 w-full rounded-xl border border-[#17201f]/15 bg-[#f4f0e8] px-4 text-sm outline-none focus:border-[#0e716e]">{catalog.data?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><label className="mt-5 block font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">EA or indicator file</label><input aria-label="Upload EA or indicator file" accept=".ex5" type="file" disabled={adminUpload.isPending} onChange={event => { const selected = event.target.files?.[0]; if (selected) void uploadRelease(selected); event.currentTarget.value = ""; }} className="mt-3 block w-full rounded-xl border border-dashed border-[#17201f]/25 bg-[#f4f0e8] p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#0e716e] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" /><p className="mt-4 text-xs leading-5 text-[#586662]">Files remain in protected storage; the browser never receives a permanent public URL.</p>{adminMessage && <p className="mt-4 rounded-xl border border-[#0e716e]/20 bg-[#f4f0e8] p-3 text-xs leading-5 text-[#39514a]">{adminMessage}</p>}</div></div></section>
      </main>
    </div>
  );
}

function AccessState({ title, detail, action, href, onClick }: { title: string; detail: string; action: string; href?: string; onClick?: () => void }) {
  const content = <><ShieldCheck size={24} /><span>{action}</span></>;
  return <div className="grid min-h-screen place-items-center bg-[#17201f] px-5 text-[#f4f0e8]"><section className="max-w-md rounded-[1.5rem] border border-white/15 bg-white/5 p-8 text-center"><h1 className="font-display text-4xl tracking-[-.05em]">{title}</h1><p className="mt-4 text-sm leading-7 text-[#c7d1cb]">{detail}</p>{href ? <a href={href} className="button-primary mt-7">{content}</a> : <button type="button" onClick={onClick} className="button-primary mt-7">{content}</button>}</section></div>;
}
