import json
import os

import numpy as np
import xgboost as xgb
from sklearn.preprocessing import StandardScaler


def model_fn(model_dir):
    """Load the model and scaler for inference."""
    model = xgb.Booster()
    model.load_model(os.path.join(model_dir, "model.json"))

    # Load scaler from JSON (numpy-version-agnostic — no pickle)
    with open(os.path.join(model_dir, "scaler_params.json")) as f:
        params = json.load(f)
    scaler = StandardScaler()
    scaler.mean_  = np.array(params["mean"])
    scaler.scale_ = np.array(params["scale"])
    scaler.var_   = np.array(params["var"])
    scaler.n_features_in_ = len(params["mean"])

    return {"model": model, "scaler": scaler}


def input_fn(request_body, request_content_type):
    """Parse incoming inference requests."""
    if request_content_type == "application/json":
        payload = json.loads(request_body)
        features = payload.get("features", [])
        return np.array(features)
    raise ValueError(f"Unsupported content type: {request_content_type}")


def predict_fn(input_data, model_dict):
    """Make predictions on the input data."""
    scaler = model_dict["scaler"]
    model = model_dict["model"]

    scaled_data = scaler.transform(input_data)
    dmatrix = xgb.DMatrix(scaled_data)
    predictions = model.predict(dmatrix)
    return predictions.tolist()


def output_fn(prediction, accept):
    """Format the prediction output."""
    if accept == "application/json":
        return json.dumps({"scores": prediction}), accept
    raise ValueError(f"Unsupported accept type: {accept}")
