import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Multisig", function () {
  async function deployToken() {
    // Contracts are deployed using the first signer/account by default
    const Token = await ethers.getContractFactory("Web3CXI");
    const token = await Token.deploy();

    return { token };
  }

  async function deployMerkleAirdropFixture() {
    const { token } = await loadFixture(deployToken);
    const [owner] = await ethers.getSigners();

    const addr1 = "0x76C1cFe708ED1d2FF2073490727f3301117767e9";
    const addr2 = "0x6b4DF334368b09f87B3722449703060EEf284126";

    const whiteList = [
      [addr1, ethers.parseEther("15")],
      [addr2, ethers.parseEther("15")],
    ];

    const merkleTree = StandardMerkleTree.of(whiteList, ["address", "uint256"]);
    const merkleRoot = merkleTree.root;

    const MerkleAirdrop = await ethers.getContractFactory("MerkleAirdrop");
    const merkleAD = await MerkleAirdrop.deploy(token, merkleRoot);

    return { owner, merkleAD, addr1, addr2, token, merkleTree, merkleRoot };
  }

  describe("Token Deployment", function () {
    // Ensure that only the owner can mint new tokens
    it("Should make sure only owner can mint", async function () {
      const [owner, otherAccount] = await hre.ethers.getSigners();
      const { token } = await loadFixture(deployToken);
      const amount = ethers.parseEther("500");

      // Expect minting from a non-owner account to fail
      await expect(token.connect(otherAccount).mint(amount)).to.be.revertedWith(
        "you are not owner"
      );
    });
  });

  describe("contract deployment", () => {
    it("it should be the owner", async () => {
      const { merkleAD, owner } = await loadFixture(deployMerkleAirdropFixture);

      expect(await merkleAD.owner()).to.equal(owner);
    });

    it("should claim airdrop", async () => {
      const { owner, merkleAD, addr1, merkleTree, merkleRoot, token } =
        await loadFixture(deployMerkleAirdropFixture);

      await helpers.impersonateAccount(addr1);
      const addr1Signer = await ethers.getSigner(addr1);

      await token.transfer(
        await merkleAD.getAddress(),
        ethers.parseEther("1000")
      );

      const amount = ethers.parseEther("15");

      await owner.sendTransaction({
        value: ethers.parseEther("90"),
        to: addr1,
      });

      const leaf = [await addr1Signer.getAddress(), amount];
      const proof = merkleTree.getProof(leaf);

      console.log("Merkle Root:", merkleRoot);
      console.log("Leaf:", leaf);
      console.log("Proof:", proof);

      await merkleAD.connect(addr1Signer).claim(amount, proof);

      expect(await merkleAD.hasClaimed(addr1Signer)).to.be.true;
    });
  });
});
