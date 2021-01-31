
// SPDX-License-Identifier: MIT

pragma solidity >=0.4.25 <0.7.0;

interface IProvider {

  function deposit(address collateralAsset, uint256 collateralAmount) external payable;
  function borrow(address borrowAsset, uint256 borrowAmount) external payable;
  function withdraw(address collateralAsset, uint256 collateralAmount) external payable;
  function payback(address borrowAsset, uint256 borrowAmount) external payable;

  // returns the address of the assets received from depositing a collateral;
  // for ex. for ETH as collateralAsset, AaveProvider should return the address of aWETH
  // and Compound should return the address of cETH.
  function getRedeemableAddress(address collateralAsset) external view returns(address);

  // returns the borrow annualized rate for an asset in ray (1e27)
  //Example 8.5% annual interest = 0.085 x 10^27 = 85000000000000000000000000 or 85*(10**24)
  function getBorrowRateFor(address asset) external view returns(uint256);
  function getBorrowBalance(address _asset) external returns(uint256);
}
