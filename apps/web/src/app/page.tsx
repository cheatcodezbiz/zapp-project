export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-xl font-bold tracking-tight text-foreground">
          Zapp
        </span>
        <nav className="flex items-center gap-4">
          <a
            href="/app/simulate"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Simulate
          </a>
          <a
            href="/app/templates"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Templates
          </a>
          <a
            href="/app"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Launch App
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl space-y-8">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Build any dApp with{" "}
            <span className="text-primary">plain English</span>
          </h1>

          <p className="text-lg leading-relaxed text-muted-foreground">
            Describe what you want, and Zapp builds your smart contracts,
            frontend, and deploys to any chain. No Solidity required.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a
              href="/app"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Get Started
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-secondary px-8 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground">
            How it works
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            From idea to deployed dApp in four steps.
          </p>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step="1"
              title="Choose a Template"
              description="Pick from proven templates — staking, yield farms, governance, NFTs, token launches — or describe your own."
              icon={"\u{1F4CB}"}
            />
            <StepCard
              step="2"
              title="Simulate"
              description="Test your tokenomics with our simulation engine. See price, treasury, APY, and risk projections before writing a line of code."
              icon={"\u{1F4CA}"}
            />
            <StepCard
              step="3"
              title="Generate"
              description="AI writes your UUPS upgradeable smart contracts, Next.js frontend, and Hardhat test suite. Real, auditable code."
              icon={"\u{1F9E0}"}
            />
            <StepCard
              step="4"
              title="Deploy"
              description="One-click deploy to Ethereum, Base, Arbitrum, or Polygon. Your dApp is live with a hosted frontend in minutes."
              icon={"\u{1F680}"}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground">
            Built for Web3 builders
          </h2>
          <p className="mb-12 text-center text-muted-foreground">
            Everything you need to go from idea to mainnet.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="UUPS Upgradeable"
              description="Every contract uses the UUPS proxy pattern with OpenZeppelin 5.x. Upgrade your logic without migrating state."
              icon={"\u{1F504}"}
            />
            <FeatureCard
              title="Risk Simulation"
              description="7-phase simulation engine with deterministic PRNG. Test 360 days of tokenomics in under 50ms."
              icon={"\u{1F6E1}\u{FE0F}"}
            />
            <FeatureCard
              title="Multi-Chain"
              description="Deploy to Ethereum, Base, Arbitrum, or Polygon. Same contract, any EVM chain."
              icon={"\u{26D3}\u{FE0F}"}
            />
            <FeatureCard
              title="Pay with Any Crypto"
              description="Top up credits with any token. No platform token required — just USD-pegged credits."
              icon={"\u{1F4B3}"}
            />
            <FeatureCard
              title="AI-Generated Code"
              description="Claude writes production-ready Solidity with NatSpec docs, access control, and reentrancy guards."
              icon={"\u{2728}"}
            />
            <FeatureCard
              title="Full Test Suite"
              description="Every generated contract comes with Hardhat tests covering init, core flows, access control, and edge cases."
              icon={"\u{1F9EA}"}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Ready to build?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start with $100 in free credits. No credit card, no KYC, just
            connect your wallet and go.
          </p>
          <a
            href="/app"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-md bg-primary px-10 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Launch App
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-sm font-bold text-foreground">Zapp</span>
          <div className="flex gap-6">
            <a
              href="/app/templates"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Templates
            </a>
            <a
              href="/app/simulate"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Simulate
            </a>
            <a
              href="/app"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </a>
          </div>
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Zapp
          </span>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
        {icon}
      </div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
        Step {step}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
