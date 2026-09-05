# RISKOS Frontend — Final Build Specification

**This supersedes any earlier frontend spec documents (`frontend.md`, `frontend_v2.md`).** A working reference implementation already exists (`riskos_frontend_v2.jsx`) — use it as ground truth for structure, data shapes, and visual language. If anything below is ambiguous, defer to what that file actually does.

---

## 0. What this product is

RISKOS is a fraud operations console, not a fintech dashboard. It has two layers:
1. **Campaign detection** — spots coordinated fraud rings forming across many accounts before they're all confirmed fraudulent, estimates their financial exposure, and recommends the least disruptive way to contain them.
2. **Point-in-time transaction risk** — investigates a single flagged transaction like a detective, with evidence, not just a score.

The backend for both is fully built and verified — every number in this spec is real, taken from actual tested output, not illustrative.

**Reference mental model:** a security operations center monitor, not an admin panel. Most traffic is calm. Something is forming. The UI's whole job is to make that contrast, and the reasoning behind every decision, visible and legible in seconds.

---

## 1. Visual identity — non-negotiable, follow exactly

- **Background:** near-black, cool undertone (`neutral-950` range), not pure black
- **Surfaces:** `neutral-900` cards with `neutral-800` hairline borders — no drop shadows, no glassmorphism
- **Status colors** (used only for status, never decoration):
  - Forming/active threat → orange (`orange-400/500/600` range)
  - Watchlist → amber (`amber-400/500`)
  - Contained/resolved → emerald (`emerald-400/600`)
  - Calm/normal → teal (`teal-400/500`) — NOT green, green reads as generic fintech "all good"
- **Numbers are load-bearing — always monospace.** Every score, ID, exposure figure, timestamp uses `font-mono tabular-nums`. This single choice is what makes it read as an instrument rather than a website.
- **Layout is not a grid of equal cards.** The Live Attack Map is a density-ranked vertical stack — forming campaigns are visually larger/louder than watchlist, which is larger than the collapsed "resolved" strip at the bottom. Card size encodes severity; this is structural, not decorative.
- **No generic KPI tile row** (icon + big number + label as the primary device) — use it only as a thin secondary strip, never the hero.
- **No purple-blue gradients, no pastel rounded-pill badges, no green checkmarks for "all clear."**
- **Motion:** deliberate and rare — new alerts entering (slide/fade, ~300-400ms), numbers counting to new values on state change. No decorative motion, no bounce, no particles. Respect `prefers-reduced-motion`.

---

## 2. Screens — build in this priority order

### Priority 1: Live Attack Map (home)
- Header stats strip (4 numbers): active threats count, exposure at risk, exposure prevented, avg time-to-containment. **Exposure at risk and exposure prevented are separate figures covering different campaign populations — never divide one by the other or present a combined ratio.**
- Density-ranked campaign card stack: status pill, score, entry-point reason text (human-readable, always shown, not hidden behind a click), entity count, exposure range (always shown as low–high, never a single number), recommended policy, mini signal-strip visualization.
- Contained campaigns collapse into a quieter "resolved" strip at the bottom, showing time-to-containment.
- A secondary, calmer strip of normal transaction flow for visual contrast against the alerts above.

### Priority 2: Campaign Detail
Reached by clicking a card. In order:
1. Header — ID (mono), status, score, confidence
2. **Legitimate-event check panel** — the suppressor's actual reasoning, shown even when not suppressed. This is the "how do you know this isn't a flash sale" answer — must never be hidden behind a click.
3. **Signal breakdown strip** — the 7 weighted signals (volume, edge creation, device concentration, IP/ASN concentration, instrument concentration, behavioral similarity, velocity) as a single horizontal segmented bar, each segment sized by weighted contribution, colored by raw intensity. This is the product's signature visual — reuse it everywhere a campaign's score needs explaining.
4. **Entity graph** — customer nodes around shared device/IP/instrument hub nodes, edges shown, flagged nodes visually distinct.
5. **Exposure panel** — current observed + low/high projected range + confidence + basis (active entity count). Never a single fake-precise number.
6. **Containment counterfactual table** — compares Allow / Challenge / Contain with fraud loss, friction cost, and net value per option; the recommended option visually dominant, not just labeled.
7. **Timeline** — vertical event log.
8. **Action buttons** — apply containment or step-up verification; on click, the view updates live (status flips, timeline gets a new entry) without a page reload. This is one of the most important demo moments — make the state change visible and satisfying, not instant/invisible.

