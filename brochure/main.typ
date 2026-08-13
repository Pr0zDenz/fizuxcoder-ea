// Signal Ledger brochure: concise, evidence-first product briefing with transparent commercial disclosures.
#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "FizuxCoder Expert Advisors",
  author: "FizuxCoder",
  rhythm: "report",
  running-header: true,
)

// ---------- Title page ----------
#page(margin: (top: 12%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #image("assets/images/fizuxcoder-mark.png", width: 2.2cm)
    #v(1.5em)
    #text(size: 28pt, weight: "bold", fill: report-accent)[FizuxCoder Expert Advisors]
    #v(0.45em)
    #text(size: 13pt, fill: luma(45))[A considered briefing on Gemini Bot EA and 3 Serangkai UNIVERSAL EA]
    #v(2.2em)
    #line(length: 48%, stroke: 0.6pt + report-accent)
    #v(2.2em)
    #image("assets/images/fizuxcoder-hero-terminal.png", width: 92%)
    #v(1.7em)
    #text(size: 10pt, fill: luma(45))[Automation, with the assumptions left visible.]
    #v(3em)
    #text(size: 9pt)[
      Prepared by FizuxCoder \
      Edition: #datetime.today().display("[day] [month repr:long] [year]")
    ]
  ]
]

// ---------- Contents ----------
#page(numbering: none, header: none)[
  #outline(title: [Contents], indent: 1.5em)
  #v(2em)
  #text(size: 9pt, fill: luma(45))[This brochure summarizes source material supplied by the creator. It describes system architecture and intended workflows; it does not publish performance forecasts or guarantees.]
]

// ---------- Main body ----------
#counter(page).update(1)

= The operating premise

FizuxCoder presents two MetaTrader 5 Expert Advisor architectures for traders who prefer to examine a system's decision logic before configuring it. The two systems share an automated-trading setting but use different analytical routes: *Gemini Bot EA* focuses on a machine-learning and volatility-quant workflow, while *3 Serangkai UNIVERSAL EA* centers on a multi-layer verification matrix and a Markov Logic Network connection.

> Automation can create consistency in a predefined workflow; it does not eliminate market, execution, technology, configuration, or supervisory risk.

#figure(
  image("assets/images/risk-discipline-visual.png", width: 100%),
  caption: [Risk management is an operating process, not a product feature.],
)

= System 01 — Gemini Bot EA v11.97

#text(fill: report-accent, weight: "bold")[Machine learning & volatility quant engine]

Gemini Bot EA v11.97 is described in the supplied source material as a fully automated quantitative engine that dynamically adapts strategy parameters using an external Python REST API. Its supplied design brief combines machine-learning classification with multi-timeframe Fibonacci projections, with the stated intention of managing risk in high-volatility instruments such as Gold (XAUUSD).

The implementation summary includes remote parameter configuration through a REST API `/config` connection, a three-state market-regime classification for quiet, normal, and extreme-volatility conditions, and price-action recovery logic based on micro-consolidation structures. It also describes a pre-news stop-order breakout workflow, a multi-timeframe safe take-profit scan from M1 through D1, and a tick-level profit-monitor / virtual trailing-stop capability.

#figure(
  image("assets/images/gemini-bot-visual.png", width: 68%),
  caption: [Gemini Bot EA: an adaptive volatility-and-configuration workflow.],
)

== Intended review questions

Before enabling Gemini Bot, clarify the required REST endpoint, the intended market and timeframes, your configuration governance, and the order-management logic under rapid price movement. Test the specific version and settings in a controlled environment. The source description does not establish that any particular configuration will produce a particular outcome.

= System 02 — 3 Serangkai UNIVERSAL EA v13.65

#text(fill: report-accent, weight: "bold")[17-pillar matrix & Markov Logic Network engine]

3 Serangkai UNIVERSAL EA v13.65 is described as a multi-layer, rules-based basket manager. According to the supplied brief, it evaluates broad macroeconomic information, multi-pair correlation, and structural price action before issuing a setup verdict. Its proposed Markov Logic Network bridge communicates through `/mln_predict` and `/mln_feedback` endpoints to exchange pillar scores and receive probabilistic buy/sell states.

The supplied 17-pillar verification matrix is organized around three broad tiers. The first tier covers fundamental considerations such as daily USD news, inflation, monetary policy, asset direction, DXY context, and bond yields. The second looks at price-action and noise filters, including Gold/DXY color correlation, trend alignment, SOP cross, and USD-strength ranking. The third is technical, referencing Fibonacci support and resistance zones, CCI momentum, DT3-ZigZag signals, FMCBR Fibonacci targets, and volume-dominance checks.

#figure(
  image("assets/images/universal-ea-visual.png", width: 68%),
  caption: [3 Serangkai UNIVERSAL EA: a structured multi-pillar verification approach.],
)

== Intended review questions

Before enabling this system, verify that the local or cloud Python components are operating correctly, that the required endpoints are reachable, and that the calendar, news, and data dependencies are understood. The supplied source also describes DT3-ZigZag swing alignment, native calendar and clustered-news filtering, emergency basket-liquidity logic, and an orphan pending-order sweep. Each of these controls should be independently tested for the broker, platform, and account context you intend to use.

