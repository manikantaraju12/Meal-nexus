# MealNexus — Food Donation Platform

MealNexus is a full-stack web application that connects food donors with NGOs and volunteers to reduce food waste and help feed those in need. The platform features a multi-role system, real-time donation tracking, AI-powered volunteer matching, and a production-grade AWS cloud infrastructure with CloudFront CDN, Route 53 DNS, and ECS Fargate deployment.

## Features

- **Multi-Role System** — Donor, Volunteer, NGO, and Admin portals with role-based access control
- **Food Donations** — Post surplus food with description, quantity, expiry date, and pickup location
- **Smart Priority** — Auto-calculates urgency (critical / high / medium / low) based on food expiry time
- **Real-time Tracking** — Status lifecycle: pending → accepted → picked → delivered
- **AI-Powered Volunteer Matching** — AWS SageMaker ranks volunteers by distance, rating, workload, and food match; falls back to Lambda → geospatial search
- **OTP Phone Verification** — Phone-based login via Fast2SMS (primary) with Twilio as fallback
- **Photo Proof Uploads** — Volunteers upload delivery proof photos stored in Amazon S3
- **Event-Driven Notifications** — SQS async queue + SNS push alerts to NGOs and volunteers
- **Campaign System** — NGOs create fundraising campaigns viewable by all users
- **Admin Dashboard** — User verification, platform-wide analytics, donation and task monitoring

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling (glassmorphism design) |
| React Router DOM v7 | Client-side routing with role-based protection |
| Axios | HTTP API client |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js v20 | Runtime |
| Express.js v4 | Web framework |
| Mongoose v8 | MongoDB ODM |
| JWT (jsonwebtoken) | Authentication tokens (30-day expiry) |
| bcryptjs | Password hashing |
| dotenv | Environment configuration |

### Database
| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Production cloud database (managed cluster) |

### AI / Machine Learning
| Service | Purpose |
|---------|---------|
| AWS SageMaker | Primary inference endpoint — BYOC Flask container (`mealnexus-ranking-dev/prod`) |
| AWS Lambda + API Gateway | Fallback AI ranking function (`mealnexus-ai-ranking-dev/prod`) |
| Python Flask | SageMaker BYOC serving app + local dev service (port 3000) |
| scikit-learn | Distance calculations and feature normalization |
| XGBoost | Model training pipeline (offline) |
| boto3 / SageMaker SDK | AWS integration |

### AWS Cloud Infrastructure
| Service | Resource Name | Purpose |
|---------|--------------|---------|
| Amazon VPC | mealnexus-vpc-dev/prod | Custom VPC (10.0.0.0/16), 2 public subnets (us-east-1a/1b), internet gateway |
| Amazon ECS Fargate | mealnexus-dev/prod | Container orchestration — backend (port 5000) + frontend (port 80), desired count 2 each |
| Amazon ECR | mealnexus-backend-dev/prod, mealnexus-frontend-dev/prod, mealnexus-sagemaker-ranking | Container image registry (3 repositories) |
| Application Load Balancer | mealnexus-alb-dev/prod | Internet-facing; `/api/*` → backend, `/*` → frontend |
| Amazon S3 | mealnexus-{env}-{account}-us-east-1 | Donation photo uploads via presigned URLs (CORS enabled) |
| Amazon SQS | mealnexus-donation-events-dev/prod | Async donation event queue with Dead Letter Queue (5-min visibility timeout) |
| Amazon SNS | mealnexus-ngo-notifications-dev/prod, mealnexus-volunteer-notifications-dev/prod | Push notifications to NGOs and volunteers (2 topics) |
| AWS Lambda | mealnexus-ai-ranking-dev/prod | AI ranking fallback function (Python 3.12, 512 MB, 30s timeout) |
| Amazon API Gateway | mealnexus-ai-api-dev/prod | REST endpoint (`/rank`) for Lambda fallback |
| AWS CloudFormation / SAM | mealnexus-dev/prod | All AWS resources defined in `infrastructure/template.yaml` |
| AWS IAM | EcsExecutionRole, EcsTaskRole, SageMakerExecutionRole | Least-privilege roles for ECS and SageMaker |
| Amazon CloudWatch Logs | /ecs/mealnexus-backend-dev/prod, /ecs/mealnexus-frontend-dev/prod | Container logs with 30-day retention |
| AWS SSM Parameter Store | /mealnexus/{env}/MONGODB_URI, /mealnexus/{env}/JWT_SECRET, /mealnexus/{env}/FAST2SMS_API_KEY | Encrypted production secrets (SecureString) — fetched by ECS at container start |
| Amazon SageMaker | mealnexus-ranking-dev/prod | Custom BYOC endpoint (ml.t2.medium, 1 instance) |
| Amazon CloudFront | mealnexus-cdn-dev/prod | Global CDN — HTTPS termination, edge caching for static assets, `/api/*` forwarded uncached to ALB |
| Amazon Route 53 | mealnexus.me hosted zone | DNS management — A alias records for apex and `www` pointing to CloudFront distribution |
| AWS Certificate Manager | mealnexus.me + www.mealnexus.me | TLS/SSL certificate (DNS-validated via Route 53, us-east-1 for CloudFront compatibility) |

