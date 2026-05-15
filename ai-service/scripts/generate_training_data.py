#!/usr/bin/env python3
"""
Generate synthetic training data for MealNexus SageMaker model.
This creates a CSV dataset that can be used to train an XGBoost model
to predict volunteer/donation match scores.

Usage:
    python generate_training_data.py --output training-data.csv --samples 5000
"""

import argparse
import csv
import random
import math


def haversine_distance(lat1, lon1, lat2, lon2):
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


def generate_sample():
    # Donation coordinates (random city center)
    donation_lat = random.uniform(12.8, 28.7)  # India lat range
    donation_lon = random.uniform(77.0, 88.0)  # India lon range

    # Candidate coordinates (nearby)
    candidate_lat = donation_lat + random.uniform(-0.5, 0.5)
    candidate_lon = donation_lon + random.uniform(-0.5, 0.5)

    distance = haversine_distance(donation_lat, donation_lon, candidate_lat, candidate_lon)

    candidate_rating = random.uniform(1.0, 5.0)
    active_tasks = random.randint(0, 15)
    max_capacity = random.randint(5, 20)
    workload_ratio = active_tasks / max_capacity if max_capacity > 0 else 0
    food_match = random.choice([0, 1])
    acceptance_rate = random.uniform(0.3, 1.0)
    candidate_type = random.choice(["ngo", "volunteer"])

    # Calculate ground-truth match score using the same formula as production
    def normalize(value, min_val, max_val):
        if max_val == min_val:
            return 0.5
        return max(0, min(1, (value - min_val) / (max_val - min_val)))

    distance_score = 1 - normalize(distance, 0, 50)
    rating_score = candidate_rating / 5.0
    workload_score = 1 - normalize(active_tasks, 0, max_capacity)
    food_match_score = float(food_match)

    if candidate_type == "ngo":
        match_score = (
            distance_score * 0.40
            + rating_score * 0.25
            + workload_score * 0.20
            + food_match_score * 0.15
        )
    else:
        match_score = (
            distance_score * 0.45
            + rating_score * 0.25
            + workload_score * 0.20
            + acceptance_rate * 0.10
        )

    # Add some noise to make the ML model learn the underlying pattern
    match_score = max(0, min(1, match_score + random.uniform(-0.05, 0.05)))

    return {
        "donation_lat": donation_lat,
        "donation_lon": donation_lon,
        "candidate_lat": candidate_lat,
        "candidate_lon": candidate_lon,
        "candidate_rating": round(candidate_rating, 2),
        "active_tasks": active_tasks,
        "max_capacity": max_capacity,
        "food_match": food_match,
        "acceptance_rate": round(acceptance_rate, 2),
        "candidate_type": candidate_type,
        "match_score": round(match_score, 4),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=str, default="training-data.csv")
    parser.add_argument("--samples", type=int, default=5000)
    args = parser.parse_args()

    fieldnames = [
        "donation_lat",
        "donation_lon",
        "candidate_lat",
        "candidate_lon",
        "candidate_rating",
        "active_tasks",
        "max_capacity",
        "food_match",
        "acceptance_rate",
        "candidate_type",
        "match_score",
    ]

    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for _ in range(args.samples):
            writer.writerow(generate_sample())

    print(f"Generated {args.samples} training samples -> {args.output}")


if __name__ == "__main__":
    main()
