"""Open CAF Backend Application Entrypoint."""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import os

API_DESCRIPTION = r"""
## 🏛️ What is Open CAF?

**Open CAF** is an open-source, operational cyber resilience platform specifically architected for **UK local authorities, councils, and public sector bodies**. It transforms the National Cyber Security Centre's (**NCSC**) Cyber Assessment Framework (**CAF v4.0**) from a static, bureaucratic compliance exercise into an active, continuous verification and remediation pipeline.

---

### 🚨 1. The Core Problem Open CAF Solves
Historically, UK local authorities conduct NCSC CAF audits using cumbersome, static Excel spreadsheets distributed once a year. This creates three critical systemic failures:
1. **Compliance "Rot"**: A spreadsheet completed in January is obsolete by February as infrastructure, supplier contracts, and staff change.
2. **Disconnected Evidence**: Assertions made in assessments lack verifiable, cryptographically secured evidence. Policies, pentest reports, and logs live scattered in local drives or emails.
3. **The "Cabinet Disconnect"**: Technical deficits (e.g. lack of MFA on legacy VPNs) are never translated into statutory citizen risk or financial terms that Council Leaders, Chief Executives, and Section 151 Officers can understand to allocate capital budgets.

Open CAF replaces this manual cycle with a **continuous, tamper-evident, risk-prioritized engineering hub**.

---

### 👥 2. Who is Facing the Problem?
* **Chief Information Security Officers (CISOs) & Security Leads**: Struggling to track 39 contributing outcomes across fragmented council directorates without real-time visibility.
* **Security Assessors & Internal Auditors**: Spending weeks manually chasing evidence, cross-referencing Indicators of Good Practice (IGPs), and calculating compliance scores.
* **Section 151 Officers (CFOs) & Chief Executives**: Legally responsible for statutory services and fiscal allocations, yet forced to make multi-million pound decisions based on opaque IT jargon.
* **Cabinet Members & Audit Committees**: Requiring objective, clear cyber risk posture summaries to fulfill public governance duties.
* **DevOps & Infrastructure Engineers**: Disconnected from the audit process; rarely receiving clear, actionable Jira or GitHub tickets prioritized by council service criticality.

---

### 🔍 3. Why are They Facing the Problem?
1. **Spreadsheet Obsolescence**: Excel sheets lack audit trails, real-time collaboration, role-based access control, and API integrations.
2. **Decentralized & Stale Evidence**: Local government departments operate in silos. Evidence is submitted once, forgotten, and never checked for annual freshness.
3. **Absence of Citizen Service Context**: Standard cybersecurity tools evaluate vulnerabilities in isolation, ignoring whether a vulnerable server powers **Adult & Children's Social Care** (Tier 1 Life Safety) or a **Public Library Wi-Fi** (Tier 3 Informational).
4. **Engineering Disconnect**: Audit deficits languish in PDFs rather than flowing into the IT department's active backlog (Jira, GitHub, Kanban).

---

### 🛡️ 4. How Open CAF Solves the Problem
Open CAF delivers a **7-Stage Operational Resilience Architecture**:
1. **Authoritative CAF v4.0 Engine**: Real-time evaluation of all 4 Objectives (A, B, C, D), 14 Principles, 39 Contributing Outcomes, and 78 Indicators of Good Practice (IGPs).
2. **Cryptographic Evidence Vault**: Secure object storage (MinIO/S3) with SHA-256 tamper-evident integrity hashing, MIME type validation, and automatic 12-month freshness monitoring.
3. **Automated Gap Detection**: Automatically isolates **Evidential Gaps** (unverified claims) from **Control Deficits** (genuine technical failures).
4. **Council Service Impact Matrix**: Calculates a dynamic priority score ($0-100$) using:
   $$\\text{Priority Score} = \\text{Normalized}\\left[\\text{Gap Severity } (1-5) \\times \\text{Service Criticality Weight } (1.0-3.0) \\times \\text{Threat Likelihood } (1-3)\\right]$$
5. **Remediation Task Management & Kanban**: Converts identified gaps into actionable remediation tasks with estimated costs (£ GBP), effort hours, SLAs (14/45/90/180 days), and burndown velocity tracking.
6. **Multi-Format Integration Exporters**: 1-click export of tasks to Jira REST API v2/v3 bulk JSON, GitHub Issues JSON, and styled Excel (.xlsx) / CSV for Council Audit Committees.
7. **Assistive AI Copilot (Human-in-the-Loop)**: Client-side redaction (sanitizing IPs, hostnames, PII, and credentials) before text enters an LLM (local Ollama or Cloud) to suggest evidence mappings, critique policy gaps, and draft remediation plans.
8. **1-Click Executive Cabinet Briefing**: Generates concise, publication-grade 2-page PDFs for Chief Executives and Section 151 Officers alongside comprehensive audit registers.

---

### 🔄 5. Inputs & Outputs Matrix
| Module / Pipeline | Key Inputs | Processing Logic | Key Outputs |
| :--- | :--- | :--- | :--- |
| **Assessment Engine** | Council Scope, Outcome Evaluations, IGP Toggles, Assessor Rationales | NCSC CAF v4.0 scoring algorithm; objective rollups | Real-time maturity percentage, completion status, audit log |
| **Evidence Vault** | Raw artifacts (PDF, DOCX, XLSX, JSON, Images) | SHA-256 checksum computation, MIME validation, 12-month age calculation | Immutable evidence record, tamper hash, staleness flag |
| **Evidence Linking** | Assessment Outcomes + Evidence IDs | Many-to-many relationship mapping, coverage aggregation | Evidential coverage status, citation quotes, audit traceability |
| **Gap Detection** | Assessment Outcomes & IGP check states | Rule engine separating unevidenced outcomes from failed controls | Classified Gaps (Evidential Gap vs. Control Deficit) with severity (1-5) |
| **Risk Matrix** | Identified Gaps + Council Service Catalog (Tiers 1-3) | Impact formula: $\\text{Severity} \\times \\text{Tier Weight} \\times \\text{Threat Likelihood}$ | 0-100 Priority Score, Risk Tier (Critical, High, Med, Low), SLA target |
| **Remediation Planner** | Identified Gaps or Manual Action Items | State machine (Backlog, In Progress, In Review, Completed); cost & hours rollup | Kanban board, burndown velocity, budget summary (£) |
| **Integrations** | Remediation Tasks & Assessment Metadata | Serialization to RFC 4180 CSV, openpyxl styled Excel, Jira v2/v3 JSON, GitHub Issues JSON | Jira bulk payload, GitHub payload, executive spreadsheet |
| **Executive Reports** | Assessment outcomes, Tier 1 service risks, Remediation budget | WeasyPrint HTML5/CSS3 paged media renderer | 2-Page Executive Cabinet Briefing PDF & Full Audit Assurance Pack PDF |

---

### 🚀 6. Step-by-Step Implementation Guide
Anyone implementing Open CAF in their organization can follow these 6 practical steps:
1. **Step 1: Onboard Council & Configure RBAC**: Set up your local authority tenant (`CouncilTenant`) and create accounts with designated roles (`CISO_ADMIN`, `SECURITY_ASSESSOR`, `AUDITOR`, `CABINET_VIEWER`).
2. **Step 2: Define Service Criticality Catalog**: Map your authority's digital services into **Tier 1** (Life Safety & Statutory: Social Care, Elections, Council Tax), **Tier 2** (Operational: Planning, Housing Repairs, Waste Routing), and **Tier 3** (Informational: Leisure, Public Wi-Fi).
3. **Step 3: Conduct Baseline CAF v4.0 Assessment**: Assess all 39 Contributing Outcomes across Objectives A, B, C, and D. Check achieved IGPs and document assessor rationales.
4. **Step 4: Deposit & Cryptographically Link Evidence**: Upload information security policies, penetration test summaries, and architecture diagrams into the Evidence Vault. Multi-tag artifacts directly to contributing outcomes.
5. **Step 5: Review Gaps & Prioritize Cyber Risks**: Examine the automated Gap Analysis register and 3x3 Heatmap. Focus immediate attention on Tier 1 statutory services with Critical Risk scores ($\ge 75$).
6. **Step 6: Execute Remediation & Export to Engineering**: Convert gaps into Remediation Tasks with assigned owners, £ GBP budgets, and SLA target dates. Export tasks directly into Jira or GitHub for sprint delivery.
7. **Step 7: Brief Cabinet & Audit Committee**: 1-click generate the 2-Page Executive Cabinet Briefing PDF for the Chief Executive, Section 151 Officer, and Cabinet Members to justify cyber investment.

---

### 📥 7. Download & Run Locally (GitHub Quickstart)

Anyone can clone and run Open CAF locally in under 3 minutes:

#### Step 1: Clone Repository
```bash
git clone https://github.com/Ugotony23/open-caf-verification-pipeline.git
cd open-caf-verification-pipeline/test
```

#### Step 2: Option A - Turnkey Docker Compose (Recommended)
```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Start all containers (Postgres pgvector, MinIO, FastAPI, Next.js)
docker compose up -d

# 3. Seed NCSC CAF v4.0 & Load Demo Dataset
docker compose exec backend python -m app.cli.seed_caf
docker compose exec backend python -m app.cli.seed_council_services
docker compose exec backend python -m app.cli.load_demo
```

#### Step 2: Option B - Native Local Setup (Python + Node.js)
```bash
# Terminal 1: Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.cli.seed_caf
python -m app.cli.seed_council_services
python -m app.cli.load_demo
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

#### Step 3: Access Endpoints & Demo Login
* **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
* **FastAPI Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Demo Login**: `ciso@borsetshire.gov.uk` / `Borsetshire2025!`
"""

app = FastAPI(
    title="Open CAF API",
    description=API_DESCRIPTION,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.v1 import auth, assessments, evidence, gaps, council_services, risk, remediation, exports, ai, reports
from app.api.deps import require_role
from app.models.user import UserRole

# Mount API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(assessments.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(gaps.router, prefix="/api/v1")
app.include_router(council_services.router, prefix="/api/v1")
app.include_router(risk.router, prefix="/api/v1")
app.include_router(remediation.router, prefix="/api/v1")
app.include_router(exports.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "project": "Open CAF",
        "description": "NCSC Cyber Assessment Framework Platform for UK Local Authorities",
        "version": "0.1.0",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "opencaf-backend",
        "version": "0.1.0"
    }

@app.get("/api/v1/test/assessor-only")
async def test_assessor_route(
    current_user=Depends(require_role([UserRole.CISO_ADMIN, UserRole.SECURITY_ASSESSOR]))
):
    """Test endpoint accessible exclusively by CISO_ADMIN and SECURITY_ASSESSOR."""
    return {"message": "Access granted", "user": current_user.email, "role": current_user.role}
