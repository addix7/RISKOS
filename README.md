# RISKOS

**Fraud doesn't start with a transaction. It starts with a pattern.**

RISKOS is an AI-powered fraud risk platform that detects both individual risky transactions and **coordinated fraud campaigns forming across many accounts** — before every transaction in that campaign is even confirmed fraudulent. Built for the Razorpay AI Buildathon 2026.

> Most fraud systems ask: *"is this transaction fraudulent?"*
> RISKOS asks: *"is a fraud campaign forming — and if so, how much is at risk, and what's the least disruptive way to stop it?"*

---
---

## At a Glance

| Capability | RISKOS |
|---|---|
| **Transaction Risk** | XGBoost, 13 features |
| **Campaign Detection** | 7 behavioral/network signals |
| **False-Alarm Control** | Entropy-based suppressor |
| **Investigation** | Claude + live DB tool-calling |
| **Network Analysis** | Entity relationship graph |
| **Exposure** | Historically grounded risk range |
| **Decisioning** | Allow / Verify / Hold / Block |
| **Human Control** | Analyst review + override |
| **Avg. Containment** | 141.5 seconds |

### Key Results

**98.55% Recall · 0.9598 AUC-ROC · 141.5s Avg. TTC · 3,479 Held-Out Transactions**

---
## Table of Contents

