import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Information used to provide portal access",
    body: "When you use the FizuxCoder Customer Portal, the service may process the account name and e-mail address supplied through sign-in, the EA product you select, ToyyibPay receipt references and verified payment status, entitlement dates, MT5 account number used for licence binding, and protected-download audit events. These records are used to verify access, maintain the requested licence, protect package delivery, and investigate misuse or support issues.",
  },
  {
    title: "Buyer e-mail notices and Gmail API access",
    body: "FizuxCoder uses the Google Gmail API with the send-only `gmail.send` permission solely to send activation and installation notices from xtr0zen@gmail.com after a customer has authenticated and the matching ToyyibPay receipt claim has been verified. The application does not use that permission to read, search, modify, delete, label, or inspect Gmail messages, attachments, contacts, mailbox settings, or message history. The server stores the administrator refresh authorization encrypted and records only limited delivery metadata needed to prevent duplicate notices and diagnose delivery failures.",
  },
  {
    title: "Third-party services",
    body: "ToyyibPay processes checkout and settlement transactions. Google provides the Gmail sending service for the administrator mailbox. The customer portal uses hosting, identity, database, and protected-storage services to operate the account and delivery workflow. Each provider handles information under its own policies. FizuxCoder does not receive or store payment-card details from ToyyibPay.",
  },
  {
    title: "Retention, access, and security",
    body: "Access, receipt-verification, entitlement, binding, and delivery records are retained only for as long as reasonably necessary to operate the service, meet legal or accounting obligations, resolve disputes, and protect the platform. Protected package files are not made permanently public. Reasonable administrative and technical measures are used to limit access, but no internet-based service can promise absolute security.",
  },
  {
    title: "Your choices and contact",
    body: "You may contact the administrator to ask about the personal information associated with your portal account, request correction of an incorrect e-mail address or MT5 binding, or raise a privacy concern. Customer activation notices are service messages tied to a verified purchase; promotional communication is not required for portal access. For privacy questions, contact xtr0zen@gmail.com.",
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#f4f0e8] text-[#17201f]">
      <header className="border-b border-[#17201f]/10 bg-[#f4f0e8]/90 backdrop-blur-xl"><div className="mx-auto flex min-h-18 max-w-[1100px] items-center justify-between px-5 lg:px-10"><a href="/" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]"><ArrowLeft size={15} /> Back to briefing</a><a href="/portal" className="button-primary button-small">Customer portal</a></div></header>
      <main className="px-5 py-14 lg:px-10 lg:py-20"><article className="mx-auto max-w-[920px]"><p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#0e716e]">FizuxCoder / operational privacy notice</p><h1 className="mt-5 max-w-3xl font-display text-[clamp(3.4rem,7vw,6.3rem)] leading-[.88] tracking-[-.065em]">Privacy, with the data path <em className="font-normal text-[#0e716e]">made visible.</em></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#52605d]">Effective 19 August 2026. This notice explains the information used to operate the FizuxCoder portal and the limited Gmail sending integration for verified buyer service notices.</p><div className="mt-10 grid gap-5 md:grid-cols-2"><div className="rounded-[1.5rem] bg-[#17201f] p-6 text-[#f4f0e8]"><ShieldCheck className="text-[#e5a631]" size={26} /><h2 className="mt-5 font-display text-3xl tracking-[-.04em]">Send-only e-mail access</h2><p className="mt-3 text-sm leading-6 text-[#c7d1cb]">Gmail API access is limited to sending automatic service notices after a verified purchase claim. It is not used to read your mailbox.</p></div><div className="rounded-[1.5rem] border border-[#17201f]/15 bg-[#fbf9f4] p-6"><Mail className="text-[#0e716e]" size={26} /><h2 className="mt-5 font-display text-3xl tracking-[-.04em]">Contact</h2><p className="mt-3 text-sm leading-6 text-[#52605d]">For account or privacy questions, write to <a className="font-semibold text-[#0e716e] underline decoration-[#e5a631] underline-offset-4" href="mailto:xtr0zen@gmail.com">xtr0zen@gmail.com</a>.</p></div></div><div className="mt-12 space-y-8">{sections.map((section, index) => <section key={section.title} className="border-t border-[#17201f]/15 pt-7"><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#e5a631]">{String(index + 1).padStart(2, "0")}</p><h2 className="mt-3 font-display text-3xl tracking-[-.04em]">{section.title}</h2><p className="mt-4 max-w-3xl text-[.98rem] leading-7 text-[#52605d]">{section.body}</p></section>)}</div></article></main>
    </div>
  );
}
