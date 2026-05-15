import json
import math
import os
from typing import Any

from flask import Flask, request, Response

app = Flask(__name__)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two coordinates."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def normalize(value: float, min_val: float, max_val: float) -> float:
    """Normalize value to 0-1 range."""
    if max_val == min_val:
        return 0.5
    return max(0, min(1, (value - min_val) / (max_val - min_val)))


def score_candidate(donation: dict, candidate: dict, candidate_type: str) -> float:
    """
    Score a candidate (NGO or volunteer) for a donation.
    Returns a score between 0 and 1.
    """
    d_coords = donation.get("pickupLocation", {}).get("coordinates", {})
    c_coords = candidate.get("address", {}).get("coordinates", {})

    distance = 50.0
    if d_coords and c_coords:
        distance = haversine_distance(
            d_coords.get("lat", 0),
            d_coords.get("lng", 0),
            c_coords.get("lat", 0),
            c_coords.get("lng", 0),
        )
    distance_score = 1 - normalize(distance, 0, 50)

    rating = candidate.get("rating", {}).get("average", 0)
    rating_score = rating / 5.0 if rating else 0.5

    active_tasks = candidate.get("stats", {}).get("activeTasks", 0)
    max_capacity = candidate.get("maxCapacity", 10)
    workload_score = 1 - normalize(active_tasks, 0, max_capacity)

    donation_food_type = donation.get("foodDetails", {}).get("foodType", "")
    preferred_types = candidate.get("preferredFoodTypes", [])
    food_match = (
        1.0
        if not preferred_types or donation_food_type in preferred_types
        else 0.0
    )

    if candidate_type == "ngo":
        score = (
            distance_score * 0.40
            + rating_score * 0.25
            + workload_score * 0.20
            + food_match * 0.15
        )
    else:  # volunteer
        acceptance_rate = candidate.get("stats", {}).get("acceptanceRate", 0.8)
        score = (
            distance_score * 0.45
            + rating_score * 0.25
            + workload_score * 0.20
            + acceptance_rate * 0.10
        )

    return round(score, 4)


@app.route("/ping", methods=["GET"])
def ping():
    """SageMaker health check endpoint."""
    return Response("{}", status=200, mimetype="application/json")


@app.route("/invocations", methods=["POST"])
def invocations():
    """SageMaker inference endpoint."""
    try:
        data = request.get_json(force=True)
        donation = data.get("donation", {})
        candidates = data.get("candidates", [])
        candidate_type = data.get("candidateType", "ngo")
        top_n = data.get("topN", 3)

        scored = []
        for candidate in candidates:
            score = score_candidate(donation, candidate, candidate_type)
            scored.append({"candidate": candidate, "score": score})

        scored.sort(key=lambda x: x["score"], reverse=True)
        top_candidates = scored[:top_n]

        result = {
            "success": True,
            "recommendations": top_candidates,
            "totalScored": len(candidates),
        }

        return Response(
            json.dumps(result),
            status=200,
            mimetype="application/json",
        )
    except Exception as e:
        error_result = {"success": False, "error": str(e)}
        return Response(
            json.dumps(error_result),
            status=500,
            mimetype="application/json",
        )


if __name__ == "__main__":
    # SageMaker containers must listen on port 8080
    port = int(os.environ.get("SAGEMAKER_BIND_TO_PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
