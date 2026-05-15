# MealNexus AWS Deployment Guide

## Prerequisites

- AWS CLI installed and configured
- SAM CLI installed
- Docker installed and running
- Node.js 20+ and Python 3.11+
- AWS account with appropriate permissions

## 1. AWS CLI Setup

```bash
# Configure AWS credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

## 2. Infrastructure Deployment

### Deploy SAM Template

```bash
cd infrastructure

# Validate template
sam validate

# Build
sam build

# Deploy (first time - guided)
sam deploy --guided

# Subsequent deployments
sam deploy \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

This creates:
- S3 bucket for assets
- SQS queue + DLQ for donation events
- SNS topics for NGO/Volunteer notifications
- Lambda function for AI ranking
- API Gateway for AI service
- ECR repositories for backend/frontend
- ECS cluster with Fargate
- VPC, subnets, security groups, ALB

## 3. Build and Push Docker Images

### Backend

```bash
cd backend

# Build
docker build -t mealnexus-backend .

# Tag for ECR
docker tag mealnexus-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mealnexus-backend-dev:latest

# Push
aws ecr get-login-password | docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mealnexus-backend-dev:latest
```

### Frontend

```bash
cd frontend

# Build
docker build -t mealnexus-frontend .

# Tag for ECR
docker tag mealnexus-frontend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mealnexus-frontend-dev:latest

# Push
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mealnexus-frontend-dev:latest
```

## 4. Update ECS Services

After pushing images, force new deployments:

```bash
# Update backend service
aws ecs update-service \
  --cluster mealnexus-dev \
  --service mealnexus-backend-dev \
  --force-new-deployment

# Update frontend service
aws ecs update-service \
  --cluster mealnexus-dev \
  --service mealnexus-frontend-dev \
  --force-new-deployment

# Wait for stability
aws ecs wait services-stable \
  --cluster mealnexus-dev \
  --services mealnexus-backend-dev mealnexus-frontend-dev
```

## 5. Environment Variables

Set these in your backend ECS task definition or .env file:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mealnexus

# AWS Services
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mealnexus-donation-events-dev
SNS_NGO_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:mealnexus-ngo-notifications-dev
SNS_VOLUNTEER_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:mealnexus-volunteer-notifications-dev
S3_BUCKET_NAME=mealnexus-dev-ACCOUNT_ID

# AI Service
AI_API_URL=https://API_ID.execute-api.us-east-1.amazonaws.com/dev

# JWT
JWT_SECRET=your-secret-key
```

## 6. Frontend Environment

Create `frontend/.env.production`:

```env
VITE_API_URL=http://ALB_DNS/api
VITE_AI_API_URL=https://API_ID.execute-api.us-east-1.amazonaws.com/dev
```

## 7. CI/CD with GitHub Actions

1. Add repository secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

2. Push to `main` or `develop` branch to trigger deployment.

## 8. SageMaker AI Ranking Deployment (Recommended)

MealNexus supports deploying the AI ranking service to AWS SageMaker for scalable, production-grade inference. The backend will automatically try SageMaker first and fall back to the local AI service if unavailable.

### 8.1 Generate Training Data (Optional - for XGBoost model)

```bash
cd ai-service

# Generate synthetic training data
python scripts/generate_training_data.py --output training-data.csv --samples 5000

# Upload to S3 for SageMaker training
aws s3 cp training-data.csv s3://mealnexus-dev-ACCOUNT_ID/training/
```

### 8.2 Deploy SageMaker Endpoint

```bash
cd ai-service

# Set required environment variables
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Build, push, and deploy
python scripts/deploy_sagemaker.py --env dev --instance-type ml.t2.medium
```

This script will:
1. Build a Docker image using `Dockerfile.sagemaker`
2. Push it to Amazon ECR (`mealnexus-sagemaker-ranking`)
3. Create a SageMaker execution role
4. Create the Model, EndpointConfig, and Endpoint

### 8.3 Test the Endpoint

```bash
cd ai-service
python scripts/test_sagemaker.py --endpoint mealnexus-ranking-dev --region us-east-1
```

### 8.4 Configure Backend to Use SageMaker

Update your backend environment variables:

```env
SAGEMAKER_ENDPOINT_NAME=mealnexus-ranking-dev
SAGEMAKER_REGION=us-east-1
```

Or set them in your ECS task definition. The backend will:
1. First try the SageMaker endpoint
2. Fall back to the local AI service (`AI_SERVICE_URL`) if SageMaker fails
3. Fall back to nearest-neighbor geospatial search if both AI services fail

### 8.5 Update Infrastructure (SAM)

The SAM template already includes SageMaker resources. Deploy or update the stack:

```bash
cd infrastructure
sam deploy \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides Environment=dev \
  --capabilities CAPABILITY_IAM
```

This creates:
- ECR repository for the SageMaker image
- SageMaker execution role
- IAM policy allowing the backend ECS tasks to invoke the endpoint

### 8.6 SageMaker Architecture

```
Backend (ECS) -> SageMaker Runtime API -> SageMaker Endpoint
                                     |
                                     v
                              ECR Container Image
                              (sagemaker_serving.py)
```

### 8.7 Training an XGBoost Model (Advanced)

For a trained ML model instead of rule-based scoring:

```bash
cd ai-service/training

# Upload training data to S3
aws s3 cp training-data.csv s3://mealnexus-dev-ACCOUNT_ID/training/

# Start training job
python train.py \
  --train s3://mealnexus-dev-ACCOUNT_ID/training/ \
  --model-dir ./model

# Deploy the trained model to SageMaker
# Use the SageMaker console or boto3 to create a Model, EndpointConfig, and Endpoint
# with the trained model artifacts in S3
```

## 9. Verification

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names mealnexus-alb-dev \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Test health check
curl http://$ALB_DNS/

# Test AI API
AI_URL=$(aws cloudformation describe-stacks \
  --stack-name mealnexus-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

curl -X POST $AI_URL \
  -H "Content-Type: application/json" \
  -d '{"donation": {...}, "candidates": [...], "candidateType": "ngo"}'
```

## 10. Cleanup

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name mealnexus-dev

# Or use SAM
sam delete --stack-name mealnexus-dev
```

## Architecture Overview

```
User -> CloudFront/ALB -> Frontend (ECS/Fargate)
                          -> Backend (ECS/Fargate) -> MongoDB
                                                   -> SQS -> SNS -> Email/SMS
                                                   -> S3 (images)
                                                   -> SageMaker Runtime -> SageMaker Endpoint (Ranking)
                          -> AI API (API Gateway) -> Lambda (Ranking - fallback)
                                                   -> Local Flask (Ranking - dev fallback)
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| ECS tasks failing | Check CloudWatch logs at `/ecs/mealnexus-backend-dev` |
| SQS messages not processing | Verify `SQS_QUEUE_URL` env var |
| AI Lambda timeout | Increase timeout in SAM template |
| ECR push denied | Run `aws ecr get-login-password` |
| CORS errors | Verify API Gateway CORS settings |
| SageMaker endpoint not found | Verify `SAGEMAKER_ENDPOINT_NAME` env var and endpoint status in AWS console |
| SageMaker invocation errors | Check that backend task role has `sagemaker:InvokeEndpoint` permission |
| SageMaker endpoint creation fails | Check IAM role exists and ECR image is accessible |
| AI ranking falls back to local | Check CloudWatch logs for `[SageMaker]` or `[AI Match]` messages |
