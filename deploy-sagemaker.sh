#!/bin/bash
set -e

# =============================================================================
# MealNexus SageMaker Deployment Script
# =============================================================================
# This script deploys the AI ranking service to AWS SageMaker.
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - Docker running
#   - Python 3.11+ with boto3 and sagemaker packages
#
# Usage:
#   ./deploy-sagemaker.sh [dev|staging|prod]
#
# =============================================================================

ENVIRONMENT="${1:-dev}"
INSTANCE_TYPE="${2:-ml.t2.medium}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_SERVICE_DIR="$SCRIPT_DIR/ai-service"
INFRA_DIR="$SCRIPT_DIR/infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Check Prerequisites
# =============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed."
        echo "Install it from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        echo "Or run: brew install awscli"
        exit 1
    fi
    AWS_VERSION=$(aws --version 2>&1 | head -1)
    log_success "AWS CLI found: $AWS_VERSION"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH."
        echo "Install Docker Desktop from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker is installed but not running. Please start Docker Desktop."
        exit 1
    fi
    DOCKER_VERSION=$(docker --version)
    log_success "Docker found: $DOCKER_VERSION"

    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed."
        echo "Install it from: https://www.python.org/downloads/"
        exit 1
    fi
    PYTHON_VERSION=$(python3 --version)
    log_success "Python found: $PYTHON_VERSION"

    # Check AWS credentials
    log_info "Verifying AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured or invalid."
        echo "Run: aws configure"
        exit 1
    fi
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    REGION=$(aws configure get region)
    log_success "AWS credentials valid (Account: $ACCOUNT_ID, Region: $REGION)"

    # Check Python dependencies
    log_info "Checking Python dependencies..."
    python3 -c "import boto3" 2>/dev/null || {
        log_warn "boto3 not installed. Installing..."
        pip3 install boto3 sagemaker
    }
    python3 -c "import sagemaker" 2>/dev/null || {
        log_warn "sagemaker not installed. Installing..."
        pip3 install sagemaker
    }
    log_success "Python dependencies ready"
}

# =============================================================================
# Deploy Infrastructure (SAM)
# =============================================================================

deploy_infrastructure() {
    log_info "Step 1: Deploying infrastructure via SAM..."
    cd "$INFRA_DIR"

    log_info "Validating SAM template..."
    sam validate

    log_info "Building SAM application..."
    sam build

    log_info "Deploying SAM stack (Environment=$ENVIRONMENT)..."
    sam deploy \
        --no-confirm-changeset \
        --no-fail-on-empty-changeset \
        --parameter-overrides "Environment=$ENVIRONMENT" \
        --capabilities CAPABILITY_IAM

    log_success "Infrastructure deployed successfully"
}

# =============================================================================
# Deploy SageMaker Endpoint
# =============================================================================

deploy_sagemaker() {
    log_info "Step 2: Deploying SageMaker endpoint..."
    cd "$AI_SERVICE_DIR"

    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    export AWS_REGION=$(aws configure get region)

    log_info "Building and pushing Docker image..."
    log_info "Deploying endpoint with instance type: $INSTANCE_TYPE"

    python3 scripts/deploy_sagemaker.py \
        --env "$ENVIRONMENT" \
        --instance-type "$INSTANCE_TYPE"

    log_success "SageMaker endpoint deployed"
}

# =============================================================================
# Test Endpoint
# =============================================================================

test_endpoint() {
    log_info "Step 3: Testing SageMaker endpoint..."
    cd "$AI_SERVICE_DIR"

    ENDPOINT_NAME="mealnexus-ranking-$ENVIRONMENT"
    REGION=$(aws configure get region)

    log_info "Invoking endpoint: $ENDPOINT_NAME"
    python3 scripts/test_sagemaker.py \
        --endpoint "$ENDPOINT_NAME" \
        --region "$REGION"

    log_success "Endpoint test complete"
}

# =============================================================================
# Update Backend Config
# =============================================================================

update_backend_config() {
    log_info "Step 4: Updating backend configuration..."

    BACKEND_ENV="$SCRIPT_DIR/backend/.env"
    ENDPOINT_NAME="mealnexus-ranking-$ENVIRONMENT"
    REGION=$(aws configure get region)

    if [ -f "$BACKEND_ENV" ]; then
        # Remove old SageMaker lines if they exist
        sed -i.bak '/^SAGEMAKER_ENDPOINT_NAME=/d' "$BACKEND_ENV" 2>/dev/null || true
        sed -i.bak '/^SAGEMAKER_REGION=/d' "$BACKEND_ENV" 2>/dev/null || true
        rm -f "$BACKEND_ENV.bak"

        # Append new config
        cat >> "$BACKEND_ENV" << EOF

# AWS SageMaker Configuration (auto-configured by deploy-sagemaker.sh)
SAGEMAKER_ENDPOINT_NAME=$ENDPOINT_NAME
SAGEMAKER_REGION=$REGION
EOF
        log_success "Backend .env updated with SageMaker endpoint: $ENDPOINT_NAME"
    else
        log_warn "Backend .env not found at $BACKEND_ENV"
    fi
}

# =============================================================================
# Print Summary
# =============================================================================

print_summary() {
    ENDPOINT_NAME="mealnexus-ranking-$ENVIRONMENT"
    REGION=$(aws configure get region)
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

    echo ""
    echo "========================================================================"
    echo "                    DEPLOYMENT COMPLETE                                 "
    echo "========================================================================"
    echo ""
    echo "  Environment:        $ENVIRONMENT"
    echo "  AWS Account:        $ACCOUNT_ID"
    echo "  AWS Region:         $REGION"
    echo "  Endpoint Name:      $ENDPOINT_NAME"
    echo "  Instance Type:      $INSTANCE_TYPE"
    echo ""
    echo "  Backend .env has been updated. To start the backend:"
    echo "    cd backend && npm install && npm run dev"
    echo ""
    echo "  To test the endpoint manually:"
    echo "    cd ai-service"
    echo "    python3 scripts/test_sagemaker.py --endpoint $ENDPOINT_NAME --region $REGION"
    echo ""
    echo "  To delete the endpoint (stop charges):"
    echo "    aws sagemaker delete-endpoint --endpoint-name $ENDPOINT_NAME"
    echo ""
    echo "========================================================================"
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo "========================================================================"
    echo "       MealNexus SageMaker Deployment - Environment: $ENVIRONMENT"
    echo "========================================================================"
    echo ""

    check_prerequisites
    deploy_infrastructure
    deploy_sagemaker
    test_endpoint
    update_backend_config
    print_summary
}

main "$@"
