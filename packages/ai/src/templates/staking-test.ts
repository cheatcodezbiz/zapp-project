/**
 * Hardcoded staking test template.
 *
 * Generates a Hardhat test file that covers initialization, staking,
 * unstaking, rewards, access control, and edge cases.
 */

export interface StakingTestParams {
  contractName: string;
  rewardRateBps: number;
  lockDurationSec: number;
  hasEmergencyWithdraw: boolean;
  hasCompounding: boolean;
  hasMaxStaked: boolean;
}

export function generateStakingTest(params: StakingTestParams): string {
  const {
    contractName,
    rewardRateBps,
    lockDurationSec,
    hasEmergencyWithdraw,
    hasCompounding,
    hasMaxStaked,
  } = params;

  const initArgs = hasMaxStaked
    ? `"test-dapp", admin.address, admin.address, await token.getAddress(), ${rewardRateBps}, ${lockDurationSec}, ethers.parseEther("1000000")`
    : `"test-dapp", admin.address, admin.address, await token.getAddress(), ${rewardRateBps}, ${lockDurationSec}`;

  const compoundTests = hasCompounding
    ? `
    describe("Compounding", () => {
      it("should compound pending rewards", async () => {
        const { staking, token, user1 } = await loadFixture(deploy);
        const stakeAmount = ethers.parseEther("1000");

        // Fund contract for rewards
        await token.transfer(await staking.getAddress(), ethers.parseEther("10000"));

        // Stake
        await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
        await staking.connect(user1).stake(stakeAmount);

        // Advance time for rewards to accrue
        await time.increase(365 * 24 * 3600); // 1 year

        const pendingBefore = await staking.pendingRewards(user1.address);
        expect(pendingBefore).to.be.gt(0);

        await expect(staking.connect(user1).compoundRewards())
          .to.emit(staking, "Compounded");

        // Staked amount should have increased
        const info = await staking.getStakerInfo(user1.address);
        expect(info.amount).to.be.gt(stakeAmount);
      });

      it("should revert if no rewards to compound", async () => {
        const { staking, token, user1 } = await loadFixture(deploy);

        await token.connect(user1).approve(await staking.getAddress(), ethers.parseEther("100"));
        await staking.connect(user1).stake(ethers.parseEther("100"));

        await expect(staking.connect(user1).compoundRewards())
          .to.be.revertedWith("No rewards to compound");
      });
    });
`
    : "";

  const emergencyTests = hasEmergencyWithdraw
    ? `
    describe("Emergency Withdraw", () => {
      it("should allow emergency withdraw when paused", async () => {
        const { staking, token, admin, user1 } = await loadFixture(deploy);
        const stakeAmount = ethers.parseEther("500");

        await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
        await staking.connect(user1).stake(stakeAmount);

        // Pause the contract
        await staking.connect(admin).pause();

        await expect(staking.connect(user1).emergencyWithdraw())
          .to.emit(staking, "EmergencyWithdrawn")
          .withArgs(user1.address, stakeAmount);

        const info = await staking.getStakerInfo(user1.address);
        expect(info.amount).to.equal(0);
      });

      it("should revert emergency withdraw when not paused", async () => {
        const { staking, token, user1 } = await loadFixture(deploy);

        await token.connect(user1).approve(await staking.getAddress(), ethers.parseEther("100"));
        await staking.connect(user1).stake(ethers.parseEther("100"));

        await expect(staking.connect(user1).emergencyWithdraw())
          .to.be.reverted;
      });
    });
`
    : "";

  const lockTests =
    lockDurationSec > 0
      ? `
      it("should revert unstake before lock expires", async () => {
        const { staking, token, user1 } = await loadFixture(deploy);
        const stakeAmount = ethers.parseEther("100");

        await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
        await staking.connect(user1).stake(stakeAmount);

        // Try to unstake immediately
        await expect(staking.connect(user1).unstake(stakeAmount))
          .to.be.revertedWith("Tokens still locked");
      });

      it("should allow unstake after lock expires", async () => {
        const { staking, token, user1 } = await loadFixture(deploy);
        const stakeAmount = ethers.parseEther("100");

        await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
        await staking.connect(user1).stake(stakeAmount);

        // Advance past lock duration
        await time.increase(${lockDurationSec} + 1);

        await expect(staking.connect(user1).unstake(stakeAmount))
          .to.emit(staking, "Unstaked")
          .withArgs(user1.address, stakeAmount);
      });`
      : `
      it("should allow immediate unstake when no lock period", async () => {
        const { staking, token, user1 } = await loadFixture(deploy);
        const stakeAmount = ethers.parseEther("100");

        await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
        await staking.connect(user1).stake(stakeAmount);

        await expect(staking.connect(user1).unstake(stakeAmount))
          .to.emit(staking, "Unstaked")
          .withArgs(user1.address, stakeAmount);
      });`;

  return `import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("${contractName}", () => {
  async function deploy() {
    const [admin, user1, user2] = await ethers.getSigners();

    // Deploy a mock ERC-20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const token = await MockToken.deploy("Mock Token", "MTK", ethers.parseEther("10000000"));
    await token.waitForDeployment();

    // Distribute tokens to users
    await token.transfer(user1.address, ethers.parseEther("100000"));
    await token.transfer(user2.address, ethers.parseEther("100000"));

    // Deploy staking contract via UUPS proxy
    const StakingFactory = await ethers.getContractFactory("${contractName}");
    const staking = await upgrades.deployProxy(
      StakingFactory,
      [${initArgs}],
      { initializer: "initialize", kind: "uups" },
    );
    await staking.waitForDeployment();

    // Fund the staking contract with reward tokens
    await token.transfer(await staking.getAddress(), ethers.parseEther("1000000"));

    return { staking, token, admin, user1, user2 };
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  describe("Initialization", () => {
    it("should set the correct initial state", async () => {
      const { staking } = await loadFixture(deploy);
      const pool = await staking.getPoolInfo();

      expect(pool.totalStaked).to.equal(0);
      expect(pool.rewardRateBps).to.equal(${rewardRateBps});
      expect(pool.lockDuration).to.equal(${lockDurationSec});
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async () => {
      const { staking, admin } = await loadFixture(deploy);
      const DEFAULT_ADMIN_ROLE = await staking.DEFAULT_ADMIN_ROLE();
      expect(await staking.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should not allow double initialization", async () => {
      const { staking, token, admin } = await loadFixture(deploy);
      await expect(
        staking.initialize(
          "test-dapp-2",
          admin.address,
          admin.address,
          await token.getAddress(),
          ${rewardRateBps},
          ${lockDurationSec}${hasMaxStaked ? ', ethers.parseEther("1000000")' : ""},
        ),
      ).to.be.reverted;
    });
  });

  // --------------------------------------------------------------------------
  // Staking
  // --------------------------------------------------------------------------

  describe("Staking", () => {
    it("should stake tokens successfully", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const stakeAmount = ethers.parseEther("1000");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);

      await expect(staking.connect(user1).stake(stakeAmount))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, stakeAmount);

      const info = await staking.getStakerInfo(user1.address);
      expect(info.amount).to.equal(stakeAmount);
    });

    it("should update totalStaked correctly", async () => {
      const { staking, token, user1, user2 } = await loadFixture(deploy);
      const amount1 = ethers.parseEther("500");
      const amount2 = ethers.parseEther("300");

      await token.connect(user1).approve(await staking.getAddress(), amount1);
      await staking.connect(user1).stake(amount1);

      await token.connect(user2).approve(await staking.getAddress(), amount2);
      await staking.connect(user2).stake(amount2);

      const pool = await staking.getPoolInfo();
      expect(pool.totalStaked).to.equal(amount1 + amount2);
    });

    it("should revert when staking 0 amount", async () => {
      const { staking, user1 } = await loadFixture(deploy);
      await expect(staking.connect(user1).stake(0))
        .to.be.revertedWith("Cannot stake 0");
    });

    it("should revert when paused", async () => {
      const { staking, token, admin, user1 } = await loadFixture(deploy);
      await staking.connect(admin).pause();

      await token.connect(user1).approve(await staking.getAddress(), ethers.parseEther("100"));
      await expect(staking.connect(user1).stake(ethers.parseEther("100")))
        .to.be.reverted;
    });
  });

  // --------------------------------------------------------------------------
  // Unstaking
  // --------------------------------------------------------------------------

  describe("Unstaking", () => {${lockTests}

    it("should revert unstaking more than staked", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const stakeAmount = ethers.parseEther("100");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
${lockDurationSec > 0 ? `\n      await time.increase(${lockDurationSec} + 1);\n` : ""}
      await expect(staking.connect(user1).unstake(stakeAmount + 1n))
        .to.be.revertedWith("Insufficient staked balance");
    });

    it("should revert unstaking 0", async () => {
      const { staking, user1 } = await loadFixture(deploy);
      await expect(staking.connect(user1).unstake(0))
        .to.be.revertedWith("Cannot unstake 0");
    });
  });

  // --------------------------------------------------------------------------
  // Rewards
  // --------------------------------------------------------------------------

  describe("Rewards", () => {
    it("should accumulate rewards over time", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const stakeAmount = ethers.parseEther("1000");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      // No rewards immediately
      const pendingNow = await staking.pendingRewards(user1.address);
      expect(pendingNow).to.equal(0);

      // Advance 30 days
      await time.increase(30 * 24 * 3600);

      const pendingLater = await staking.pendingRewards(user1.address);
      expect(pendingLater).to.be.gt(0);
    });

    it("should claim rewards correctly", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const stakeAmount = ethers.parseEther("1000");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);

      // Advance 90 days
      await time.increase(90 * 24 * 3600);

      await expect(staking.connect(user1).claimRewards())
        .to.emit(staking, "RewardsClaimed");
    });

    it("should distribute proportional rewards to multiple stakers", async () => {
      const { staking, token, user1, user2 } = await loadFixture(deploy);

      // User1 stakes 3000, user2 stakes 1000 (3:1 ratio)
      const amount1 = ethers.parseEther("3000");
      const amount2 = ethers.parseEther("1000");

      await token.connect(user1).approve(await staking.getAddress(), amount1);
      await staking.connect(user1).stake(amount1);

      await token.connect(user2).approve(await staking.getAddress(), amount2);
      await staking.connect(user2).stake(amount2);

      // Advance 365 days
      await time.increase(365 * 24 * 3600);

      const pending1 = await staking.pendingRewards(user1.address);
      const pending2 = await staking.pendingRewards(user2.address);

      // User1 should get ~3x the rewards of user2
      // Allow 5% tolerance for block timestamp rounding
      const ratio = Number(pending1) / Number(pending2);
      expect(ratio).to.be.closeTo(3, 0.15);
    });

    it("should revert claim when no rewards", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);

      await token.connect(user1).approve(await staking.getAddress(), ethers.parseEther("100"));
      await staking.connect(user1).stake(ethers.parseEther("100"));

      // Claim immediately — no time has passed, so no rewards
      await expect(staking.connect(user1).claimRewards())
        .to.be.revertedWith("No rewards to claim");
    });
  });

  // --------------------------------------------------------------------------
  // Access Control
  // --------------------------------------------------------------------------

  describe("Access Control", () => {
    it("should allow admin to set reward rate", async () => {
      const { staking, admin } = await loadFixture(deploy);

      await expect(staking.connect(admin).setRewardRate(1000))
        .to.emit(staking, "RewardRateUpdated")
        .withArgs(${rewardRateBps}, 1000);
    });

    it("should revert non-admin setting reward rate", async () => {
      const { staking, user1 } = await loadFixture(deploy);
      await expect(staking.connect(user1).setRewardRate(1000))
        .to.be.reverted;
    });

    it("should allow admin to pause and unpause", async () => {
      const { staking, admin } = await loadFixture(deploy);
      await staking.connect(admin).pause();
      await staking.connect(admin).unpause();
    });

    it("should revert non-admin pause", async () => {
      const { staking, user1 } = await loadFixture(deploy);
      await expect(staking.connect(user1).pause()).to.be.reverted;
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe("Edge Cases", () => {
    it("should handle first staker correctly (empty pool)", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const stakeAmount = ethers.parseEther("100");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);

      // This should succeed — pool update with 0 totalStaked
      await expect(staking.connect(user1).stake(stakeAmount)).to.not.be.reverted;
    });

    it("should handle unstaking entire balance", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const stakeAmount = ethers.parseEther("500");

      await token.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
${lockDurationSec > 0 ? `\n      await time.increase(${lockDurationSec} + 1);\n` : ""}
      await staking.connect(user1).unstake(stakeAmount);

      const info = await staking.getStakerInfo(user1.address);
      expect(info.amount).to.equal(0);

      const pool = await staking.getPoolInfo();
      expect(pool.totalStaked).to.equal(0);
    });

    it("should handle multiple stake/unstake cycles", async () => {
      const { staking, token, user1 } = await loadFixture(deploy);
      const amount = ethers.parseEther("100");

      for (let i = 0; i < 3; i++) {
        await token.connect(user1).approve(await staking.getAddress(), amount);
        await staking.connect(user1).stake(amount);
${lockDurationSec > 0 ? `        await time.increase(${lockDurationSec} + 1);\n` : ""}        await staking.connect(user1).unstake(amount);
      }

      const info = await staking.getStakerInfo(user1.address);
      expect(info.amount).to.equal(0);
    });

    it("should reject reward rate above 100%", async () => {
      const { staking, admin } = await loadFixture(deploy);
      await expect(staking.connect(admin).setRewardRate(10001))
        .to.be.revertedWith("Rate exceeds 100%");
    });
  });
${compoundTests}${emergencyTests}});
`;
}
