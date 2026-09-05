# RISKOS — Campaign Detection Layer (Addendum to backend.md)

## 0. Context for the AI agent building this

RISKOS's core backend (ML risk scoring, AI investigator, entity graph, counterfactual simulation, human review, feedback loop, chargeback evidence) is **built, verified, and frozen**. Do not modify any of it except where explicitly noted below.

This addendum adds a new capability on top of the existing system: **detecting the formation of a coordinated fraud campaign** (a "ring" or "attack") before individual transactions within it are confirmed fraudulent, rather than only scoring transactions one at a time.

The reframed pitch: *"Most fraud systems ask whether this transaction is fraudulent. RISKOS asks whether a fraud campaign is forming — and if it is, estimates its exposure and applies the minimum friction required to contain it."*

**Design constraints (do not violate these):**
- **No new deep learning / temporal graph neural network.** Use sliding-window statistical/rule-based features feeding a weighted scoring formula, or at most the existing frozen Gradient Boosting model with new input features. This must run fast (well under 100ms) and be explainable on a whiteboard — no black-box campaign classifier.
- **No fabricated "predicted future transaction" numbers.** Exposure must be calculated from historical capacity of currently-active suspicious entities (e.g. median transactions/exposure per compromised account from past campaigns), shown as a range with a confidence level — never a single fake-precise number.
- **Must not false-positive on legitimate traffic spikes** (flash sales, festival sales, coupon campaigns). This is the single most important thing to get right — build the legitimate-event suppressor before anything else gets demoed.
- **Defense-only.** This detects and contains; it does not simulate, generate, or execute attacks.

---

## 1. New Data Model

### 1.1 New tables

**entity_time_windows** (rolling aggregate state per entity, updated on each transaction)
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| entity_type | enum | device / ip / merchant / beneficiary / account_cluster |
| entity_id | UUID | |
| window_size | enum | 5m / 15m / 1h / 24h |
| window_start | timestamp | |
| transaction_count | int | |
| unique_accounts | int | |
| unique_devices | int | |
| unique_ips | int | |
| new_edges_count | int | new entity_links created in this window |
| failed_count | int | |
| total_amount_paise | bigint | |
| device_entropy | float | Shannon entropy of device distribution within this entity's cluster |
| ip_entropy | float | |
| asn_entropy | float | (use IP-derived ASN proxy if real ASN data unavailable — note this explicitly if simulated) |

**campaigns**
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| status | enum | forming / active / contained / resolved / false_positive |
| detected_at | timestamp | |
| campaign_score | float | 0-1, from the weighted formula |
| confidence | float | |
| entity_ids | JSONB | list of {entity_type, entity_id} in this cluster |
| entry_point | string | how the cluster was first identified (e.g. "device fa428... edge velocity spike") |
| legitimate_event_check | JSONB | result of the suppressor: {is_legitimate: bool, reason: string, matched_baseline: bool} |
| exposure_at_risk_low_paise | bigint | |
| exposure_at_risk_high_paise | bigint | |
| exposure_confidence | float | |
| recommended_policy | enum | allow / challenge / contain |
| contained_at | timestamp | nullable |
| resolution | string | nullable — how it ended |

**campaign_events** (timeline log for the "Campaign DNA" view)
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| campaign_id | FK → campaigns | |
| event_type | string | e.g. "new_account_joined", "score_threshold_crossed", "policy_applied", "first_confirmed_fraud" |
| occurred_at | timestamp | |
| detail | JSONB | |

**merchant_baselines** (per-merchant historical normal behavior, for the legitimate-event suppressor)
| field | type | notes |
|---|---|---|
| id | UUID | PK |
| merchant_id | FK → merchants | |
| day_of_week | int | |
| hour_of_day | int | |
| avg_transactions_per_window | float | |
| avg_new_accounts_per_window | float | |
| avg_device_entropy | float | |
| std_dev_transactions | float | for z-score style deviation checks |
| known_event_tags | JSONB | e.g. previously-tagged "flash_sale" windows and their signature, so recurring legitimate spikes can be recognized |

### 1.2 Additions to existing tables
- `transactions`: add `campaign_id` (nullable FK) — set when a transaction is attributed to a detected campaign.

---

## 2. Core Services

