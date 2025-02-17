export const ASSET_NAME = {
  DAI: 'DAI',
  USDC: 'USDC',
  FTM: 'FTM',
  BTC: 'BTC',
  ETH: 'ETH',
};

export const ASSETS = {
  [ASSET_NAME.DAI]: {
    id: ASSET_NAME.DAI.toLowerCase(),
    name: ASSET_NAME.DAI,
    decimals: 18,
    address: '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E',
    oracle: '0x91d5DEFAFfE2854C7D02F50c80FA1fdc8A721e52',
  },
  [ASSET_NAME.USDC]: {
    id: ASSET_NAME.USDC.toLowerCase(),
    name: ASSET_NAME.USDC,
    decimals: 6,
    address: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
    oracle: '0x2553f4eeb82d5A26427b8d1106C51499CBa5D99c',
  },
  [ASSET_NAME.FTM]: {
    id: ASSET_NAME.FTM.toLowerCase(),
    name: ASSET_NAME.FTM,
    decimals: 18,
    address: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
    oracle: '0xf4766552D15AE4d256Ad41B6cf2933482B0680dc',
  },
  [ASSET_NAME.BTC]: {
    id: ASSET_NAME.BTC.toLowerCase(),
    name: ASSET_NAME.BTC,
    decimals: 8,
    address: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
    oracle: '0x8e94C22142F4A64b99022ccDd994f4e9EC86E4B4',
  },
  [ASSET_NAME.ETH]: {
    id: ASSET_NAME.ETH.toLowerCase(),
    name: ASSET_NAME.ETH,
    decimals: 18,
    address: '0x74b23882a30290451a17c44f4f05243b6b58c76d',
    oracle: '0x11DdD3d147E5b83D01cee7070027092397d63658',
    isERC20: true,
  },
};
