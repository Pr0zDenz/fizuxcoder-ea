import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowLeft, Check, Clipboard, ExternalLink, Loader2, LockKeyhole, PauseCircle, RefreshCw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

type ContentStatus = "draft" | "approved" | "publish_pending" | "publish_failed" | "posted" | "rejected";

const statusStyle: Record<ContentStatus, string> = {
  draft: "border-[#e5a631]/40 bg-[#e5a631]/10 text-[#e5a631]",
  approved: "border-[#0eafa7]/50 bg-[#0eafa7]/10 text-[#6de0d8]",
  publish_pending: "border-[#e5a631]/50 bg-[#e5a631]/10 text-[#f4d27e]",
  publish_failed: "border-[#d67a63]/70 bg-[#d67a63]/10 text-[#f0b1a0]",
  posted: "border-[#7db88e]/50 bg-[#7db88e]/10 text-[#d3f1d8]",
  rejected: "border-[#d67a63]/50 bg-[#d67a63]/10 text-[#f0b1a0]",
};

function formatScheduledAt(value: Date | null) {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" });
}

function isScreenshotDraft(item: { assetUrl: string | null; complianceFlags: string | null }) {
  return Boolean(item.assetUrl && item.complianceFlags?.includes("signal_screenshot_owner_review"));
}

