# RISKOS Backend — Build Specification

## 0. Context for the AI agent building this

You are building the backend for **RISKOS**, an AI-powered payment risk investigation platform for a fraud-detection hackathon (Razorpay challenge). The backend must:

1. Score incoming payment transactions for fraud risk using a real ML model (trained and evaluated honestly on a held-out test set — no fabricated metrics).
2. Detect abnormal transaction velocity ("spikes").
3. Run an AI Investigator that gathers evidence about a flagged transaction using defined tools/functions (not hallucinated data).
4. Build an entity relationship graph (customer ↔ device ↔ IP ↔ card ↔ merchant) to surface potential abuse rings.
5. Simulate the outcome of different actions (allow / verify / hold / block) before committing to one — a counterfactual engine.
6. Apply the minimum necessary friction based on risk (not a blunt allow/block binary).
7. Support human analyst review, override, and a feedback loop that RISKOS learns from.
8. Generate a chargeback evidence pack for disputed transactions.
9. Expose model health metrics (precision, recall, F1, false-positive rate/cost).

This is a **defense-only** system. Do not implement anything that could be used to test, evade, or attack fraud detection — no adversarial/red-team simulation of attacks against the system itself.

Build this in phases (see Section 9 — Build Order). Get Phase 1 fully working end-to-end before touching Phase 2 or 3.

---

## 1. Tech Stack

- **Language/Framework:** Python 3.11+ with FastAPI
- **Database:** PostgreSQL (use SQLAlchemy as ORM, Alembic for migrations)
- **ML:** scikit-learn (or XGBoost/LightGBM) for the core risk classifier — keep it simple and interpretable over exotic, since honest evaluated metrics matter more than model complexity
- **AI Investigator / LLM calls:** Anthropic API (Claude) using tool use / function calling — the model must call defined backend functions to retrieve evidence, never fabricate data
- **Task queue (optional, only if time allows):** none required for hackathon scope — synchronous request/response is fine
- **Auth:** simple JWT-based auth for the analyst dashboard (single role: "analyst" is enough — no need for complex RBAC)
- **Env config:** `.env` file, loaded via `pydantic-settings`

> If the agent building this prefers Node.js/Express instead of Python/FastAPI, that's an acceptable substitution — but the ML risk model training/evaluation pipeline should still be done in Python (scikit-learn) even if the API layer is Node, and exposed to the Node backend via a small internal Python service or a pre-trained model artifact loaded at startup.

---

## 2. Data Model

### 2.1 Core entities

**customers**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| name | string | |
| email | string | |
| phone | string | |
| account_created_at | timestamp | used for account-age features |
| trust_score | float | updated by feedback loop, default 0.5 |

**merchants**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| name | string | |
| category | string | e.g. "electronics", "fashion" |

**devices**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| fingerprint_hash | string | hashed device fingerprint |
| first_seen_at | timestamp | |

