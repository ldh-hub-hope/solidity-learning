import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let managers: HardhatEthersSigner[]; // 3명의 manager
  let hacker: HardhatEthersSigner; // manager 가 아닌 주소
  let myTokenC: MyToken;
  let tinyBankC: TinyBank;

  beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    managers = [signers[1], signers[2], signers[3]];
    hacker = signers[4];

    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
    tinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
      managers.map((m) => m.address),
    ]);
    // TinyBank 가 reward 를 mint 할 수 있도록 manager 권한 부여
    await myTokenC.setManager(await tinyBankC.getAddress());
  });

  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await tinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
    it("should register 3 managers", async () => {
      expect(await tinyBankC.managersLength()).equal(3);
      for (const m of managers) {
        expect(await tinyBankC.isManager(m.address)).equal(true);
      }
    });
    it("should revert when deployed with fewer than 3 managers", async () => {
      await expect(
        hre.ethers.deployContract("TinyBank", [
          await myTokenC.getAddress(),
          [managers[0].address, managers[1].address],
        ])
      ).to.be.revertedWith("At least 3 managers required");
    });
  });

  describe("Staking", () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await expect(tinyBankC.stake(stakingAmount))
        .to.emit(tinyBankC, "Staked")
        .withArgs(signer0.address, stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await tinyBankC.totalStaked()).equal(stakingAmount);
      expect(await myTokenC.balanceOf(await tinyBankC.getAddress())).equal(
        await tinyBankC.totalStaked()
      );
    });
  });

  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
      for (let i = 0; i < BLOCKS; i++) {
        await myTokenC.transfer(transferAmount, signer0.address);
      }

      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString(), DECIMALS)
      );
    });
  });

  describe("Multi Manager - setRewardPerBlock", () => {
    const newReward = hre.ethers.parseUnits("2", DECIMALS);

    it("should revert with 'You are not a manager' when a non-manager confirms", async () => {
      await expect(tinyBankC.connect(hacker).confirm()).to.be.revertedWith(
        "You are not a manager"
      );
    });

    it("should revert with 'Not all confirmed yet' when nobody confirmed", async () => {
      await expect(tinyBankC.setRewardPerBlock(newReward)).to.be.revertedWith(
        "Not all confirmed yet"
      );
    });

    it("should revert with 'Not all confirmed yet' when only some managers confirmed", async () => {
      await tinyBankC.connect(managers[0]).confirm();
      await tinyBankC.connect(managers[1]).confirm();
      await expect(tinyBankC.setRewardPerBlock(newReward)).to.be.revertedWith(
        "Not all confirmed yet"
      );
    });

    it("should change rewardPerBlock when all managers confirmed", async () => {
      for (const m of managers) {
        await tinyBankC.connect(m).confirm();
      }
      expect(await tinyBankC.allConfirmed()).equal(true);
      await tinyBankC.setRewardPerBlock(newReward);
      expect(await tinyBankC.rewardPerBlock()).equal(newReward);
    });

    it("should reset confirmations after rewardPerBlock is changed", async () => {
      for (const m of managers) {
        await tinyBankC.connect(m).confirm();
      }
      await tinyBankC.setRewardPerBlock(newReward);
      expect(await tinyBankC.allConfirmed()).equal(false);
      await expect(
        tinyBankC.setRewardPerBlock(hre.ethers.parseUnits("3", DECIMALS))
      ).to.be.revertedWith("Not all confirmed yet");
    });
  });
});
