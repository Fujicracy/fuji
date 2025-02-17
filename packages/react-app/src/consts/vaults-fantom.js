import { ASSETS, ASSET_NAME } from './assets-fantom';
import { PROVIDER_TYPE, PROVIDERS } from './providers';

const VAULTS_NAMES = {
  VaultFTMDAI: 'VaultFTMDAI',
  VaultFTMUSDC: 'VaultFTMUSDC',
  VaultWBTCDAI: 'VaultWBTCDAI',
  VaultWETHUSDC: 'VaultWETHUSDC',
  VaultWETHDAI: 'VaultWETHDAI',
};

const COLLATERAL_IDS = {
  [VAULTS_NAMES.VaultFTMDAI]: 0,
  [VAULTS_NAMES.VaultFTMUSDC]: 2,
  [VAULTS_NAMES.VaultWBTCDAI]: 4,
  [VAULTS_NAMES.VaultWETHUSDC]: 6,
  [VAULTS_NAMES.VaultWETHDAI]: 8,
};

const BORROW_IDS = {
  [VAULTS_NAMES.VaultFTMDAI]: 1,
  [VAULTS_NAMES.VaultFTMUSDC]: 3,
  [VAULTS_NAMES.VaultWBTCDAI]: 5,
  [VAULTS_NAMES.VaultWETHUSDC]: 7,
  [VAULTS_NAMES.VaultWETHDAI]: 9,
};

const VAULTS = {
  [VAULTS_NAMES.VaultFTMDAI]: {
    borrowAsset: ASSETS[ASSET_NAME.DAI],
    collateralAsset: ASSETS[ASSET_NAME.FTM],
    borrowId: BORROW_IDS[VAULTS_NAMES.VaultFTMDAI],
    collateralId: COLLATERAL_IDS[VAULTS_NAMES.VaultFTMDAI],
    providers: [
      PROVIDERS[PROVIDER_TYPE.GEIST],
      PROVIDERS[PROVIDER_TYPE.CREAM],
      PROVIDERS[PROVIDER_TYPE.HUNDRED],
    ],
    name: 'VaultFTMDAI',
    title: 'FTM-DAI',
    threshold: 60,
  },
  [VAULTS_NAMES.VaultFTMUSDC]: {
    borrowAsset: ASSETS[ASSET_NAME.USDC],
    collateralAsset: ASSETS[ASSET_NAME.FTM],
    borrowId: BORROW_IDS[VAULTS_NAMES.VaultFTMUSDC],
    collateralId: COLLATERAL_IDS[VAULTS_NAMES.VaultFTMUSDC],
    providers: [
      PROVIDERS[PROVIDER_TYPE.GEIST],
      PROVIDERS[PROVIDER_TYPE.CREAM],
      PROVIDERS[PROVIDER_TYPE.HUNDRED],
    ],
    name: 'VaultFTMUSDC',
    title: 'FTM-USDC',
    threshold: 60,
  },
  [VAULTS_NAMES.VaultWBTCDAI]: {
    borrowAsset: ASSETS[ASSET_NAME.DAI],
    collateralAsset: ASSETS[ASSET_NAME.BTC],
    borrowId: BORROW_IDS[VAULTS_NAMES.VaultWBTCDAI],
    collateralId: COLLATERAL_IDS[VAULTS_NAMES.VaultWBTCDAI],
    providers: [
      PROVIDERS[PROVIDER_TYPE.GEIST],
      PROVIDERS[PROVIDER_TYPE.CREAM],
      PROVIDERS[PROVIDER_TYPE.HUNDRED],
    ],
    name: 'VaultWBTCDAI',
    title: 'BTC-DAI',
    threshold: 65,
  },
  [VAULTS_NAMES.VaultWETHUSDC]: {
    borrowAsset: ASSETS[ASSET_NAME.USDC],
    collateralAsset: ASSETS[ASSET_NAME.ETH],
    borrowId: BORROW_IDS[VAULTS_NAMES.VaultWETHUSDC],
    collateralId: COLLATERAL_IDS[VAULTS_NAMES.VaultWETHUSDC],
    providers: [
      PROVIDERS[PROVIDER_TYPE.GEIST],
      PROVIDERS[PROVIDER_TYPE.CREAM],
      PROVIDERS[PROVIDER_TYPE.HUNDRED],
    ],
    name: 'VaultWETHUSDC',
    title: 'ETH-USDC',
    threshold: 75,
  },
  [VAULTS_NAMES.VaultWETHDAI]: {
    borrowAsset: ASSETS[ASSET_NAME.DAI],
    collateralAsset: ASSETS[ASSET_NAME.ETH],
    borrowId: BORROW_IDS[VAULTS_NAMES.VaultWETHDAI],
    collateralId: COLLATERAL_IDS[VAULTS_NAMES.VaultWETHDAI],
    providers: [
      PROVIDERS[PROVIDER_TYPE.GEIST],
      PROVIDERS[PROVIDER_TYPE.CREAM],
      PROVIDERS[PROVIDER_TYPE.HUNDRED],
    ],
    name: 'VaultWETHDAI',
    title: 'ETH-DAI',
    threshold: 75,
  },
};

export { VAULTS_NAMES, BORROW_IDS, COLLATERAL_IDS, VAULTS };