### SMS Providers
| Service | Purpose |
|---------|---------|
| Fast2SMS | Primary OTP delivery — India-native, cost-effective |
| Twilio | Fallback OTP delivery — global coverage |

### DevOps & CI/CD
| Service | Purpose |
|---------|---------|
| GitHub Actions | CI/CD pipeline (`.github/workflows/deploy-aws.yml`) |
| Docker | Containerization: `node:20-alpine` (backend), `nginx:alpine` (frontend), `python:3.11-slim` (AI) |
| AWS SAM CLI | IaC build and deployment |

## Architecture

```
 Browser
    │  HTTPS
    ▼
 Route 53 (mealnexus.me A alias)
    │
    ▼
 CloudFront CDN  ──  edge cache for static assets
    │  /*  (HTTP → ALB)   │  /api/*  (uncached, all headers forwarded)
    ▼                      ▼
 ┌──────────────────────────────────────────────────┐
 │  Application Load Balancer  (mealnexus-alb)      │
 │  /api/*  ──────────►  ECS Backend  (port 5000)   │
 │  /*      ──────────►  ECS Frontend (port 80)     │
 └──────────────────────────────────────────────────┘
                    │ ECS Backend
                    ├── MongoDB Atlas         (cloud database)
                    ├── S3                    (photo uploads via presigned URLs)
                    ├── SQS ──► SNS           (async events → push notifications)
                    └── AI Ranking (3-tier fallback):
                         1. SageMaker endpoint   (primary)
                         2. Lambda + API Gateway  (fallback)
                         3. Haversine geospatial  (last resort)

Secrets:  SSM Parameter Store ──► ECS containers at runtime
Logs:     ECS containers ──────► CloudWatch Logs (/ecs/mealnexus-*)
Images:   GitHub Actions ──────► ECR ──────────► ECS rolling deploy
TLS:      ACM Certificate (DNS-validated) ──────► CloudFront HTTPS
DNS:      Route 53 hosted zone ─────────────────► Namecheap nameservers
```

## Project Structure

