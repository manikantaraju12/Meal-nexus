#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
MealNexus AI - Train locally and deploy to SageMaker.
No Docker required — uses AWS pre-built XGBoost container.

Steps:
  1. Generate 5000 synthetic training samples
  2. Train XGBoost model locally (~1-2 min)
  3. Package model.json + scaler.pkl + inference.py into model.tar.gz
  4. Upload to S3
  5. Create SageMaker endpoint (5-15 min for AWS to provision)
"""

import os, sys, json, pickle, tarfile, time, math, random, tempfile
from pathlib import Path

# Load backend .env so AWS credentials are available without extra env setup
_env_path = Path(__file__).parent.parent / "backend" / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import boto3
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error

# ── Config ────────────────────────────────────────────────────────────────────
REGION        = "us-east-1"
BUCKET        = "mealnexus-uploads"
ENDPOINT_NAME = "mealnexus-ranking-dev"
INSTANCE_TYPE = "ml.t2.medium"
SAMPLES       = 5000
ROLE_NAME     = "mealnexus-sagemaker-role-dev"
S3_MODEL_KEY  = "sagemaker/mealnexus-ranking/model.tar.gz"
# AWS pre-built XGBoost container (no Docker needed)
XGBOOST_IMAGE = "683313688378.dkr.ecr.us-east-1.amazonaws.com/sagemaker-xgboost:1.7-1"

INFERENCE_PY  = os.path.join(os.path.dirname(__file__), "inference", "inference.py")
# ──────────────────────────────────────────────────────────────────────────────


def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Step 1: Generate training data ───────────────────────────────────────────
def generate_data(n=5000):
    print(f"\n[1/5] Generating {n} training samples...")
    rows = []
    for _ in range(n):
        dlat = random.uniform(12.8, 28.7)
        dlon = random.uniform(77.0, 88.0)
        clat = dlat + random.uniform(-0.5, 0.5)
        clon = dlon + random.uniform(-0.5, 0.5)
        dist = haversine(dlat, dlon, clat, clon)
        rating = random.uniform(1.0, 5.0)
        active = random.randint(0, 15)
        cap    = random.randint(5, 20)
        food   = random.choice([0, 1])
        acc    = random.uniform(0.3, 1.0)
        ctype  = random.choice(["ngo", "volunteer"])

        ds = max(0, 1 - dist/50)
        rs = rating / 5.0
        ws = 1 - (active / cap)
        score = (ds*0.40 + rs*0.25 + ws*0.20 + food*0.15) if ctype == "ngo" \
                else (ds*0.45 + rs*0.25 + ws*0.20 + acc*0.10)
        score = max(0, min(1, score + random.uniform(-0.05, 0.05)))

        rows.append({"donation_lat": dlat, "donation_lon": dlon,
                     "candidate_lat": clat, "candidate_lon": clon,
                     "candidate_rating": round(rating, 2), "active_tasks": active,
                     "max_capacity": cap, "food_match": food,
                     "acceptance_rate": round(acc, 2), "candidate_type": ctype,
                     "match_score": round(score, 4)})

    df = pd.DataFrame(rows)
    print(f"    Generated {len(df)} samples [OK]")
    return df


# ── Step 2: Train model ───────────────────────────────────────────────────────
def extract_features(df):
    feats = []
    for _, r in df.iterrows():
        dist     = haversine(r["donation_lat"], r["donation_lon"], r["candidate_lat"], r["candidate_lon"])
        rating   = r["candidate_rating"] / 5.0
        workload = r["active_tasks"] / r["max_capacity"] if r["max_capacity"] > 0 else 0
        food     = float(r["food_match"])
        acc      = float(r["acceptance_rate"])
        ctype    = 1.0 if r["candidate_type"] == "ngo" else 0.0
        feats.append([dist, rating, workload, food, acc, ctype])
    return np.array(feats)


def train(df, model_dir):
    print("\n[2/5] Training XGBoost model...")
    X = extract_features(df)
    y = df["match_score"].values

    X_tr, X_val, y_tr, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    scaler = StandardScaler()
    X_tr_s  = scaler.fit_transform(X_tr)
    X_val_s = scaler.transform(X_val)

    model = xgb.XGBRegressor(
        n_estimators=200, max_depth=6, learning_rate=0.1,
        subsample=0.8, colsample_bytree=0.8,
        objective="reg:squarederror", random_state=42,
        early_stopping_rounds=20, eval_metric="rmse"
    )
    model.fit(X_tr_s, y_tr, eval_set=[(X_val_s, y_val)], verbose=False)

    mse = mean_squared_error(y_val, model.predict(X_val_s))
    mae = mean_absolute_error(y_val, model.predict(X_val_s))
    print(f"    MSE: {mse:.4f}  |  MAE: {mae:.4f} [OK]")

    os.makedirs(model_dir, exist_ok=True)
    model.save_model(os.path.join(model_dir, "model.json"))
    # Save scaler as JSON so it loads on any numpy version (no pickle)
    scaler_params = {
        "mean":  scaler.mean_.tolist(),
        "scale": scaler.scale_.tolist(),
        "var":   scaler.var_.tolist(),
    }
    with open(os.path.join(model_dir, "scaler_params.json"), "w") as f:
        json.dump(scaler_params, f)
    print(f"    Artifacts saved [OK]")


# ── Step 3: Package artifacts ─────────────────────────────────────────────────
def package(model_dir, tarball):
    print("\n[3/5] Packaging model.json + scaler_params.json + inference.py ...")
    with tarfile.open(tarball, "w:gz") as tar:
        tar.add(os.path.join(model_dir, "model.json"),         arcname="model.json")
        tar.add(os.path.join(model_dir, "scaler_params.json"), arcname="scaler_params.json")
        tar.add(INFERENCE_PY, arcname="code/inference.py")
    print(f"    Packaged -> {tarball} [OK]")


# ── Step 4: Upload to S3 ──────────────────────────────────────────────────────
def upload(s3, tarball):
    print(f"\n[4/5] Uploading to s3://{BUCKET}/{S3_MODEL_KEY} ...")
    s3.upload_file(tarball, BUCKET, S3_MODEL_KEY)
    uri = f"s3://{BUCKET}/{S3_MODEL_KEY}"
    print(f"    Uploaded [OK]  →  {uri}")
    return uri


# ── IAM Role helper ───────────────────────────────────────────────────────────
def get_or_create_role(iam):
    try:
        role_arn = iam.get_role(RoleName=ROLE_NAME)["Role"]["Arn"]
        print(f"    Using existing role: {role_arn}")
        return role_arn
    except iam.exceptions.NoSuchEntityException:
        print(f"    Creating IAM role: {ROLE_NAME} ...")
        trust = json.dumps({"Version": "2012-10-17", "Statement": [
            {"Effect": "Allow", "Principal": {"Service": "sagemaker.amazonaws.com"},
             "Action": "sts:AssumeRole"}
        ]})
        resp = iam.create_role(RoleName=ROLE_NAME, AssumeRolePolicyDocument=trust,
                               Description="MealNexus SageMaker execution role")
        iam.attach_role_policy(RoleName=ROLE_NAME,
                               PolicyArn="arn:aws:iam::aws:policy/AmazonSageMakerFullAccess")
        iam.attach_role_policy(RoleName=ROLE_NAME,
                               PolicyArn="arn:aws:iam::aws:policy/AmazonS3FullAccess")
        time.sleep(12)
        print(f"    Role created [OK]")
        return resp["Role"]["Arn"]


# ── Step 5: Deploy SageMaker endpoint ────────────────────────────────────────
def deploy(sm, iam, model_s3_uri):
    print(f"\n[5/5] Deploying SageMaker endpoint: {ENDPOINT_NAME}")

    role_arn    = get_or_create_role(iam)
    image_uri   = XGBOOST_IMAGE
    config_name = f"{ENDPOINT_NAME}-config"

    # Delete endpoint first (must be gone before model/config can be deleted)
    try:
        sm.delete_endpoint(EndpointName=ENDPOINT_NAME)
        print(f"    Deleted existing endpoint, waiting 30s...")
        time.sleep(30)
    except Exception:
        pass
    # Delete stale model and config
    for fn, arg in [(sm.delete_model,            {"ModelName": ENDPOINT_NAME}),
                    (sm.delete_endpoint_config,  {"EndpointConfigName": config_name})]:
        try: fn(**arg)
        except Exception: pass

    sm.create_model(
        ModelName=ENDPOINT_NAME,
        PrimaryContainer={
            "Image": image_uri,
            "ModelDataUrl": model_s3_uri,
            "Environment": {
                "SAGEMAKER_PROGRAM": "inference.py",
                "SAGEMAKER_SUBMIT_DIRECTORY": "/opt/ml/model/code"
            }
        },
        ExecutionRoleArn=role_arn
    )
    print(f"    SageMaker model created [OK]")

    sm.create_endpoint_config(
        EndpointConfigName=config_name,
        ProductionVariants=[{
            "VariantName": "AllTraffic",
            "ModelName": ENDPOINT_NAME,
            "InstanceType": INSTANCE_TYPE,
            "InitialInstanceCount": 1,
            "InitialVariantWeight": 1.0
        }]
    )
    print(f"    Endpoint config created [OK]")

    sm.create_endpoint(EndpointName=ENDPOINT_NAME, EndpointConfigName=config_name)
    print(f"    Creating endpoint (this takes 5-15 min)...")

    print("    Waiting for InService status...")
    sm.get_waiter("endpoint_in_service").wait(
        EndpointName=ENDPOINT_NAME,
        WaiterConfig={"Delay": 30, "MaxAttempts": 40}
    )
    print(f"    Endpoint is InService [OK]")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  MealNexus AI — SageMaker Deployment (no Docker needed)")
    print("=" * 60)

    session = boto3.Session(
        region_name=REGION,
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )
    s3  = session.client("s3")
    sm  = session.client("sagemaker")
    iam = session.client("iam")
    sts = session.client("sts")

    account = sts.get_caller_identity()["Account"]
    print(f"  AWS Account : {account}")
    print(f"  Region      : {REGION}")
    print(f"  S3 Bucket   : {BUCKET}")

    with tempfile.TemporaryDirectory() as tmp:
        df = generate_data(SAMPLES)
        train(df, os.path.join(tmp, "model"))
        tarball = os.path.join(tmp, "model.tar.gz")
        package(os.path.join(tmp, "model"), tarball)
        uri = upload(s3, tarball)

    deploy(sm, iam, uri)

    print("\n" + "=" * 60)
    print("  DEPLOYMENT COMPLETE")
    print("=" * 60)
    print(f"\n  Add these to backend/.env:")
    print(f"  SAGEMAKER_ENDPOINT_NAME={ENDPOINT_NAME}")
    print(f"  SAGEMAKER_REGION={REGION}")
    print(f"\n  NOTE:  Remember to delete the endpoint after demo to avoid charges:")
    print(f"  (AWS Console → SageMaker → Endpoints → Delete)")
    print()


if __name__ == "__main__":
    main()
