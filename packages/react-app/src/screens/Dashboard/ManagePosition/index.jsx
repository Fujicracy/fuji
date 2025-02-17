import React, { useState, useEffect } from 'react';
import find from 'lodash/find';
import { useLocation, useHistory } from 'react-router-dom';
import ArrowBackIosOutlinedIcon from '@material-ui/icons/ArrowBackIosOutlined';
import { useMediaQuery } from 'react-responsive';
import { Flex } from 'rebass';
import { Grid } from '@material-ui/core';

import { BREAKPOINTS, BREAKPOINT_NAMES } from 'consts';
import { useAuth, useResources, useContractLoader, useContractReader } from 'hooks';
import {
  TransactionHistory,
  CollaterizationIndicator,
  ProvidersList,
  PositionElement,
  PositionActions,
  BlackBoxContainer,
  SectionTitle,
  NavBackLink,
} from 'components';

import FlashClose from '../FlashClose';
import DebtForm from '../DebtForm';
import CollateralForm from '../CollateralForm';
import SupplyAndBorrowForm from '../SupplyAndBorrowForm';
import RepayAndWithdrawForm from '../RepayAndWithdrawForm';

function ManagePosition() {
  const { address } = useAuth();
  const contracts = useContractLoader();
  const { vaults } = useResources();

  const history = useHistory();
  const queries = new URLSearchParams(useLocation().search);
  const vaultAddress = queries?.get('vaultAddress');

  const [vault, setVault] = useState();
  const [position, setPosition] = useState();

  const isMobile = useMediaQuery({ maxWidth: BREAKPOINTS[BREAKPOINT_NAMES.MOBILE].inNumber });
  const isTablet = useMediaQuery({
    minWidth: BREAKPOINTS[BREAKPOINT_NAMES.MOBILE].inNumber,
    maxWidth: BREAKPOINTS[BREAKPOINT_NAMES.TABLET].inNumber,
  });
  const actionsType = 'single';

  const debtBalance = useContractReader(contracts, 'FujiERC1155', 'balanceOf', [
    address,
    vault?.borrowId,
  ]);
  const collateralBalance = useContractReader(contracts, 'FujiERC1155', 'balanceOf', [
    address,
    vault?.collateralId,
  ]);

  useEffect(() => {
    function init() {
      const vaultName = find(
        Object.keys(contracts),
        name => contracts[name].address.toLowerCase() === vaultAddress?.toLowerCase(),
      );
      const v = find(vaults, key => key.name === vaultName);
      if (v) {
        setVault(v);
        const pos = { vault: v, vaultAddress, debtBalance, collateralBalance };
        setPosition(pos);
      } else {
        // if cannot find vault by address, go back to my-positions
        // reasons could be: wrong network, wrong vault address
        history.replace('my-positions');
      }
    }

    if (contracts) init();
  }, [vaultAddress, vault, vaults, contracts, collateralBalance, debtBalance, history]);

  return (
    <Flex flexDirection="column" alignItems="center" justifyContent="center">
      <Flex
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        maxWidth={isMobile ? '500px' : isTablet ? '800px' : '1200px'}
        margin={isMobile ? '32px auto' : isTablet ? '44px auto' : '72px auto'}
        padding="0 2rem"
      >
        <BlackBoxContainer hasBlackContainer={false} width={1} maxWidth="68rem">
          <NavBackLink to="my-positions">
            <ArrowBackIosOutlinedIcon style={{ fontSize: isMobile ? 16 : 18 }} />
            <SectionTitle marginLeft="8px" fontSize={isMobile ? '16px' : '18px'}>
              Back
            </SectionTitle>
          </NavBackLink>

          <Grid container spacing={isMobile ? 3 : isTablet ? 4 : 6}>
            {position && (
              <>
                <Grid item md={8} sm={12} xs={12}>
                  <BlackBoxContainer hasBlackContainer={false} ml={3} mb={3}>
                    <Grid container>
                      <Grid item xs={4}>
                        {' '}
                      </Grid>
                      <Grid item xs={8}>
                        <Flex width={1 / 1}>
                          <SectionTitle
                            fontSize={isMobile ? '10px' : isTablet ? '14px' : '16px'}
                            justifyContent="center"
                            alignItems="center"
                            width="30%"
                          >
                            <>Collateral</>
                          </SectionTitle>
                          <SectionTitle
                            fontSize={isMobile ? '10px' : isTablet ? '14px' : '16px'}
                            justifyContent="center"
                            alignItems="center"
                            width="30%"
                          >
                            <>Debt</>
                          </SectionTitle>
                          <SectionTitle
                            fontSize={isMobile ? '10px' : isTablet ? '14px' : '16px'}
                            justifyContent="center"
                            alignItems="center"
                            width="40%"
                          >
                            <>Health Factor</>
                          </SectionTitle>
                        </Flex>
                      </Grid>
                    </Grid>
                  </BlackBoxContainer>
                  {/* <span className="empty-button" /> */}
                  <BlackBoxContainer
                    hasBlackContainer
                    noBottomBorderRadius
                    noBottomBorder
                    padding="12px 0px 12px 28px"
                  >
                    <PositionElement actionType={PositionActions.None} position={position} />
                  </BlackBoxContainer>
                  <BlackBoxContainer hasBlackContainer padding="28px" noTopBorderRadius>
                    <form noValidate>
                      <Grid container spacing={4}>
                        <Grid item md={6} xs={12}>
                          {actionsType === 'single' ? (
                            <CollateralForm position={position} />
                          ) : (
                            <SupplyAndBorrowForm position={position} />
                          )}
                        </Grid>
                        <Grid item md={6} xs={12}>
                          {actionsType === 'single' ? (
                            <DebtForm position={position} />
                          ) : (
                            <RepayAndWithdrawForm position={position} />
                          )}
                        </Grid>
                      </Grid>
                    </form>
                  </BlackBoxContainer>
                  {!isMobile && !isTablet && <FlashClose position={position} />}
                </Grid>
                <Grid item md={4} sm={12} xs={12}>
                  <Grid container direction="column" spacing={isMobile ? 4 : 6}>
                    <Grid item>
                      <CollaterizationIndicator position={position} />
                    </Grid>
                    {!isMobile && !isTablet && (
                      <Grid item>
                        <ProvidersList markets={[vault?.borrowAsset.name]} isSelectable={false} />
                      </Grid>
                    )}
                  </Grid>
                </Grid>
                {(isMobile || isTablet) && (
                  <Grid item md={4} sm={12} xs={12}>
                    <FlashClose position={position} />
                  </Grid>
                )}
              </>
            )}
          </Grid>
          <TransactionHistory vaultName={vault?.name} />
        </BlackBoxContainer>
      </Flex>
    </Flex>
  );
}

export default ManagePosition;
