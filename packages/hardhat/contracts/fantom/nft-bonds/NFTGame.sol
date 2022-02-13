// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

/// @title NFT Game 
/// @author fuji-dao.eth
/// @notice Contract that handles logic for the NFT Bond game

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../../interfaces/IVault.sol";
import "../../interfaces/IVaultControl.sol";
import "../../interfaces/IERC20Extended.sol";

contract NFTGame is Initializable, ERC1155Upgradeable, AccessControlUpgradeable {

  /**
  * @dev Changing valid vaults
  */
  event ValidVaultsChanged(address[] validVaults);

  struct UserData {
    uint64 lastTimestampUpdate;
    uint64 rateOfAccrual;
    uint128 accruedPoints;
    uint128 recordedDebtBalance;
    uint256 lockedNFTId;
  }

  // Constants

  uint256 constant SEC = 86400;

  // uint256 private constant MINIMUM_DAILY_DEBT_POSITION = 1;
  // uint256 private constant POINT_PER_DEBTUNIT_PER_DAY = 1; 

  uint256 public constant POINTS_ID = 0;
  uint256 public constant POINTS_DECIMALS = 5;

  address private constant _FTM = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;


  // Roles

  bytes32 public constant GAME_ADMIN = keccak256("GAME_ADMIN");
  bytes32 public constant GAME_INTERACTOR = keccak256("GAME_INTERACTOR");


  // Sate Variables

  uint64 public gameLaunchTimestamp;
  bytes32 public merkleRoot;

  mapping(address => UserData) public userdata;

  // TokenID =>  supply amount
  mapping(uint256 => uint256) public totalSupply;

  address[] public validVaults;

  // Timestamps for each game phase
    // 0 = start game launch
    // 1 = end of accumulation
    // 2 = end of trade and lock
    // 3 = end of bond
  uint256[4] public gamePhaseTimestamps;

  modifier onlyVault() {
    require(isValidVault(msg.sender), "only valid vault caller!");
    _;
  }

  function initialize(uint256[4] memory phases) external initializer {
    __ERC1155_init("");
    __AccessControl_init();
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setupRole(GAME_ADMIN, msg.sender);
    _setupRole(GAME_INTERACTOR, msg.sender);
    gamePhaseTimestamps = phases;
  }

  /// State Changing Functions

  // Admin functions

  /**
  * @notice Sets the list of vaults that count towards the game
  */
  function setValidVaults(address[] memory vaults) external {
    require(hasRole(GAME_ADMIN, msg.sender), "No permission");
    validVaults = vaults;
    emit ValidVaultsChanged(vaults);
  }

  function setGamePhases(uint256[3] memory newPhasesTimestamps) external {
    require(hasRole(GAME_ADMIN, msg.sender), "No permission");
    gamePhaseTimestamps = newPhasesTimestamps;
  }

  // Game control functions

  /**
  * @notice Compute user's total debt in Fuji in all vaults of this chain.
  * @dev Called whenever a user performs a 'borrow()' or 'payback()' call on {FujiVault} contract
  * @dev Must consider all fuji active vaults, and different decimals.
  */
  function checkStateOfPoints(
    address user,
    uint256 balanceChange,
    bool isPayback,
    uint256 decimals
  ) external onlyVault {

    uint256 phase = whatPhase();
    // Only once accumulation has begun
    if (phase > 0) {
      // Reads state of debt as per last 'borrow()' or 'payback()' call
      uint256 debt = getUserDebt(user);
      balanceChange = _convertToDebtUnits(balanceChange, decimals);

      if (userdata[user].rateOfAccrual != 0) {
        // Compound points from previous state, considering current 'borrow()' or 'payback()' amount change.
        _compoundPoints(user, isPayback ? debt + balanceChange : debt - balanceChange, phase);
      }
      _updateUserInfo(user, uint128(debt), phase);
    } 
  }

  function userLock(address user, uint256 boostNumber) external {
    require(hasRole(GAME_INTERACTOR, msg.sender), "No permission");
    require(userdata[user].lockedNFTId == 0, "user laready locked!");

    uint256 phase = whatPhase();
    uint256 debt = getUserDebt(user);

    // If user was accumulating points, need to do final compounding
    if (userdata[user].rateOfAccrual != 0) {
      _compoundPoints(user, debt, phase);
    }

    // Set all accrue parameters to zero
    _updateUserInfo(user, uint128(debt), phase);

    // Compute and assign final score
    uint256 finalScore = userdata[user].accruedPoints * boostNumber / 100;

    userdata[user].accruedPoints = uint128(finalScore);
    userdata[user].lockedNFTId = uint256(
      keccak256(
        abi.encodePacked(user, finalScore)
    ));

    // Mint the lockedNFT for user
    _mint(user, userdata[user].lockedNFTId, 1, "");

    //TODO Burn the crates and cards remaining for user
  }

  function mint(address user, uint256 id, uint256 amount) external {
    require(hasRole(GAME_INTERACTOR, msg.sender), "No permission");
    // accumulation and trading
    uint256 phase = whatPhase();
    require(phase >= 1 && phase < 3);

    if (id == POINTS_ID) {
      _mintPoints(user, amount);
    } else {
      _mint(user, id, amount, "");
    }
    totalSupply[id] += amount;
  }

  function burn(address user, uint256 id, uint256 amount) external {
    require(hasRole(GAME_INTERACTOR, msg.sender), "No permission");
    // accumulation, trading and bonding
    uint256 phase = whatPhase();
    require(phase >= 1);

    if (id == POINTS_ID) {
      uint256 debt = getUserDebt(user);
      _compoundPoints(user, debt, phase);
      _updateUserInfo(user, uint128(debt), phase);
      require(userdata[user].accruedPoints >= amount, "Not enough points");
      userdata[user].accruedPoints -= uint128(amount);
    } else {
      _burn(user, id, amount);
    }
    totalSupply[id] -= amount;
  }

  /**
  * @notice Claims bonus points given to user before 'gameLaunchTimestamp'.
  */
  function claimBonusPoints() public {}

  function setMerkleRoot(bytes32 _merkleRoot) external {
    require(hasRole(GAME_ADMIN, msg.sender), "No permission");
    require(_merkleRoot[0] != 0, "empty merkleRoot!");
    merkleRoot = _merkleRoot;
  }


  // View Functions

  /**
  * @notice Checks if a given vault is a valid vault
  */
  function isValidVault(address vault) public view returns (bool){
    for (uint256 i = 0; i < validVaults.length; i++) {
      if (validVaults[i] == vault) {
        return true;
      }
    }
    return false;
  }

  /**
  * @notice Returns the balance of token Id.
  * @dev If id == 0, refers to point score system, else is calls ERC1155 NFT balance.
  */
  function balanceOf(address user, uint256 id) public view override returns (uint256) {
    // To query points balance, id == 0
    if (id == POINTS_ID) {
      return _pointsBalanceOf(user, whatPhase());
    } else {
      // Otherwise check ERC1155
      return super.balanceOf(user, id);
    }
  }

  /**
  * @notice Compute user's rate of point accrual.
  * @dev Unit should be points per second.
  */
  function computeRateOfAccrual(address user) public view returns (uint256) {
    return getUserDebt(user) * (10**POINTS_DECIMALS) / SEC;
  }

  /**
  * @notice Compute user's (floored) total debt in Fuji in all vaults of this chain.
  * @dev Must consider all fuji's active vaults, and different decimals.
  * @dev This function floors decimals to the nearest integer amount of debt. Example 1.78784 usdc = 1 unit of debt
  */
  function getUserDebt(address user) public view returns (uint256) {
    uint256 totalDebt = 0;

    IVaultControl.VaultAssets memory vAssets;
    uint256 decimals;
    for (uint256 i = 0; i < validVaults.length; i++) {
      vAssets = IVaultControl(validVaults[i]).vAssets();
      decimals = vAssets.borrowAsset == _FTM ? 18 : IERC20Extended(vAssets.borrowAsset).decimals();
      totalDebt += _convertToDebtUnits(IVault(validVaults[i]).userDebtBalance(user), decimals);
    }
    return totalDebt;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, AccessControlUpgradeable) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  // Internal Functions

  /**
  * @notice Returns a value that helps identify appropriate game logic according to game phase.
  */
  function whatPhase() public view returns (uint256 phase) {
    phase = block.timestamp;
    if(phase < gamePhaseTimestamps[0]) {
      phase = 0; // Pre-game
    } else if (phase >= gamePhaseTimestamps[0] && phase < gamePhaseTimestamps[1]) {
      phase = 1; // Accumulation
    } else if (phase >= gamePhaseTimestamps[1] && phase < gamePhaseTimestamps[2]) {
      phase = 2; // Trade and lock
    } else {
      phase = 3; // Bonding
    }
  }

  /**
  * @notice Compute user's accrued points since user's 'lastTimestampUpdate' or at the end of accumulation phase.
  * @dev Includes points earned from debt balance and points from earned by debt accrued interest.
  */
  function _computeAccrued(address user, uint256 debt, uint256 phase) internal view returns (uint256) {
    UserData memory info = userdata[user];
    uint256 timeStampDiff = 0;
    uint256 estimateInterestEarned = 0; 

    if (phase == 1) {
      timeStampDiff = _timestampDifference(block.timestamp, info.lastTimestampUpdate);
      estimateInterestEarned = debt - info.recordedDebtBalance;
    } else if (phase > 1 && info.recordedDebtBalance > 0 ) {
      timeStampDiff = _timestampDifference(gamePhaseTimestamps[1], info.lastTimestampUpdate);
      estimateInterestEarned = timeStampDiff == 0 ? 0 : debt - info.recordedDebtBalance;
    }
    
    uint256 pointsFromRate = timeStampDiff * (info.rateOfAccrual);
    // Points from interest are an estimate within 99% accuracy in 90 day range.
    uint256 pointsFromInterest = estimateInterestEarned * (timeStampDiff + 1 days) / 2;

    return pointsFromRate + pointsFromInterest;
  }

  /**
  * @dev Returns de balance of accrued points of a user.
  */
  function _pointsBalanceOf(address user, uint256 phase) internal view returns (uint256) {
    return userdata[user].accruedPoints + _computeAccrued(user, getUserDebt(user), phase);
  }

  /**
  * @dev Adds 'computeAccrued()' to recorded 'accruedPoints' in UserData and totalSupply
  * @dev Must update all fields of UserData information.
  */
  function _compoundPoints(address user, uint256 debt, uint256 phase) internal {
    uint256 points = _computeAccrued(user, debt, phase);

    _mintPoints(user, points);
  }

  function _timestampDifference(uint256 newTimestamp, uint256 oldTimestamp) internal pure returns (uint256) {
    return newTimestamp - oldTimestamp;
  }

  function _convertToDebtUnits(uint256 value, uint256 decimals) internal pure returns (uint256) {
    return value / 10**decimals;
  }

  //TODO change this function for the public one with the corresponding permission
  function _mintPoints(address user, uint256 amount) internal {
    userdata[user].accruedPoints += uint128(amount);
    totalSupply[POINTS_ID] += amount;
  }

  function _updateUserInfo(address user, uint128 balance, uint256 phase) internal {
    if (phase == 1) {
      userdata[user].lastTimestampUpdate = uint64(block.timestamp);
      userdata[user].recordedDebtBalance = uint128(balance);
      userdata[user].rateOfAccrual = uint64(balance * (10**POINTS_DECIMALS) / SEC);
    } else if (
      phase > 1 &&
      userdata[user].lastTimestampUpdate > 0 &&
      userdata[user].lastTimestampUpdate != uint64(gamePhaseTimestamps[1])
    ) {
      // Update user data for no more accruing.
      userdata[user].lastTimestampUpdate = uint64(gamePhaseTimestamps[1]);
      userdata[user].rateOfAccrual = 0; 
      userdata[user].recordedDebtBalance = 0;
    }
  }

  function _isCrateOrCardId(uint256[] memory ids) internal pure returns(bool isSpecialID) {
    for (uint256 index = 0; index < ids.length; index++) {
      if( ids[index] <= 11 ) {
        isSpecialID = true;
      }
    }
  }

  function _beforeTokenTransfer(
    address operator,
    address from,
    address to,
    uint256[] memory ids,
    uint256[] memory amounts,
    bytes memory data
  ) internal view override {
    operator;
    from;
    to;
    amounts;
    data;
    if ( whatPhase() == 3) {
      require(!_isCrateOrCardId(ids), "gamePhase: Id not transferible");
    }
  }
}
