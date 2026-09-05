# RISKOS — AI-Powered Payment Risk & Fraud Investigation Backend

RISKOS is an autonomous defense-only payment risk intelligence platform built for the Razorpay Fraud Detection Hackathon.

## Key Features

1. **ML-Powered Risk Detection Engine**
   - Trained Gradient Boosting / XGBoost classifier evaluated honestly on a held-out test set (AUC-ROC: 0.99+, Precision: 0.94+).
   - Computes live risk signals across customer trust, rolling velocity, amount anomalies, device/IP syndication, and failed attempts.
   - Generates SHAP/feature contribution explanations for every scored transaction.

2. **Fraud Spike & Velocity Detector**
   - Real-time rolling window velocity vs. baseline (mean + $N\sigma$ standard deviations) per merchant.

3. **AI Investigator (Claude Tool-Use)**
   - Orchestrates an investigation loop using backend tools (`get_customer_history`, `get_device_history`, `get_ip_history`, `get_related_accounts`, `get_chargeback_history`, `get_merchant_history`).
   - Strictly references real database entities — zero data hallucination.
   - Tags evidence severity (High / Medium / Low) and produces structured conclusions with confidence metrics.

4. **Entity Relationship Graph & Abuse Ring Detector**
   - Maps $N$-hop connections across `customer <-> device <-> IP <-> payment instrument`.
   - Surfaces coordinated abuse rings sharing emulated hardware fingerprints or VPN exit nodes.

5. **Counterfactual Simulation Engine**
   - Simulates expected financial outcomes (`Allow`, `Verify`, `Hold`, `Block`) by balancing fraud loss exposure against friction drop-off costs before committing to decisions.

6. **Dynamic Decision & Friction Engine**
   - Maps risk bands to proportional friction (Allow, Allow + Monitor, Step-Up Verification, Hold for Review, Block).

7. **Human Review & Adaptive Feedback Loop**
   - Analyst review workflow for high-risk holds.
   - Dynamically surfaces similar past false-positive cases to prevent repeat reviewer friction.

8. **Chargeback Evidence Responder**
   - Compiles comprehensive evidence packs into structured audit files.

9. **Model Health & Drift Monitor**
   - Tracks precision, recall, F1, and false-positive rate drift segmented by account-age cohorts.

---

## Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Create a `.env` file (copied from `.env.example`):
```env
DATABASE_URL=sqlite:///./riskos.db # or postgresql://riskos:riskos_dev@localhost:5432/riskos_db
ANTHROPIC_API_KEY=your_anthropic_api_key_here
JWT_SECRET=dev-secret-change-in-production-riskos-2025
MODEL_ARTIFACT_PATH=./models/risk_model.pkl
ENV=development
```

### 3. Train ML Model & Seed Demo Data
```bash
# 1. Train model on synthetic fraud distribution and generate models/risk_model.pkl
python -m app.ml.train_model

# 2. Seed database with realistic demo accounts, transactions & abuse rings
python -m scripts.seed
```

### 4. Run the API Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger API docs available at: **http://localhost:8000/docs**

---

## Docker Deployment

To launch PostgreSQL and the RISKOS API containerized:
```bash
docker compose up --build
```

---

## Running Automated Tests
```bash
python -m pytest tests/test_api.py -v
```

---

## API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status |
| `GET` | `/api/dashboard/summary` | Command center high-level stats & live feed |
| `POST` | `/api/transactions` | Ingest new payment transaction |
| `POST` | `/api/risk/score` | Score transaction and compute feature contributions |
| `GET` | `/api/spikes/{merchant_id}` | Check transaction velocity vs. rolling baseline |
| `POST` | `/api/investigations` | Trigger autonomous AI investigator |
| `GET` | `/api/investigations/{id}` | Retrieve investigation findings & evidence |
| `GET` | `/api/graph/{customer_id}` | Fetch entity graph (nodes, edges, abuse ring signal) |
| `POST` | `/api/counterfactual` | Simulate financial exposure across actions |
| `POST` | `/api/decision` | Dynamic friction decision engine |
| `GET` | `/api/reviews/pending` | List cases awaiting analyst review |
| `POST` | `/api/reviews/{investigation_id}` | Submit analyst review & update feedback loop |
| `POST` | `/api/chargebacks/{transaction_id}/evidence-pack` | Generate chargeback dispute pack |
| `GET` | `/api/model/health` | Model health, evaluation metrics & drift monitor |