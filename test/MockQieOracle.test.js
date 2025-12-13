const { expect } = require('chai');
const { ethers } = require('hardhat');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('MockQieOracle', function () {
  it('initializes with the passed price and decimals', async function () {
    const [deployer] = await ethers.getSigners();
    const MockOracle = await ethers.getContractFactory('MockQieOracle');
    const initialPrice = ethers.parseEther('1');
    const oracle = await MockOracle.deploy(initialPrice, 18);
    await oracle.waitForDeployment();

    expect(await oracle.getPrice()).to.equal(initialPrice);
    expect(await oracle.decimals()).to.equal(18);
    expect(await oracle.owner()).to.equal(deployer.address);
  });

  it('allows the owner to update the price and emits an event', async function () {
    const [deployer] = await ethers.getSigners();
    const MockOracle = await ethers.getContractFactory('MockQieOracle');
    const oracle = await MockOracle.deploy(ethers.parseEther('1'), 18);
    await oracle.waitForDeployment();

    const newPrice = ethers.parseEther('1.05');
    await expect(oracle.setPrice(newPrice)).to.emit(oracle, 'PriceUpdated').withArgs(newPrice, anyValue);
    expect(await oracle.getPrice()).to.equal(newPrice);
  });

  it('reverts when a non-owner tries to set the price', async function () {
    const [deployer, attacker] = await ethers.getSigners();
    const MockOracle = await ethers.getContractFactory('MockQieOracle');
    const oracle = await MockOracle.deploy(ethers.parseEther('1'), 18);
    await oracle.waitForDeployment();

    const attackerPrice = ethers.parseEther('2');
    await expect(oracle.connect(attacker).setPrice(attackerPrice))
      .to.be.revertedWithCustomError(oracle, 'OwnableUnauthorizedAccount')
      .withArgs(attacker.address);
  });
});
