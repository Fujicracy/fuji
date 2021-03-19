// SPDX-License-Identifier: MIT

pragma solidity >=0.4.25 <0.8.0;
pragma experimental ABIEncoderV2;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { IDebtToken } from "./IDebtToken.sol";
import { VaultBase } from "./VaultBase.sol";
import { IVault } from "./IVault.sol";
import { IProvider } from "./IProvider.sol";
import { Flasher } from "./flashloans/Flasher.sol";
import {Errors} from './Debt-token/Errors.sol';
import { AlphaWhitelist } from "./AlphaWhitelist.sol";

import "hardhat/console.sol"; //test line

//interface IController {
  //function doControllerRoutine(address _vault) external returns(bool);
//}

contract VaultETHDAI is IVault, VaultBase, AlphaWhitelist {

  AggregatorV3Interface public oracle;

  //Base Struct Object to define Safety factor
  //a divided by b represent the factor example 1.2, or +20%, is (a/b)= 6/5
  struct Factor {
    uint256 a;
    uint256 b;
  }

  //Safety factor
  Factor private safetyF;

  //Collateralization factor
  Factor private collatF;
  uint256 internal constant BASE = 1e18;

  //State variables to control vault providers
  address[] public providers;
  address public override activeProvider;

  Flasher flasher;
  address public override debtToken;

  mapping(address => uint256) public collaterals;

  constructor (
    
    address _controller,
    address _fliquidator,
    address _oracle

  ) public {

    controller = _controller;
    fliquidator =_fliquidator;
    whitelisted[101] = fliquidator;
    reversedwhitelisted[fliquidator] = 101;

    oracle = AggregatorV3Interface(_oracle);

    collateralAsset = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE); // ETH
    borrowAsset = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // DAI

    // + 5%
    safetyF.a = 21;
    safetyF.b = 20;

    // 125%
    collatF.a = 5;
    collatF.b = 4;


  }

  //Core functions

  /**
  * @dev Deposits collateral and borrows underlying in a single function call from activeProvider
  * @param _collateralAmount: amount to be deposited
  * @param _borrowAmount: amount to be borrowed
  */
  function depositAndBorrow(uint256 _collateralAmount, uint256 _borrowAmount) external payable {
    deposit(_collateralAmount);
    borrow(_borrowAmount);
  }

  /**
  * @dev Deposit Vault's type collateral to activeProvider
  * call Controller checkrates
  * @param _collateralAmount: to be deposited
  * Emits a {Deposit} event.
  */
  function deposit(uint256 _collateralAmount) public override isWhitelisted payable {
    require(msg.value == _collateralAmount, Errors.VL_NOT_MATCH_MSG_VALUE);
    require(msg.value <= ETH_CAP_VALUE, Errors.SP_ALPHA_ETH_CAP_VALUE);//Alpha

    //IController fujiTroller = IController(controller);
    //fujiTroller.doControllerRoutine(address(this));

    //uint256 currentBalance = redeemableCollateralBalance();

    // deposit to current provider
    _deposit(_collateralAmount, address(activeProvider));

    //uint256 newBalance = redeemableCollateralBalance();

    //require(newBalance > currentBalance, "Not enough collateral been received");

    collateralBalance = collateralBalance.add(_collateralAmount);

    uint256 providedCollateral = collaterals[msg.sender];
    collaterals[msg.sender] = providedCollateral.add(_collateralAmount);

    emit Deposit(msg.sender, _collateralAmount);

  }

  /**
  * @dev Withdraws Vault's type collateral from activeProvider
  * call Controller checkrates
  * @param _withdrawAmount: amount of collateral to withdraw
  * Emits a {Withdraw} event.
  */
  function withdraw(uint256 _withdrawAmount) public override isWhitelisted {

    uint256 providedCollateral = collaterals[msg.sender];

    require(providedCollateral >= _withdrawAmount, Errors.VL_INVALID_WITHDRAW_AMOUNT);
    // get needed collateral for current position
    // according current price
    uint256 neededCollateral = getNeededCollateralFor( IDebtToken(debtToken).balanceOf(msg.sender));

    require(providedCollateral.sub(_withdrawAmount) >= neededCollateral, Errors.VL_INVALID_WITHDRAW_AMOUNT);

    // withdraw collateral from current provider
    _withdraw(_withdrawAmount, address(activeProvider));

    collaterals[msg.sender] = providedCollateral.sub(_withdrawAmount);
    IERC20(collateralAsset).uniTransfer(msg.sender, _withdrawAmount);
    collateralBalance = collateralBalance.sub(_withdrawAmount);

    emit Withdraw(msg.sender, _withdrawAmount);

    //IController fujiTroller = IController(controller);
    //fujiTroller.doControllerRoutine(address(this));
  }

  /**
  * @dev Borrows Vault's type underlying amount from activeProvider
  * @param _borrowAmount: token amount of underlying to borrow
  * Emits a {Borrow} event.
  */
  function borrow(uint256 _borrowAmount) public override isWhitelisted  {

    uint256 providedCollateral = collaterals[msg.sender];

    // get needed collateral for already existing positions
    // together with the new position
    // according current price
    uint256 neededCollateral = getNeededCollateralFor(
      _borrowAmount.add(IDebtToken(debtToken).balanceOf(msg.sender))
    );

    require(providedCollateral > neededCollateral, Errors.VL_INVALID_BORROW_AMOUNT);

    updateDebtTokenBalances();

    // borrow from the current provider
    _borrow(_borrowAmount, address(activeProvider));

    IERC20(borrowAsset).uniTransfer(msg.sender, _borrowAmount);

    IDebtToken(debtToken).mint(msg.sender,msg.sender,_borrowAmount);

    emit Borrow(msg.sender, _borrowAmount);
  }

  /**
  * @dev Paybacks Vault's type underlying to activeProvider
  * @param _repayAmount: token amount of underlying to repay
  * Emits a {Repay} event.
  */
  function payback(uint256 _repayAmount) public override isWhitelisted payable {
    updateDebtTokenBalances();

    uint256 userDebtBalance = IDebtToken(debtToken).balanceOf(msg.sender);
    require(userDebtBalance > 0, Errors.VL_NO_DEBT_TO_PAYBACK);

    require(
      IERC20(borrowAsset).allowance(msg.sender, address(this))
      >= _repayAmount,
      Errors.VL_MISSING_ERC20_ALLOWANCE
    );

    IERC20(borrowAsset).transferFrom(msg.sender, address(this), _repayAmount);

    // payback current provider
    _payback(_repayAmount, address(activeProvider));

    IDebtToken(debtToken).burn(msg.sender,_repayAmount);

    emit Repay(msg.sender, _repayAmount);
  }

  /**
  * @dev Changes Vault debt and collateral to newProvider, called by Flasher
  * @param _newProvider new provider's address
  * @param _flashLoanDebt amount of flashloan underlying to repay Flashloan
  * Emits a {Switch} event.
  */
  function executeSwitch(address _newProvider,uint256 _flashLoanDebt) public override {
    // TODO make callable only from Flasher
    uint256 borrowBalance = borrowBalance();

    require(
      IERC20(borrowAsset).allowance(msg.sender, address(this)) >= borrowBalance,
      Errors.VL_MISSING_ERC20_ALLOWANCE
    );

    IERC20(borrowAsset).transferFrom(msg.sender, address(this), borrowBalance);

    // 1. payback current provider
    _payback(borrowBalance, address(activeProvider));

    // 2. withdraw collateral from current provider
    _withdraw(collateralBalance, address(activeProvider));

    // 3. deposit to the new provider
    _deposit(collateralBalance, address(_newProvider));

    // 4. borrow from the new provider, borrowBalance + premium = flashloandebt
    _borrow(_flashLoanDebt, address(_newProvider));

    updateDebtTokenBalances();

    // return borrowed amount to Flasher
    IERC20(borrowAsset).uniTransfer(msg.sender, _flashLoanDebt);

    emit Switch(activeProvider, _newProvider);
  }

  //Setter, change state functions

  /**
  * @dev Sets a new active provider for the Vault
  * @param _provider: fuji address of the new provider
  * Emits a {SetActiveProvider} event.
  */
  function setActiveProvider(address _provider) external override  {
    activeProvider = _provider;

    emit SetActiveProvider(_provider);
  }

  /**
  * @dev Get the collateral provided for a User.
  * @param _user: Address of the user
  */
  function setUsercollateral(address _user, uint256 _newValue) external override isAuthorized {
    collaterals[_user] = _newValue;
  }

  //Administrative functions

  /**
  * @dev Sets a debt token for this vault.
  * @param _debtToken: fuji debt token address
  */
  function setDebtToken(address _debtToken) external isAuthorized {
    debtToken = _debtToken;
  }

  /**
  * @dev Sets the flasher for this vault.
  * @param _flasher: flasher address
  */
  function setFlasher(address _flasher) external isAuthorized {
    flasher = Flasher(_flasher);
  }

  /**
  * @dev Sets the Collateral balance for this vault, after a change.
  * @param _newCollateralBalance: New balance value
  */
  function setVaultCollateralBalance(uint256 _newCollateralBalance) external override isAuthorized {
    collateralBalance = _newCollateralBalance;
  }

  /**
  * @dev Adds a provider to the Vault
  * @param _provider: new provider fuji address
  */
  function addProvider(address _provider) external isAuthorized {
    bool alreadyIncluded = false;

    //Check if Provider is not already included
    for (uint i = 0; i < providers.length; i++) {
      if (providers[i] == _provider) {
        alreadyIncluded = true;
      }
    }
    require(!alreadyIncluded, Errors.VL_PROVIDER_ALREADY_ADDED);

    //Push new provider to provider array
    providers.push(_provider);

    //Asign an active provider if none existed
    if (providers.length == 1) {
      activeProvider = _provider;
    }
  }

  function updateDebtTokenBalances() public override {
    IDebtToken(debtToken).updateState(borrowBalance());
  }


  //Getter Functions

  /**
  * @dev Get the collateral provided for a User.
  * @param _user: Address of the user
  */
  function getUsercollateral(address _user) external view override returns(uint256){
    return collaterals[_user];
  }

  /**
  * @dev Returns an array of the Vault's providers
  */
  function getProviders() external view override returns(address[] memory) {
    return providers;
  }

  /**
  * @dev Getter for vault's collateral asset address.
  * @return collateral asset address
  */
  function getCollateralAsset() external view override returns(address) {
    return address(collateralAsset);
  }

  /**
  * @dev Getter for vault's borrow asset address.
  * @return borrow asset address
  */
  function getBorrowAsset() external view override returns(address) {
    return address(borrowAsset);
  }

  /**
  * @dev Gets the collateral balance
  */
  function getcollateralBalance() external override view returns(uint256) {
    return collateralBalance;
  }

  /**
  * @dev Get the flasher for this vault.
  */
  function getFlasher() external view override returns(address) {
    return address(flasher);
  }

  /**
  * @dev Returns an amount to be paid as bonus for liquidation
  * @param _amount: Vault underlying type intended to be liquidated
  * @param _flash: Flash or classic type of liquidation, bonus differs
  */
  function getLiquidationBonusFor(
    uint256 _amount,
    bool _flash
  ) external view override returns(uint256) {
    // get price of DAI in ETH
    (,int256 latestPrice,,,) = oracle.latestRoundData();
    uint256 p = _amount.mul(uint256(latestPrice));

    if (_flash) {
      // 1/25 or 4%
      return p.mul(1).div(25).div(BASE);
    }
    else {
      // 1/20 or 5%
      return p.mul(1).div(20).div(BASE);
    }
  }

  /**
  * @dev Returns the amount of collateral needed, including safety factors
  * @param _amount: Vault underlying type intended to be borrowed
  */
  function getNeededCollateralFor(uint256 _amount) public view override returns(uint256) {
    // get price of DAI in ETH
    (,int256 latestPrice,,,) = oracle.latestRoundData();
    return _amount.mul(uint256(latestPrice))
        // 5/4 or 125% collateralization factor
        .mul(collatF.a)
        .div(collatF.b)
        // 21/20 or + 5% safety factor
        .mul(safetyF.a)
        .div(safetyF.b)
        .div(BASE);
  }

  /**
  * @dev Returns the amount of collateral of a user address
  * @param _user: address of the user
  */
  function getCollateralShareOf(address _user) public view returns(uint256 share) {
    uint256 providedCollateral = collaterals[_user];
    if (providedCollateral == 0) {
      share = 0;
    }
    else {
      share = providedCollateral.mul(BASE).div(collateralBalance);
    }
  }

  /**
  * @dev Returns the redeermable amount of collateral of a user address
  * @param _user: address of the user
  */
  //function getRedeemableAmountOf(address _user) public view returns(uint256 share) {
  //  uint256 collateralShare = getCollateralShareOf(_user);
  //  share = redeemableCollateralBalance().mul(collateralShare).div(BASE);
  //}

  /**
  * @dev Returns the amount of redeemable collateral from an active provider
  */
  //function redeemableCollateralBalance() public view returns(uint256) {
  //  address redeemable = IProvider(activeProvider).getRedeemableAddress(collateralAsset);
  //  return IERC20(redeemable).balanceOf(address(this));
  //}

  /**
  * @dev Returns the total borrow balance of the Vault's type underlying at active provider
  */
  function borrowBalance() public override returns(uint256) {
    return IProvider(activeProvider).getBorrowBalance(borrowAsset);
  }

  receive() external payable {}
}
