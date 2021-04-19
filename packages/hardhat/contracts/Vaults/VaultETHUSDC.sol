// SPDX-License-Identifier: MIT

pragma solidity >=0.4.25 <0.8.0;
pragma experimental ABIEncoderV2;

import { IVault } from "./IVault.sol";
import { VaultBase } from "./VaultBase.sol";
import { IFujiAdmin } from "../IFujiAdmin.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IFujiERC1155 } from "../FujiERC1155/IFujiERC1155.sol";
import { IProvider } from "../Providers/IProvider.sol";
import { Errors } from "../Libraries/Errors.sol";

import "hardhat/console.sol"; //test line

interface IAlphaWhitelist {

  function whitelistRoutine(address _usrAddrs, uint256 _amount) external returns(bool letgo);
  function depositCapCheckRoutine(uint256 currentUserDepositBal, uint256 newDeposit) external returns(bool letgo);
  function isAddrWhitelisted(address _usrAddrs) external view returns(bool);

}

contract VaultETHUSDC is IVault, VaultBase, ReentrancyGuard {

  uint256 internal constant BASE = 1e18;

  enum FactorType {safety, collateral, bonusLiq, bonusFlashLiq, flashclosefee}

  struct Factor {
    uint64 a;
    uint64 b;
  }

  // Safety factor
  Factor public safetyF;

  // Collateralization factor
  Factor public collatF;

  //State variables
  address[] public providers;
  address public override activeProvider;

  IFujiAdmin private fujiAdmin;
  address public FujiERC1155;
  AggregatorV3Interface public oracle;

  modifier isAuthorized() {
    require(
      msg.sender == fujiAdmin.getController() ||
      msg.sender == owner(),
      Errors.VL_NOT_AUTHORIZED);
    _;
  }

  modifier onlyFlash() {
    require(
      msg.sender == fujiAdmin.getFlasher(),
      Errors.VL_NOT_AUTHORIZED);
    _;
  }

  constructor (

    address _fujiAdmin,
    address _oracle

  ) public {

    fujiAdmin = IFujiAdmin(_fujiAdmin);
    oracle = AggregatorV3Interface(_oracle);

    vAssets.collateralAsset = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE); // ETH
    vAssets.borrowAsset = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // USDC

    // 1.05
    safetyF.a = 21;
    safetyF.b = 20;

    // 1.269
    collatF.a = 80;
    collatF.b = 63;

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
  * @dev Paybacks the underlying asset and withdraws collateral in a single function call from activeProvider
  * @param _paybackAmount: amount of underlying asset to be payback, pass -1 to pay full amount
  * @param _collateralAmount: amount of collateral to be withdrawn, pass -1 to withdraw maximum amount
  */
  function paybackAndWithdraw(int256 _paybackAmount, int256 _collateralAmount) external payable {
    payback(_paybackAmount);
    withdraw(_collateralAmount);
  }


  /**
  * @dev Deposit Vault's type collateral to activeProvider
  * call Controller checkrates
  * @param _collateralAmount: to be deposited
  * Emits a {Deposit} event.
  */
  function deposit(uint256 _collateralAmount) public override payable {

    require(msg.value == _collateralAmount, Errors.VL_AMOUNT_ERROR);

    // Alpha Whitelist Routine
    IAlphaWhitelist aWhitelist = IAlphaWhitelist(fujiAdmin.getaWhitelist());
    require(aWhitelist.whitelistRoutine(msg.sender, _collateralAmount), Errors.SP_ALPHA_WHTLIST_FULL);

    // Alpha Cap Check
    uint256 userCurrentBalance = IFujiERC1155(FujiERC1155).balanceOf(msg.sender, vAssets.collateralID);
    require(aWhitelist.depositCapCheckRoutine(userCurrentBalance, _collateralAmount),Errors.SP_ALPHA_ETH_CAP_VALUE);

    // Delegate Call Deposit to current provider
    _deposit(_collateralAmount, address(activeProvider));

    // Collateral Management
    IFujiERC1155(FujiERC1155).mint(msg.sender, vAssets.collateralID, _collateralAmount, "");

    emit Deposit(msg.sender, vAssets.collateralAsset ,_collateralAmount);
  }

  /**
  * @dev Withdraws Vault's type collateral from activeProvider
  * call Controller checkrates
  * @param _withdrawAmount: amount of collateral to withdraw
  * otherwise pass -1 to withdraw maximum amount possible of collateral (including safety factors)
  * Emits a {Withdraw} event.
  */
  function withdraw(int256 _withdrawAmount) public override nonReentrant {

    // If call from Normal User do typical, otherwise Fliquidator
    if(msg.sender != fujiAdmin.getFliquidator()) {

      _updateF1155Balances();

      // Get User Collateral in this Vault
      uint256 providedCollateral = IFujiERC1155(FujiERC1155).balanceOf(msg.sender, vAssets.collateralID);

      // Check User has collateral
      require(providedCollateral > 0, Errors.VL_INVALID_COLLATERAL);

      // Get Required Collateral with Factors to maintain debt position healthy
      uint256 neededCollateral = getNeededCollateralFor(
        IFujiERC1155(FujiERC1155).balanceOf(msg.sender,vAssets.borrowID),
        true
      );

      uint256 amountToWithdraw;

      if (_withdrawAmount < 0) {
        amountToWithdraw = providedCollateral.sub(neededCollateral);
      } else if ( _withdrawAmount > 0) {
        amountToWithdraw = uint256(_withdrawAmount);
      }

      // Check Withdrawal amount will not fall undercollaterized.
      require(providedCollateral.sub(amountToWithdraw) >= neededCollateral, Errors.VL_INVALID_WITHDRAW_AMOUNT);

      // Collateral Management
      IFujiERC1155(FujiERC1155).burn(msg.sender, vAssets.collateralID, amountToWithdraw);

      // Delegate Call Withdraw to current provider
      _withdraw(amountToWithdraw, address(activeProvider));

      // Transer Assets to User
      IERC20(vAssets.collateralAsset).uniTransfer(msg.sender, amountToWithdraw);

      emit Withdraw(msg.sender, vAssets.collateralAsset, amountToWithdraw);

    } else if(msg.sender == fujiAdmin.getFliquidator()) {

    // Logic used when called by Fliquidator
    _withdraw(uint256(_withdrawAmount), address(activeProvider));
    IERC20(vAssets.collateralAsset).uniTransfer(msg.sender, uint256(_withdrawAmount));

    }

  }

  /**
  * @dev Borrows Vault's type underlying amount from activeProvider
  * @param _borrowAmount: token amount of underlying to borrow
  * Emits a {Borrow} event.
  */
  function borrow(uint256 _borrowAmount) public override nonReentrant {

    _updateF1155Balances();

    uint256 providedCollateral = IFujiERC1155(FujiERC1155).balanceOf(msg.sender, vAssets.collateralID);

    // Get Required Collateral with Factors to maintain debt position healthy
    uint256 neededCollateral = getNeededCollateralFor(
      _borrowAmount.add(IFujiERC1155(FujiERC1155).balanceOf(msg.sender,vAssets.borrowID)),
      true
    );

    // Check Provided Collateral is greater than needed to maintain healthy position
    require(providedCollateral > neededCollateral, Errors.VL_INVALID_BORROW_AMOUNT);

    // Debt Management
    IFujiERC1155(FujiERC1155).mint(msg.sender, vAssets.borrowID, _borrowAmount, "");

    // Delegate Call Borrow to current provider
    _borrow(_borrowAmount, address(activeProvider));

    // Transer Assets to User
    IERC20(vAssets.borrowAsset).uniTransfer(msg.sender, _borrowAmount);

    emit Borrow(msg.sender, vAssets.borrowAsset, _borrowAmount);
  }

  /**
  * @dev Paybacks Vault's type underlying to activeProvider
  * @param _repayAmount: token amount of underlying to repay, or pass -1 to repay full ammount
  * Emits a {Repay} event.
  */
  function payback(int256 _repayAmount) public override payable {

    // If call from Normal User do typical, otherwise Fliquidator
    if (msg.sender != fujiAdmin.getFliquidator()) {

      _updateF1155Balances();

      uint256 userDebtBalance = IFujiERC1155(FujiERC1155).balanceOf(msg.sender,vAssets.borrowID);

      // Check User Debt is greater than Zero
      require(userDebtBalance > 0, Errors.VL_NO_DEBT_TO_PAYBACK);

      // Get corresponding amount of Base Protocol Debt Only
      (,uint256 fujidebt) = IFujiERC1155(FujiERC1155).splitBalanceOf(msg.sender,vAssets.borrowID);

      uint256 amountToPayback;

      // If passed argument amount is negative do MAX
      if(_repayAmount < 0) {
        amountToPayback = userDebtBalance;
      } else if( _repayAmount >= 0 ) {

        amountToPayback = uint256(_repayAmount);

        // Check amountToPayback is NON Zero
        require(amountToPayback > 0, Errors.VL_NO_DEBT_TO_PAYBACK );
      }

      // Check User Allowance
      require(
        IERC20(vAssets.borrowAsset).allowance(msg.sender, address(this))
        >= amountToPayback,
        Errors.VL_MISSING_ERC20_ALLOWANCE
        );

      // Transfer Asset from User to Vault
      IERC20(vAssets.borrowAsset).transferFrom(msg.sender, address(this), amountToPayback);

      // Delegate Call Payback to current provider
      _payback(amountToPayback.sub(fujidebt), address(activeProvider));

      // Transfer Remaining Debt Amount to Fuji Treasury
      IERC20(vAssets.borrowAsset).transfer(fujiAdmin.getTreasury(), fujidebt);

      // Debt Management
      IFujiERC1155(FujiERC1155).burn(msg.sender, vAssets.borrowID, userDebtBalance);

      emit Payback(msg.sender, vAssets.borrowAsset,userDebtBalance);

    } else if (msg.sender == fujiAdmin.getFliquidator()) {

      // Logic used when called by Fliquidator
      require(
        IERC20(vAssets.borrowAsset).allowance(msg.sender, address(this))
        >= uint256(_repayAmount),
        Errors.VL_MISSING_ERC20_ALLOWANCE
      );

      IERC20(vAssets.borrowAsset).transferFrom(msg.sender, address(this), uint256(_repayAmount));

      _payback(uint256(_repayAmount), address(activeProvider));
    }
  }

  /**
  * @dev Changes Vault debt and collateral to newProvider, called by Flasher
  * @param _newProvider new provider's address
  * @param _flashLoanDebt amount of flashloan underlying to repay Flashloan
  * Emits a {Switch} event.
  */
  function executeSwitch(
    address _newProvider,
    uint256 _flashLoanDebt
  ) external override onlyFlash whenNotPaused {

    uint256 borrowBalance = borrowBalance(activeProvider);

    // Check Allowance
    require(
      IERC20(vAssets.borrowAsset).allowance(msg.sender, address(this)) >= borrowBalance,
      Errors.VL_MISSING_ERC20_ALLOWANCE
    );

    // Load Flashloan Assets to Vault
    IERC20(vAssets.borrowAsset).transferFrom(msg.sender, address(this), borrowBalance);

    // Payback current provider
    _payback(borrowBalance, address(activeProvider));

    // Withdraw collateral from current provider
    uint256 collateralBalance = depositBalance(activeProvider);
    _withdraw(collateralBalance, address(activeProvider));

    // Deposit to the new provider
    _deposit(collateralBalance, address(_newProvider));

    // Borrow from the new provider, borrowBalance + premium = flashloandebt
    _borrow(_flashLoanDebt, address(_newProvider));

    // return borrowed amount to Flasher
    IERC20(vAssets.borrowAsset).uniTransfer(msg.sender, _flashLoanDebt);

    emit Switch(address(this) ,activeProvider, _newProvider);
  }

  //Setter, change state functions

  /**
  * @dev Sets the fujiAdmin Address
  * @param _fujiAdmin: FujiAdmin Contract Address
  */
  function setfujiAdmin(address _fujiAdmin) public isAuthorized{
    fujiAdmin = IFujiAdmin(_fujiAdmin);
  }

  /**
  * @dev Sets a new active provider for the Vault
  * @param _provider: fuji address of the new provider
  * Emits a {SetActiveProvider} event.
  */
  function setActiveProvider(address _provider) external override isAuthorized {
    activeProvider = _provider;

    emit SetActiveProvider(_provider);
  }

  //Administrative functions

  /**
  * @dev Sets a fujiERC1155 Collateral and Debt Asset manager for this vault and initializes it.
  * @param _FujiERC1155: fuji ERC1155 address
  */
  function setFujiERC1155(address _FujiERC1155) external isAuthorized {
    FujiERC1155 = _FujiERC1155;
     vAssets.collateralID = IFujiERC1155(_FujiERC1155).addInitializeAsset(IFujiERC1155.AssetType.collateralToken, address(this));
     vAssets.borrowID = IFujiERC1155(_FujiERC1155).addInitializeAsset(IFujiERC1155.AssetType.debtToken, address(this));
  }

  /**
  * @dev Set Factors "a" and "b" for a Struct Factor
  * For safetyF;  Sets Safety Factor of Vault, should be > 1, a/b
  * For collatF; Sets Collateral Factor of Vault, should be > 1, a/b
  * @param _type: enum FactorType
  * @param _newFactorA: A number
  * @param _newFactorB: A number
  */
  function setFactor(FactorType _type, uint64 _newFactorA, uint64 _newFactorB) external isAuthorized {
    if(_type == FactorType.safety) {
      safetyF.a = _newFactorA;
      safetyF.b = _newFactorB;
    } else if (_type == FactorType.collateral) {
      collatF.a = _newFactorA;
      collatF.b = _newFactorB;
    }
  }

  /**
  * @dev Sets the Oracle address (Must Comply with AggregatorV3Interface)
  * @param _newOracle: new Oracle address
  */
  function setOracle(address _newOracle) external isAuthorized {
    oracle = AggregatorV3Interface(_newOracle);
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

  /**
  * @dev Overrides a porvider address at location in the providers Array
  * @param _position: position in the array
  * @param _provider: new provider fuji address
  */
  function overrideProvider(uint8 _position, address _provider) external isAuthorized {
    providers[_position] = _provider;
  }

  /**
  * @dev Internal Function to call updateState in F1155
  */
  function _updateF1155Balances() internal {
    IFujiERC1155(FujiERC1155).updateState(vAssets.borrowID, borrowBalance(activeProvider));
    IFujiERC1155(FujiERC1155).updateState(vAssets.collateralID, depositBalance(activeProvider));
  }

  /**
  * @dev External Function to call updateState in F1155
  */
  function updateF1155Balances() external override {
    _updateF1155Balances();
  }

  //Getter Functions

  /**
  * @dev Returns an array of the Vault's providers
  */
  function getProviders() external view override returns(address[] memory) {
    return providers;
  }

  /**
  * @dev Getter for vaultAssets Struct
  */
  function getvAssets() external view returns(VaultAssets memory) {
    return vAssets;
  }

  /**
  * @dev Getter for vault's FujiERC1155 address.
  * @return FujiERC1155 contract address
  */
  function getF1155() external override view returns(address) {
    return FujiERC1155;
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
    uint256 p = (_amount.mul(1e12).mul(uint256(latestPrice))).div(BASE);

    if (_flash) {
      // Bonus Factors for Flash Liquidation
      (uint64 a, uint64 b) = fujiAdmin.getBonusFlashL();
      return p.mul(a).div(b);
    }
    else {
      //Bonus Factors for Normal Liquidation
      (uint64 a, uint64 b) = fujiAdmin.getBonusLiq();
      return p.mul(a).div(b);
    }
  }

  /**
  * @dev Returns the amount of collateral needed, including or not safety factors
  * @param _amount: Vault underlying type intended to be borrowed
  * @param _withFactor: Inidicate if computation should include safety_Factors
  */
  function getNeededCollateralFor(uint256 _amount, bool _withFactor) public view override returns(uint256) {
    // Get price of DAI in ETH
    (,int256 latestPrice,,,) = oracle.latestRoundData();
    uint256 minimumReq = (_amount.mul(1e12).mul(uint256(latestPrice))).div(BASE);

    if(_withFactor) { //125% + 5%
      return minimumReq.mul(collatF.a).mul(safetyF.a).div(collatF.b).div(safetyF.b);
    } else {
      return minimumReq;
    }
  }

  /**
  * @dev Returns the total borrow balance of the Vault's  underlying at provider
  * @param _provider: address of a provider
  */
  function borrowBalance(address _provider) public view override returns(uint256) {
    return IProvider(_provider).getBorrowBalance(vAssets.borrowAsset);
  }

  /**
  * @dev Returns the total deposit balance of the Vault's type collateral at provider
  * @param _provider: address of a provider
  */
  function depositBalance(address _provider) public view override returns(uint256) {
    uint256 balance = IProvider(_provider).getDepositBalance(vAssets.collateralAsset);
    return balance;
  }

  receive() external payable {}
}