```
meal-nexus/
├── frontend/                        # React 18 + Vite + Tailwind (glassmorphism UI)
│   ├── src/
│   │   ├── components/              # Layout, OtpModal, shared UI
│   │   ├── pages/
│   │   │   ├── donor/               # Dashboard, Donate, MyDonations
│   │   │   ├── ngo/                 # Dashboard, Donations
│   │   │   ├── volunteer/           # Dashboard, Tasks
│   │   │   ├── admin/               # Dashboard, Users, Donations, Tasks
│   │   │   └── campaigns/           # CampaignList, CampaignDetail, CreateCampaign
│   │   ├── context/                 # AuthContext (JWT + role state)
│   │   └── utils/                   # api.js (Axios client)
│   ├── nginx.conf                   # SPA fallback + /api/ reverse proxy
│   └── Dockerfile                   # Multi-stage: node builder → nginx:alpine
├── backend/                         # Node.js + Express API
│   ├── routes/                      # auth, users, donations, tasks, otp, campaigns, admin
│   ├── middleware/                  # auth.js (JWT verify + role guard)
│   ├── models/                      # User, Donation, Task, Campaign, Notification
│   ├── utils/                       # awsMessaging.js, sagemakerClient.js, otpService.js
│   └── Dockerfile                   # node:20-alpine, non-root user, port 5000
├── ai-service/                      # Python AI ranking service
│   ├── sagemaker_serving.py         # Flask BYOC app (/ping + /invocations)
│   ├── lambda_ranking.py            # AWS Lambda handler (same scoring logic)
│   ├── app.py                       # Local dev Flask service (port 3000)
│   ├── Dockerfile.sagemaker         # python:3.11-slim + gunicorn
│   └── scripts/
│       ├── deploy_sagemaker.py      # Creates SageMaker model + endpoint
│       └── test_sagemaker.py        # Endpoint validation
├── infrastructure/
│   ├── template.yaml                # All AWS resources (VPC, ECS, ALB, S3, SQS, SNS,
│   │                                #   Lambda, API GW, ECR, IAM, CloudWatch, SageMaker,
│   │                                #   CloudFront CDN, Route 53, ACM Certificate)
│   └── samconfig.toml               # [dev] and [prod] deploy configs
└── .github/workflows/
    └── deploy-aws.yml               # 6-job CI/CD pipeline
```

## Getting Started

### Prerequisites
- Node.js v20+
- Python 3.11+ (for AI service)
- Docker Desktop (for image builds)

### Local Installation

**1. Clone the repository:**
```bash
git clone https://github.com/karthik-ganti/meal-nexus.git
cd meal-nexus
```

**2. Backend:**
```bash
cd backend
npm install
# Create .env from the template below
npm run dev          # runs on http://localhost:5000
```

**3. Frontend:**
```bash
cd frontend
npm install
npm run dev          # runs on http://localhost:5173
```

**4. AI service (optional):**
```bash
cd ai-service
pip install -r requirements.txt
python app.py        # runs on http://localhost:3000
```

## Environment Variables

Create `backend/.env`:

```env
# Core
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mealnexus
JWT_SECRET=your_jwt_secret_key

# AWS credentials (for local dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# AWS resources (values output by SAM deploy)
S3_BUCKET_NAME=mealnexus-dev-{account}-us-east-1
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/{account}/mealnexus-donation-events-dev
SNS_NGO_TOPIC_ARN=arn:aws:sns:us-east-1:{account}:mealnexus-ngo-notifications-dev
SNS_VOLUNTEER_TOPIC_ARN=arn:aws:sns:us-east-1:{account}:mealnexus-volunteer-notifications-dev

# SMS — Fast2SMS (primary, India)
USE_REAL_SMS=true
FAST2SMS_API_KEY=your_fast2sms_key

# SMS — Twilio (optional fallback)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

# AI ranking
AI_SERVICE_URL=http://localhost:3000
SAGEMAKER_ENDPOINT_NAME=mealnexus-ranking-dev
SAGEMAKER_REGION=us-east-1
```

> **Production secrets** (`MONGODB_URI`, `JWT_SECRET`, `FAST2SMS_API_KEY`) are stored in **AWS SSM Parameter Store** as SecureString at `/mealnexus/{env}/` and injected into ECS containers at runtime — never baked into Docker images.

## CI/CD Pipeline

Push to `develop` deploys to the **dev** environment. Push to `main` deploys to **prod**. Resources are named with a `-dev` or `-prod` suffix accordingly.

