/** Private editorial desk. It creates no social connection, auto-publishing job, advertising campaign, or spend. */
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Check, Clipboard, ExternalLink, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

type ContentStatus = "draft" | "approved" | "publish_pending" | "publish_failed" | "posted" | "rejected";

const statusStyle: Record<ContentStatus, string> = {
  draft: "border-[#e5a631]/40 bg-[#e5a631]/10 text-[#e5a631]",
  approved: "border-[#0eafa7]/50 bg-[#0eafa7]/10 text-[#0eafa7]",
  publish_pending: "border-[#e5a631]/50 bg-[#e5a631]/10 text-[#e5a631]",
  publish_failed: "border-[#d67a63]/70 bg-[#d67a63]/10 text-[#f0b1a0]",
  posted: "border-[#7db88e]/50 bg-[#7db88e]/10 text-[#d3f1d8]",
  rejected: "border-[#d67a63]/50 bg-[#d67a63]/10 text-[#f0b1a0]",
};

function formatScheduledAt(value: Date | null) {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" });
}

export default function MarketingStudio() {
  const { user, loading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const studio = trpc.marketing.list.useQuery(undefined, { enabled: isAdmin });
  const threadsConnection = trpc.marketing.threadsConnection.useQuery(undefined, { enabled: isAdmin });
  const utils = trpc.useUtils();
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const refresh = async () => utils.marketing.list.invalidate();
  const seed = trpc.marketing.seedTwoWeekPilot.useMutation({
    onSuccess: async result => { setMessage(`Two-week pilot ready: ${result.created} new draft(s), ${result.existing} existing item(s).`); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const applyGeminiRevision = trpc.marketing.applyGeminiBotRevision.useMutation({
    onSuccess: async result => { setMessage(`20-day Gemini Bot EA campaign ready: ${result.created} created, ${result.revised} revised, ${result.current} already current, ${result.archived} prior drafts archived, ${result.skipped} protected from change. All new items remain drafts; no Threads post was sent.`); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const approve = trpc.marketing.approve.useMutation({
    onMutate: variables => { setMessage(`Publishing draft #${variables.contentItemId} to Threads… keep this page open while the provider confirms the post.`); },
    onSuccess: async result => { setMessage(`Approved and published to Threads${result.hasImage ? " with one image" : " as text-only"}. External post ID: ${result.externalPostId}. ${result.replenishment?.created ? `Fresh draft #${result.replenishment.contentItemId} queued for review.` : "No duplicate fresh draft was created."}`); try { await refresh(); } catch { setMessage(`Published to Threads. External post ID: ${result.externalPostId}. A fresh draft was ${result.replenishment?.created ? "queued" : "not created"}. Refresh the page to reload the queue.`); } },
    onError: error => setMessage(`Threads publication failed: ${error.message}`),
  });
  const retryPublish = trpc.marketing.retryPublish.useMutation({
    onMutate: variables => { setMessage(`Retrying Threads publication for draft #${variables.contentItemId}… keep this page open while the provider confirms the post.`); },
    onSuccess: async result => { setMessage(`Threads publication retry succeeded${result.hasImage ? " with one image" : " as text-only"}. External post ID: ${result.externalPostId}. ${result.replenishment?.created ? `Fresh draft #${result.replenishment.contentItemId} queued for review.` : "No duplicate fresh draft was created."}`); try { await refresh(); } catch { setMessage(`Published to Threads after retry. External post ID: ${result.externalPostId}. A fresh draft was ${result.replenishment?.created ? "queued" : "not created"}. Refresh the page to reload the queue.`); } },
    onError: error => setMessage(`Threads publication retry failed: ${error.message}`),
  });
  const reject = trpc.marketing.reject.useMutation({
    onSuccess: async () => { setMessage("Draft rejected. It cannot be marked posted unless a new approved draft is created."); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const counts = useMemo(() => ({
    draft: studio.data?.filter(item => item.status === "draft").length ?? 0,
    approved: studio.data?.filter(item => item.status === "approved").length ?? 0,
    posted: studio.data?.filter(item => item.status === "posted").length ?? 0,
    archived: studio.data?.filter(item => item.status === "rejected" && item.complianceFlags?.includes("superseded_by_gemini_20_day_campaign")).length ?? 0,
  }), [studio.data]);

  const copyCaption = async (id: number, caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 1800);
    } catch {
      setMessage("Copy failed in this browser. Select the caption text manually before posting in Threads.");
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#17201f] text-[#f4f0e8]"><Loader2 className="animate-spin" size={30} /></div>;
  if (!isAuthenticated) return <AccessState title="Sign in required" detail="The marketing studio is restricted to the administrator account." action="Sign in" onClick={startLogin} />;
  if (!isAdmin) return <AccessState title="Administrator access required" detail="This content workspace is not available to your account." action="Return to customer portal" href="/portal" />;

  return <div className="min-h-screen bg-[#17201f] px-5 py-10 text-[#f4f0e8] lg:px-10 lg:py-14" data-testid="marketing-studio">
    <main className="mx-auto max-w-[1240px]">
      <a href="/admin/operations" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#c7d1cb] hover:text-[#e5a631]"><ArrowLeft size={14} /> Administrator operations</a>
      <section className="mt-7 border-b border-white/15 pb-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#e5a631]">Private organic pilot · approval-triggered Threads workflow</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><h1 className="font-display text-5xl tracking-[-.06em]">Content studio.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d1cb]">Review risk-first drafts, then approve the exact caption, destination, and selected image. Approval publishes that approved item to the connected owner account; this page has no advertising campaign or spend capability.</p></div><div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end"><a href="/api/threads/oauth/start" className="button-outline !border-[#0eafa7]/70 !text-[#f4f0e8]">{threadsConnection.data?.connected ? `Connected @${threadsConnection.data.username ?? "Threads"}` : "Connect Threads"} <ExternalLink size={16} /></a><button type="button" onClick={() => applyGeminiRevision.mutate()} disabled={applyGeminiRevision.isPending} className="button-outline !border-[#e5a631]/70 !text-[#f4f0e8]"><span>{applyGeminiRevision.isPending ? "Revising Gemini drafts" : "Apply Gemini Bot EA revision"}</span>{applyGeminiRevision.isPending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}</button><button type="button" onClick={() => seed.mutate()} disabled={seed.isPending} className="button-primary shrink-0"><span>{seed.isPending ? "Preparing pilot" : "Prepare two-week pilot"}</span>{seed.isPending ? <Loader2 className="animate-spin" size={16} /> : <ExternalLink size={16} />}</button></div></div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Content queue status"><StatusCard label="Draft review" value={counts.draft} tone="text-[#e5a631]" /><StatusCard label="Approved to post" value={counts.approved} tone="text-[#0eafa7]" /><StatusCard label="Recorded published" value={counts.posted} tone="text-[#d3f1d8]" /><StatusCard label="Archived / superseded" value={counts.archived} tone="text-[#f0b1a0]" /></section>

      <section className="mt-6 rounded-[1.25rem] border border-[#0eafa7]/40 bg-[#0eafa7]/10 p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#6de0d8]">Threads connection</p><p className="mt-2 text-sm leading-6 text-[#d7e1dc]">{threadsConnection.isLoading ? "Checking secure owner connection…" : threadsConnection.data?.connected ? `Connected to @${threadsConnection.data.username ?? "Threads"}. The access token stays server-side. Approved drafts publish through the text or single-image Threads flow; no advertising or spend operation is available.` : "Not connected. Select Connect Threads, approve the requested owner permissions, and return here for identity verification. Approval remains unavailable until the owner account is connected."}</p></section>

      <section className="mt-6 rounded-[1.25rem] border border-[#e5a631]/40 bg-[#e5a631]/10 p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#e5a631]">Approval guardrail</p><p className="mt-2 max-w-4xl text-sm leading-6 text-[#d7e1dc]">Approval is the publish command for that exact stored caption, destination, and optional single image. The required risk notice is appended to the published text. Never approve claims of guaranteed returns, profits, win rates, or risk-free automation; review the final item before selecting Approve.</p></section>
      {message && <p role="status" className="mt-6 rounded-xl border border-[#0eafa7]/35 bg-[#0eafa7]/10 p-4 text-sm leading-6 text-[#d7e1dc]">{message}</p>}

      <section className="mt-8 space-y-5">
        {studio.isLoading && <div className="grid min-h-40 place-items-center rounded-[1.5rem] border border-white/15 bg-white/5"><Loader2 className="animate-spin text-[#e5a631]" /></div>}
        {studio.data?.map(item => <article key={item.id} className="rounded-[1.5rem] border border-white/15 bg-white/[.045] p-5 shadow-[4px_4px_0_rgba(229,166,49,.22)] lg:p-6" data-testid={`marketing-item-${item.id}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#c7d1cb]">{formatScheduledAt(item.scheduledFor)}</span><span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] ${statusStyle[item.status]}`}>{item.status === "rejected" && item.complianceFlags?.includes("superseded_by_gemini_20_day_campaign") ? "archived / superseded" : item.status}</span><span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#c7d1cb]">Compliance {item.complianceStatus}</span></div><h2 className="mt-3 font-display text-3xl tracking-[-.04em]">{item.title}</h2>{item.status === "rejected" && item.complianceFlags?.includes("superseded_by_gemini_20_day_campaign") && <p className="mt-2 text-xs leading-5 text-[#f0b1a0]">Archived when the earlier pilot was superseded by the Gemini Bot EA 20-day campaign. This is not a Threads provider rejection.</p>}<p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#e8eeea]">{item.caption}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] leading-5 text-[#c7d1cb]"><span className="rounded-lg border border-white/10 px-2 py-1">{item.caption.length}/500 characters</span><span className="rounded-lg border border-white/10 px-2 py-1">{item.language === "en_ms" ? "English + BM" : "English"}</span><a href={item.destinationUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2 py-1 hover:border-[#e5a631]">Review destination</a></div></div>{item.assetUrl && <img src={item.assetUrl} alt={item.assetAlt ?? "Marketing asset"} className="h-48 w-full rounded-2xl border border-white/10 object-cover lg:w-44" />}</div>
          <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-[1fr_auto]"><div><p className="font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#e5a631]">Required risk notice</p><p className="mt-1 text-xs leading-5 text-[#c7d1cb]">{item.riskNotice}</p><p className="mt-2 text-[11px] leading-5 text-[#8fa8a0]">{item.assetUrl ? "One supplied image will be attached when this item is published." : "This item will publish as text-only."}</p>{item.status === "publish_failed" && <p className="mt-2 text-xs leading-5 text-[#f0b1a0]">Automatic publication failed: {item.publishErrorMessage ?? "Review the connection and retry."}</p>}</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void copyCaption(item.id, item.caption)} className="button-outline !border-white/20 !text-[#f4f0e8]">{copiedId === item.id ? <Check size={15} /> : <Clipboard size={15} />}{copiedId === item.id ? "Copied" : "Copy caption"}</button>{item.status === "draft" && <><button type="button" onClick={() => approve.mutate({ contentItemId: item.id })} disabled={approve.isPending || retryPublish.isPending} aria-busy={approve.isPending} className="button-primary">{approve.isPending ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}{approve.isPending ? "Publishing…" : "Approve & publish"}</button><button type="button" onClick={() => reject.mutate({ contentItemId: item.id })} disabled={reject.isPending} className="button-outline !border-[#d67a63]/70 !text-[#f0b1a0]"><X size={15} />Reject</button></>}{item.status === "publish_pending" && <p role="status" className="rounded-lg border border-[#e5a631]/40 bg-[#e5a631]/10 px-3 py-2 text-xs text-[#f4d27e]">Publishing to Threads… the result will appear here when the provider confirms or rejects the post.</p>}{item.status === "publish_failed" && <button type="button" onClick={() => retryPublish.mutate({ contentItemId: item.id })} disabled={retryPublish.isPending || approve.isPending} aria-busy={retryPublish.isPending} className="button-primary !bg-[#0eafa7]">{retryPublish.isPending ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}{retryPublish.isPending ? "Retrying…" : "Retry publish"}</button>}</div></div>
        </article>)}
        {!studio.isLoading && !studio.data?.length && <div className="rounded-[1.5rem] border border-dashed border-white/20 p-10 text-center"><p className="font-display text-3xl">No pilot drafts yet.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#c7d1cb]">Prepare the two-week pilot to add the approval-gated content queue. This creates private draft records only.</p></div>}
      </section>
    </main>
  </div>;
}

function StatusCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-[1.25rem] border border-white/15 bg-white/[.045] p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#c7d1cb]">{label}</p><p className={`mt-3 font-display text-4xl ${tone}`}>{value}</p></div>;
}

function AccessState({ title, detail, action, href, onClick }: { title: string; detail: string; action: string; href?: string; onClick?: () => void }) {
  const content = <><ShieldCheck size={24} /><span>{action}</span></>;
  return <div className="grid min-h-screen place-items-center bg-[#17201f] px-5 text-[#f4f0e8]"><section className="max-w-md rounded-[1.5rem] border border-white/15 bg-white/5 p-8 text-center"><h1 className="font-display text-4xl tracking-[-.05em]">{title}</h1><p className="mt-4 text-sm leading-7 text-[#c7d1cb]">{detail}</p>{href ? <a href={href} className="button-primary mt-7">{content}</a> : <button type="button" onClick={onClick} className="button-primary mt-7">{content}</button>}</section></div>;
}
