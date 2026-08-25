/**
 * Signal Ledger design: Swiss-modernist editorial briefing with evidence-first messaging,
 * warm paper ground, deep signal teal interaction points, and transparent broker disclosure.
 */
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Braces,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  ExternalLink,
  Layers3,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

const brokerUrl = "https://trk.pepperstonepartners.com/SH1TD";
const geminiPurchaseUrl = "https://toyyibpay.com/t1rvxbft";
const threeSPurchaseUrl = "https://toyyibpay.com/3-Serangkai-EA";

const products = {
  gemini: {
    index: "01",
    name: "Gemini Bot EA",
    version: "v11.97",
    eyebrow: "Machine learning & volatility quant engine",
    statement: "Built to adapt operational parameters across changing volatility conditions.",
    image: "/manus-storage/gemini-bot-visual_2a5151dd.jpg",
    accent: "amber",
    features: [
      "Remote parameter configuration through a REST API connection",
      "Three-state market regime classification: quiet, normal, and extreme volatility",
      "Price-action recovery logic using micro-consolidation bases and Fibonacci objectives",
      "Pre-news stop-order workflow intended to manage breakout-event windows",
      "Multi-timeframe safe take-profit scanning from M1 to D1",
      "Tick-level profit-monitor and virtual trailing-stop controls",
    ],
  },
  universal: {
    index: "02",
    name: "3 Serangkai UNIVERSAL EA",
    version: "v13.85",
    eyebrow: "17-pillar matrix & Markov Logic Network engine",
    statement: "A multi-layer basket-management framework with explicit market-state verification.",
    image: "/manus-storage/universal-ea-visual_56634923.jpg",
    accent: "teal",
    features: [
      "Markov Logic Network bridge for sending pillar scores and receiving probabilistic states",
      "Seventeen verification dimensions across fundamental, PA/noise, and technical tiers",
      "DT3-ZigZag swing integration for higher-timeframe structural alignment",
      "Native calendar and clustered-news context, including USD sentiment filtering",
      "Emergency basket-liquidity logic when combined conditions weaken",
      "Orphan pending-order sweep after the main basket reaches its take-profit condition",
    ],
  },
} as const;

const comparison = [
  ["Core architecture", "Machine learning + volatility quant", "17-pillar matrix + Markov Logic Network"],
  ["Primary signal input", "FMCBR breakouts and M1 directional context", "DT3-ZigZag swings and multi-pillar approval"],
  ["External connection", "REST API /config for live parameters", "WebRequest /mln_predict and /mln_feedback"],
  ["News context", "Pre-news stop-order breakout workflow", "Native calendar and clustered-sentiment filter"],
  ["Drawdown controls", "Pyramiding and price-action base re-entry", "Dynamic Fibonacci sizing and emergency score logic"],
  ["Exit logic", "Adaptive MTF Fibonacci target and cash escape", "Dedicated safe TP and orphan-order sweep"],
  ["Account scope", "Standard and cent accounts; auto-detection", "Standard and cent accounts; auto-detection"],
];

const faq = [
  {
    question: "What is an Expert Advisor?",
    answer:
      "An Expert Advisor is software that can automate predefined trading tasks inside MetaTrader. Automation does not remove market, execution, connectivity, or configuration risk.",
  },
  {
    question: "Which EA is the better fit?",
    answer:
      "Gemini Bot is positioned around adaptive volatility and price-action recovery workflows. 3 Serangkai UNIVERSAL is positioned around a broader rule-and-probability decision matrix. Review the feature sheet, test on a demo environment, and assess your own operational requirements before enabling either system.",
  },
  {
    question: "Does the website provide performance forecasts?",
    answer:
      "No. The site intentionally avoids profit projections and return forecasts. Historical testing, live records, spreads, slippage, commissions, liquidity, and user configuration can produce materially different outcomes.",
  },
  {
    question: "Why is Pepperstone shown as a setup option?",
    answer:
      "The supplied registration pathway is a referral link. If you choose to register through it, the site operator may receive compensation. You remain responsible for reviewing the broker's terms, local availability, and suitability for your circumstances.",
  },
  {
    question: "How does the 3S license-activation release work?",
    answer:
      "The current 3S release design uses a one-time activation code, License ID, and authorized MT5 account number. The EA sends those values to the supplied HTTPS activation endpoint, which validates the license and returns a customer-specific API key. A master server key is never a customer input. The replacement library release is still under validation and will be published only after the package and public activation endpoint are confirmed.",
  },
];

function SignalMark({ className = "" }: { className?: string }) {
  return (
    <img
      src="/manus-storage/fizuxcoder-mark_c48fdfd3.png"
      alt="FizuxCoder three-stroke signal mark"
      className={className}
    />
  );
}

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className="section-label">
      <span>{index}</span>
      <i />
      <p>{children}</p>
    </div>
  );
}