= Side-by-side capability ledger

#table(
  columns: (1.3fr, 2fr, 2fr),
  inset: 8pt,
  stroke: (x: 0.35pt + luma(180), y: 0.35pt + luma(180)),
  fill: (x, y) => if y == 0 { luma(235) } else { none },
  align: left + top,
  [*Capability*], [*Gemini Bot EA v11.97*], [*3 Serangkai UNIVERSAL EA v13.65*],
  [Core architecture], [Machine learning + volatility quant], [17-pillar matrix + Markov Logic Network],
  [Primary signal route], [FMCBR breakouts with M1 directional context], [DT3-ZigZag swings with multi-pillar approval],
  [External connection], [REST API `/config` for live parameters], [WebRequest `/mln_predict` and `/mln_feedback`],
  [News context], [Pre-news stop-order breakout workflow], [Native calendar and clustered-sentiment filter],
  [Risk / basket controls], [Pyramiding and price-action base re-entry], [Dynamic Fibonacci sizing and emergency score logic],
  [Exit controls], [Adaptive multi-timeframe Fibonacci objective and cash escape], [Dedicated safe take-profit and orphan-order sweep],
  [Account scope], [Standard and cent accounts; auto-detection described], [Standard and cent accounts; auto-detection described],
)

#v(1em)
#text(size: 8.5pt, fill: luma(45))[Source note: the entries above are a condensed comparison of the creator-supplied feature matrix. They are capability descriptions, not independent verification, recommendations, or performance claims.]

= A measured setup protocol

An EA should be introduced through a controlled process. First, review the documentation, platform requirements, connection dependencies, and account constraints. Next, use a demo environment to examine order behavior, broker conditions, logs, and edge cases. Only after your own testing should you consider whether a separately monitored live configuration is appropriate. Continue to document changes and review the system rather than treating automation as unattended certainty.

#grid(
  columns: (1fr, 1fr),
  gutter: 12pt,
  [
    #text(fill: report-accent, weight: "bold")[01 / Study]
    
    Read the architecture, verify prerequisites, and identify every external dependency.
  ],
  [
    #text(fill: report-accent, weight: "bold")[02 / Specify]
    
    Define the platform, account, configuration, and monitoring criteria you will use.
  ],
  [
    #text(fill: report-accent, weight: "bold")[03 / Observe]
    
    Test in a controlled environment and review execution conditions over adequate time.
  ],
  [
    #text(fill: report-accent, weight: "bold")[04 / Reassess]
    
    Record changes, evaluate risk, and avoid extrapolating historic or simulated results.
  ],
)

= Purchase and broker pathways

The EA purchase route and the broker-registration route are intentionally separate. If you decide to purchase Gemini Bot EA v11.97, the creator has supplied an active ToyyibPay payment destination. You will leave the FizuxCoder website to complete any transaction, and ToyyibPay will handle the payment page, transaction terms, and customer information associated with that process.

#link("https://toyyibpay.com/t1rvxbft")[*Open the Gemini Bot EA ToyyibPay purchase page*]

#v(1.5em)

The supplied Pepperstone pathway is a referral registration link for visitors who independently decide it is relevant to their setup. The site operator may receive compensation if you register through that link or QR code. This commercial relationship does not establish that Pepperstone, either EA, or any particular trading arrangement is suitable for you. Check local availability, broker terms, product disclosures, and your own circumstances before taking action.

#grid(
  columns: (1fr, 1fr),
  gutter: 18pt,
  [
    #text(fill: report-accent, weight: "bold")[Optional broker referral]
    
    #link("https://trk.pepperstonepartners.com/SH1TD")[Open the Pepperstone referral registration page]
    
    #v(1em)
    #text(size: 8.5pt, fill: luma(45))[Referral disclosure: the creator may receive compensation if a visitor registers through this path.]
  ],
  [
    #align(center)[
      #link("https://trk.pepperstonepartners.com/SH1TD")[#image("assets/images/pepperstone-referral-qr-code.png", width: 3.1cm)]
      #v(.5em)
      #text(size: 8.5pt, fill: luma(45))[Scan to open the supplied referral page.]
    ]
  ],
)

= Important risk statement

Trading leveraged products and operating automated systems can lead to rapid losses, including the loss of funds committed to a trading account. Expert Advisors can be affected by volatility, price gaps, liquidity, spread changes, slippage, failed or delayed network connections, broker execution, platform behavior, configuration choices, and software errors. No system feature, test, historic example, or automated control can remove these risks.

Historic testing, simulations, or reported past records do not predict future results. They can differ materially from live outcomes due to methodology, periods selected, settings, costs, and real-world execution. Do not trade money you cannot afford to lose. Nothing in this brochure is investment, legal, or tax advice, a personalized recommendation, or a representation of assured results. Review applicable local restrictions and seek independent professional advice where appropriate.

= Source basis

This brochure is based on materials supplied by FizuxCoder, including the Gemini Bot EA and 3 Serangkai UNIVERSAL EA feature descriptions, comparison matrix, Pepperstone referral QR code and link, and the corrected ToyyibPay payment URL. The contents have been edited for clarity and structured as a product briefing. No independent performance audit, broker assessment, or investment-suitability assessment has been performed for this document.