**ip_addresses**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| ip_hash | string | hashed IP (don't store raw IP in plaintext) |
| first_seen_at | timestamp | |

**payment_instruments** (cards/UPI/etc.)
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| instrument_hash | string | hashed card/UPI identifier |
| type | enum | card / upi / netbanking / wallet |

**transactions**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| customer_id | FK → customers | |
| merchant_id | FK → merchants | |
| device_id | FK → devices | |
| ip_id | FK → ip_addresses | |
| instrument_id | FK → payment_instruments | |
| amount | decimal | |
| currency | string | default INR |
| status | enum | pending / approved / declined / disputed |
| created_at | timestamp | |
| risk_score | float | nullable, set after scoring |
| risk_label | enum | nullable — allow / verify / hold / block |

**entity_links** (for the graph)
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| entity_a_type | enum | customer / device / ip / instrument |
| entity_a_id | UUID | |
| entity_b_type | enum | |
| entity_b_id | UUID | |
| relationship | string | e.g. "shared_device", "shared_ip" |
| strength | float | confidence/weight of the link |

**investigations**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| transaction_id | FK → transactions | |
| evidence | JSONB | structured evidence gathered by tools |
| ai_conclusion | text | |
| recommended_action | enum | allow / verify / hold / block |
| confidence | float | |
| created_at | timestamp | |

**human_reviews**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| investigation_id | FK → investigations | |
| reviewer_name | string | |
| decision | enum | approved_ai_recommendation / overridden |
| final_action | enum | allow / verify / hold / block |
| reason | text | |
| created_at | timestamp | |

**chargebacks**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| transaction_id | FK → transactions | |
| filed_at | timestamp | |
| status | enum | open / evidence_submitted / won / lost |
| evidence_pack_url | string | nullable |

**model_metrics** (for Risk Health)
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| run_at | timestamp | |
| precision | float | |
| recall | float | |
| f1_score | float | |
| false_positive_rate | float | |
| false_positive_cost | decimal | |
| test_set_size | int | |

---

## 3. Core Services

### 3.1 Risk Detection Engine
- Input: a transaction + derived features (see below)
- Output: `risk_score` (0–100)
- Features to compute at scoring time:
  - Customer: account age, avg transaction amount, prior transaction count, prior chargeback count
  - Transaction: amount vs. customer's rolling average, transaction frequency in last N minutes, failed-payment count in last N minutes
  - Device: is this device new for this customer, how many distinct customers use this device
  - IP: is this IP new, how many distinct customers use this IP
  - Instrument: how many customers/accounts are linked to this payment instrument
- Model: train a gradient-boosted classifier (XGBoost/LightGBM) or logistic regression baseline on a labeled dataset (see Section 6 — Data Sourcing). Store the trained model artifact (`.pkl`/`.json`) and load it at API startup.
- Endpoint: `POST /api/risk/score` — takes a transaction ID, returns risk_score and feature contributions (use SHAP values or simple feature-importance breakdown for explainability).

### 3.2 Fraud Spike Detector
- Runs a rolling window count of transactions per merchant (e.g. per-minute buckets).
- Compares current window count to a rolling baseline (e.g. mean + N standard deviations over the last hour).
- If it exceeds threshold, flag `spike_detected = true` on that time window and trigger deeper investigation on transactions within it.
- Endpoint: `GET /api/spikes/{merchant_id}` — returns current velocity vs. baseline.

### 3.3 AI Investigator
- Triggered when `risk_score` exceeds a threshold OR a spike is detected.
- Uses Claude with tool use. Define these tools as backend functions the model can call — **never let the model invent evidence**:
  - `get_customer_history(customer_id)`
  - `get_transaction_history(customer_id)`
  - `get_device_history(device_id)`
  - `get_ip_history(ip_id)`
  - `get_merchant_history(merchant_id)`
  - `get_related_accounts(customer_id)` — traverses `entity_links`
  - `get_chargeback_history(customer_id)`
- The model calls these tools, gathers evidence, and produces:
  - A structured evidence list (each item tagged 🔴/🟠/🟢 severity)
  - A plain-language conclusion
  - A recommended action (allow/verify/hold/block)
- Store the full evidence + conclusion in the `investigations` table.
- Endpoint: `POST /api/investigations` (body: transaction_id) → returns investigation object.

### 3.4 Entity Graph Builder
- On each new transaction, upsert links into `entity_links`:
  - customer ↔ device (via this transaction's device)
  - customer ↔ ip
  - customer ↔ instrument
  - device ↔ other customers who've used the same device (derive via query, not stored redundantly)
- Endpoint: `GET /api/graph/{customer_id}` — returns a graph payload (nodes + edges) for the frontend to render, showing N-hop connections.
- Abuse ring heuristic: if a connected component (via shared device/IP/instrument) contains more than K distinct customers within a recent time window, flag it as a potential `abuse_ring` with a confidence score.

### 3.5 Counterfactual Simulation Engine
- Given a transaction + risk_score, compute estimated outcomes for each possible action:
  - **Allow:** estimated fraud loss exposure = risk_score × amount × historical_fraud_loss_rate
  - **Verify:** estimated exposure reduced by a configurable verification effectiveness factor; adds a friction cost (estimated drop-off rate for legitimate customers)
  - **Hold:** exposure near zero, but friction cost is highest
- Output: a comparison table (exposure, friction cost estimate, net expected value) per option, and pick the option with best expected value, subject to a friction ceiling.
- Endpoint: `POST /api/counterfactual` (body: transaction_id) → returns options + recommended action.

### 3.6 Dynamic Friction / Decision Engine
- Maps risk band + counterfactual recommendation → final action:
  - 0–20: Allow
  - 21–40: Allow + Monitor
  - 41–65: Step-up verification
  - 66–85: Hold for review
  - 86–100: Block
- Supports context-specific overrides (e.g., repeated COD abuse → disable COD for that customer but allow prepaid).
- Endpoint: `POST /api/decision` (body: transaction_id) → returns final action + reasoning.

### 3.7 Human Review Workflow
- Endpoint: `GET /api/reviews/pending` — list investigations awaiting human decision (typically hold/block cases)
- Endpoint: `POST /api/reviews/{investigation_id}` — analyst submits decision (approve AI recommendation or override + reason)
- On override, store the review and feed it into the Adaptive Feedback Loop (3.8)

### 3.8 Adaptive Feedback Loop
- When a human overrides an AI decision (e.g., marks something a false positive), store:
  - the original risk signals
  - the AI decision
  - the human decision + reason
- On future investigations, query for similar past cases (simple similarity: same customer, or same device/IP cluster, or similar feature vector via cosine similarity) and surface: *"Similar cases were previously marked legitimate by human reviewers."*
- This can start as a simple lookup/similarity query — no need for online model retraining within hackathon scope, but log everything so retraining is possible later.

### 3.9 Chargeback Evidence Responder
- Endpoint: `POST /api/chargebacks/{transaction_id}/evidence-pack`
- Compiles: transaction details, customer history, device/IP info, full investigation record, human review decision, timeline of events.
- Renders as a PDF (or structured JSON if PDF generation is out of scope for time) and stores a reference in `chargebacks.evidence_pack_url`.

### 3.10 Risk Health Monitor
- After training/evaluating the model on a held-out test set, store precision/recall/F1/false-positive rate/false-positive cost in `model_metrics`.
- Endpoint: `GET /api/model/health` — returns latest metrics + trend over time if you log multiple runs.
- Add a simple check: compare false-positive rate across account-age buckets (e.g., new accounts vs. established) to detect the kind of drift called out in the product brief ("false positives increased among newly created accounts").

---

## 4. API Summary

```
POST   /api/transactions              # ingest a new transaction
POST   /api/risk/score                # score a transaction
GET    /api/spikes/{merchant_id}      # check velocity vs baseline
POST   /api/investigations            # trigger AI investigation
GET    /api/investigations/{id}       # fetch investigation detail
GET    /api/graph/{customer_id}       # entity graph for a customer
POST   /api/counterfactual            # simulate action outcomes
POST   /api/decision                  # get final recommended action
GET    /api/reviews/pending           # list cases awaiting human review
POST   /api/reviews/{investigation_id} # submit human decision
POST   /api/chargebacks/{transaction_id}/evidence-pack  # generate evidence pack
GET    /api/model/health              # model metrics
GET    /api/dashboard/summary         # command center stats (totals, high-risk count, loss prevented)
```

---

## 5. Command Center / Dashboard Data

`GET /api/dashboard/summary` should return:
```json
{
  "total_transactions": 12481,
  "high_risk_count": 183,
  "loss_prevented": 2480000,
  "live_activity": [
    {"transaction_id": "...", "amount": 78000, "risk_score": 91, "status": "INVESTIGATING"},
    {"transaction_id": "...", "amount": 12500, "risk_score": 67, "status": "VERIFY"}
  ]
}
```

---

## 6. Data Sourcing (for the ML model)

You need labeled transaction data to train the Risk Detection Engine. Options, in order of preference for a hackathon timeline:

1. Use a public fraud dataset (e.g., IEEE-CIS Fraud Detection dataset from Kaggle) to train the base classifier, then map its features onto this schema as closely as possible.
2. If richer multi-account/entity-graph behavior is needed and the public dataset doesn't have it, generate a synthetic dataset: simulate normal customers + a subset of coordinated/abusive accounts (shared device/IP/instrument clusters) with realistic transaction patterns, label them, and use that to demonstrate the entity-graph and abuse-ring features specifically.
3. Do not fabricate final reported metrics — whatever numbers land in `model_metrics` must come from an actual held-out evaluation run.

---

## 7. Non-Functional Requirements

- Seed script (`seed.py` or `seed.ts`) that populates the database with realistic demo data: normal transactions, a few high-risk transactions, a device/IP cluster representing an abuse ring, and a couple of historical chargebacks — this is what the live demo will run against.
- Hash all device fingerprints, IPs, and payment instrument identifiers before storing — never store raw PII in plaintext, and mention this in the demo (it also happens to be a compliance/privacy signal judges will notice positively).
- CORS enabled for the frontend dev server.
- All monetary values in paise/smallest currency unit internally, formatted as ₹ on API responses or left to frontend formatting — pick one and be consistent.

---

## 8. Environment Variables

```
DATABASE_URL=
ANTHROPIC_API_KEY=
JWT_SECRET=
MODEL_ARTIFACT_PATH=./models/risk_model.pkl
ENV=development
```

---

## 9. Build Order (do not skip ahead)

**Phase 1 — Core backend (build this first, get it fully working):**
1. Data schema + migrations (Section 2)
2. Transaction ingestion endpoint
3. Risk Detection Engine — train model offline, load at startup, scoring endpoint
4. Fraud Spike Detector
5. AI Investigator with real tool-calling functions
6. Entity Graph Builder + graph endpoint
7. Dynamic Friction / Decision Engine (can be a simple threshold table initially)

**Phase 2 — Once Phase 1 works end-to-end:**
8. Counterfactual Simulation Engine
9. Human Review workflow + Adaptive Feedback Loop
10. Chargeback Evidence Responder
11. Risk Health Monitor + dashboard summary endpoint

**Phase 3 — Only if time remains after Phase 1 and 2 are solid:**
12. Any of: analyst-facing graph query/investigation workbench UI hooks, customer-facing self-verification endpoint, trajectory/drift scoring layered on top of the point-in-time risk score.

Do not start Phase 3 work until Phase 1 and Phase 2 are demo-ready end to end.
