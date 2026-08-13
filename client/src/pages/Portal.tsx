/** Signal Ledger portal: a restrained customer library that exposes downloads only after verified payment entitlement. */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Download, KeyRound, Loader2, LockKeyhole, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

function formatPrice(priceSen: number, currency: string) {
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: currency === "MYR" ? "MYR" : currency, maximumFractionDigits: 0 }).format(priceSen / 100);
}

function formatSaving(originalPriceSen: number | null, priceSen: number, currency: string) {
  return originalPriceSen && originalPriceSen > priceSen ? formatPrice(originalPriceSen - priceSen, currency) : null;
}

export default function Portal() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const returnedOrder = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("order");
  const catalog = trpc.catalog.list.useQuery();
  const library = trpc.portal.library.useQuery(undefined, { enabled: isAuthenticated });
  const returnedOrderStatus = trpc.portal.orderStatus.useQuery({ externalReference: returnedOrder ?? "pending" }, { enabled: isAuthenticated && Boolean(returnedOrder) });
  const [adminProductId, setAdminProductId] = useState("gemini-bot-ea");
  const [adminMessage, setAdminMessage] = useState("");
  const [claimProductId, setClaimProductId] = useState("gemini-bot-ea");
  const [claimReceiptNo, setClaimReceiptNo] = useState("");
  const [claimMessage, setClaimMessage] = useState("");
  const download = trpc.portal.download.useMutation({
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
  });
  const adminUpload = trpc.admin.uploadPackage.useMutation({
    onSuccess: () => {
      setAdminMessage("Package stored securely. Customers with active access will now see it in their library.");
      library.refetch();
    },
    onError: error => setAdminMessage(error.message),
  });
  const claimPurchase = trpc.portal.claimPurchase.useMutation({
    onSuccess: ({ productName }) => {
      setClaimMessage(`${productName} access is confirmed. Your eligible package files are now available below.`);
      setClaimReceiptNo("");
      library.refetch();
    },
    onError: error => setClaimMessage(error.message),
  });

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

  if (loading || catalog.isLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f0e8] text-[#0e716e]"><Loader2 className="animate-spin" size={30} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f0e8] text-[#17201f]">
      <header className="border-b border-[#17201f]/10 bg-[#f4f0e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-18 max-w-[1280px] items-center justify-between px-5 lg:px-10">
          <div className="flex items-center gap-5"><a href="/" className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#52605d]"><ArrowLeft size={15} /><span className="hidden sm:inline">Briefing</span></a><span className="hidden h-7 w-px bg-[#17201f]/15 sm:block" /><a href="/portal" className="flex items-center gap-3" aria-label="FizuxCoder customer portal"><img src="/manus-storage/fizuxcoder-mark_c48fdfd3.png" alt="FizuxCoder signal mark" className="h-10 w-10 object-contain" /><span><strong className="block font-display text-2xl leading-none tracking-[-.05em]">FizuxCoder</strong><small className="mt-1 block font-mono text-[8px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Customer dossier</small></span></a></div>
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-[10px] uppercase tracking-[.1em] text-[#66736f] sm:inline">{user?.email ?? user?.name ?? "Customer"}</span>
              <button type="button" onClick={() => logout()} className="button-outline !px-3 !py-2"><LogOut size={14} /> Sign out</button>
            </div>
          ) : (
            <button type="button" onClick={startLogin} className="button-primary button-small"><KeyRound size={14} /> Customer sign in</button>
          )}
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#17201f] px-5 py-16 text-[#f4f0e8] lg:px-10 lg:py-24">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[#e5a631]/30" />
          <div className="relative mx-auto max-w-[1280px]">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#e5a631]">FizuxCoder / customer access</p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(3.2rem,7vw,6.6rem)] leading-[.86] tracking-[-.065em]">Own the setup.<br /><em className="font-normal text-[#0eafa7]">Keep the access.</em></h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c7d1cb]">Secure checkout opens the verified ToyyibPay payment page for the selected package. Sign in to retain an account record for post-payment access and future release delivery.</p>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#adbbb4]"><span>Signed payment callback</span><span className="text-[#e5a631]">•</span><span>Account-bound access</span><span className="text-[#e5a631]">•</span><span>Protected package links</span></div>
          </div>
        </section>

        <section className="px-5 py-16 lg:px-10 lg:py-20">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col justify-between gap-5 border-b border-[#17201f]/15 pb-7 md:flex-row md:items-end">
              <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Select a licence</p><h2 className="mt-3 font-display text-4xl tracking-[-.05em]">Purchase options</h2></div>
              <p className="max-w-xl text-sm leading-6 text-[#586662]">The checkout amount and category are defined on the server. No price, category code, or payment secret is trusted from the browser.</p>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {catalog.data?.map((product) => (
                <article key={product.id} className="flex flex-col rounded-[2rem] border border-[#17201f]/15 bg-[#fbf9f4] p-7 shadow-[9px_9px_0_#d8d0c2] lg:p-9">
                  <div className="flex items-start justify-between gap-5"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#0e716e]">{product.billingCycle === "lifetime" ? "Lifetime promo" : "Monthly access"}</p><h3 className="mt-4 font-display text-4xl leading-none tracking-[-.05em]">{product.name}</h3></div><ShieldCheck className="shrink-0 text-[#e5a631]" size={31} /></div>
                  <p className="mt-6 flex-1 text-[.96rem] leading-7 text-[#576560]">{product.description}</p>
                  <div className="mt-8 flex flex-col gap-5 border-t border-[#17201f]/10 pt-6 sm:flex-row sm:items-end sm:justify-between"><div>{product.originalPriceSen && <p className="font-mono text-sm font-medium text-[#8d6c53] line-through">Was {formatPrice(product.originalPriceSen, product.currency)}</p>}<p className="mt-1 font-display text-4xl tracking-[-.05em]">{formatPrice(product.priceSen, product.currency)}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[.1em] text-[#66736f]"><span>{product.billingCycle === "monthly" ? "per month · renewal required" : "one-time lifetime promo"}</span>{formatSaving(product.originalPriceSen, product.priceSen, product.currency) && <strong className="text-[#0e716e]">Save {formatSaving(product.originalPriceSen, product.priceSen, product.currency)}</strong>}</div></div><a href={product.directCheckoutUrl} target="_blank" rel="noreferrer" className="button-primary"><span>Pay securely</span><ArrowRight size={16} /></a></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#d7e1dc] px-5 py-16 lg:px-10 lg:py-20">
          <div className="mx-auto max-w-[1280px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Customer library</p><h2 className="mt-3 font-display text-4xl tracking-[-.05em]">Your eligible downloads</h2></div>{isAuthenticated && <button type="button" onClick={() => library.refetch()} className="button-outline !px-4 !py-3"><RefreshCw size={15} /> Refresh access</button>}</div>
            {isAuthenticated && returnedOrder && <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#0e716e]/20 bg-[#f4f0e8] p-4 text-sm leading-6 text-[#40534d]">{returnedOrderStatus.isLoading ? <Loader2 className="mt-0.5 shrink-0 animate-spin text-[#0e716e]" size={18} /> : returnedOrderStatus.data?.status === "paid" ? <CheckCircle2 className="mt-0.5 shrink-0 text-[#0e716e]" size={18} /> : <Clock3 className="mt-0.5 shrink-0 text-[#e5a631]" size={18} />}<p>{returnedOrderStatus.data?.status === "paid" ? `Payment confirmed for ${returnedOrderStatus.data.productName}. Your eligible downloads are now available below.` : returnedOrderStatus.data?.status === "failed" ? `Payment was not completed: ${returnedOrderStatus.data.failureReason ?? "ToyyibPay marked this transaction as failed."}` : "Your payment return was received. The secure callback may take a short moment to confirm; refresh access if the library has not updated yet."}</p></div>}
            {!isAuthenticated ? (
              <div className="mt-8 flex flex-col items-start gap-4 rounded-[1.5rem] bg-[#f4f0e8] p-7 shadow-[7px_7px_0_#0e716e] sm:flex-row sm:items-center"><LockKeyhole className="shrink-0 text-[#0e716e]" size={28} /><div className="flex-1"><p className="font-semibold">Sign in to view your library.</p><p className="mt-1 text-sm leading-6 text-[#596762]">Access is linked to the customer account used before checkout and enabled only after a verified payment callback.</p></div><button type="button" onClick={startLogin} className="button-primary button-small">Sign in <ArrowRight size={14} /></button></div>
            ) : library.isLoading ? (
              <div className="mt-8 flex items-center gap-3 text-[#0e716e]"><Loader2 className="animate-spin" size={20} /> Loading your entitlements…</div>
            ) : <div className="mt-8 space-y-6"><form onSubmit={event => { event.preventDefault(); if (claimReceiptNo.trim()) claimPurchase.mutate({ productId: claimProductId, receiptNo: claimReceiptNo.trim() }); }} className="rounded-[1.5rem] border border-[#17201f]/15 bg-[#f4f0e8] p-7 shadow-[7px_7px_0_#0e716e]"><p className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">Already paid through ToyyibPay?</p><h3 className="mt-3 font-display text-3xl tracking-[-.04em]">Claim your package access.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[#596762]">Enter the ToyyibPay invoice or settlement reference from your successful receipt. The receipt email must match this signed-in account before a package is unlocked.</p><div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"><select value={claimProductId} onChange={event => setClaimProductId(event.target.value)} className="h-12 rounded-xl border border-[#17201f]/15 bg-white px-4 text-sm outline-none focus:border-[#0e716e]">{catalog.data?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select><input value={claimReceiptNo} onChange={event => setClaimReceiptNo(event.target.value)} placeholder="ToyyibPay invoice or settlement reference" className="h-12 rounded-xl border border-[#17201f]/15 bg-white px-4 text-sm outline-none focus:border-[#0e716e]" /><button type="submit" disabled={!claimReceiptNo.trim() || claimPurchase.isPending} className="button-primary disabled:cursor-wait disabled:opacity-60">{claimPurchase.isPending ? <Loader2 className="animate-spin" size={16} /> : "Verify receipt"}</button></div>{claimMessage && <p className="mt-4 rounded-xl border border-[#0e716e]/20 bg-[#d7e1dc] p-3 text-sm leading-6 text-[#38544c]">{claimMessage}</p>}</form>{library.data?.length ? <div className="grid gap-5 lg:grid-cols-2">{library.data.map((item) => <article key={item.productId} className="rounded-[1.5rem] bg-[#f4f0e8] p-7 shadow-[7px_7px_0_#0e716e]"><div className="flex justify-between gap-5"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">{item.status === "active" ? "Access active" : "Access expired"}</p><h3 className="mt-3 font-display text-3xl tracking-[-.04em]">{item.productName}</h3></div>{item.status === "active" ? <CheckCircle2 className="text-[#0e716e]" size={25} /> : <Clock3 className="text-[#e5a631]" size={25} />}</div>{item.billingCycle === "monthly" && <p className="mt-3 text-sm text-[#596762]">{item.expiresAt ? `Access renews after ${new Date(item.expiresAt).toLocaleDateString()}.` : "Monthly access is active."}</p>}<div className="mt-6 grid gap-2 border-t border-[#17201f]/10 pt-5">{item.files.length ? item.files.map((file) => <button key={file.id} type="button" onClick={() => download.mutate({ fileId: file.id })} disabled={download.isPending} className="flex items-center justify-between rounded-xl border border-[#17201f]/12 px-4 py-3 text-left text-sm transition hover:border-[#0e716e] hover:text-[#0e716e]"><span>{file.displayName}</span><Download size={16} /></button>) : <p className="text-sm leading-6 text-[#596762]">Your purchase is verified. The package files will appear here once the administrator uploads the current release.</p>}</div></article>)}</div> : <div className="rounded-[1.5rem] border border-[#17201f]/15 bg-[#f4f0e8] p-7 text-sm leading-7 text-[#596762]">No active packages are linked to this account yet. Complete a purchase above and then claim the successful receipt here.</div>}</div>}
          </div>
        </section>

        {user?.role === "admin" && <section className="border-t border-[#17201f]/12 bg-[#fbf9f4] px-5 py-16 lg:px-10">
          <div className="mx-auto grid max-w-[1280px] gap-8 lg:grid-cols-[.75fr_1.25fr]">
            <div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Owner-only release desk</p><h2 className="mt-3 font-display text-4xl tracking-[-.05em]">Add a protected package file.</h2><p className="mt-5 max-w-sm text-sm leading-7 text-[#586662]">Upload a new `.ex5` release to the selected product library. Only customers with an active verified entitlement receive a signed download link.</p></div>
            <div className="rounded-[1.5rem] border border-[#17201f]/15 bg-[#d7e1dc] p-6 shadow-[7px_7px_0_#0e716e]">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">Product library</label>
              <select value={adminProductId} onChange={event => setAdminProductId(event.target.value)} className="mt-3 h-12 w-full rounded-xl border border-[#17201f]/15 bg-[#f4f0e8] px-4 text-sm outline-none focus:border-[#0e716e]">
                {catalog.data?.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <label className="mt-5 block font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">EA or indicator file</label>
              <input aria-label="Upload EA or indicator file" accept=".ex5" type="file" disabled={adminUpload.isPending} onChange={event => { const selected = event.target.files?.[0]; if (selected) void uploadRelease(selected); event.currentTarget.value = ""; }} className="mt-3 block w-full rounded-xl border border-dashed border-[#17201f]/25 bg-[#f4f0e8] p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#0e716e] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
              <p className="mt-4 text-xs leading-5 text-[#586662]">Files are stored in the protected package library; the browser never receives a permanent public file URL.</p>
              {adminMessage && <p className="mt-4 rounded-xl border border-[#0e716e]/20 bg-[#f4f0e8] p-3 text-xs leading-5 text-[#39514a]">{adminMessage}</p>}
            </div>
          </div>
        </section>}
      </main>
    </div>
  );
}