- [The Problem](#the-problem)
- [What RISKOS Does](#what-riskos-does)
- [Architecture](#architecture)
- [How It Works — Full Walkthrough](#how-it-works--full-walkthrough)
- [Features](#features)
- [Honest Metrics](#honest-metrics)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Overview](#api-overview)
- [Known Limitations](#known-limitations)
- [What Broke, and How We Fixed It](#what-broke-and-how-we-fixed-it)
- [License](#license)

---

## The Problem

Payment platforms process transactions one at a time and score each in isolation. This catches lone-actor fraud well, but misses **coordinated fraud**: a group creating many fake accounts, sharing devices, IPs, and stolen cards, hitting a merchant repeatedly. Individually, each transaction can look almost normal. Collectively, the pattern is obvious — but only if something is actually looking for the pattern, not just the transaction.

Academic fraud research explicitly documents this as "fraud campaigns" — coordinated events where several orders are placed by a small group using multiple identities — and argues detection must cluster related activity, not score it individually. Enterprise fraud-intelligence platforms already validate this as the correct frontier, but they're closed, expensive, black-box tools sold to large institutions.

**RISKOS brings that same class of capability down to something transparent, explainable, and self-serve.**

---

## What RISKOS Does

RISKOS operates on two layers:

| Layer | Question it answers |
|---|---|
| **Point-in-Time Risk** | Is *this specific transaction* risky, and why? |
| **Campaign Detection** | Is a *coordinated attack* forming across many accounts, right now? |

For both layers, RISKOS doesn't just output a number — it shows its evidence, estimates financial exposure honestly (as a range, never a fabricated single figure), and recommends the response that minimizes total expected cost — fraud losses *and* customer friction — rather than defaulting to a blanket block.

---

## Architecture

```
                         PAYMENT STREAM
                                │
                                ▼
                  ┌─────────────────────────┐
                  │  ML Risk Scorer (XGBoost) │
                  └────────────┬────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
      Point-in-Time Investigation      Temporal Feature Engine
      (AI Investigator + Graph)        (5m/15m/1h/24h windows)
                │                               │
                │                               ▼
                │                    Legitimate-Event Suppressor
                │                    (entropy-based diversity check)
                │                               │
                │                               ▼
                │                    7-Signal Campaign Scorer
                │                               │
                │                               ▼
                │                    Exposure-at-Risk Estimator
                │                    (historically grounded, ranged)
                │                               │
                └───────────────┬───────────────┘
                                ▼
                    Counterfactual Decision Engine
                (Allow / Verify / Hold / Block — argmax over
                 expected value: -(fraud loss + friction cost))
                                │
                                ▼
                      Human Review & Override
                                │
                                ▼
                    Adaptive Feedback Loop
              (remembers past overrides, surfaces
                     similar future cases)
```

---

## How It Works — Full Walkthrough

1. A payment arrives — amount, merchant, customer, device, IP, instrument recorded.
2. **ML Risk Scorer**: an XGBoost classifier evaluates 13 features (account age, amount vs. customer average, device/IP/instrument sharing, etc.) and outputs a fraud probability.
3. **Fraud spike detection** monitors transaction velocity per merchant against its own rolling baseline.
4. In parallel, the **campaign detection layer** tracks rolling time windows across every device, IP, account cluster, and merchant for coordinated formation patterns.
5. **Legitimate-Event Suppressor** runs first, before anything is flagged as a campaign. It measures *infrastructure entropy* — a real crowd naturally uses diverse devices/IPs; a fraud ring concentrates on a small set. This was stress-tested against evasion up to 28 rotating devices, and a 7th signal (payment-instrument concentration) was added specifically because devices/IPs are cheap to rotate but valid stolen cards are not.
6. If confirmed as a real campaign, **exposure is estimated** — grounded in the historical fraud capacity of currently active suspicious entities, always shown as a range with a stated confidence, never a single fabricated number.
7. The **AI Investigator** (Claude, via tool-calling) queries the real database — device history, IP history, related accounts, chargeback history — and writes a plain-English case file. Every finding is tagged with the exact function call that produced it; verified to never hallucinate evidence it didn't retrieve.
8. The **Entity Graph** visually maps connections: customer → device → IP → instrument → other customers, revealing coordinated rings that look like unrelated individuals in isolation.
9. The **Counterfactual Engine** compares Allow / Verify / Hold / Block by expected value (`-（fraud loss + friction cost)`) and recommends whichever minimizes total cost — not a fixed risk-score threshold rule.
10. A **human analyst** can approve or override any recommendation, with a reason.
11. The **Adaptive Feedback Loop** remembers past overrides and surfaces similar prior cases on future investigations.
12. If a chargeback occurs, a **dispute evidence pack** is generated in one click, with sensitive identifiers (device fingerprints, card numbers) shown only in hashed form.

---

## Features

- ML-based transaction risk scoring (XGBoost, class-weighted, threshold-swept)
- Fraud velocity spike detection with merchant-specific baselines
- AI Investigator with verified, tool-attributed evidence (no hallucination)
- Entity relationship graph / fraud ring visualization
- Entropy-based legitimate-event suppressor (distinguishes flash sales from fraud rings)
- 7-signal weighted campaign scorer (volume, edge creation, device/IP/instrument concentration, behavioral similarity, velocity)
- Exposure-at-risk estimation, historically grounded, always ranged
- Cluster-level and transaction-level counterfactual simulation (real argmax, not a hardcoded rule)
- Dynamic friction — 5-tier response (allow / monitor / verify / hold / block)
- Human review workflow with approve/override
- Adaptive feedback loop
- Chargeback evidence pack generator (hashed sensitive data)
- Live model health & campaign metrics dashboard
- Full frontend: sign-in, live attack map, campaign detail, transaction investigation, review queue, model health

---

## Honest Metrics

Evaluated on **3,479 held-out transactions** (553 fraud cases, **15.9% prevalence**), using **entity-cluster splitting** — entire connected fraud rings stay fully in either train or test, never split across both, verified with zero cluster overlap. (An earlier row-level split was caught producing an inflated, dishonest 96%+ result before this fix.)

| Metric | Value |
|---|---|
| Precision | 61.30% |
| Recall | 98.55% |
| F1 Score | 75.59% |
| AUC-ROC | 0.9598 |
| False Positive Rate | 11.76% |

**Why precision is deliberately traded for recall:** a missed fraud case costs real money; a false positive only triggers step-up verification, not an automatic decline, because the friction engine absorbs it gracefully. This tradeoff was validated with a full threshold sweep (0.50–0.90) — the operating point is a deliberate choice on a known curve, not an unexamined default.

**Campaign detection:** average time-to-containment **141.5 seconds**. Correctly detected all seeded coordinated-fraud scenarios; correctly suppressed a simulated legitimate flash-sale surge with zero false alarms.

---

## Tech Stack

**Backend:** Python, FastAPI, PostgreSQL, SQLAlchemy, scikit-learn / XGBoost, SHAP, Claude (Anthropic) for AI investigation
**Frontend:** React, Tailwind CSS
**Auth:** JWT

---

## Project Structure

```
RISKOS/
├── backend/
│   ├── app/
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── routers/         # REST API endpoints
│   │   ├── services/        # Core engines (risk, campaign, exposure, counterfactual)
│   │   └── ml/               # Model training, feature engineering, data generation
│   ├── models/               # Trained model artifact
│   ├── scripts/               # Database seed script
│   └── tests/                # Automated test suite
├── frontend/
│   └── src/
│       ├── components/       # React components (screens, cards, graphs)
│       └── api/               # API client
├── backend.md                 # Backend build specification
├── campaign_detection.md       # Campaign detection layer specification
├── frontend_final.md           # Frontend build specification
└── openapi.json                # Full API schema
```

---

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt --break-system-packages
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Interactive API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

### Demo Login

```
Email: analyst@riskos.ai
Password: analyst_demo_secret_2026
```

---

## API Overview

Full schema in [`openapi.json`](./openapi.json). Key endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/login` | Analyst authentication |
| `POST /api/risk/score` | Score a transaction |
| `POST /api/investigations` | Trigger AI investigation |
| `GET /api/graph/{customer_id}` | Entity relationship graph |
| `POST /api/counterfactual` | Transaction-level 4-option decision comparison |
| `GET /api/dashboard/live-attack-map` | Live campaign summary |
| `GET /api/campaigns/{id}` | Campaign detail |
| `POST /api/campaigns/{id}/contain` \| `/verify` | Apply containment policy |
| `POST /api/campaigns/{id}/counterfactual` | Campaign-level decision comparison |
| `GET /api/reviews/pending` | Human review queue |
| `POST /api/reviews/{investigation_id}` | Submit review decision |
| `GET /api/model/health` | Model evaluation metrics |
| `GET /api/campaigns/metrics` | Campaign detection metrics |
| `POST /api/chargebacks/{transaction_id}/evidence-pack` | Generate dispute evidence |

---

## Known Limitations

Stated openly, not hidden:

- A fully-resourced adversary using unique devices, unique IPs, *and* unique payment instruments per account, with randomized behavioral timing, would currently be difficult to catch at the individual-merchant level. Future work: cross-merchant BIN/issuer velocity, behavioral biometrics, longer-window persistent graph correlation across 7–30 days.
- Training/seed data is realistic synthetic data, not live production traffic — metrics are honestly reported as held-out evaluation on this dataset, not claimed as production accuracy.
- At the current operating threshold, roughly 4 in 10 flagged transactions are false positives — mitigated, not eliminated, by routing most to step-up verification rather than a hard decline.

---

## What Broke, and How We Fixed It

In the spirit of showing real engineering, not just a polished result:

- **Data leakage in the ML evaluation.** An early entity-cluster split had a bug allowing linked accounts to appear in both train and test, producing an inflated, dishonest ~96% accuracy. Fixed with `GroupShuffleSplit` on cluster ID, verified with zero cluster overlap.
- **Seeder bypassing the real scoring pipeline.** The database seeder was assigning hardcoded risk scores instead of running transactions through the actual model, causing the dashboard and live API to disagree on the same transaction's risk. Fixed by routing all seeded transactions through the real scoring pipeline.
- **Cold-start blind spot.** First-time transactions defaulted `amount_vs_avg_ratio` to a neutral value (self-referential baseline), making brand-new burner accounts structurally invisible to amount-anomaly detection — exactly the population most likely to be fraudulent. Fixed with a population-level baseline and an explicit `no_history` feature.
- **Evasion blind spot in campaign detection.** Infrastructure-rotation attacks (up to 28 devices) could dilute entropy-based signals toward looking organic. Added payment-instrument concentration as a 7th scoring signal, since valid stolen cards are economically harder to rotate than devices or IPs.
- **Exposure calculation using a flat historical average untethered from transaction scale**, producing exposure estimates over 100x larger than the actual observed transaction amount for small-ticket fraud patterns. Fixed by anchoring the estimate to each campaign's own observed transaction scale, with historical data as a secondary adjustment factor.
- **Decision-path mismatch.** The recommended containment policy was determined by a hardcoded risk-score threshold, not the actual counterfactual expected-value calculation — meaning the "recommended" action could contradict its own displayed math. Fixed to select via true argmax over net expected value.

---

## License

Built for the Razorpay AI Buildathon 2026.
