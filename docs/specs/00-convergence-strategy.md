# ZAPP PLATFORM -- CONVERGENCE STRATEGY

**Date:** 2026-03-30
**Status:** Final team alignment document
**Inputs:** Platform Architect spec, Simulation Engine spec, Web3 SDK spec, UX Engineering spec

---

## 1. TEAM ALIGNMENT SUMMARY

All four specialists independently converged on the same core stack. This is a strong signal that the architecture is sound.

### Universal agreements (no conflicts)

| Decision | All 4 agree on |
|----------|---------------|
| Monorepo | pnpm workspaces + Turborepo |
| Language | TypeScript everywhere (contracts in Solidity) |
| Frontend framework | Next.js 14+ App Router |
| Styling | Tailwind CSS 4 |
| Component library | shadcn/ui + Radix primitives |
| API protocol | tRPC v11 with SSE subscriptions |
| Database ORM | Drizzle ORM (not Prisma) |
| State management | Zustand (client) + TanStack Query v5 (server) |
| Wallet connection | RainbowKit + wagmi v2 + viem v2 |
| Smart contract pattern | UUPS proxy (OpenZeppelin 5.x) |
| Job queue | BullMQ v5 (Redis-backed) |
| Charting | Recharts |
| Object storage | Cloudflare R2 (zero egress) |
| Deployment key security | AWS KMS (FIPS 140-3 Level 3) |
| Design | Dark-first, indigo accent (#6366F1) |
| Font | Inter + JetBrains Mono |

---

## 2. CONFLICTS RESOLVED

### 2.1 Authentication library

- **Platform Architect:** SIWE + custom JWT
- **Web3 SDK Lead:** better-auth with SIWE plugin

**Resolution: better-auth with SIWE plugin.**
Rationale: better-auth provides session management, multi-wallet linking, and database persistence out of the box. Building custom JWT session management is unnecessary work when better-auth handles it. The SIWE plugin implements the exact ERC-4361 flow both leads described.

### 2.2 Credit balance data type

- **Platform Architect:** `numeric(20,6)` (arbitrary precision decimal)
- **Web3 SDK Lead:** `BIGINT` (integer cents)

**Resolution: BIGINT (integer cents).**
Rationale: Integer arithmetic eliminates floating-point rounding errors entirely. Financial systems should never use decimals when integers work. $42.50 is stored as `4250`. All comparisons, sums, and deductions are exact. The Web3 Lead's approach is the industry standard for fintech ledgers.

### 2.3 Event indexing approach

- **Platform Architect:** viem `watchContractEvent` initially, upgrade to Alchemy/The Graph at scale
- **Web3 SDK Lead:** Alchemy Webhooks from day one

**Resolution: Alchemy Webhooks from day one.**
Rationale: Alchemy webhooks are not harder to set up than raw WebSocket listeners, but they are dramatically more reliable (auto-reconnect, guaranteed delivery, sub-second latency). Starting with the scalable approach avoids a migration.

### 2.4 Smart contract framework

- **Platform Architect:** Did not specify
- **Web3 SDK Lead:** Hardhat

**Resolution: Hardhat.**
Rationale: Hardhat Ignition provides declarative deployment with recovery. hardhat-verify integrates with Sourcify + Etherscan. The JS/TS ecosystem aligns with the backend. OpenZeppelin's upgrades plugin has first-class Hardhat support.

### 2.5 Simulation pricing (free vs paid)

- **Platform Architect:** Simulations free, rate-limited to 10/hour
- **Product Architecture doc:** $0.50 per simulation run

**Resolution: Free simulations in the browser, paid for server-side advanced runs.**
Rationale: The simulation engine runs entirely in the browser (JavaScript). There is no server cost for basic slider-driven simulations. Charging for them would create friction at the most critical learning moment. Reserve credit charges for: (1) AI-enhanced risk reports that call LLM APIs, (2) server-side batch scenario analysis, (3) export/save operations.

### 2.6 Upgrade approach for MVP

- **Platform Architect:** Recommends fresh deploy (new address) for MVP, UUPS upgrades in Phase 3
- **Web3 SDK Lead:** Full UUPS upgrade flow designed and specified
- **Product Architecture doc:** Upgrades are a core principle ("build once, upgrade forever")

**Resolution: Deploy UUPS proxy infrastructure from day one, but defer the upgrade UI to Phase 2.**
Rationale: Every contract deploys as proxy + implementation from the start (this is just the deployment script — minimal extra work). But the user-facing "describe your upgrade in English" flow is complex and can wait. Phase 1 users who need changes get a fresh deployment. The proxy is there waiting for when we add the upgrade pipeline.

---

## 3. OPEN DECISIONS REQUIRING FOUNDER INPUT

These decisions have clear recommendations but may be overridden based on business priorities:

### 3.1 Deposit fee percentage

- Spec says 5-10% range
- **Recommendation:** Start at 7.5% flat. Simple, competitive, transparent. Adjust based on volume data after 30 days. Consider lower fees for stablecoin deposits (3-5%) since they don't need DEX swapping.

### 3.2 Minimum deposit amount

- **Recommendation:** $10 on L2s (Base, Arbitrum, Polygon), $50 on Ethereum mainnet. Below these thresholds, gas + swap costs eat the deposit.

### 3.3 Credit expiration

- **Recommendation:** No expiration. Credits are money the user paid for. Hosting auto-deducts monthly. If balance hits $0, 7-day grace period on hosted frontends (per product doc).

### 3.4 Platform name / domain

- The specs use "Zapp" as a working name. This needs to be finalized before we write smart contract code (the base contract includes a `dappId` prefix).

---

## 4. INTERFACE MAP — WHERE THE DOMAINS CONNECT

```
┌─────────────────────────────────────────────────────────────┐
│                         UX LAYER                            │
│  Next.js App Router + shadcn/ui + Zustand + TanStack Query  │
│                                                             │
│  Landing → Credits → Templates → Simulation → Generate →    │
│  Preview → Deploy → Dashboard → Upgrade                     │
└──────┬──────────────┬──────────────────┬────────────────────┘
       │              │                  │
       │    ┌─────────▼────────┐   ┌─────▼──────────────┐
       │    │ SIMULATION ENGINE│   │   WEB3 SDK          │
       │    │ (browser pkg)    │   │   (npm package)     │
       │    │                  │   │                     │
       │    │ SimulationConfig │   │ WalletProvider      │
       │    │ → SimResult      │   │ useWallet           │
       │    │ → RiskClass      │   │ useContractWrite    │
       │    │ → ChartDataSet[] │   │ TransactionToast    │
       │    └──────────────────┘   └─────────────────────┘
       │
  ┌────▼──────────────────────────────────────────────────────┐
  │                      tRPC API SERVER                       │
  │  auth | credits | projects | templates | simulation | gen  │
  │                                                            │
  │  Services: Auth, Credit, Project, Generation,              │
  │            Compilation, Deployment, Hosting, Indexing       │
  │                                                            │
  │  Jobs (BullMQ): generate → compile → test → deploy → host  │
  └────┬──────────┬──────────┬──────────┬─────────────────────┘
       │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐ ┌───▼─────────┐
  │Postgres│ │ Redis  │ │AI APIs │ │ Blockchain   │
  │(Drizzle│ │(BullMQ │ │(Claude,│ │ (via Alchemy │
  │  ORM)  │ │ cache, │ │ GPT,   │ │  + KMS signer│
  │        │ │ nonces)│ │DeepSk) │ │  + Hardhat)  │
  └────────┘ └────────┘ └────────┘ └──────────────┘
```

### Key data flow contracts between domains:

| From → To | Interface | Defined by |
|-----------|-----------|------------|
| Simulation → UX | `SimulationResult` → `ChartDataSet[]` via `transformToChartData()` | Sim Lead |
| Simulation → UX | `RiskClassification` → Risk badge component | Sim Lead (data), UX Lead (display) |
| Simulation → UX | `SliderParamRegistry` → Slider components | Sim Lead (metadata), UX Lead (rendering) |
| Web3 SDK → UX | `useWallet()` → Wallet button state | Web3 Lead (hook), UX Lead (component) |
| Web3 SDK → UX | `TransactionState` → Toast/progress UI | Web3 Lead (state machine), UX Lead (display) |
| API → UX | tRPC router types → Frontend queries | Architect (router), UX Lead (consumption) |
| API → Simulation | `SimulationConfig` → Server-side sim runner | Architect (job), Sim Lead (engine) |
| API → Web3 SDK | Deployment job → `deployer.ts` → chain | Architect (pipeline), Web3 Lead (deployer) |
| UX → API | Credit spend requests → `creditProcedure` middleware | UX Lead (trigger), Architect (middleware) |

---

## 5. UNIFIED TECH STACK — FINAL

### Runtime
| Layer | Technology | Version |
|-------|-----------|---------|
| Node.js | 22 LTS | ^22.x |
| Package manager | pnpm | ^9.x |
| Build orchestration | Turborepo | ^2.x |

### Frontend (Platform)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | ^14.x (App Router) | SSR, routing, code splitting |
| React | ^18.x | UI framework |
| Tailwind CSS | ^4.x | Styling |
| shadcn/ui + Radix | latest | Component primitives |
| Zustand | ^4.x | Client state |
| TanStack Query | ^5.x | Server state + caching |
| Recharts | ^2.x | Charts (simulation + dashboard) |
| Framer Motion | ^11.x | Tier 3 animations only |
| Lucide React | latest | Icons |
| Inter + JetBrains Mono | via next/font | Typography |

### Backend (API Server)
| Technology | Version | Purpose |
|-----------|---------|---------|
| tRPC | ^11.x | Type-safe API + SSE subscriptions |
| Drizzle ORM | ^0.45+ | PostgreSQL ORM |
| BullMQ | ^5.x | Job queue (generate/compile/deploy pipeline) |
| better-auth | latest | SIWE authentication + sessions |
| Pino | ^8.x | Structured logging |

### Web3
| Technology | Version | Purpose |
|-----------|---------|---------|
| RainbowKit | ^2.x | Wallet connection UI |
| wagmi | ^2.19+ | React hooks for EVM |
| viem | ^2.38+ | EVM interaction, KMS signing |
| Hardhat | ^2.22+ | Compilation + fork simulation |
| OpenZeppelin Contracts (Upgradeable) | ^5.1.0 | UUPS, AccessControl, ReentrancyGuard |
| solc | 0.8.28 (pinned) | Solidity compiler |
| LI.FI SDK | ^3.x | Cross-chain bridge aggregation |
| 0x Swap API | v2 | Same-chain DEX aggregation |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| PostgreSQL 16 | Primary database |
| Redis 7 | BullMQ, caching, nonce management, rate limiting |
| Cloudflare R2 | Object storage (zero egress) |
| Cloudflare Workers | Serving generated dApp frontends |
| AWS KMS | Deployment wallet key management |
| Alchemy | RPC provider + Webhooks for indexing |
| Docker | Isolated compilation containers |
| Kubernetes | Production container orchestration |

### AI
| Model | Tier | Used for |
|-------|------|----------|
| Claude Opus | Premium | Smart contract generation, security review |
| Claude Sonnet | Standard | Frontend gen, iterations, NL→params |
| Claude Haiku | Economy | Test generation, boilerplate |
| DeepSeek Coder | Fallback | Cost-optimized frontend generation |

---

## 6. MVP PHASE 1 — BUILD ORDER

### Critical path (sequential — each blocks the next):

```
Week 1: FOUNDATION
  ├─ Scaffold monorepo (pnpm + Turborepo + shared-types)
  ├─ PostgreSQL schema (Drizzle) + migrations
  ├─ tRPC server skeleton with auth router
  ├─ Next.js app with Tailwind + shadcn/ui + design tokens
  └─ Wallet connection (RainbowKit + better-auth SIWE)

Week 2: SIMULATION ENGINE
  ├─ Core types (SimulationConfig, SimulationState, SimulationResult)
  ├─ StakingEmissionsPlugin (full 7-phase step loop)
  ├─ Risk classification engine (fee coverage → green/yellow/red)
  ├─ Template-based risk report generator
  └─ ChartDataTransformer (SimResult → Recharts format)

Week 3: SIMULATION UI
  ├─ Simulation dashboard page (the crown jewel)
  ├─ Parameter sliders with debounced chart updates
  ├─ 4 Recharts charts (price, treasury, APY, P&L)
  ├─ Risk badge component (expandable with findings)
  ├─ Web Worker for off-main-thread simulation
  └─ Fast-path sensitivity matrix for slider drag performance

Week 4: CREDITS + TEMPLATES
  ├─ Credit system (deposit contract, Chainlink oracle, DB ledger)
  ├─ Credit top-up UI (token selector, amount, fee breakdown)
  ├─ Template gallery page (staking template first)
  ├─ Template configurator → simulation flow
  └─ Credit balance display + spend tracking

Week 5-6: CODE GENERATION + DEPLOYMENT
  ├─ AI generation pipeline (Claude → Solidity smart contract)
  ├─ AI generation pipeline (Claude → React frontend)
  ├─ Hardhat compilation in Docker container
  ├─ Automated test runner (Anvil)
  ├─ Deployment pipeline (KMS signer → proxy + impl → verify)
  ├─ Generation progress UI (stage stepper + live log)
  └─ BullMQ pipeline: generate → compile → test → deploy → host

Week 7-8: HOSTING + POLISH
  ├─ Static hosting on Cloudflare R2 + Workers
  ├─ Management dashboard (metrics, event feed)
  ├─ Alchemy webhook integration for indexing
  ├─ Landing page
  ├─ End-to-end testing (wallet → credits → template → sim → deploy)
  ├─ Error handling polish
  └─ First deployment celebration (confetti!)
```

### Parallelizable work (can happen alongside critical path):

| Work | Can start | Depends on |
|------|-----------|------------|
| Deposit smart contract (Solidity) | Week 1 | Nothing |
| ZappBaseUpgradeable.sol | Week 1 | Nothing |
| Staking template Solidity code | Week 2 | ZappBase |
| AI prompt engineering | Week 3 | Template examples |
| Landing page design | Week 3 | Design tokens |
| Stress test library | Week 3 | Simulation engine |

---

## 7. WHAT MAKES THIS PRODUCT WIN

After synthesizing all four specs, here's what emerges as the "why this is a $100M product" thesis:

1. **The simulation is the moat.** No competitor visualizes protocol economics before generating code. This is the feature that makes non-technical users trust the platform and makes experienced users respect it.

2. **The risk engine is the conscience.** Telling users "this is structurally a Ponzi scheme" is unprecedented in crypto tooling. It builds enormous trust and provides legal cover.

3. **The SDK makes quality consistent.** By handling all web3 plumbing in a tested SDK and only letting AI generate protocol-specific logic, we dramatically reduce the surface area for AI-generated bugs.

4. **Credits make the economics invisible.** Pay with any crypto, get stable USD credits, never think about it again. No subscriptions, no invoices, no credit card forms.

5. **The upgrade loop creates retention.** UUPS proxies mean users come back to iterate. Every return visit burns credits. This is the SaaS retention model applied to crypto tooling.

---

## 8. RISKS AND MITIGATIONS

| Risk | Severity | Mitigation |
|------|----------|------------|
| AI generates vulnerable smart contracts | Critical | Security scan before deployment + template-based base contract + OpenZeppelin libraries + isolated test chain |
| Simulation accuracy questioned | High | Template-based reports (auditable), confidence bands on charts, clear disclaimers, deterministic (reproducible) |
| Credit double-spend under concurrency | High | PostgreSQL row-level locking (`SELECT ... FOR UPDATE`), BIGINT cents, CHECK constraint >= 0 |
| Deployer key compromise | High | AWS KMS (keys never leave HSM), per-chain keys, minimal gas balance, CloudTrail audit |
| AI API rate limits during generation | Medium | Multi-model fallback chain, retry with backoff, queue with concurrency limits |
| Cross-chain deposit fails mid-bridge | Medium | LI.FI handles recovery; platform credits only after confirmed arrival |
| Generated dApp frontend has bugs | Medium | Reusable SDK handles hard parts; AI only generates UI layout + contract calls |
| User deploys protocol that harms others | Medium | Risk classification logged + timestamped (platform has proof user was informed) |
