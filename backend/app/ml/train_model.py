import os
import sys
import joblib
import numpy as np
from pathlib import Path
from datetime import datetime, timezone

from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    confusion_matrix, roc_auc_score,
)
from sklearn.ensemble import GradientBoostingClassifier

try:
    from xgboost import XGBClassifier
    USE_XGB = True
except ImportError:
    USE_XGB = False

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False

from app.ml.generate_data import generate_dataset, FEATURE_COLUMNS


def train_and_save(output_path: str = "./models/risk_model.pkl") -> dict:
    print("[TRAIN] Generating synthetic dataset with entity clusters...")
    df = generate_dataset(n_customers=1000, n_transactions=15000, fraud_rate=0.08)

    X = df[FEATURE_COLUMNS].values.astype(np.float32)
    y = df["is_fraud"].values
    groups = df["cluster_id"].values

    print(f"[TRAIN] Dataset: {len(df)} transactions, {y.sum()} fraud ({y.mean()*100:.1f}%), {len(set(groups))} entity clusters")

    # Cluster-level split: entire syndicate clusters are strictly in train OR test (NO leakage)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups=groups))

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y[train_idx], y[test_idx]
    groups_train = set(groups[train_idx])
    groups_test = set(groups[test_idx])

    # Assert 0 cluster overlap
    overlap = groups_train.intersection(groups_test)
    assert len(overlap) == 0, f"Entity cluster leakage detected: {overlap}"
    print(f"[TRAIN] Entity-cluster split verified: 0 cluster overlap between train ({len(groups_train)} clusters) and test ({len(groups_test)} clusters)")

    if USE_XGB:
        print("[TRAIN] Training XGBoost classifier...")
        scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
        clf = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.05,
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=42,
            n_jobs=-1,
        )
        clf.fit(X_train, y_train)
    else:
        print("[TRAIN] Training GradientBoosting classifier...")
        clf = GradientBoostingClassifier(n_estimators=200, max_depth=4, learning_rate=0.05, random_state=42)
        clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]

    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / max(fp + tn, 1)
    auc = roc_auc_score(y_test, y_prob)

    print(f"[EVAL] Held-out Cluster Evaluation (Zero Leakage):")
    print(f"       Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f}")
    print(f"       AUC-ROC: {auc:.4f} | False Positive Rate: {fpr:.4f}")
    print(f"       Confusion Matrix: TN={tn} FP={fp} FN={fn} TP={tp}")
    print(f"       Test set size: {len(y_test)} transactions")

    explainer = None
    if HAS_SHAP:
        print("[TRAIN] Computing SHAP explainer...")
        try:
            explainer = shap.TreeExplainer(clf)
        except Exception as e:
            print(f"[WARN] SHAP explainer note: {e}")

    artifact = {
        "model": clf,
        "feature_columns": FEATURE_COLUMNS,
        "explainer": explainer,
        "metrics": {
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "false_positive_rate": float(fpr),
            "auc_roc": float(auc),
            "test_set_size": int(len(y_test)),
            "run_at": datetime.now(timezone.utc).isoformat(),
        },
        "feature_importances": dict(zip(FEATURE_COLUMNS, clf.feature_importances_.tolist())) if hasattr(clf, "feature_importances_") else {},
    }

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(artifact, output_path)
    print(f"[TRAIN] Model artifact saved to {output_path}")

    return artifact["metrics"]


if __name__ == "__main__":
    output = sys.argv[1] if len(sys.argv) > 1 else "./models/risk_model.pkl"
    metrics = train_and_save(output)
    print("\n=== Final Metrics ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")