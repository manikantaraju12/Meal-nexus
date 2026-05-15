#!/usr/bin/env python3
"""
Test the SageMaker endpoint for the MealNexus AI ranking service.

Usage:
    python test_sagemaker.py --endpoint mealnexus-ranking-dev
"""

import argparse
import json

import boto3


def test_endpoint(endpoint_name, region="us-east-1"):
    client = boto3.client("sagemaker-runtime", region_name=region)

    payload = {
        "donation": {
            "pickupLocation": {
                "coordinates": {"lat": 17.385044, "lng": 78.486671}
            },
            "foodDetails": {"foodType": "veg"},
        },
        "candidates": [
            {
                "_id": "vol1",
                "name": "Volunteer A",
                "address": {"coordinates": {"lat": 17.390044, "lng": 78.490671}},
                "rating": {"average": 4.5},
                "stats": {"activeTasks": 2, "acceptanceRate": 0.9},
                "preferredFoodTypes": ["veg"],
                "maxCapacity": 10,
            },
            {
                "_id": "vol2",
                "name": "Volunteer B",
                "address": {"coordinates": {"lat": 17.300044, "lng": 78.400671}},
                "rating": {"average": 3.5},
                "stats": {"activeTasks": 8, "acceptanceRate": 0.6},
                "preferredFoodTypes": ["non-veg"],
                "maxCapacity": 10,
            },
        ],
        "candidateType": "volunteer",
        "topN": 2,
    }

    print(f"Invoking endpoint: {endpoint_name}")
    print(f"Payload: {json.dumps(payload, indent=2)}")

    try:
        response = client.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType="application/json",
            Body=json.dumps(payload),
        )
        result = json.loads(response["Body"].read())
        print("\nResponse:")
        print(json.dumps(result, indent=2))

        if result.get("success"):
            print("\nTop Recommendations:")
            for i, rec in enumerate(result.get("recommendations", []), 1):
                name = rec["candidate"].get("name", "Unknown")
                score = rec["score"]
                print(f"  {i}. {name} - Score: {score:.4f}")
        else:
            print(f"Error from endpoint: {result.get('error')}")

    except Exception as e:
        print(f"Error invoking endpoint: {e}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", type=str, required=True)
    parser.add_argument("--region", type=str, default="us-east-1")
    args = parser.parse_args()

    test_endpoint(args.endpoint, args.region)


if __name__ == "__main__":
    main()
