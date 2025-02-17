import React, { useState } from 'react';
import { parseUnits } from '@ethersproject/units';
// import TextField from '@material-ui/core/TextField';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
} from '@material-ui/core';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import {
  ASSET_NAME,
  PROVIDER_TYPE,
  PROVIDERS,
  BREAKPOINTS,
  BREAKPOINT_NAMES,
  CHAIN_NAMES,
} from 'consts';
import { Transactor, GasEstimator } from 'helpers';
import { useMediaQuery } from 'react-responsive';

import { useAuth, useContractLoader } from 'hooks';

import { Flex } from 'rebass';
import { SectionTitle, Tooltip, Button } from 'components';

import { FlashCloseContainer, RepayButton, Description } from './styles';

const providerIndexes = {
  AAVE: '0', // on fantom it's Geist
  DYDX: '1',
  CREAM: '2',
  BALANCER: '3',
  AAVEV3: '4',
};

async function getProviderIndex(vault, contracts, networkName) {
  const activeProvider = await contracts[vault.name].activeProvider();

  let index = providerIndexes.BALANCER;

  if (networkName === CHAIN_NAMES.ETHEREUM) {
    const ibank = PROVIDERS[PROVIDER_TYPE.IRONBANK].name;
    const ibankAddr = contracts[ibank].address;
    if (
      [ASSET_NAME[networkName].DAI, ASSET_NAME[networkName].USDC].includes(vault.borrowAsset.name)
    ) {
      index = providerIndexes.DYDX;
    } else if (activeProvider.toLowerCase() !== ibankAddr) {
      index = providerIndexes.CREAM;
    }
  } else if (networkName === CHAIN_NAMES.FANTOM) {
    index = providerIndexes.AAVE;
  } else if (networkName === CHAIN_NAMES.POLYGON) {
    index = providerIndexes.BALANCER;
  } else if (networkName === CHAIN_NAMES.ARBITRUM) {
    index = providerIndexes.BALANCER;
  }

  return index;
}

function FlashClose({ position }) {
  const { provider, networkName } = useAuth();
  const contracts = useContractLoader();

  const tx = Transactor(provider);

  const [dialog, setDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [amount, setAmount] = useState('');

  const isMobile = useMediaQuery({ maxWidth: BREAKPOINTS[BREAKPOINT_NAMES.MOBILE].inNumber });
  const isTablet = useMediaQuery({
    minWidth: BREAKPOINTS[BREAKPOINT_NAMES.MOBILE].inNumber,
    maxWidth: BREAKPOINTS[BREAKPOINT_NAMES.TABLET].inNumber,
  });

  const vault = position.vault;

  const decimals = vault.borrowAsset.decimals;
  const onFlashClose = async () => {
    setLoading(true);
    const providerIndex = await getProviderIndex(vault, contracts, networkName);
    const { Fliquidator } = contracts;

    const gasLimit = await GasEstimator(Fliquidator, 'flashClose', [
      parseUnits(amount, decimals),
      position.vaultAddress,
      providerIndex,
    ]);
    const res = await tx(
      Fliquidator.flashClose(parseUnits(amount, decimals), position.vaultAddress, providerIndex, {
        gasLimit,
      }),
    );

    if (res && res.hash) {
      const receipt = await res.wait();
      if (receipt && receipt.events && receipt.events.find(e => e.event === 'FlashClose')) {
        setConfirmation(true);
      }
    }
    setLoading(false);
    setAmount('');
  };

  return (
    <>
      <Dialog open={dialog} aria-labelledby="form-dialog-title">
        <div
          className="close"
          onClick={() => {
            setDialog(false);
            setAmount('');
          }}
        >
          <HighlightOffIcon />
        </div>
        <DialogTitle id="form-dialog-title">{confirmation ? 'Success' : 'Flash Close'}</DialogTitle>
        <DialogContent>
          {confirmation ? (
            <DialogContentText>Your transaction has been processed.</DialogContentText>
          ) : (
            <DialogContentText>
              You are about to repay your debt by selling part of your collateral. We are going to
              use a flash loan for that purpose. <br />
              <br />
              <span className="bold">Fee: 1%</span>
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          {confirmation ? (
            <Button
              block
              onClick={() => {
                setDialog(false);
                setConfirmation(false);
              }}
            >
              Close
            </Button>
          ) : (
            <Button
              onClick={() => onFlashClose()}
              block
              height={44}
              borderRadius={8}
              fontWeight={600}
              disabled={loading}
            >
              <Flex flexDirection="row" justifyContent="center" alignItems="center">
                {loading && (
                  <CircularProgress
                    style={{
                      width: 25,
                      height: 25,
                      marginRight: '10px',
                      color: 'rgba(0, 0, 0, 0.26)',
                    }}
                  />
                )}
                {loading ? 'Repaying...' : 'Repay'}
              </Flex>
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <FlashCloseContainer>
        <Flex mb="0.5rem">
          <SectionTitle fontSize={isMobile ? '16px' : isTablet ? '20px' : '16px'}>
            Flash Close
          </SectionTitle>
          {!isMobile && !isTablet && (
            <Tooltip>
              <InfoOutlinedIcon />
              <span>
                Repay your debt position from your collateral by using a flash loan. Fee: 1%
              </span>
            </Tooltip>
          )}
        </Flex>

        <Flex alignItems="center" justifyContent="space-between" mt="1rem">
          <Description>Use a flash loan to repay your debt in a single transaction.</Description>

          <Flex>
            <RepayButton
              onClick={() => {
                setDialog(true);
                setAmount('-1');
              }}
            >
              Repay
            </RepayButton>
          </Flex>
        </Flex>
      </FlashCloseContainer>
    </>
  );
}

export default FlashClose;