export default function MarketingStudio() {
  const { user, loading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const studio = trpc.marketing.list.useQuery(undefined, { enabled: isAdmin });
  const threadsConnection = trpc.marketing.threadsConnection.useQuery(undefined, { enabled: isAdmin });
  const automation = trpc.marketing.automationStatus.useQuery(undefined, { enabled: isAdmin });
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [enablePhrase, setEnablePhrase] = useState("");

  const refresh = async () => {
    await Promise.all([
      utils.marketing.list.invalidate(),
      utils.marketing.automationStatus.invalidate(),
      utils.marketing.threadsConnection.invalidate(),
    ]);
  };

  const seed = trpc.marketing.seedTwoWeekPilot.useMutation({
    onSuccess: async result => { setMessage(`Two-week pilot ready: ${result.created} new draft(s), ${result.existing} existing item(s).`); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const applyGeminiRevision = trpc.marketing.applyGeminiBotRevision.useMutation({
    onSuccess: async result => { setMessage(`Evergreen Gemini Bot EA queue ready: ${result.created} created, ${result.revised} revised, ${result.current} already current, ${result.archived} prior drafts archived, ${result.skipped} protected from change. No Threads post was sent.`); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const approve = trpc.marketing.approve.useMutation({
    onMutate: variables => setMessage(`Publishing draft #${variables.contentItemId} to Threads. Keep this page open while the provider confirms the post.`),
    onSuccess: async result => { setMessage(`Approved and published to Threads${result.hasImage ? " with one image" : " as text-only"}. External post ID: ${result.externalPostId}. ${result.replenishment?.created ? `Fresh draft #${result.replenishment.contentItemId} is ready for review.` : "No duplicate replenishment draft was created."}`); await refresh(); },
    onError: error => setMessage(`Threads publication failed: ${error.message}`),
  });
  const retryPublish = trpc.marketing.retryPublish.useMutation({
    onMutate: variables => setMessage(`Retrying Threads publication for draft #${variables.contentItemId}. Keep this page open while the provider confirms the post.`),
    onSuccess: async result => { setMessage(`Threads retry succeeded${result.hasImage ? " with one image" : " as text-only"}. External post ID: ${result.externalPostId}.`); await refresh(); },
    onError: error => setMessage(`Threads retry failed: ${error.message}`),
  });
  const reject = trpc.marketing.reject.useMutation({
    onSuccess: async () => { setMessage("Draft rejected. It cannot be published unless a new reviewable draft is created."); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const verifyInvite = trpc.marketing.verifyPrivateInviteLink.useMutation({
    onSuccess: async () => { setMessage("The server-only private invite link was validated. Its value remains hidden from the browser."); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const prepareGrowth = trpc.marketing.prepareTelegramGrowthDrafts.useMutation({
    onSuccess: async result => { setMessage(`Private Telegram-growth drafts ready: ${result.created} created, ${result.existing} already retained. All remain owner-review drafts.`); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const setEligibility = trpc.marketing.setScheduleEligibility.useMutation({
    onSuccess: async result => { setMessage(result.scheduled ? "The exact reviewed draft is now eligible for the scheduled queue." : "This draft has been removed from the scheduled queue."); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const killSwitch = trpc.marketing.engageAutomationKillSwitch.useMutation({
    onSuccess: async () => { setMessage("Kill switch engaged. The scheduled publisher is paused and will skip all runs."); await refresh(); },
    onError: error => setMessage(error.message),
  });
  const enableSchedule = trpc.marketing.enableThreeDailyPublishing.useMutation({
    onSuccess: async () => { setMessage("Three-daily scheduled Threads publishing is now enabled for approved queue items. One item maximum can publish per run."); setEnablePhrase(""); await refresh(); },
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
      setMessage("Copy failed in this browser. Select the caption text manually before using it.");
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#17201f] text-[#f4f0e8]"><Loader2 className="animate-spin" size={30} /></div>;
  if (!isAuthenticated) return <AccessState title="Sign in required" detail="The marketing studio is restricted to the administrator account." action="Sign in" onClick={startLogin} />;
  if (!isAdmin) return <AccessState title="Administrator access required" detail="This content workspace is not available to your account." action="Return to customer portal" href="/portal" />;

  const automationPaused = automation.data?.automaticPublishingEnabled !== "yes" || automation.data?.killSwitchEngaged !== "no";

  return <div className="min-h-screen bg-[#17201f] px-5 py-10 text-[#f4f0e8] lg:px-10 lg:py-14" data-testid="marketing-studio">
    <main className="mx-auto max-w-[1240px]">
      <a href="/admin/operations" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#c7d1cb] transition hover:text-[#e5a631]"><ArrowLeft size={14} />Administrator operations</a>

      <section className="mt-7 border-b border-white/15 pb-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#e5a631]">Private evergreen studio · owner-governed Threads workflow</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="font-display text-5xl tracking-[-.06em]">Content studio.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d1cb]">Review a final caption, destination, and optional single image. Manual approval can publish immediately. Scheduled publishing is a separate queue and requires a reviewed item, a valid server-only private invite link, and the visible kill switch released by you.</p></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <a href="/api/threads/oauth/start" className="button-outline !border-[#0eafa7]/70 !text-[#f4f0e8]">{threadsConnection.data?.connected ? `Connected @${threadsConnection.data.username ?? "Threads"}` : "Connect Threads"}<ExternalLink size={16} /></a>
            <button type="button" onClick={() => applyGeminiRevision.mutate()} disabled={applyGeminiRevision.isPending} className="button-outline !border-[#e5a631]/70 !text-[#f4f0e8]">{applyGeminiRevision.isPending ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}{applyGeminiRevision.isPending ? "Refreshing drafts" : "Refresh evergreen drafts"}</button>
            <button type="button" onClick={() => seed.mutate()} disabled={seed.isPending} className="button-primary">{seed.isPending ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}{seed.isPending ? "Preparing pilot" : "Prepare two-week pilot"}</button>
          </div>
        </div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Content queue status">
        <StatusCard label="Draft review" value={counts.draft} tone="text-[#e5a631]" />
        <StatusCard label="Scheduled queue" value={automation.data?.queuedCount ?? 0} tone="text-[#6de0d8]" />
        <StatusCard label="Approved manual" value={counts.approved} tone="text-[#0eafa7]" />
        <StatusCard label="Published" value={counts.posted} tone="text-[#d3f1d8]" />
        <StatusCard label="Archived" value={counts.archived} tone="text-[#f0b1a0]" />
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-[#6de0d8]/35 bg-[linear-gradient(130deg,rgba(14,175,167,.16),rgba(12,21,20,.62))] p-5 shadow-[4px_4px_0_rgba(14,175,167,.14)] lg:p-6" data-testid="telegram-growth-funnel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#6de0d8]"><LockKeyhole size={13} />Telegram growth funnel · restricted configuration</p><h2 className="mt-3 font-display text-3xl tracking-[-.045em]">Private channel, controlled invitation.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#d7e1dc]">The join link is intentionally held only as server configuration and is never rendered in this browser. Fresh Telegram-growth copy stays draft-only until you nominate its exact final text for the scheduled queue. EA signal delivery and VPS screenshot intake are not linked to this automation.</p></div><div className={`rounded-full border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.12em] ${automation.data?.inviteLinkConfigured ? "border-[#7db88e]/45 bg-[#7db88e]/10 text-[#d3f1d8]" : "border-[#e5a631]/45 bg-[#e5a631]/10 text-[#f4d27e]"}`}>{automation.data?.inviteLinkConfigured ? "Private invite verified" : "Private invite required"}</div></div>
        <div className="mt-5 grid gap-3 md:grid-cols-3"><FunnelStep number="01" title="Secure link" detail="Store and validate a revocable private t.me invite only in administrator configuration." active={Boolean(automation.data?.inviteLinkConfigured)} /><FunnelStep number="02" title="Review exact draft" detail="Create or inspect marketing copy; screenshots remain evidence drafts until individually selected." active={(automation.data?.queuedCount ?? 0) > 0} /><FunnelStep number="03" title="Release deliberately" detail="Schedule remains paused by default; it may publish one reviewed queue item per approved run." active={!automationPaused} /></div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="button-outline !border-[#6de0d8]/50 !text-[#f4f0e8]" onClick={() => verifyInvite.mutate()} disabled={verifyInvite.isPending}>{verifyInvite.isPending ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}Validate secure invite</button><button type="button" className="button-outline !border-[#e5a631]/55 !text-[#f4f0e8]" onClick={() => prepareGrowth.mutate()} disabled={prepareGrowth.isPending}>{prepareGrowth.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}Create invite drafts</button></div>
      </section>

      <section className="mt-6 rounded-[1.5rem] border border-[#e5a631]/40 bg-[#e5a631]/10 p-5 lg:p-6" data-testid="scheduled-threads-control">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#e5a631]">Threads automation guardrail</p><h2 className="mt-3 font-display text-3xl tracking-[-.045em]">{automationPaused ? "Paused by default" : "Scheduled publisher active"}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[#d7e1dc]">Proposed cadence: 09:00, 13:00, and 21:00 Malaysia time. The worker can post at most one approved queue item each run. It records skips, failures, and confirmed posts. A signal screenshot is never eligible unless you review and select it item by item.</p></div><div className={`rounded-2xl border px-4 py-3 text-sm ${automationPaused ? "border-[#e5a631]/35 bg-black/10 text-[#f4d27e]" : "border-[#7db88e]/45 bg-[#7db88e]/10 text-[#d3f1d8]"}`}><p className="font-mono text-[9px] font-bold uppercase tracking-[.12em]">Kill switch</p><p className="mt-1 font-semibold">{automationPaused ? "ENGAGED / SAFE" : "RELEASED"}</p><p className="mt-1 text-xs leading-5 opacity-80">{automation.data?.scheduleConfigured ? "Heartbeat task linked" : "No task created yet"}</p></div></div>
        <div className="mt-5 grid gap-3 border-t border-[#e5a631]/20 pt-5 lg:grid-cols-[1fr_auto_auto]"><label className="block"><span className="font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#f4d27e]">Final owner confirmation</span><input value={enablePhrase} onChange={event => setEnablePhrase(event.target.value)} placeholder="Type ENABLE THREADS AUTO POSTING" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-[#f4f0e8] outline-none transition placeholder:text-[#8fa8a0] focus:border-[#e5a631]" /></label><button type="button" className="button-primary self-end !bg-[#0eafa7]" onClick={() => enableSchedule.mutate({ confirmationPhrase: enablePhrase as "ENABLE THREADS AUTO POSTING" })} disabled={enableSchedule.isPending || enablePhrase !== "ENABLE THREADS AUTO POSTING"}>{enableSchedule.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{automationPaused ? "Enable 3 daily posts" : "Reconfirm schedule"}</button><button type="button" className="button-outline self-end !border-[#d67a63]/70 !text-[#f0b1a0]" onClick={() => killSwitch.mutate()} disabled={killSwitch.isPending}>{killSwitch.isPending ? <Loader2 size={16} className="animate-spin" /> : <PauseCircle size={16} />}Engage kill switch</button></div>
      </section>

      <section className="mt-6 rounded-[1.25rem] border border-[#7c9ee8]/35 bg-[#7c9ee8]/10 p-5" data-testid="threads-activity-guidance"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#b9cdfb]">Owner-supplied Threads activity guidance</p><div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><div><p className="text-sm font-semibold text-[#edf2ff]">Tuesday · 23:00–02:00 GMT+8</p><p className="mt-1 text-xs leading-5 text-[#c5d5ff]">91 observed views in the owner’s current audience insight.</p></div><div><p className="text-sm font-semibold text-[#edf2ff]">Wednesday · 02:00–05:00 GMT+8</p><p className="mt-1 text-xs leading-5 text-[#c5d5ff]">62 observed views in the owner’s current audience insight.</p></div><p className="self-center text-xs leading-5 text-[#c5d5ff]">Guidance only—not a guarantee of reach. The three-post schedule stays paused until you set and explicitly confirm exact times.</p></div></section>

      <section className="mt-6 rounded-[1.25rem] border border-[#7db88e]/40 bg-[#7db88e]/10 p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#d3f1d8]">Signal evidence intake · draft only</p><p className="mt-2 max-w-4xl text-sm leading-6 text-[#d7e1dc]">Authenticated Gemini Bot EA setup and take-profit screenshots may arrive from the VPS. Each event creates an owner-review image draft with a portal link. It does not publish to Threads, post back to Telegram, or alter the EA signal channel. Review full context and redact account identifiers before you select any screenshot for the scheduled queue.</p></section>
      <section className="mt-6 rounded-[1.25rem] border border-[#0eafa7]/40 bg-[#0eafa7]/10 p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#6de0d8]">Threads connection</p><p className="mt-2 text-sm leading-6 text-[#d7e1dc]">{threadsConnection.isLoading ? "Checking secure owner connection." : threadsConnection.data?.connected ? `Connected to @${threadsConnection.data.username ?? "Threads"}. The access token stays server-side.` : "Not connected. Select Connect Threads, approve the owner permissions, and return for identity verification."}</p></section>
      <section className="mt-6 rounded-[1.25rem] border border-[#d67a63]/40 bg-[#d67a63]/10 p-5"><p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#f0b1a0]"><AlertTriangle size={13} />Approval guardrail</p><p className="mt-2 max-w-4xl text-sm leading-6 text-[#d7e1dc]">Manual “Approve & publish” remains an immediate action for one exact stored item. “Approve for scheduled queue” is distinct and does not post now. Never use claims of guaranteed returns, profits, win rates, risk-free automation, or urgency based on promised returns.</p></section>

      {message && <p role="status" className="mt-6 rounded-xl border border-[#0eafa7]/35 bg-[#0eafa7]/10 p-4 text-sm leading-6 text-[#d7e1dc]">{message}</p>}

      <section className="mt-8 space-y-5">
        {studio.isLoading && <div className="grid min-h-40 place-items-center rounded-[1.5rem] border border-white/15 bg-white/5"><Loader2 className="animate-spin text-[#e5a631]" /></div>}
        {studio.data?.map(item => {
          const screenshot = isScreenshotDraft(item);
          const scheduleEligible = item.automationEligible === "yes";
          return <article key={item.id} className="rounded-[1.5rem] border border-white/15 bg-white/[.045] p-5 shadow-[4px_4px_0_rgba(229,166,49,.16)] lg:p-6" data-testid={`marketing-item-${item.id}`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#c7d1cb]">{formatScheduledAt(item.scheduledFor)}</span><span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] ${statusStyle[item.status]}`}>{item.status === "rejected" && item.complianceFlags?.includes("superseded_by_gemini_20_day_campaign") ? "archived / superseded" : item.status}</span><span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#c7d1cb]">Compliance {item.complianceStatus}</span>{scheduleEligible && <span className="rounded-full border border-[#6de0d8]/45 bg-[#0eafa7]/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#6de0d8]">Schedule eligible</span>}{screenshot && <span className="rounded-full border border-[#e5a631]/45 bg-[#e5a631]/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#f4d27e]">Screenshot review required</span>}</div><h2 className="mt-3 font-display text-3xl tracking-[-.04em]">{item.title}</h2>{item.status === "rejected" && item.complianceFlags?.includes("superseded_by_gemini_20_day_campaign") && <p className="mt-2 text-xs leading-5 text-[#f0b1a0]">Archived when the earlier pilot was superseded. This is not a Threads provider rejection.</p>}<p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#e8eeea]">{item.caption}</p><div className="mt-4 flex flex-wrap gap-2 text-[11px] leading-5 text-[#c7d1cb]"><span className="rounded-lg border border-white/10 px-2 py-1">{item.caption.length}/500 characters</span><span className="rounded-lg border border-white/10 px-2 py-1">{item.language === "en_ms" ? "English + BM" : "English"}</span><a href={item.destinationUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 px-2 py-1 transition hover:border-[#e5a631]">Review destination</a></div></div>{item.assetUrl && <figure className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/20 p-2 lg:w-52"><img src={item.assetUrl} alt={item.assetAlt ?? "Marketing asset"} className="h-52 w-full rounded-xl object-contain" data-testid="marketing-screenshot" /><figcaption className="px-1 pt-2 text-[10px] leading-4 text-[#8fa8a0]">{screenshot ? "Owner-review screenshot · verify complete context" : "One selected image may be attached"}</figcaption></figure>}</div>
            <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 lg:grid-cols-[1fr_auto]"><div><p className="font-mono text-[9px] font-bold uppercase tracking-[.12em] text-[#e5a631]">Required risk notice</p><p className="mt-1 text-xs leading-5 text-[#c7d1cb]">{item.riskNotice}</p><p className="mt-2 text-[11px] leading-5 text-[#8fa8a0]">{item.assetUrl ? "One supplied image is retained for review before posting." : "This item will publish as text-only."}</p>{item.status === "publish_failed" && <p className="mt-2 text-xs leading-5 text-[#f0b1a0]">Publication failed: {item.publishErrorMessage ?? "Review the connection and retry."}</p>}</div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void copyCaption(item.id, item.caption)} className="button-outline !border-white/20 !text-[#f4f0e8]">{copiedId === item.id ? <Check size={15} /> : <Clipboard size={15} />}{copiedId === item.id ? "Copied" : "Copy caption"}</button>{(item.status === "draft" || (item.status === "approved" && scheduleEligible)) && <button type="button" onClick={() => setEligibility.mutate({ contentItemId: item.id, eligible: !scheduleEligible })} disabled={setEligibility.isPending} className="button-outline !border-[#6de0d8]/55 !text-[#f4f0e8]">{scheduleEligible ? <X size={15} /> : <ShieldCheck size={15} />}{scheduleEligible ? "Remove from schedule" : "Approve for schedule"}</button>}{item.status === "draft" && <><button type="button" onClick={() => approve.mutate({ contentItemId: item.id })} disabled={approve.isPending || retryPublish.isPending || setEligibility.isPending} aria-busy={approve.isPending} className="button-primary">{approve.isPending ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}{approve.isPending ? "Publishing" : "Approve & publish"}</button><button type="button" onClick={() => reject.mutate({ contentItemId: item.id })} disabled={reject.isPending} className="button-outline !border-[#d67a63]/70 !text-[#f0b1a0]"><X size={15} />Reject</button></>}{item.status === "publish_pending" && <p role="status" className="rounded-lg border border-[#e5a631]/40 bg-[#e5a631]/10 px-3 py-2 text-xs text-[#f4d27e]">Publishing to Threads. The result appears after provider confirmation.</p>}{item.status === "publish_failed" && <button type="button" onClick={() => retryPublish.mutate({ contentItemId: item.id })} disabled={retryPublish.isPending || approve.isPending} aria-busy={retryPublish.isPending} className="button-primary !bg-[#0eafa7]">{retryPublish.isPending ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />}{retryPublish.isPending ? "Retrying" : "Retry publish"}</button>}</div></div>
          </article>;
        })}
        {!studio.isLoading && !studio.data?.length && <div className="rounded-[1.5rem] border border-dashed border-white/20 p-10 text-center"><p className="font-display text-3xl">No drafts yet.</p><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#c7d1cb]">Prepare the evergreen queue or validate the private invitation configuration to add owner-review growth drafts. Neither action posts to Threads.</p></div>}
      </section>
    </main>
  </div>;
}

function StatusCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-[1.25rem] border border-white/15 bg-white/[.045] p-5"><p className="font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#c7d1cb]">{label}</p><p className={`mt-3 font-display text-4xl ${tone}`}>{value}</p></div>;
}

function FunnelStep({ number, title, detail, active }: { number: string; title: string; detail: string; active: boolean }) {
  return <div className={`rounded-2xl border p-4 transition ${active ? "border-[#6de0d8]/45 bg-[#0eafa7]/10" : "border-white/10 bg-black/10"}`}><p className="font-mono text-[10px] font-bold tracking-[.12em] text-[#e5a631]">{number}</p><h3 className="mt-2 font-display text-xl tracking-[-.035em]">{title}</h3><p className="mt-2 text-xs leading-5 text-[#c7d1cb]">{detail}</p></div>;
}

function AccessState({ title, detail, action, href, onClick }: { title: string; detail: string; action: string; href?: string; onClick?: () => void }) {
  const content = <><ShieldCheck size={24} /><span>{action}</span></>;
  return <div className="grid min-h-screen place-items-center bg-[#17201f] px-5 text-[#f4f0e8]"><section className="max-w-md rounded-[1.5rem] border border-white/15 bg-white/5 p-8 text-center"><h1 className="font-display text-4xl tracking-[-.05em]">{title}</h1><p className="mt-4 text-sm leading-7 text-[#c7d1cb]">{detail}</p>{href ? <a href={href} className="button-primary mt-7">{content}</a> : <button type="button" onClick={onClick} className="button-primary mt-7">{content}</button>}</section></div>;
}
