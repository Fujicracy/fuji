import { ASSETS } from '../consts/index.js';

const providerIndexes = {
  AAVE: '0', // on fantom it's Geist
  DYDX: '1',
  CREAM: '2',
};

const getForEthereum = (contracts, activeProvider, borrowAsset) => {
  const assets = ASSETS.ethereum;

  if ([assets.DAI.address, assets.USDC.address].includes(borrowAsset)) {
    // use dydx flashloans when underlying asset is DAI or USDC
    return providerIndexes.DYDX;
  }
  if (contracts.ProviderIronBank && contracts.ProviderIronBank.address !== activeProvider) {
    return providerIndexes.CREAM;
  }
  return providerIndexes.AAVE;
};

export const getFlashloanProvider = async (setup, vault) => {
  const { contracts, config } = setup;

  const { borrowAsset } = await vault.vAssets();
  const activeProvider = await vault.activeProvider();

  let index = providerIndexes.AAVE;
  if (config.networkName === 'ethereum') {
    index = getForEthereum(contracts, activeProvider, borrowAsset);
  } else if (config.networkName === 'fantom') {
    index =
      contracts.ProviderCream.address === activeProvider
        ? providerIndexes.AAVE
        : providerIndexes.CREAM;
  }

  return index;
};
