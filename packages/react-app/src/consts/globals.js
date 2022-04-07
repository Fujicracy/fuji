const DEPLOYMENT_TYPES = {
  CORE: 'core',
  FUSE: 'fuse',
};

const ETH_CAP_VALUE = process.env.REACT_APP_ETH_CAP_VALUE || 2;

const APP_URL = process.env.REACT_APP_APP_URL || 'http://localhost:3000';
const LANDING_URL = process.env.REACT_APP_LANDING_URL || 'http://localhost:3000';
const API_BASE_URI =
  process.env.REACT_APP_API_BASE_URI || 'https://fuji-api-dot-fuji-306908.ey.r.appspot.com';
const INFURA_ID = process.env.REACT_APP_INFURA_ID;
const BLOCKNATIVE_KEY = process.env.REACT_APP_BLOCKNATIVE_KEY;
const DEPLOYMENT = process.env.REACT_APP_DEPLOYMENT || DEPLOYMENT_TYPES.CORE;

const MERKLE_DIST_ADDR = '0x51407A073fb7C703185f47c3FBB1B915678221b8';
const FUJIFLOPS_NFT_ADDR = '0x376C0AA9150095cB36AdcD472bE390D31C6BeF8F';

const TRANSACTION_ACTIONS = {
  ALL: 'All',
  DEPOSIT: 'Deposit',
  BORROW: 'Borrow',
  PAYBACK: 'Payback',
  WITHDRAW: 'Withdraw',
  LIQUIDATION: 'Liquidation',
};
const TRANSACTION_TYPES = Object.keys(TRANSACTION_ACTIONS).map(key => TRANSACTION_ACTIONS[key]);

export {
  APP_URL,
  LANDING_URL,
  API_BASE_URI,
  INFURA_ID,
  BLOCKNATIVE_KEY,
  DEPLOYMENT,
  DEPLOYMENT_TYPES,
  ETH_CAP_VALUE,
  MERKLE_DIST_ADDR,
  FUJIFLOPS_NFT_ADDR,
  TRANSACTION_ACTIONS,
  TRANSACTION_TYPES,
};
