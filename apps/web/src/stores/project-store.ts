"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectFile {
  path: string;
  content: string;
  language: "solidity" | "typescript" | "json";
}

export interface ProjectDeployment {
  chainId: number;
  chainName: string;
  proxyAddress: string;
  implementationAddress: string;
  txHash: string;
  explorerUrl: string;
  deployedAt: number;
}

export interface Project {
  id: string;
  name: string;
  templateId: string;
  status:
    | "draft"
    | "simulated"
    | "generating"
    | "compiled"
    | "deployed"
    | "failed";
  createdAt: number;
  /** Generated files */
  files: ProjectFile[];
  /** Deployment info (set after deploy) */
  deployment?: ProjectDeployment;
}

interface ProjectState {
  projects: Project[];
  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  getProject: (id: string) => Project | undefined;
}

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_STAKING_CONTRACT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @title ZappStaking
/// @notice A simple ERC-20 staking contract with configurable reward rate.
contract ZappStaking is Initializable, OwnableUpgradeable {
    IERC20Upgradeable public stakingToken;
    uint256 public rewardRatePerSecond;

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lastStakedAt;
    }

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);

    function initialize(
        address _stakingToken,
        uint256 _rewardRate
    ) public initializer {
        __Ownable_init();
        stakingToken = IERC20Upgradeable(_stakingToken);
        rewardRatePerSecond = _rewardRate;
    }

    function stake(uint256 amount) external {
        require(amount > 0, "Cannot stake 0");
        stakingToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].lastStakedAt = block.timestamp;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(stakes[msg.sender].amount >= amount, "Insufficient stake");
        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;
        stakingToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }
}`;

const DEMO_FRONTEND = `"use client";

import { useState } from "react";
import { useAccount, useContractWrite } from "wagmi";

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Staking Protocol</h1>

      {!isConnected ? (
        <p className="text-muted-foreground">
          Connect your wallet to start staking.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Stake Tokens</h2>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount to stake"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
            <button className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-primary-foreground">
              Stake
            </button>
          </div>
        </div>
      )}
    </main>
  );
}`;

const DEMO_TESTS = `import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { ZappStaking } from "../typechain-types";

describe("ZappStaking", () => {
  let staking: ZappStaking;
  let token: any;
  let owner: any;
  let user: any;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock", "MCK", ethers.parseEther("1000000"));

    const Staking = await ethers.getContractFactory("ZappStaking");
    staking = (await upgrades.deployProxy(Staking, [
      await token.getAddress(),
      ethers.parseEther("0.01"),
    ])) as unknown as ZappStaking;

    // Fund user
    await token.transfer(user.address, ethers.parseEther("1000"));
    await token.connect(user).approve(await staking.getAddress(), ethers.MaxUint256);
  });

  it("should allow staking", async () => {
    await staking.connect(user).stake(ethers.parseEther("100"));
    const info = await staking.stakes(user.address);
    expect(info.amount).to.equal(ethers.parseEther("100"));
  });

  it("should allow unstaking", async () => {
    await staking.connect(user).stake(ethers.parseEther("100"));
    await staking.connect(user).unstake(ethers.parseEther("50"));
    const info = await staking.stakes(user.address);
    expect(info.amount).to.equal(ethers.parseEther("50"));
  });

  it("should reject unstaking more than staked", async () => {
    await staking.connect(user).stake(ethers.parseEther("100"));
    await expect(
      staking.connect(user).unstake(ethers.parseEther("200"))
    ).to.be.revertedWith("Insufficient stake");
  });
});`;

const demoProject: Project = {
  id: "demo-staking",
  name: "Staking Protocol",
  templateId: "staking-protocol",
  status: "deployed",
  createdAt: Date.now() - 86400000,
  files: [
    {
      path: "contracts/ZappStaking.sol",
      content: DEMO_STAKING_CONTRACT,
      language: "solidity",
    },
    {
      path: "app/page.tsx",
      content: DEMO_FRONTEND,
      language: "typescript",
    },
    {
      path: "test/ZappStaking.test.ts",
      content: DEMO_TESTS,
      language: "typescript",
    },
  ],
  deployment: {
    chainId: 8453,
    chainName: "Base",
    proxyAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28",
    implementationAddress: "0x892d35Cc6634C0532925a3b844Bc9e7595f2bD42",
    txHash: "0x8a2f7c...e91b3d",
    explorerUrl: "https://basescan.org",
    deployedAt: Date.now() - 3600000,
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [demoProject],

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  updateProject: (id, patch) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    })),

  getProject: (id) => get().projects.find((p) => p.id === id),
}));
