"""
Synthetic fraud dataset generator for RISKOS.
Generates realistic multi-vector fraud patterns (device farms, IP pooling, stolen cards, low trust, velocity).
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

FEATURE_COLUMNS = [
    "account_age_days",
    "avg_amount",
    "prior_txn_count",
    "prior_chargeback_count",
    "amount_vs_avg_ratio",
    "no_history",
    "txn_freq_1h",
    "failed_count_30m",
    "is_new_device",
    "device_distinct_customers",
    "is_new_ip",
    "ip_distinct_customers",
    "instrument_distinct_customers",
    "trust_score",
]

GLOBAL_BASELINE_AMOUNT_PAISE = 250000.0


def generate_dataset(n_customers: int = 1000, n_transactions: int = 15000, fraud_rate: float = 0.08) -> pd.DataFrame:
    now = datetime.utcnow()
    records = []

    customer_ids = list(range(n_customers))
    
    # 6 distinct syndicate clusters with varied fraud MOs
    n_ring_clusters = 6
    ring_size = 18
    ring_custs = set()
    cluster_map = {}

    for r_idx in range(n_ring_clusters):
        c_ids = list(range(n_customers - (r_idx + 1) * ring_size, n_customers - r_idx * ring_size))
        ring_custs.update(c_ids)
        for cid in c_ids:
            cluster_map[cid] = f"syndicate_{r_idx}"

    normal_custs = set(range(n_customers - n_ring_clusters * ring_size))
    for cid in normal_custs:
        cluster_map[cid] = f"norm_{cid}"

    account_ages = {}
    trust_scores = {}
    avg_amounts = {}
    prior_cb_counts = {}

    for c in normal_custs:
        account_ages[c] = float(np.random.exponential(scale=350) + 15)
        trust_scores[c] = float(np.clip(np.random.normal(0.88, 0.08), 0.65, 0.99))
        avg_amounts[c] = float(np.random.lognormal(mean=12.2, sigma=0.6))
        prior_cb_counts[c] = 0

    for c in ring_custs:
        account_ages[c] = float(np.random.uniform(1, 10))
        trust_scores[c] = float(np.clip(np.random.normal(0.18, 0.05), 0.05, 0.30))
        avg_amounts[c] = float(np.random.lognormal(mean=16.0, sigma=0.4))
        prior_cb_counts[c] = int(np.random.choice([0, 1, 2, 3], p=[0.5, 0.3, 0.15, 0.05]))

    # Diversified infrastructure pooling:
    # Cluster 0, 1: Device farms (shared devices, varied IPs)
    # Cluster 2, 3: Carding ring (shared cards & devices, proxy IPs)
    # Cluster 4, 5: VPN syndicate (shared IPs, dynamic devices)
    ring_devices = {}
    ring_ips = {}
    ring_insts = {}
    for r_idx in range(n_ring_clusters):
        ring_devices[f"syndicate_{r_idx}"] = list(range(900 + r_idx * 2, 902 + r_idx * 2))
        ring_ips[f"syndicate_{r_idx}"] = list(range(980 + r_idx * 2, 982 + r_idx * 2))
        ring_insts[f"syndicate_{r_idx}"] = list(range(800 + r_idx * 2, 802 + r_idx * 2))

    # Shared home IPs for some normal families (realistic noise)
    shared_home_ips = list(range(700, 720))

    device_map = {}
    ip_map = {}
    inst_map = {}

    for c in normal_custs:
        device_map[c] = random.randint(0, 850)
        ip_map[c] = random.choice(shared_home_ips) if random.random() < 0.15 else random.randint(0, 950)
        inst_map[c] = random.randint(0, 750)

    for c in ring_custs:
        clust = cluster_map[c]
        device_map[c] = random.choice(ring_devices[clust])
        ip_map[c] = random.choice(ring_ips[clust])
        inst_map[c] = random.choice(ring_insts[clust])

    device_customers = {d: set() for d in range(1000)}
    ip_customers = {ip: set() for ip in range(1000)}
    inst_customers = {inst: set() for inst in range(1000)}
    cust_devices = {c: set() for c in customer_ids}
    cust_ips = {c: set() for c in customer_ids}
    cust_txns = {c: [] for c in customer_ids}

    n_fraud = int(n_transactions * fraud_rate)
    fraud_indices = set(random.sample(range(n_transactions), n_fraud))

    for i in range(n_transactions):
        is_fraud = (i in fraud_indices)

        if is_fraud:
            if random.random() < 0.85:
                cust_id = random.choice(list(ring_custs))
            else:
                cust_id = random.choice(list(normal_custs))
        else:
            if random.random() < 0.95:
                cust_id = random.choice(list(normal_custs))
            else:
                cust_id = random.choice(list(ring_custs))

        clust = cluster_map[cust_id]
        acct_age = account_ages[cust_id]
        base_avg_amt = avg_amounts[cust_id]
        prior_cb = prior_cb_counts[cust_id]
        trust = trust_scores[cust_id]

        t_offset = random.uniform(0, 30 * 24 * 3600)
        txn_time = now - timedelta(seconds=t_offset)

        if cust_id in ring_custs:
            # Varied syndicate patterns: some share device, some share IP, some share instrument
            r_pattern = random.random()
            if r_pattern < 0.40:
                device_id = random.choice(ring_devices[clust])
                ip_id = random.choice(ring_ips[clust])
                inst_id = random.choice(ring_insts[clust])
            elif r_pattern < 0.70:
                device_id = random.choice(ring_devices[clust])
                ip_id = random.randint(950, 979) # Rotating IP
                inst_id = random.choice(ring_insts[clust])
            else:
                device_id = random.randint(850, 899)
                ip_id = random.choice(ring_ips[clust]) # Shared VPN IP
                inst_id = inst_map.get(cust_id, random.randint(0, 750))
        elif is_fraud:
            device_id = random.randint(850, 899)
            ip_id = random.randint(950, 979)
            inst_id = inst_map.get(cust_id, random.randint(0, 750))
        else:
            device_id = device_map.get(cust_id, random.randint(0, 850))
            ip_id = ip_map.get(cust_id, random.randint(0, 950))
            inst_id = inst_map.get(cust_id, random.randint(0, 750))

        if is_fraud and cust_id in normal_custs:
            amount = int(base_avg_amt * random.uniform(4.0, 18.0))
        elif cust_id in ring_custs:
            amount = int(base_avg_amt * random.uniform(0.8, 1.8))
        else:
            amount = int(np.random.lognormal(mean=np.log(base_avg_amt), sigma=0.35))
            amount = max(500, amount)

        history = cust_txns[cust_id]
        prior_txn_count = len(history)
        no_history = 1 if prior_txn_count == 0 else 0

        if prior_txn_count > 0:
            prior_amounts = [h["amount"] for h in history]
            cust_avg = np.mean(prior_amounts)
        else:
            cust_avg = GLOBAL_BASELINE_AMOUNT_PAISE

        amount_vs_avg = amount / cust_avg if cust_avg > 0 else 1.0

        is_new_device = 1 if device_id not in cust_devices[cust_id] else 0
        is_new_ip = 1 if ip_id not in cust_ips[cust_id] else 0

        device_customers[device_id].add(cust_id)
        ip_customers[ip_id].add(cust_id)
        inst_customers[inst_id].add(cust_id)
        cust_devices[cust_id].add(device_id)
        cust_ips[cust_id].add(ip_id)

        recent_1h = sum(1 for h in history if (txn_time - h["time"]).total_seconds() <= 3600)
        failed_30m = sum(1 for h in history if (txn_time - h["time"]).total_seconds() <= 1800 and h["failed"])
        if is_fraud and random.random() < 0.4:
            recent_1h += random.randint(2, 6)
            failed_30m += random.randint(1, 3)

        failed = 1 if (is_fraud and random.random() < 0.25) else 0

        rec = {
            "account_age_days": acct_age,
            "avg_amount": cust_avg,
            "prior_txn_count": prior_txn_count,
            "prior_chargeback_count": prior_cb,
            "amount_vs_avg_ratio": min(amount_vs_avg, 50.0),
            "no_history": no_history,
            "txn_freq_1h": recent_1h,
            "failed_count_30m": failed_30m,
            "is_new_device": is_new_device,
            "device_distinct_customers": min(len(device_customers[device_id]), 50),
            "is_new_ip": is_new_ip,
            "ip_distinct_customers": min(len(ip_customers[ip_id]), 50),
            "instrument_distinct_customers": min(len(inst_customers[inst_id]), 50),
            "trust_score": trust,
            "cluster_id": clust,
            "cust_id": cust_id,
            "time": txn_time,
            "amount": amount,
            "failed": failed,
            "is_fraud": int(is_fraud),
        }
        records.append(rec)
        cust_txns[cust_id].append(rec)

    df = pd.DataFrame(records)
    return df