### Priority 3: Transaction Investigation
Reached from a campaign's entity graph, the review queue, or direct lookup. In order:
1. Transaction summary (amount, merchant, customer trust/age, risk score)
2. **AI Investigator evidence list** — each finding attributed to the specific tool call that produced it (e.g. `get_device_history()`). This proves the AI isn't hallucinating — don't summarize this away, show the attribution.
3. SHAP-style feature contribution bars
4. Entity graph (same component as Campaign Detail)
5. Counterfactual table — four options this time (Allow / Verify / Hold / Block), same visual treatment as the campaign-level version
6. Human review panel — approve or override, with a reason field, updating visibly on decision

### Priority 4: Human Review Queue
List of pending cases — mixing individual transaction reviews and campaign-level reviews in one queue. Clicking a row routes to the correct detail view (Campaign Detail or Transaction Investigation) based on the item's kind.

### Priority 5: Model Health
Two sections, clearly separated:
- Point-in-time model: precision/recall/F1/AUC/FPR **always shown alongside test set size and fraud prevalence** — never bare percentages with no context.
- Campaign detection: avg TTC, forming/watchlist/contained counts, exposure at risk vs. exposure prevented as two separate figures (see Priority 1 note — same rule applies here).

### Priority 6 (build only if time remains): Chargeback Evidence Pack Viewer
Renders a compiled evidence pack — transaction, customer, hashed telemetry (show the hashes explicitly, it's a privacy signal worth surfacing, not hiding), investigation record, human review decision. Export/download affordance for the PDF.

### Also needed: Login
Minimal JWT auth screen. Doesn't need polish — this is not a screen anyone will remember.

---

## 3. Reusable components (build these once, use everywhere)

- `StatusPill` — sharp-edged status indicator, color per Section 1, small pulsing dot for "forming"
- `Mono` — monospace number/ID wrapper, used constantly
- `SignalStrip` — the signature 7-segment weighted breakdown bar
- `EntityGraph` — hub-and-spoke graph (customer nodes around shared device/IP/instrument hubs)
- `CounterfactualTable` — N-option policy comparison (works for both 3-option campaign-level and 4-option transaction-level), recommended option visually highlighted
- `CampaignCard` — the density-ranked home screen card

---

## 4. Data — what's real, what to wire up

Every screen in the reference build (`riskos_frontend_v2.jsx`) is populated with real numbers taken from actual verified backend output — not made up for demo purposes. When wiring this against the live API, replace the constant data blocks with `fetch` calls to:

- `GET /api/dashboard/live-attack-map` → Live Attack Map campaign list
- `GET /api/campaigns/{id}` → Campaign Detail (includes suppressor result, signals, exposure, timeline)
- `POST /api/campaigns/{id}/counterfactual` → containment counterfactual table
- `POST /api/campaigns/{id}/contain` / `POST /api/campaigns/{id}/verify` → action buttons
- `POST /api/investigations` + `GET /api/investigations/{id}` → Transaction Investigation evidence
- `GET /api/graph/{customer_id}` → entity graph data
- `POST /api/counterfactual` → transaction-level 4-option comparison
- `POST /api/reviews/{investigation_id}` → human review submit
- `GET /api/reviews/pending` → Review Queue
- `GET /api/model/health` + `GET /api/campaigns/metrics` → Model Health
- `POST /api/chargebacks/{transaction_id}/evidence-pack` → Evidence Pack Viewer
- `POST /api/auth/login` → Login

The full OpenAPI schema is already exported (`openapi.json`) if a more formal contract is needed.

---

## 5. Rule for whoever builds this

If a choice isn't specified above, default to *less* — quieter color, smaller motion, plainer copy — rather than filling the gap with a generic dashboard default (gradient KPI tiles, rounded pastel badges, decorative icons). The whole point of this product is that it looks like a serious instrument a fraud analyst would trust, not a marketing site for one.
