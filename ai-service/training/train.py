import argparse
import json
import os
import pickle

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", type=str, default=os.environ.get("SM_MODEL_DIR", "/opt/ml/model"))
    parser.add_argument("--train", type=str, default=os.environ.get("SM_CHANNEL_TRAIN", "/opt/ml/input/data/train"))
    parser.add_argument("--validation", type=str, default=os.environ.get("SM_CHANNEL_VALIDATION", "/opt/ml/input/data/validation"))
    parser.add_argument("--output-data-dir", type=str, default=os.environ.get("SM_OUTPUT_DATA_DIR", "/opt/ml/output/data"))
    return parser.parse_args()


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371
    d_lat = np.radians(lat2 - lat1)
    d_lon = np.radians(lon2 - lon1)
    a = (
        np.sin(d_lat / 2) ** 2
        + np.cos(np.radians(lat1))
        * np.cos(np.radians(lat2))
        * np.sin(d_lon / 2) ** 2
    )
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c


def extract_features(df):
    """Extract features from raw donation-candidate matching data."""
    features = []
    for _, row in df.iterrows():
        d_lat = row.get("donation_lat", 0)
        d_lon = row.get("donation_lon", 0)
        c_lat = row.get("candidate_lat", 0)
        c_lon = row.get("candidate_lon", 0)

        distance = haversine_distance(d_lat, d_lon, c_lat, c_lon)
        rating = row.get("candidate_rating", 0) / 5.0
        active_tasks = row.get("active_tasks", 0)
        max_capacity = row.get("max_capacity", 10)
        workload_ratio = active_tasks / max_capacity if max_capacity > 0 else 0
        food_match = 1.0 if row.get("food_match", False) else 0.0
        acceptance_rate = row.get("acceptance_rate", 0.8)
        candidate_type = 1.0 if row.get("candidate_type", "ngo") == "ngo" else 0.0

        features.append([
            distance,
            rating,
            workload_ratio,
            food_match,
            acceptance_rate,
            candidate_type,
        ])

    return np.array(features)


def train_model(args):
    print("Loading training data...")
    train_files = [f for f in os.listdir(args.train) if f.endswith(".csv")]
    if not train_files:
        raise ValueError("No CSV training files found")

    train_path = os.path.join(args.train, train_files[0])
    df_train = pd.read_csv(train_path)

    print(f"Training data loaded: {len(df_train)} rows")

    X = extract_features(df_train)
    y = df_train["match_score"].values

    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    print("Training XGBoost model...")
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
    )

    model.fit(
        X_train_scaled,
        y_train,
        eval_set=[(X_val_scaled, y_val)],
        early_stopping_rounds=20,
        verbose=True,
    )

    # Evaluate
    y_pred = model.predict(X_val_scaled)
    mse = mean_squared_error(y_val, y_pred)
    mae = mean_absolute_error(y_val, y_pred)

    metrics = {"mse": float(mse), "mae": float(mae)}
    print(f"Validation MSE: {mse:.4f}, MAE: {mae:.4f}")

    # Save metrics
    metrics_path = os.path.join(args.output_data_dir, "metrics.json")
    os.makedirs(args.output_data_dir, exist_ok=True)
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    # Save model
    os.makedirs(args.model_dir, exist_ok=True)
    model_path = os.path.join(args.model_dir, "model.json")
    model.save_model(model_path)

    # Save scaler
    scaler_path = os.path.join(args.model_dir, "scaler.pkl")
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)

    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")


def model_fn(model_dir):
    """Load model for SageMaker inference."""
    model = xgb.Booster()
    model.load_model(os.path.join(model_dir, "model.json"))
    return model


def input_fn(request_body, request_content_type):
    """Parse input for inference."""
    if request_content_type == "application/json":
        data = json.loads(request_body)
        return np.array(data["features"])
    raise ValueError(f"Unsupported content type: {request_content_type}")


def predict_fn(input_data, model):
    """Run prediction."""
    dmatrix = xgb.DMatrix(input_data)
    predictions = model.predict(dmatrix)
    return predictions.tolist()


def output_fn(prediction, response_content_type):
    """Format output."""
    if response_content_type == "application/json":
        return json.dumps({"scores": prediction})
    raise ValueError(f"Unsupported content type: {response_content_type}")


if __name__ == "__main__":
    args = parse_args()
    train_model(args)