### 2.1 Temporal Feature Engine (`app/services/temporal_features.py`)
- On each new transaction, update `entity_time_windows` for the relevant entities (device, IP, merchant, any linked beneficiary) across all four window sizes.
- Compute deltas: `new_accounts_5m`, `new_edges_5m`, `edge_velocity` (new edges per minute, e.g. "Device X gained 9 new account relationships in the last minute"), `velocity_change` (current window vs. same entity's own trailing baseline).
- Compute entropy metrics per cluster (device/IP/ASN diversity) using standard Shannon entropy: `H = -Σ p_i log(p_i)` over the distribution of devices/IPs/etc. within a candidate cluster. Low entropy (concentration) + high volume = suspicious; high entropy + high volume = probably a legitimate crowd.
- This is pure aggregation/arithmetic — no ML training required for this component.

### 2.2 Campaign Scorer (`app/services/campaign_detector.py`)
- Rule-based weighted formula (explicitly NOT presented as "scientifically optimal" — these are calibrated starting weights, tunable later):

```
campaign_score =
    0.25 × volume_anomaly       (current volume vs. this entity's own trailing baseline, z-score style)
  + 0.20 × edge_creation_anomaly (new_edges_5m relative to historical norm for this entity type)
  + 0.20 × device_concentration  (inverse of device_entropy — low entropy = high concentration = suspicious)
  + 0.15 × ip_asn_concentration  (inverse of ip_entropy / asn_entropy)
  + 0.10 × behavioral_similarity (optional/simplify: similarity of transaction amounts/timing across the candidate cluster — e.g. coefficient of variation being unusually low, suggesting scripted behavior)
  + 0.10 × velocity_anomaly      (rate of change in transaction frequency for this entity)
```
- Any entity/cluster crossing a score threshold (start with 0.6, make configurable) enters `forming` status in `campaigns`.
- Log every score-relevant input to `campaign_events` so the "why" is fully auditable — this must never be a black box.

### 2.3 Legitimate-Event Suppressor (`app/services/event_suppressor.py`)
**Build this before demoing anything else in this layer.** For any candidate campaign, before it's confirmed:
1. Compare current metrics against `merchant_baselines` for this merchant/day-of-week/hour-of-day. If the deviation is explainable by a previously-seen recurring pattern (e.g. this merchant always spikes on Friday evenings), suppress or downgrade the alert.
2. Check entropy: a legitimate flash-sale crowd should have HIGH device/IP/ASN diversity even at high volume. A fraud campaign should show volume + LOW diversity (concentration). This is the primary discriminator — a spike alone is not enough, spike + concentration is the signal.
3. Store the suppressor's reasoning in `campaigns.legitimate_event_check` regardless of outcome, so it's visible in the demo ("here's why this wasn't flagged" is as important to show as "here's why this was").

### 2.4 Exposure-at-Risk Calculator (`app/services/exposure_engine.py`)
- For a confirmed-forming campaign, calculate exposure using **historical capacity of currently active suspicious entities**, not a predicted future:
```
exposure_at_risk = Σ (P_fraud_i × expected_loss_i) for each suspicious entity i in the cluster
```
where `expected_loss_i` is derived from median transaction value × median transactions-per-account observed in past resolved campaigns in the seed data (or a reasonable documented default if no historical campaigns exist yet for that pattern type).
- Always return a **range** (low/high) with a **confidence score**, plus the inputs used (number of active entities, historical comparable campaign count, median throughput) — never a bare number. Example shape:
```json
{
  "exposure_low_paise": 480000000,
  "exposure_high_paise": 630000000,
  "confidence": 0.78,
  "basis": {
    "active_suspicious_entities": 21,
    "historical_comparable_campaigns": 5,
    "median_txn_value_paise": 2470000,
    "median_txns_per_entity": 8
  }
}
```

### 2.5 Containment Counterfactual (extend existing `app/services/counterfactual.py`)
- Extend the existing counterfactual engine (already built and verified for single transactions) to also accept a **cluster/campaign** as input instead of a single transaction.
- Compare three cluster-level policies: **Allow** (no intervention), **Challenge** (step-up verification on all currently-active suspicious entities in the cluster), **Contain** (block/hold all currently-active suspicious entities).
- Reuse the same expected-value math pattern already verified for the transaction-level counterfactual: `net_expected_value = -(fraud_loss_estimate + friction_cost_estimate)`, computed per policy, with the friction cost representing legitimate-customer disruption if any innocent entities are caught in the net.
- Recommend whichever policy minimizes total expected loss (fraud + friction combined) — this is the same principle as the existing per-transaction decision engine, just applied at cluster scope.

### 2.6 Metrics: Time to Containment & Attack Compression Ratio (`app/services/campaign_metrics.py`)
- **Time to Containment (lead time):** `TTC = T(first_confirmed_fraud_in_cluster) - T(RISKOS_detection)`. Positive value = RISKOS detected the campaign before the first fraud was confirmed. Log `detected_at` on the campaign and the timestamp of whichever transaction in the cluster first became confirmed fraud.
- **Attack Compression Ratio:** `ACR = (transactions_allowed_before_containment) / (estimated_total_campaign_size_if_uncontained)`. Requires the seeded demo campaigns to have a defined "what would have happened if unmitigated" size — since you control the simulation, this can be explicit in the seed data rather than estimated.
- Endpoint: `GET /api/campaigns/{id}/metrics` returning TTC, ACR, and standard precision/recall for campaign detection evaluated against your seeded held-out campaigns (see Section 4).

---

## 3. New API Endpoints

```
GET    /api/campaigns                        # list all campaigns (forming/active/contained/resolved)
GET    /api/campaigns/{id}                    # full campaign detail: score, entities, timeline, exposure, policy
GET    /api/campaigns/{id}/timeline            # campaign_events for the "Campaign DNA" view
GET    /api/campaigns/{id}/exposure            # exposure-at-risk breakdown
POST   /api/campaigns/{id}/counterfactual      # cluster-level policy comparison (allow/challenge/contain)
POST   /api/campaigns/{id}/apply-policy        # apply a chosen containment policy, log to campaign_events
GET    /api/campaigns/{id}/metrics             # TTC, ACR, precision/recall for this campaign
GET    /api/dashboard/live-attack-map          # summary of all currently forming/active campaigns for the homepage view
```

---

## 4. Seed Data — Demo Campaigns

Do **not** attempt a full statistical episode generator with hundreds of synthetic campaigns — that's disproportionate effort for a hackathon timeline. Instead, hand-craft a small, clearly-labeled set directly in `scripts/seed.py`:

1. **Campaign A — Device-farm micro-payment probing** (the one already partially seeded: 7-account syndicate). Extend it with realistic timestamps showing formation → first fraud → escalation, so TTC can be computed.
2. **Campaign B — Bot/emulator voucher abuse** (already seeded, 3 accounts). Same timestamp treatment.
3. **Campaign C — A NEW third campaign** showing a different pattern (e.g. card-testing via many small ₹10-50 transactions across rotating cards, same device) to prove the detector generalizes beyond one pattern shape.
4. **Legitimate Flash-Sale Event — critical, do not skip.** A seeded high-volume, high-new-account event for one merchant that looks superficially similar to a campaign (volume spike, many new accounts) but has HIGH device/IP entropy (diverse real customers) and should NOT be flagged, or should be flagged and then correctly suppressed by the legitimate-event checker. This is your single most important seed scenario — it's the proof against the "flash sale false positive" objection.

For each of Campaigns A-C, explicitly define in the seed script: `campaign_start_time`, `first_fraud_confirmed_time`, and `estimated_uncontained_size` (a documented assumption, not a measured fact — state this clearly wherever it's surfaced) so TTC and ACR are computable end-to-end.

Held-out evaluation: since you only have a handful of hand-labeled campaigns, do not claim statistically rigorous precision/recall the way the point-in-time model's metrics are claimed. Present this component's evaluation honestly as a small-sample proof-of-concept (e.g. "detected 3/3 seeded campaigns, correctly suppressed 1/1 legitimate flash-sale event") rather than inflating it with a false sense of statistical rigor.

---

## 5. Build Order

1. Temporal Feature Engine (2.1) — foundational, everything else depends on it
2. Legitimate-Event Suppressor (2.3) — build and test this early with the flash-sale seed scenario, before trusting any campaign alerts
3. Campaign Scorer (2.2)
4. Seed the four demo scenarios (Section 4)
5. Exposure-at-Risk Calculator (2.4)
6. Containment Counterfactual extension (2.5)
7. TTC / ACR metrics (2.6)
8. New API endpoints (Section 3)
9. Full regression test pass — do not break any of the existing frozen/verified Phase 1-2 components

Do not skip step 2. A campaign detector that hasn't been proven against a legitimate-spike scenario is not demo-safe.