```
git push
  │
  ├─ [1] test
  │       Lint backend + build frontend + install AI deps
  │
  └─ [2] deploy-infra  (SAM → CloudFormation)
          VPC, ECS cluster, ALB, S3, SQS, SNS, Lambda, API Gateway, ECR repos,
          CloudFront CDN, Route 53 hosted zone, ACM certificate (if DomainName set)
          │
          ├─ [3] build                    ├─ [4] deploy-sagemaker    ├─ [5] deploy-ai
          │       Docker → ECR            │       SageMaker endpoint  │       Lambda update
          │       (backend + frontend)    │       (ml.t2.medium)      │       (SAM deploy)
          │
          └─ [6] deploy-ecs
                  ECS rolling update → wait for service stability → ALB health check
```

## AI Ranking Flow

When an NGO accepts a donation with `autoAssign: true`, the backend scores all available volunteers:

```
1. POST to SageMaker endpoint (mealnexus-ranking-{env})
   Input:  { donation, candidates, candidateType, topN }
   Scoring: distance (45%) + rating (25%) + workload (20%) + food match (10%)

2. If SageMaker unavailable → AWS Lambda fallback (mealnexus-ai-ranking-{env})
   via API Gateway POST /rank

3. If Lambda unavailable → Haversine geospatial search
   (nearest-neighbor distance only)

Output: top 3 volunteers sorted by composite score
→ NGO selects one → SQS event queued → SNS notification dispatched
```

## API Routes

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | Public | Create account |
| POST | `/api/auth/login` | Public | Step 1 — verify credentials, send OTP |
| POST | `/api/auth/verify-login-otp` | Public | Step 2 — verify OTP, receive JWT |
| GET | `/api/users/profile` | Any | Get current user profile |
| PUT | `/api/users/profile` | Any | Update profile |
| GET | `/api/users/volunteers` | NGO/Admin | List all volunteers |
| GET | `/api/users/ngos` | Public | List verified NGOs |
| POST | `/api/donations` | Donor | Post food donation |
| GET | `/api/donations` | All | List donations (filtered by role) |
| PUT | `/api/donations/:id/accept` | NGO | Accept donation + AI volunteer ranking |
| PUT | `/api/donations/:id/assign-volunteer` | NGO | Manual volunteer assignment |
| PUT | `/api/donations/:id/status` | Volunteer | Update status with proof photo |
| POST | `/api/donations/:id/rate` | Any | Rate after delivery |
| GET | `/api/tasks` | Volunteer | My assigned tasks |
| POST | `/api/otp/send` | Public | Send OTP to phone |
| POST | `/api/otp/verify` | Public | Verify OTP code |
| GET | `/api/campaigns` | Public | Browse campaigns |
| POST | `/api/campaigns` | NGO/Admin | Create campaign |
| GET | `/api/admin/dashboard` | Admin | Platform analytics |
| GET | `/api/admin/users` | Admin | All users |
| PUT | `/api/admin/users/:id/verify` | Admin | Verify user account |
| GET | `/api/admin/donations` | Admin | All donations |

## Deployment

Infrastructure is managed entirely via AWS SAM (CloudFormation). Manual deploy:

```bash
cd infrastructure
sam build
sam deploy --config-env dev --no-confirm-changeset --capabilities CAPABILITY_IAM
```

**To enable CloudFront CDN + Route 53 DNS** (requires a registered domain):
```bash
sam deploy --config-env prod --no-confirm-changeset --capabilities CAPABILITY_IAM \
  --parameter-overrides "Environment=prod DomainName=mealnexus.me"
```
After deploying with a domain, copy the **Route53NameServers** output and update your domain registrar (e.g. Namecheap) to point to Route 53. CloudFront's HTTPS URL then becomes your production endpoint.

**Live dev environment (ALB direct):**
`http://mealnexus-alb-dev-486624458.us-east-1.elb.amazonaws.com`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request targeting `develop`

## License

MIT License

## Acknowledgments

Built to reduce food waste and connect communities through technology — linking surplus food donors with NGOs and volunteers who can make it reach those who need it most.
