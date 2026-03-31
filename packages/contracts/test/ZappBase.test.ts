import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { TestZapp, TestZappV2 } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZappBaseUpgradeable", function () {
  let zapp: TestZapp;
  let admin: HardhatEthersSigner;
  let upgrader: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const DAPP_ID = "test-dapp-001";
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));

  beforeEach(async function () {
    [admin, upgrader, other] = await ethers.getSigners();

    const TestZapp = await ethers.getContractFactory("TestZapp");
    zapp = (await upgrades.deployProxy(
      TestZapp,
      [DAPP_ID, admin.address, upgrader.address],
      { initializer: "initialize", kind: "uups" }
    )) as unknown as TestZapp;
    await zapp.waitForDeployment();
  });

  describe("Initialization", function () {
    it("should set the dappId correctly", async function () {
      expect(await zapp.dappId()).to.equal(DAPP_ID);
    });

    it("should set the initial contract version to 1", async function () {
      expect(await zapp.contractVersion()).to.equal(1n);
    });

    it("should grant DEFAULT_ADMIN_ROLE to admin", async function () {
      expect(await zapp.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should grant UPGRADER_ROLE to upgrader", async function () {
      expect(await zapp.hasRole(UPGRADER_ROLE, upgrader.address)).to.be.true;
    });

    it("should not allow re-initialization", async function () {
      await expect(
        zapp.initialize(DAPP_ID, admin.address, upgrader.address)
      ).to.be.reverted;
    });
  });

  describe("Pause / Unpause", function () {
    it("should allow admin to pause", async function () {
      await zapp.connect(admin).pause();
      expect(await zapp.paused()).to.be.true;
    });

    it("should allow admin to unpause", async function () {
      await zapp.connect(admin).pause();
      await zapp.connect(admin).unpause();
      expect(await zapp.paused()).to.be.false;
    });

    it("should revert if non-admin tries to pause", async function () {
      await expect(zapp.connect(other).pause()).to.be.reverted;
    });

    it("should revert if non-admin tries to unpause", async function () {
      await zapp.connect(admin).pause();
      await expect(zapp.connect(other).unpause()).to.be.reverted;
    });
  });

  describe("Upgrades", function () {
    it("should allow UPGRADER_ROLE to upgrade", async function () {
      const TestZappV2 = await ethers.getContractFactory("TestZappV2");
      const upgraded = (await upgrades.upgradeProxy(
        await zapp.getAddress(),
        TestZappV2.connect(upgrader),
        { kind: "uups" }
      )) as unknown as TestZappV2;

      // Version should be incremented by _authorizeUpgrade
      expect(await upgraded.contractVersion()).to.equal(2n);
      // New function should be available
      expect(await upgraded.v2Feature()).to.equal("v2");
      // State should be preserved
      expect(await upgraded.dappId()).to.equal(DAPP_ID);
    });

    it("should revert upgrade if caller lacks UPGRADER_ROLE", async function () {
      const TestZappV2 = await ethers.getContractFactory("TestZappV2");
      await expect(
        upgrades.upgradeProxy(
          await zapp.getAddress(),
          TestZappV2.connect(other),
          { kind: "uups" }
        )
      ).to.be.reverted;
    });
  });
});