function PurchaseCard({ eyebrow, title, price, priorPrice, detail, href }: { eyebrow: string; title: string; price: string; priorPrice: string; detail: string; href: string }) {
  return <article className="flex flex-col rounded-[2rem] border border-[#17201f]/15 bg-[#d7e1dc] p-7 shadow-[10px_10px_0_#0e716e] lg:p-9"><div className="flex items-start justify-between gap-5"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">{eyebrow}</p><h3 className="mt-4 max-w-lg font-display text-4xl leading-none tracking-[-.05em]">{title}</h3></div><Sparkles className="shrink-0 text-[#e5a631]" size={31} /></div><p className="mt-6 flex-1 text-[.96rem] leading-7 text-[#52605d]">{detail}</p><div className="mt-8 flex flex-col gap-5 border-t border-[#17201f]/15 pt-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-sm font-medium text-[#8d6c53] line-through">Was {priorPrice}</p><p className="mt-1 font-display text-4xl tracking-[-.05em]">{price}</p></div><a href={href} target="_blank" rel="noreferrer" className="button-dark">Pay securely <ExternalLink size={17} /></a></div></article>;
}

export default function Home() {
  const [activeProduct, setActiveProduct] = useState<keyof typeof products>("gemini");
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [riskOpen, setRiskOpen] = useState(false);
  const [setup, setSetup] = useState(2);

  const active = products[activeProduct];
  const setupMessage = useMemo(() => {
    const messages = [
      "Begin with architecture review and a demo-only installation.",
      "Add broker-account specification and platform connection checks.",
      "Introduce a small, separately monitored live configuration only after your own testing.",
      "Document changes, review execution conditions, and avoid treating automation as unattended certainty.",
    ];
    return messages[setup - 1];
  }, [setup]);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f4f0e8] text-[#17201f]">
      <header className="sticky top-0 z-50 border-b border-[#17201f]/10 bg-[#f4f0e8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <a href="#top" className="flex items-center gap-3" aria-label="FizuxCoder home">
            <SignalMark className="h-11 w-11 object-contain" />
            <div className="leading-none">
              <p className="font-display text-[1.35rem] tracking-[-0.045em]">FizuxCoder</p>
              <p className="mt-1 font-mono text-[9px] font-semibold tracking-[0.18em] text-[#0e716e]">AUTOMATION BRIEF / 2026</p>
            </div>
          </a>

          <nav className="hidden items-center gap-7 font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-[#52605d] lg:flex">
            <a href="#systems" className="nav-link">Systems</a>
            <a href="#matrix" className="nav-link">Matrix</a>
            <a href="#protocol" className="nav-link">Setup protocol</a>
            <a href="#activation" className="nav-link">3S activation</a>
            <a href="/portal" className="nav-link">Customer portal</a>
            <a href="#disclosure" className="nav-link">Risk notes</a>
          </nav>

          <div className="hidden lg:block">
            <a href="/portal" className="button-primary button-small">
              Customer portal <ArrowUpRight size={15} />
            </a>
          </div>
          <button
            type="button"
            aria-label="Toggle navigation"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#17201f]/15 lg:hidden"
            onClick={() => setMobileNavOpen((value) => !value)}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={19} />}
          </button>
        </div>
        {mobileNavOpen && (
          <div className="border-t border-[#17201f]/10 bg-[#f4f0e8] px-5 py-5 lg:hidden">
            <div className="flex flex-col gap-4 font-mono text-xs uppercase tracking-[0.12em]">
              {[
                ["Systems", "#systems"],
                ["Matrix", "#matrix"],
                ["Setup protocol", "#protocol"],
                ["3S activation", "#activation"],
                ["Risk notes", "#disclosure"],
              ].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMobileNavOpen(false)}>{label}</a>
              ))}
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="hero-shell">
          <div className="hero-grain" />
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-12 pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,.95fr)] lg:px-10 lg:pb-20 lg:pt-20">
            <div className="relative z-10 flex flex-col justify-between lg:pr-10">
              <div>
                <SectionLabel index="00">FizuxCoder / Expert Advisor dossier</SectionLabel>
                <h1 className="mt-9 max-w-3xl font-display text-[clamp(3.5rem,7vw,7.35rem)] leading-[0.88] tracking-[-0.07em] text-[#17201f]">
                  Automation,
                  <br />
                  <em className="font-display font-normal text-[#0e716e]">with the assumptions</em>
                  <br />left visible.
                </h1>
                <p className="mt-8 max-w-xl text-[1.05rem] leading-8 text-[#4a5855] lg:text-[1.18rem]">
                  Two distinct MT5 Expert Advisor architectures for traders who want to study the system before they configure it. Review the decision logic, compare the controls, and use a measured setup path.
                </p>
              </div>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <a href="#systems" className="button-primary">
                  Examine the systems <ArrowRight size={17} />
                </a>
                <button type="button" className="button-text" onClick={() => setRiskOpen(true)}>
                  <CircleAlert size={16} /> Read risk note
                </button>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#17201f]/15 pt-5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#64706d]">
                <span>MT5-compatible workflow</span>
                <span className="text-[#0e716e]">•</span>
                <span>Two-system comparison</span>
                <span className="text-[#0e716e]">•</span>
                <span>Risk-first setup path</span>
              </div>
            </div>

            <div className="relative min-h-[410px] overflow-hidden rounded-[2.25rem] border border-white/50 bg-[#17201f] shadow-[24px_30px_0_#d8d0c2] lg:min-h-[610px]">
              <img
                src="/manus-storage/fizuxcoder-hero-terminal_00e89626.jpg"
                alt="Abstract quantitative trading workstation"
                className="absolute inset-0 h-full w-full object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#17201f] via-[#17201f]/10 to-transparent" />
              <div className="absolute left-6 top-6 flex items-center gap-2 rounded-full border border-white/20 bg-[#17201f]/75 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#f4f0e8] backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#e5a631]" /> System briefing
              </div>
              <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/15 bg-[#17201f]/75 p-5 text-[#f4f0e8] backdrop-blur-lg">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d8d0c2]">A considered view of automation</p>
                <p className="mt-3 max-w-sm font-display text-2xl leading-tight tracking-[-0.035em]">Structured systems deserve a structured review.</p>
              </div>
            </div>
          </div>
          <div className="ticker-line" aria-hidden="true">
            <div>CONFIGURATION • CONTEXT • EXECUTION • DISCIPLINE • REVIEW • CONFIGURATION • CONTEXT • EXECUTION • DISCIPLINE • REVIEW •</div>
          </div>
        </section>

        <section id="systems" className="relative bg-[#17201f] py-20 text-[#f4f0e8] lg:py-28">
          <div className="edition-rail edition-rail-dark"><span>01</span><i /></div>
          <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
            <div className="max-w-3xl">
              <SectionLabel index="01">Two engines, two analytical routes</SectionLabel>
              <h2 className="mt-7 font-display text-[clamp(2.8rem,5vw,5rem)] leading-[.92] tracking-[-0.06em]">Choose the lens before you choose the logic.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#c9c7c0]">The systems share an automated-trading setting, but they approach market context differently. Select an engine to view its supplied capability summary.</p>
            </div>

            <div className="mt-12 grid gap-7 lg:grid-cols-[.72fr_1.28fr]">
              <div className="flex flex-col gap-3">
                {(Object.entries(products) as [keyof typeof products, typeof products[keyof typeof products]][]).map(([key, product]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveProduct(key)}
                    className={`product-tab ${activeProduct === key ? "product-tab-active" : ""}`}
                    aria-pressed={activeProduct === key}
                  >
                    <span className="font-mono text-xs text-[#e5a631]">{product.index}</span>
                    <span className="text-left">
                      <strong className="block font-display text-2xl tracking-[-0.035em]">{product.name}</strong>
                      <small>{product.eyebrow}</small>
                    </span>
                    <ArrowDownRight className="ml-auto" size={18} />
                  </button>
                ))}
                <p className="mt-5 border-l border-[#0e716e] pl-4 text-sm leading-6 text-[#b9c2bd]">Capabilities are adapted from the source material you supplied. They describe intended system logic, not a guarantee of output, market access, or suitability.</p>
              </div>

              <article className="overflow-hidden rounded-[2rem] bg-[#f4f0e8] text-[#17201f] shadow-[12px_12px_0_rgba(14,113,110,.7)]">
                <div className="grid md:grid-cols-[.8fr_1.2fr]">
                  <div className="relative min-h-[300px] overflow-hidden bg-[#0e716e]">
                    <img src={active.image} alt={`${active.name} concept visual`} className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e716e] via-transparent to-transparent" />
                    <div className="absolute bottom-5 left-5 rounded-full bg-[#f4f0e8] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0e716e]">{active.version}</div>
                  </div>
                  <div className="p-7 lg:p-10">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0e716e]">{active.eyebrow}</p>
                        <h3 className="mt-4 font-display text-4xl leading-none tracking-[-0.055em]">{active.name}</h3>
                      </div>
                      {activeProduct === "gemini" ? <Bot className="shrink-0 text-[#e5a631]" size={32} /> : <Layers3 className="shrink-0 text-[#0e716e]" size={32} />}
                    </div>
                    <p className="mt-6 text-lg leading-7 text-[#50615d]">{active.statement}</p>
                    <ul className="mt-7 grid gap-3">
                      {active.features.map((feature) => (
                        <li key={feature} className="flex gap-3 border-t border-[#17201f]/10 pt-3 text-[.91rem] leading-6">
                          <Check className="mt-1 shrink-0 text-[#0e716e]" size={14} strokeWidth={3} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-7 flex flex-col gap-3 border-t border-[#17201f]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-[#63706b]">Secure purchase route / ToyyibPay</p>
                      <a href={activeProduct === "gemini" ? geminiPurchaseUrl : threeSPurchaseUrl} target="_blank" rel="noreferrer" className="button-primary button-small">
                        Get {activeProduct === "gemini" ? "Gemini Bot EA" : "3S Universal EA"} <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="matrix" className="relative py-20 lg:py-28">
          <div className="edition-rail"><span>02</span><i /></div>
          <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div>
                <SectionLabel index="02">Feature comparison matrix</SectionLabel>
                <h2 className="mt-7 font-display text-[clamp(2.8rem,5vw,4.8rem)] leading-[.92] tracking-[-0.06em]">A matrix for questions worth asking.</h2>
              </div>
              <p className="max-w-xl text-lg leading-8 text-[#53605e]">The table compares the supplied architecture descriptions. It is not a product ranking and does not measure real-world performance. Confirm any implementation detail directly with the developer before installation.</p>
            </div>
            <div className="mt-12 overflow-hidden rounded-[1.5rem] border border-[#17201f]/15 bg-[#fbf9f4] shadow-[10px_10px_0_#d8d0c2]">
              <div className="overflow-x-auto">
                <table className="comparison-table min-w-[800px] w-full text-left">
                  <thead>
                    <tr>
                      <th>Capability</th>
                      <th><span className="text-[#d18414]">01</span> Gemini Bot EA <small>v11.97</small></th>
                      <th><span className="text-[#0e716e]">02</span> 3 Serangkai UNIVERSAL <small>v13.65</small></th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map(([title, gemini, universal]) => (
                      <tr key={title}>
                        <th>{title}</th>
                        <td>{gemini}</td>
                        <td>{universal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-[#17201f]/10 px-6 py-4 font-mono text-[10px] uppercase tracking-[0.11em] text-[#68726f]">Capability descriptions supplied by the creator • Verify platform requirements, endpoint availability, and broker restrictions independently</p>
            </div>
          </div>
        </section>

        <section id="protocol" className="relative bg-[#d7e1dc] py-20 lg:py-28">
          <div className="edition-rail"><span>03</span><i /></div>
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-[.83fr_1.17fr] lg:px-10">
            <div>
              <SectionLabel index="03">An educational setup worksheet</SectionLabel>
              <h2 className="mt-7 max-w-xl font-display text-[clamp(2.8rem,5vw,5rem)] leading-[.92] tracking-[-0.06em]">Sequence the setup. Do not chase the outcome.</h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-[#455651]">Use this simple planner to frame the operational order of review. It is not a forecast, a signal service, or a recommendation to deposit, trade, or select a broker.</p>
              <div className="mt-8 flex items-start gap-3 rounded-2xl bg-[#f4f0e8]/75 p-4 text-sm leading-6 text-[#4f5d59]">
                <ShieldCheck className="mt-0.5 shrink-0 text-[#0e716e]" size={20} />
                <p>Begin in a demo environment. Check local regulation, read the EA documentation, and define your own limits before moving to any live setting.</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] bg-[#17201f] p-7 text-[#f4f0e8] shadow-[14px_14px_0_#0e716e] lg:p-10">
              <div className="absolute -right-12 -top-10 h-40 w-40 rounded-full border border-[#e5a631]/40" />
              <p className="relative font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#e5a631]">Setup stage / {String(setup).padStart(2, "0")}</p>
              <div className="relative mt-6 flex justify-between font-display text-3xl tracking-[-0.05em]">
                <span>Review path</span><span className="text-[#0eafa7]">{setup}/4</span>
              </div>
              <input
                aria-label="Select setup stage"
                className="stage-range relative mt-10 w-full"
                type="range"
                min="1"
                max="4"
                step="1"
                value={setup}
                onChange={(event) => setSetup(Number(event.target.value))}
              />
              <div className="relative mt-4 grid grid-cols-4 text-center font-mono text-[9px] uppercase tracking-[0.09em] text-[#b6c1bc]">
                <span>Study</span><span>Specify</span><span>Monitor</span><span>Review</span>
              </div>
              <div className="relative mt-9 border-l border-[#e5a631] pl-5">
                <p className="font-display text-2xl leading-tight tracking-[-.035em]">{setupMessage}</p>
              </div>
              <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
                <div className="flex gap-3 rounded-xl bg-white/8 p-4 text-sm leading-5 text-[#c8d0cc]"><Code2 className="shrink-0 text-[#e5a631]" size={18} />Validate platform and configuration prerequisites.</div>
                <div className="flex gap-3 rounded-xl bg-white/8 p-4 text-sm leading-5 text-[#c8d0cc]"><Clock3 className="shrink-0 text-[#0eafa7]" size={18} />Allow adequate observation time before revising inputs.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="activation" className="relative bg-[#17201f] py-20 text-[#f4f0e8] lg:py-28">
          <div className="edition-rail edition-rail-dark"><span>04</span><i /></div>
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-[.78fr_1.22fr] lg:px-10">
            <div>
              <SectionLabel index="04">3S license-activation release</SectionLabel>
              <h2 className="mt-7 max-w-xl font-display text-[clamp(2.8rem,5vw,5rem)] leading-[.92] tracking-[-.06em]">A one-time activation, then a customer-specific connection.</h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-[#c9c7c0]">The latest 3S production-server design validates a License ID, one-time activation code, and authorized MT5 account through an HTTPS activation request. On success, the EA stores a customer-specific key locally for its permitted service connection.</p>
              <p className="mt-4 max-w-lg text-sm leading-6 text-[#aab9b3]">Payment-confirmation e-mails are sent separately by the FizuxCoder portal after a verified payment claim and direct the buyer back to the portal. Gmail is not used by the EA, and it is not part of the MT5 activation settings.</p>
              <div className="mt-8 border-l border-[#e5a631] pl-4 text-sm leading-6 text-[#d7e1dc]">
                <strong className="font-mono text-[10px] uppercase tracking-[.13em] text-[#e5a631]">Release boundary</strong>
                <p className="mt-2">The complete 3S replacement package is in validation. It will be added to the protected customer library only after the corrected archive, release version, and public activation endpoint are confirmed.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["01", "Claim protected access", "Use the verified purchase and portal claim process before downloading a current 3S release."],
                ["02", "Extract the MQL5 package", "Open MT5 Data Folder, extract the supplied MQL5 folder, and replace files only when the release note instructs you to do so."],
                ["03", "Attach the license EA", "Attach 3SUniversalEA_customer_license.ex5 to the intended chart, then apply the supplied MLN preset when the release note specifies it."],
                ["04", "Activate through HTTPS", "Add the supplied base URL to MT5 WebRequest permissions, then enter the License ID, one-time code, and authorized account. The activation endpoint checks the record before returning a customer-specific key."],
              ].map(([step, title, copy]) => (
                <article key={step} className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="font-mono text-[10px] font-bold tracking-[.15em] text-[#e5a631]">{step}</p>
                  <h3 className="mt-5 font-display text-2xl leading-none tracking-[-.035em]">{title}</h3>
                  <p className="mt-4 text-sm leading-6 text-[#c9d1cd]">{copy}</p>
                </article>
              ))}
              <aside className="sm:col-span-2 rounded-2xl border border-[#0eafa7]/40 bg-[#0e716e]/25 p-5 text-sm leading-6 text-[#d8efea]">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#6de0d8]">Customer security rule</p>
                <p className="mt-2">Never enter or share a Master Server key, broker password, payment credential, Gmail credential, or customer API key. Gmail only delivers the post-payment portal notice; the 3S EA uses its customer-specific activation result for permitted MLN prediction and feedback requests.</p>
              </aside>
            </div>
          </div>
        </section>

        <section id="performance" className="relative overflow-hidden bg-[#fbf9f4] py-20 lg:py-28">
          <div className="edition-rail"><span>05</span><i /></div>
          <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
              <div>
                <SectionLabel index="05">Historical account evidence</SectionLabel>
                <h2 className="mt-7 max-w-3xl font-display text-[clamp(2.8rem,5vw,5.2rem)] leading-[.9] tracking-[-.06em]">A result is evidence to inspect—not a promise to buy.</h2>
              </div>
              <div className="space-y-4 border-l border-[#e5a631] pl-5 text-base leading-7 text-[#4e5e59] lg:mb-2">
                <p><strong className="text-[#17201f]">Owner-stated sample window:</strong> 13–25 August 2026. The supplied platform screenshots visibly show account activity and reports captured on 24–25 August.</p>
                <p>They are owner-supplied, not independently audited, and do not establish the result of every day in the stated window. The account currency and deposit history are not visible in the screenshots.</p>
              </div>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-[.76fr_1.24fr]">
              <article className="rounded-[2rem] bg-[#17201f] p-7 text-[#f4f0e8] shadow-[10px_10px_0_#0e716e] lg:p-9">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#e5a631]">How the EA can create or lose value</p>
                <h3 className="mt-5 font-display text-4xl leading-[.95] tracking-[-.05em]">Rules first. Market outcome second.</h3>
                <div className="mt-7 space-y-5 text-sm leading-7 text-[#d4ddd7]">
                  <p>Gemini Bot EA automates its configured decision and execution workflow in MetaTrader. It can monitor its permitted market conditions, place or manage an order when those conditions are met, and operate according to its settings.</p>
                  <p>A profitable trade occurs only when the selected direction, timing, exit logic, market movement, broker execution, and costs align favourably. The same workflow can produce losses when they do not.</p>
                  <p>That is why the evidence below includes both the reported gain and the reported losses, drawdown, and losing sequence. The EA does not create profit with certainty, and it should never be run without risk limits and active supervision.</p>
                </div>
                <a href="#disclosure" className="mt-8 inline-flex items-center gap-2 border-b border-[#e5a631] pb-1 font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#f4f0e8] hover:text-[#e5a631]">Read the risk statement <ArrowRight size={14} /></a>
              </article>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Reported net result", "+2,646.91", "No currency shown in the supplied account report."],
                  ["Maximum drawdown", "11.5%", "Reported historical drawdown in the platform summary."],
                  ["Trading-robot activity", "133 XAUUSD trades", "The displayed report attributes the sample to trading robots; no manual trades are shown."],
                  ["Profit factor", "3.18", "Historical XAUUSD report statistic only; it is not a forecast."],
                  ["Reported gross loss", "−1,216.78", "Displayed alongside gross profit of +3,863.69."],
                  ["Losing sequence", "9 consecutive losses", "The platform summary also shows 23 consecutive wins; both belong to this sample."],
                ].map(([label, value, detail]) => (
                  <article key={label} className="rounded-2xl border border-[#17201f]/12 bg-white p-5 shadow-sm">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[.12em] text-[#0e716e]">{label}</p>
                    <p className="mt-5 font-display text-4xl leading-none tracking-[-.05em] text-[#17201f]">{value}</p>
                    <p className="mt-4 text-sm leading-6 text-[#63716d]">{detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-4">
              <figure className="rounded-2xl border border-[#17201f]/12 bg-white p-3 shadow-sm">
                <img src="/manus-storage/IMG_2830_0b6080d2.PNG" alt="Owner-supplied account report displaying reported total, gross profit, gross loss, and performance ratios" className="h-[330px] w-full rounded-xl object-cover object-top" loading="lazy" />
                <figcaption className="px-1 pt-3 text-xs leading-5 text-[#5e6d68]">Platform summary: reported total, gross profit, gross loss, drawdown, and ratios.</figcaption>
              </figure>
              <figure className="rounded-2xl border border-[#17201f]/12 bg-white p-3 shadow-sm">
                <img src="/manus-storage/IMG_2829_5c3403f2.PNG" alt="Owner-supplied platform report displaying maximum drawdown and deposit load" className="h-[330px] w-full rounded-xl object-cover object-top" loading="lazy" />
                <figcaption className="px-1 pt-3 text-xs leading-5 text-[#5e6d68]">Platform risk report: 11.5% maximum drawdown and 5.27% maximum deposit load shown.</figcaption>
              </figure>
              <figure className="rounded-2xl border border-[#17201f]/12 bg-white p-3 shadow-sm">
                <img src="/manus-storage/IMG_2833_de9ccbc1.PNG" alt="Owner-supplied XAUUSD report displaying 133 trading-robot trades and a profit factor of 3.18" className="h-[330px] w-full rounded-xl object-cover object-top" loading="lazy" />
                <figcaption className="px-1 pt-3 text-xs leading-5 text-[#5e6d68]">Platform symbol report: 133 XAUUSD robot trades and a displayed 3.18 profit factor.</figcaption>
              </figure>
              <figure className="rounded-2xl border border-[#17201f]/12 bg-white p-3 shadow-sm">
                <img src="/manus-storage/IMG_2828_176307f5.PNG" alt="Owner-supplied XAUUSD deal history showing a completed Gemini Bot EA trade and multiple historical positions" className="h-[330px] w-full rounded-xl object-cover object-top" loading="lazy" />
                <figcaption className="px-1 pt-3 text-xs leading-5 text-[#5e6d68]">Platform deal history: one visible XAUUSD Gemini Bot EA deal and surrounding historical positions.</figcaption>
              </figure>
            </div>

            <aside className="mt-8 rounded-2xl border border-[#e5a631]/60 bg-[#fff5dd] p-5 text-sm leading-6 text-[#4e5248] lg:flex lg:gap-6">
              <p className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[.13em] text-[#8a5b05]">Evidence boundary</p>
              <p className="mt-2 lg:mt-0"><strong>Owner-supplied August 2026 account snapshot.</strong> These screenshots are not independently audited, may not be representative, and do not predict future results. Automated XAUUSD trading can produce losses, drawdowns, spread and slippage effects, or rapid account loss. Test every configuration on demo before considering live use.</p>
            </aside>
          </div>
        </section>

        <section className="relative py-20 lg:py-28">
          <div className="edition-rail"><span>06</span><i /></div>
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-[.88fr_1.12fr] lg:px-10">
            <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-[#17201f]">
              <img src="/manus-storage/risk-discipline-visual_785023c2.jpg" alt="Abstract risk-management balance visual" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-[#17201f]/80 via-transparent to-transparent" />
              <div className="absolute bottom-7 left-7 right-7 border-l border-[#e5a631] pl-4 text-[#f4f0e8]">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#d7e1dc]">A deliberate boundary</p>
                <p className="mt-2 font-display text-3xl leading-none tracking-[-.04em]">Risk management is a process, not a product feature.</p>
              </div>
            </div>
            <div id="disclosure" className="lg:pt-10">
              <SectionLabel index="06">Read before configuring</SectionLabel>
              <h2 className="mt-7 font-display text-[clamp(2.8rem,5vw,4.8rem)] leading-[.92] tracking-[-0.06em]">The risk note belongs in the main document.</h2>
              <div className="mt-8 border-y border-[#17201f]/15 py-6">
                <p className="text-lg leading-8 text-[#455551]">Trading leveraged products and operating automated systems can result in rapid losses. Past testing and historical examples do not predict future results. You are responsible for local legal requirements, broker selection, position sizing, settings, supervision, and any decision to use a live account.</p>
              </div>
              <button type="button" className="mt-7 button-outline" onClick={() => setRiskOpen(true)}><CircleAlert size={17} /> Open the full risk statement</button>
            </div>
          </div>
        </section>

        <section id="broker" className="relative bg-[#e5a631] py-20 lg:py-24">
          <div className="edition-rail"><span>07</span><i /></div>
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
            <div>
              <SectionLabel index="07">Optional broker pathway</SectionLabel>
              <h2 className="mt-7 max-w-3xl font-display text-[clamp(3rem,6vw,6rem)] leading-[.88] tracking-[-.065em]">If you need a broker, begin with the details.</h2>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#413310]">The provided Pepperstone registration path is available for visitors who independently decide it is relevant to their setup. Before proceeding, check availability in your jurisdiction, review its terms and product disclosures, and consider whether the service is appropriate for you.</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <a href={brokerUrl} target="_blank" rel="noreferrer sponsored" className="button-dark">
                  Visit Pepperstone registration <ExternalLink size={17} />
                </a>
                <p className="max-w-xs font-mono text-[10px] leading-5 uppercase tracking-[.12em] text-[#5d4a14]">External link • new tab • referral relationship disclosed below</p>
              </div>
            </div>
            <aside className="flex flex-col justify-between rounded-[2rem] bg-[#f4f0e8] p-6 shadow-[11px_11px_0_#17201f] lg:p-8">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Scan to open</p>
                  <h3 className="mt-3 font-display text-3xl leading-none tracking-[-.045em]">Broker registration link</h3>
                </div>
                <Braces className="text-[#e5a631]" size={31} />
              </div>
              <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                <img src="/manus-storage/pepperstone-referral-qr-code_561add84.png" alt="QR code for the Pepperstone referral registration link" className="h-36 w-36 rounded-xl border border-[#17201f]/10 bg-white p-2" />
                <div className="text-sm leading-6 text-[#50605a]">
                  <p className="font-semibold text-[#17201f]">Referral disclosure</p>
                  <p className="mt-2">This QR code and link are referral links supplied by the site owner. The site owner may receive compensation if you register through them. That commercial relationship does not make the broker or either EA suitable for you.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="purchase" className="bg-[#fbf9f4] py-20 lg:py-24">
          <div className="mx-auto max-w-[1440px] px-5 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-end"><div><SectionLabel index="08">Secure purchase routes</SectionLabel><h2 className="mt-7 max-w-2xl font-display text-[clamp(2.8rem,5vw,5.3rem)] leading-[.9] tracking-[-.06em]">Choose the EA separately from your broker setup.</h2></div><p className="max-w-xl text-lg leading-8 text-[#52605d]">Each button opens its own active ToyyibPay checkout. Review the system requirements, support terms, licence model, and risk statement before making any purchase decision.</p></div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <PurchaseCard eyebrow="Lifetime package access" title="3 Serangkai UNIVERSAL EA v13.85" price="RM2,999" priorPrice="RM4,300" detail="Lifetime package-download entitlement. After a verified claim and MT5 binding, the Master Server API licence is issued for one year and renewed through support." href={threeSPurchaseUrl} />
              <PurchaseCard eyebrow="Monthly access" title="Gemini Bot EA v11.97" price="RM450" priorPrice="RM999" detail="Monthly access to the Gemini Bot EA package and required indicators. Renewal is required to retain the monthly entitlement." href={geminiPurchaseUrl} />
            </div>
            <p className="mt-6 text-xs leading-5 text-[#596762]">You will leave this site to complete payment. The payment page, transaction terms, and customer information are handled by ToyyibPay. Payment verification, protected delivery, and any account-binding steps continue in the FizuxCoder portal after payment.</p>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
            <div>
              <SectionLabel index="08">Field questions</SectionLabel>
              <h2 className="mt-7 font-display text-[clamp(2.8rem,5vw,4.8rem)] leading-[.92] tracking-[-.06em]">A few useful questions before you begin.</h2>
            </div>
            <div className="border-t border-[#17201f]/20">
              {faq.map((item, index) => (
                <div key={item.question} className="border-b border-[#17201f]/20">
                  <button className="flex w-full items-center justify-between gap-5 py-6 text-left" type="button" onClick={() => setFaqOpen(faqOpen === index ? null : index)} aria-expanded={faqOpen === index}>
                    <span className="font-display text-2xl tracking-[-.035em]">{item.question}</span>
                    <ChevronDown className={`shrink-0 transition-transform duration-200 ${faqOpen === index ? "rotate-180 text-[#0e716e]" : ""}`} size={20} />
                  </button>
                  {faqOpen === index && <p className="max-w-2xl pb-6 text-[.98rem] leading-7 text-[#52605d]">{item.answer}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#17201f] px-5 py-12 text-[#f4f0e8] lg:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <div className="flex items-center gap-3"><SignalMark className="h-12 w-12 object-contain" /><p className="font-display text-3xl tracking-[-.05em]">FizuxCoder</p></div>
            <p className="mt-6 max-w-xl text-sm leading-7 text-[#b7c0ba]">This page summarizes user-supplied software descriptions. It is a marketing and information page, not investment advice, a solicitation where prohibited, or a representation of assured results.</p>
          </div>
          <div className="lg:pt-3">
            <p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#e5a631]">Quick route</p>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[.12em] text-[#d7e1dc]">
              <a className="hover:text-[#e5a631]" href="#systems">Systems</a>
              <a className="hover:text-[#e5a631]" href="#matrix">Comparison</a>
              <a className="hover:text-[#e5a631]" href="#purchase">Purchase</a>
              <a className="hover:text-[#e5a631]" href="#disclosure">Risk statement</a>
              <a className="hover:text-[#e5a631]" href={brokerUrl} target="_blank" rel="noreferrer sponsored">Broker link</a>
              <a className="hover:text-[#e5a631]" href="/privacy">Privacy</a>
              <a className="hover:text-[#e5a631]" href="/terms">Terms</a>
            </div>
            <p className="mt-8 font-mono text-[9px] uppercase tracking-[.12em] text-[#8d9b93]">© 2026 FizuxCoder. Automated trading involves risk.</p>
          </div>
        </div>
      </footer>

      {riskOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#17201f]/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="risk-title">
          <div className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#f4f0e8] p-7 shadow-2xl lg:p-10">
            <button type="button" onClick={() => setRiskOpen(false)} aria-label="Close risk statement" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-[#17201f]/15"><X size={18} /></button>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#0e716e]">Important disclosure</p>
            <h2 id="risk-title" className="mt-4 pr-12 font-display text-4xl leading-none tracking-[-.05em]">Automated trading carries meaningful risk.</h2>
            <div className="mt-7 space-y-5 text-[.98rem] leading-7 text-[#4c5a56]">
              <p>Expert Advisors are software tools. They can be affected by market volatility, gaps, liquidity, spread changes, slippage, failed or delayed network connections, broker execution, platform behaviour, parameter choices, and programming or configuration errors.</p>
              <p>Backtests, simulations, and historic examples are not indications or guarantees of future performance. Any figures from a historical source should be independently verified and assessed in the context of methodology, period selection, settings, costs, and real-world execution differences.</p>
              <p>Nothing on this website is investment, legal, or tax advice. Do not trade money you cannot afford to lose. Seek independent professional advice where appropriate, check local restrictions, and use a demo environment before considering any live configuration.</p>
            </div>
            <button type="button" onClick={() => setRiskOpen(false)} className="mt-8 button-primary">I understand <Check size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
