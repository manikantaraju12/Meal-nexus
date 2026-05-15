#!/usr/bin/env python3
"""
Deploy the MealNexus AI ranking service to AWS SageMaker.

This script:
1. Builds a Docker image for SageMaker
2. Pushes it to Amazon ECR
3. Creates a SageMaker Model, EndpointConfig, and Endpoint

Prerequisites:
- AWS CLI configured with appropriate permissions
- Docker running
- boto3 and sagemaker Python packages installed

Usage:
    export AWS_REGION=us-east-1
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    python deploy_sagemaker.py --env dev --instance-type ml.t2.medium

To use the deployed endpoint from the backend:
    Set SAGEMAKER_ENDPOINT_NAME=mealnexus-ranking-dev in backend .env
"""

import argparse
import json
import os
import subprocess
import sys
import time

import boto3


REGION = os.environ.get("AWS_REGION", "us-east-1")
ACCOUNT_ID = os.environ.get("AWS_ACCOUNT_ID", "")

ECR_REPO_NAME = os.environ.get("ECR_REPO_NAME", "mealnexus-sagemaker-ranking")
IMAGE_TAG = "latest"


def run_command(cmd, cwd=None):
    """Run a shell command and return output."""
    print(f">>> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        sys.exit(1)
    return result.stdout.strip()


def ensure_ecr_repository(ecr_client, repo_name):
    """Create ECR repo if it doesn't exist."""
    try:
        ecr_client.describe_repositories(repositoryNames=[repo_name])
        print(f"ECR repository '{repo_name}' exists.")
    except ecr_client.exceptions.RepositoryNotFoundException:
        print(f"Creating ECR repository '{repo_name}'...")
        ecr_client.create_repository(repositoryName=repo_name)
        print(f"ECR repository '{repo_name}' created.")


def build_and_push_image(account_id, region, repo_name, tag, cwd):
    """Build Docker image and push to ECR."""
    ecr_uri = f"{account_id}.dkr.ecr.{region}.amazonaws.com"
    image_uri = f"{ecr_uri}/{repo_name}:{tag}"

    # Login to ECR
    login_cmd = (
        f"aws ecr get-login-password --region {region} | "
        f"docker login --username AWS --password-stdin {ecr_uri}"
    )
    run_command(login_cmd)

    # Build image using SageMaker Dockerfile
    build_cmd = f"docker build -t {repo_name}:{tag} -f Dockerfile.sagemaker ."
    run_command(build_cmd, cwd=cwd)

    # Tag image
    tag_cmd = f"docker tag {repo_name}:{tag} {image_uri}"
    run_command(tag_cmd)

    # Push image
    push_cmd = f"docker push {image_uri}"
    run_command(push_cmd)

    print(f"Image pushed: {image_uri}")
    return image_uri


def get_or_create_execution_role(iam_client, role_name):
    """Get or create SageMaker execution role."""
    try:
        response = iam_client.get_role(RoleName=role_name)
        role_arn = response["Role"]["Arn"]
        print(f"SageMaker execution role exists: {role_arn}")
        return role_arn
    except iam_client.exceptions.NoSuchEntityException:
        print(f"Creating SageMaker execution role '{role_name}'...")
        assume_role_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"Service": "sagemaker.amazonaws.com"},
                    "Action": "sts:AssumeRole",
                }
            ],
        }
        response = iam_client.create_role(
            RoleName=role_name,
            AssumeRolePolicyDocument=json.dumps(assume_role_policy),
            Description="Execution role for MealNexus SageMaker ranking endpoint",
        )
        # Attach AmazonSageMakerFullAccess policy
        iam_client.attach_role_policy(
            RoleName=role_name,
            PolicyArn="arn:aws:iam::aws:policy/AmazonSageMakerFullAccess",
        )
        # Also attach ECR read access
        iam_client.attach_role_policy(
            RoleName=role_name,
            PolicyArn="arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
        )
        role_arn = response["Role"]["Arn"]
        print(f"Role created: {role_arn}")
        # Wait for role to propagate
        time.sleep(10)
        return role_arn


