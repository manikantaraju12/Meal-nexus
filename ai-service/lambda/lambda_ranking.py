import json
import math
import os
from typing import Any


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two coordinates."""
    R = 6371  # Earth radius in km
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
    # Extract coordinates
    d_coords = donation.get("pickupLocation", {}).get("coordinates", {})
    c_coords = candidate.get("address", {}).get("coordinates", {})

    # Distance score (inverse — closer is better)
    distance = 50.0  # default large distance
    if d_coords and c_coords:
        distance = haversine_distance(
            d_coords.get("lat", 0),
            d_coords.get("lng", 0),
            c_coords.get("lat", 0),
            c_coords.get("lng", 0),
        )
    distance_score = 1 - normalize(distance, 0, 50)

    # Rating score
    rating = candidate.get("rating", {}).get("average", 0)
    rating_score = rating / 5.0 if rating else 0.5

    # Workload score (inverse — fewer tasks is better)
    active_tasks = candidate.get("stats", {}).get("activeTasks", 0)
    max_capacity = candidate.get("maxCapacity", 10)
    workload_score = 1 - normalize(active_tasks, 0, max_capacity)

    # Food type match
    donation_food_type = donation.get("foodDetails", {}).get("foodType", "")
    preferred_types = candidate.get("preferredFoodTypes", [])
    food_match = (
        1.0
        if not preferred_types or donation_food_type in preferred_types
        else 0.0
    )

    # Weighted scoring
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


def lambda_handler(event: dict, context: Any) -> dict:
    """AWS Lambda handler for ranking candidates."""
    try:
        body = json.loads(event.get("body", "{}"))
        donation = body.get("donation", {})
        candidates = body.get("candidates", [])
        candidate_type = body.get("candidateType", "ngo")
        top_n = body.get("topN", 3)

        # Score all candidates
        scored = []
        for candidate in candidates:
            score = score_candidate(donation, candidate, candidate_type)
            scored.append({"candidate": candidate, "score": score})

        # Sort by score descending and take top N
        scored.sort(key=lambda x: x["score"], reverse=True)
        top_candidates = scored[:top_n]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps(
                {
                    "success": True,
                    "recommendations": top_candidates,
                    "totalScored": len(candidates),
                }
            ),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"success": False, "error": str(e)}),
        }
