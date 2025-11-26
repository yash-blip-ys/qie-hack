const { expect } = require('chai');
const { ethers } = require('hardhat');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');

describe('QieTreasury', function () {
  async function deploySuite() {
    const [deployer, user, recipient] = await ethers.getSigners();

    const QUSD = await ethers.getContractFactory('QUSD');
    const qusd = await QUSD.deploy(deployer.address);

    const Treasury = await ethers.getContractFactory('QieTreasury');
    const treasury = await Treasury.deploy(await qusd.getAddress(), deployer.address);

    await qusd.transferOwnership(await treasury.getAddress());

    return { deployer, user, recipient, qusd, treasury };
  }

  it('mints QUSD 1:1 when native QIE deposited', async function () {
    const { user, qusd, treasury } = await deploySuite();
    const amount = ethers.parseEther('5');

    await expect(treasury.connect(user).depositNativeForStable({ value: amount }))
      .to.emit(treasury, 'NativeDeposited')
      .withArgs(user.address, amount, amount);

    const balance = await qusd.balanceOf(user.address);
    expect(balance).to.equal(amount);
  });

  it('burns QUSD and emits cross-border event', async function () {
    const { user, recipient, qusd, treasury } = await deploySuite();
    const amount = ethers.parseEther('2');

    await treasury.connect(user).depositNativeForStable({ value: amount });
    expect(await qusd.balanceOf(user.address)).to.equal(amount);

    await expect(
      treasury.connect(user).executeCrossBorderTransfer(recipient.address, amount, 'INR')
    )
      .to.emit(treasury, 'CrossBorderFulfillmentRequested')
      .withArgs(user.address, recipient.address, amount, 'INR', anyValue);

    expect(await qusd.balanceOf(user.address)).to.equal(0n);
  });
});