def deploy_endpoint(sagemaker_client, image_uri, role_arn, endpoint_name, instance_type):
    """Create SageMaker model, endpoint config, and endpoint."""
    model_name = endpoint_name
    config_name = f"{endpoint_name}-config"

    # Delete existing model if present (redeploy scenario)
    try:
        sagemaker_client.delete_model(ModelName=model_name)
        print(f"Deleted existing model: {model_name}")
    except Exception:
        pass

    # Delete existing endpoint config if present
    try:
        sagemaker_client.delete_endpoint_config(EndpointConfigName=config_name)
        print(f"Deleted existing endpoint config: {config_name}")
    except Exception:
        pass

    # Create model
    print(f"Creating SageMaker model '{model_name}'...")
    sagemaker_client.create_model(
        ModelName=model_name,
        PrimaryContainer={
            "Image": image_uri,
            "Mode": "SingleModel",
        },
        ExecutionRoleArn=role_arn,
    )
    print(f"Model created: {model_name}")

    # Create endpoint config
    print(f"Creating endpoint config '{config_name}'...")
    sagemaker_client.create_endpoint_config(
        EndpointConfigName=config_name,
        ProductionVariants=[
            {
                "VariantName": "AllTraffic",
                "ModelName": model_name,
                "InstanceType": instance_type,
                "InitialInstanceCount": 1,
                "InitialVariantWeight": 1.0,
            }
        ],
    )
    print(f"Endpoint config created: {config_name}")

    # Create or update endpoint
    try:
        sagemaker_client.describe_endpoint(EndpointName=endpoint_name)
        print(f"Endpoint '{endpoint_name}' exists. Updating...")
        sagemaker_client.update_endpoint(
            EndpointName=endpoint_name,
            EndpointConfigName=config_name,
        )
    except sagemaker_client.exceptions.ClientError as e:
        if "Could not find endpoint" in str(e):
            print(f"Creating endpoint '{endpoint_name}'...")
            sagemaker_client.create_endpoint(
                EndpointName=endpoint_name,
                EndpointConfigName=config_name,
            )
        else:
            raise

    print(f"Endpoint creation/update initiated: {endpoint_name}")
    print("Waiting for endpoint to be InService (this may take 5-10 minutes)...")

    waiter = sagemaker_client.get_waiter("endpoint_in_service")
    try:
        waiter.wait(
            EndpointName=endpoint_name,
            WaiterConfig={"Delay": 30, "MaxAttempts": 40},
        )
        print(f"Endpoint is InService: {endpoint_name}")
    except Exception as e:
        print(f"Endpoint did not reach InService state: {e}")
        print("Check the SageMaker console for details.")
        sys.exit(1)

    return endpoint_name


def main():
    parser = argparse.ArgumentParser(description="Deploy MealNexus AI to SageMaker")
    parser.add_argument("--env", type=str, default="dev", help="Environment name (dev/staging/prod)")
    parser.add_argument("--instance-type", type=str, default="ml.t2.medium", help="SageMaker instance type")
    parser.add_argument("--skip-build", action="store_true", help="Skip Docker build and use existing ECR image")
    args = parser.parse_args()

    if not ACCOUNT_ID:
        print("Error: AWS_ACCOUNT_ID environment variable not set.")
        print("Run: export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)")
        sys.exit(1)

    endpoint_name = f"mealnexus-ranking-{args.env}"
    role_name = f"mealnexus-sagemaker-role-{args.env}"

    script_dir = os.path.dirname(os.path.abspath(__file__))
    ai_service_dir = os.path.dirname(script_dir)

    ecr_client = boto3.client("ecr", region_name=REGION)
    iam_client = boto3.client("iam", region_name=REGION)
    sagemaker_client = boto3.client("sagemaker", region_name=REGION)

    # Step 1: Ensure ECR repo exists
    ensure_ecr_repository(ecr_client, ECR_REPO_NAME)

    # Step 2: Build and push image (unless skipped)
    if not args.skip_build:
        image_uri = build_and_push_image(
            ACCOUNT_ID, REGION, ECR_REPO_NAME, IMAGE_TAG, cwd=ai_service_dir
        )
    else:
        image_uri = f"{ACCOUNT_ID}.dkr.ecr.{REGION}.amazonaws.com/{ECR_REPO_NAME}:{IMAGE_TAG}"
        print(f"Using existing image: {image_uri}")

    # Step 3: Get or create execution role
    role_arn = get_or_create_execution_role(iam_client, role_name)

    # Step 4: Deploy endpoint
    deploy_endpoint(
        sagemaker_client,
        image_uri,
        role_arn,
        endpoint_name,
        args.instance_type,
    )

    print("\n" + "=" * 60)
    print("DEPLOYMENT COMPLETE")
    print("=" * 60)
    print(f"Endpoint Name: {endpoint_name}")
    print(f"Region:        {REGION}")
    print(f"Instance Type: {args.instance_type}")
    print(f"Image URI:     {image_uri}")
    print("\nAdd this to your backend .env:")
    print(f"  SAGEMAKER_ENDPOINT_NAME={endpoint_name}")
    print(f"  SAGEMAKER_REGION={REGION}")
    print("\nTest the endpoint:")
    print(f"  python scripts/test_sagemaker.py --endpoint {endpoint_name}")


if __name__ == "__main__":
    main()
