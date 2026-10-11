import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("mytoken deploy", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  const decimals = 18;
  before("should deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      18,
    ]);
  });
  it("should return name", async () => {
    expect(await myTokenC.name()).equal("MyToken");
  });
  it("should return symbol", async () => {
    expect(await myTokenC.symbol()).equal("MT");
  });
  it("should return decimals", async () => {
    expect(await myTokenC.decimals()).equal(18);
  });
    it("should return 0 totalSupply", async () => {
    expect(await myTokenC.totalSupply()).equal(1n * 10n ** 18n);
  });
  it("should return 1MT balance for signer 0", async () => {
    const signer0 = signers[0];
    expect(await myTokenC.balanceOf(signer0)).equal(1n * 10n ** 18n);
  });
  it("shoud have 0.5MT", async () => {
    const signer1 = signers[1];
    await myTokenC.transfer(hre.ethers.parseUnits("0.5", 18), signer1.address);
    expect(await myTokenC.balanceOf(signer1.address)).equal(
      hre.ethers.parseUnits("0.5", 18)
    );
  });

  describe("TransferFrom", () => {
    before("should deploy", async () => {
      myTokenC = await hre.ethers.deployContract("MyToken", [
        "MyToken",
        "MT",
        decimals,
      ]);
    });
    it("should emit Approval event", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.approve(signer1.address, hre.ethers.parseUnits("10", decimals))
      )
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, hre.ethers.parseUnits("10", decimals));
    });
    it("should transfer 0.3MT from signer0 to signer1 by signer1", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(
            signer0.address,
            signer1.address,
            hre.ethers.parseUnits("0.3", decimals)
          )
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.3", decimals)
        );
    });
    it("should have 0.7MT for signer0 and 0.3MT for signer1", async () => {
      expect(await myTokenC.balanceOf(signers[0].address)).equal(
        hre.ethers.parseUnits("0.7", decimals)
      );
      expect(await myTokenC.balanceOf(signers[1].address)).equal(
        hre.ethers.parseUnits("0.3", decimals)
      );
    });
  });
});