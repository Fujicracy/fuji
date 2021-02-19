// SPDX-License-Identifier: MIT

pragma solidity >=0.4.25 <0.7.0;
pragma experimental ABIEncoderV2;

import "./VaultETHDAI.sol";
import "./flashloans/Flasher.sol";

contract Controller {
  address private owner;
  address public flasherAddr;

  //Change Threshold is the minimum percent in Borrowing Rates to trigger a provider change
  //Percentage Expressed in ray (1e27)
  uint256 public changeThreshold;

  //State variables to control vault providers
  address[] public vaults;

  //Modifiers
  modifier isAuthorized() {
    require(msg.sender == owner || msg.sender == address(this), "!authorized");
    _;
  }

  constructor(
    address _owner,
    address _flasher,
    uint256 _changeThreshold
  ) public {
    // Add initializer addresses
    owner = _owner;
    flasherAddr = _flasher;
    changeThreshold = _changeThreshold;
  }

  //Administrative functions

  /**
  * @dev Adds a Vault to the controller.
  * @param _vaultAddr: Address of vault to be added
  */
  function addVault(
    address _vaultAddr
  ) external isAuthorized {
    bool alreadyIncluded = false;

    //Check if Vault is already included
    for (uint i =0; i < vaults.length; i++ ) {
      if (vaults[i] == _vaultAddr) {
        alreadyIncluded = true;
      }
    }
    require(alreadyIncluded == false, "Vault is already included in Controller");

    //Loop to check if vault address is already there
    vaults.push(_vaultAddr);
  }

  /**
  * @dev Changes the conditional Threshold for a provider switch
  * @param _newThreshold: percent decimal in ray (example 25% =.25 x10^27)
  */
  function setChangeThreshold(
    uint256 _newThreshold
  ) external isAuthorized {
    changeThreshold = _newThreshold;
  }

  /**
  * @dev Changes the flasher contract address
  * @param _newFlasher: address of new flasher contract
  */
  function setFlasher(
    address _newFlasher
  ) external isAuthorized {
    flasherAddr = _newFlasher;
  }

  /**
  * @dev Sets a new provider to called Vault, returns true on success
  * @param _vaultAddr: fuji Vault address to which active provider will change
  * @param _newProviderAddr: fuji address of new Provider
  */
  function setProvider(
    address _vaultAddr,
    address _newProviderAddr
  ) internal isAuthorized returns(bool) {
    //Create vault instance and call setActiveProvider method in that vault.
    IVault(_vaultAddr).setActiveProvider(_newProviderAddr);
  }

  //Controller Core functions

  /**
  * @dev Performs full routine to check the borrowing Rates from the
  * various providers of a Vault, it swap the assets to the best provider,
  * and sets a new active provider for the called Vault
  * @param _vaultAddr: fuji Vault address
  * @return true if provider got switched, false if no change
  */
  function doControllerRoutine(
    address _vaultAddr
  ) external returns(bool) {

    //Check if there is an opportunity to Change provider with a lower borrowing Rate
    (bool opportunityTochange, address newProvider) = checkRates(_vaultAddr);

    if (opportunityTochange) {
      //Check how much borrowed balance along with accrued interest at current Provider

      //Initiate Flash Loan
      IVault vault = IVault(_vaultAddr);
      uint256 debtPosition = vault.borrowBalance();

      require(debtPosition > 0, "No debt to liquidate");

      Flasher(flasherAddr).initiateDyDxFlashLoan(
        FlashLoan.CallType.Switch,
        _vaultAddr,
        newProvider,
        vault.borrowAsset(),
        debtPosition
      );

      //Set the new provider in the Vault
      setProvider(_vaultAddr, address(newProvider));
      return true;
    }
    else {
      return false;
    }
  }

  /**
  * @dev Compares borrowing rates from providers of a vault
  * @param _vaultAddr: Fuji vault address
  * @return true on success and address of provider with best borrowing rate
  */
  function checkRates(
    address _vaultAddr
  ) public view returns(bool, address) {
    //Get the array of Providers from _vaultAddr
    address[] memory arrayOfProviders = IVault(_vaultAddr).getProviders();
    address borrowingAsset = IVault(_vaultAddr).borrowAsset();
    bool opportunityTochange = false;

    //Call and check borrow rates for all Providers in array for _vaultAddr
    uint256 currentRate = IProvider(IVault(_vaultAddr).activeProvider()).getBorrowRateFor(borrowingAsset);
    uint256 differance;
    address newProvider;

    for (uint i=0; i < arrayOfProviders.length; i++) {
      differance = (currentRate >= IProvider(arrayOfProviders[i]).getBorrowRateFor(borrowingAsset) ?
      currentRate - IProvider(arrayOfProviders[i]).getBorrowRateFor(borrowingAsset) :
      IProvider(arrayOfProviders[i]).getBorrowRateFor(borrowingAsset) - currentRate);
      if (differance >= changeThreshold && IProvider(arrayOfProviders[i]).getBorrowRateFor(borrowingAsset) < currentRate) {
        currentRate = IProvider(arrayOfProviders[i]).getBorrowRateFor(borrowingAsset);
        newProvider = arrayOfProviders[i];
        opportunityTochange = true;
      }
    }
    //Returns success or not, and the Iprovider with lower borrow rate
    return (opportunityTochange, newProvider);
  }
}
