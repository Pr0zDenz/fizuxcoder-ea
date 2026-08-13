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
    version: "v13.65",
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
            <a href="#disclosure" className="nav-link">Risk notes</a>
          </nav>

          <div className="hidden lg:block">
            <a href="#broker" className="button-primary button-small">
              Broker setup <ArrowUpRight size={15} />
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
                    {activeProduct === "gemini" && (
                      <div className="mt-7 flex flex-col gap-3 border-t border-[#17201f]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-[#63706b]">Secure purchase route / ToyyibPay</p>
                        <a href={geminiPurchaseUrl} target="_blank" rel="noreferrer" className="button-primary button-small">
                          Get Gemini Bot EA <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
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

        <section className="relative py-20 lg:py-28">
          <div className="edition-rail"><span>04</span><i /></div>
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
              <SectionLabel index="04">Read before configuring</SectionLabel>
              <h2 className="mt-7 font-display text-[clamp(2.8rem,5vw,4.8rem)] leading-[.92] tracking-[-0.06em]">The risk note belongs in the main document.</h2>
              <div className="mt-8 border-y border-[#17201f]/15 py-6">
                <p className="text-lg leading-8 text-[#455551]">Trading leveraged products and operating automated systems can result in rapid losses. Past testing and historical examples do not predict future results. You are responsible for local legal requirements, broker selection, position sizing, settings, supervision, and any decision to use a live account.</p>
              </div>
              <button type="button" className="mt-7 button-outline" onClick={() => setRiskOpen(true)}><CircleAlert size={17} /> Open the full risk statement</button>
            </div>
          </div>
        </section>

        <section id="broker" className="relative bg-[#e5a631] py-20 lg:py-24">
          <div className="edition-rail"><span>05</span><i /></div>
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
            <div>
              <SectionLabel index="05">Optional broker pathway</SectionLabel>
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
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 lg:grid-cols-[.95fr_1.05fr] lg:px-10">
            <div>
              <SectionLabel index="06">Gemini Bot purchase route</SectionLabel>
              <h2 className="mt-7 max-w-2xl font-display text-[clamp(2.8rem,5vw,5.3rem)] leading-[.9] tracking-[-.06em]">Purchase the EA separately from your broker setup.</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#52605d]">Gemini Bot EA v11.97 is available through the active ToyyibPay bill supplied by the creator. A purchase decision should follow your own review of system requirements, support terms, and the risk statement—not an expectation of a particular trading result.</p>
            </div>
            <aside className="flex flex-col justify-between rounded-[2rem] bg-[#d7e1dc] p-7 shadow-[11px_11px_0_#0e716e] lg:p-9">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[#0e716e]">Payment processor</p>
                  <h3 className="mt-3 font-display text-4xl leading-none tracking-[-.05em]">ToyyibPay</h3>
                </div>
                <Sparkles className="text-[#e5a631]" size={31} />
              </div>
              <dl className="mt-10 grid gap-4 border-y border-[#17201f]/15 py-5 font-mono text-[10px] uppercase tracking-[.12em] text-[#53605e] sm:grid-cols-2">
                <div><dt className="text-[#0e716e]">Item</dt><dd className="mt-2 font-semibold text-[#17201f]">Gemini Bot EA v11.97</dd></div>
                <div><dt className="text-[#0e716e]">Bill code</dt><dd className="mt-2 font-semibold text-[#17201f]">x42sivvj</dd></div>
              </dl>
              <a href={geminiPurchaseUrl} target="_blank" rel="noreferrer" className="mt-8 button-dark">
                Continue to ToyyibPay <ExternalLink size={17} />
              </a>
              <p className="mt-4 text-xs leading-5 text-[#596762]">You will leave this site to complete payment. The payment page, transaction terms, and any customer information are handled by ToyyibPay.</p>
            </aside>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 lg:grid-cols-[.8fr_1.2fr] lg:px-10">
            <div>
              <SectionLabel index="07">Field questions</SectionLabel>
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
