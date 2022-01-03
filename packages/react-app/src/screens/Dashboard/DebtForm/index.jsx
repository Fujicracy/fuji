import React, { useEffect, useState } from 'react';
import { formatUnits, parseUnits } from '@ethersproject/units';
import { BigNumber } from '@ethersproject/bignumber';
import { useForm } from 'react-hook-form';
import { useMediaQuery } from 'react-responsive';

import {
  Grid,
  Typography,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContentText,
  DialogContent,
  DialogTitle,
  CircularProgress,
} from '@material-ui/core';

import { InfoOutlined, HighlightOff } from '@material-ui/icons';
import { BREAKPOINTS, BREAKPOINT_NAMES } from 'consts';
import { Flex } from 'rebass';

import {
  useContractReader,
  useExchangePrice,
  useBalance,
  useAllowance,
  useAuth,
  useContractLoader,
} from 'hooks';

import {
  TextInput,
  Label,
  SectionTitle,
  Tooltip,
  IntenseSpan,
  Button,
  ToggleSwitch,
  MaxButton,
} from 'components';

import { Transactor, GasEstimator } from '../../../helpers';

import DeltaPositionRatios from '../DeltaPositionRatios';

const Action = {
  Repay: 0,
  Borrow: 1,
};

function DebtForm({ position }) {
  const { address, provider } = useAuth();
  const contracts = useContractLoader();

  const { register, errors, setValue, handleSubmit, clearErrors } = useForm({ mode: 'onChange' });
  const tx = Transactor(provider);

  const [action, setAction] = useState(Action.Repay);
  const [focus, setFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [leftToBorrow, setLeftToBorrow] = useState('');
  const [dialog, setDialog] = useState({ step: null, withApproval: false });

  const { vaultAddress, vault } = position;
  const { collateralAsset, borrowAsset } = vault;
  const { decimals } = vault.borrowAsset;

  const borrowPrice = useExchangePrice(borrowAsset);
  const collateralPrice = useExchangePrice(collateralAsset);

  const unFormattedBalance = useBalance(
    provider,
    address,
    contracts,
    borrowAsset.name,
    borrowAsset.isERC20,
    1000,
  );

  const balance = unFormattedBalance
    ? Number(formatUnits(unFormattedBalance, decimals)).toFixed(6)
    : null;

  const allowance = useAllowance(contracts, borrowAsset, [address, vaultAddress]);

  const debtBalance = useContractReader(contracts, 'FujiERC1155', 'balanceOf', [
    address,
    vault.borrowId,
  ]);
  const collateralBalance = useContractReader(contracts, 'FujiERC1155', 'balanceOf', [
    address,
    vault.collateralId,
  ]);

  const neededCollateral = useContractReader(contracts, vault.name, 'getNeededCollateralFor', [
    debtBalance || '0',
    'true',
  ]);

  const isMobile = useMediaQuery({ maxWidth: BREAKPOINTS[BREAKPOINT_NAMES.MOBILE].inNumber });
  const isTablet = useMediaQuery({
    minWidth: BREAKPOINTS[BREAKPOINT_NAMES.MOBILE].inNumber,
    maxWidth: BREAKPOINTS[BREAKPOINT_NAMES.TABLET].inNumber,
  });

  useEffect(() => {
    if (neededCollateral && collateralBalance) {
      const colDecimals = collateralAsset.decimals;
      const diff = Number(formatUnits(collateralBalance.sub(neededCollateral), colDecimals));
      const left = (diff / 1.35 / borrowPrice) * collateralPrice;
      setLeftToBorrow(left.toFixed(6));
    }
  }, [neededCollateral, collateralBalance, borrowPrice, collateralPrice, collateralAsset]);

  const borrow = async () => {
    const gasLimit = await GasEstimator(contracts[vault.name], 'borrow', [
      parseUnits(amount, decimals),
    ]);
    const res = await tx(
      contracts[vault.name].borrow(parseUnits(amount, decimals), {
        gasLimit,
      }),
    );

    if (res && res.hash) {
      const receipt = await res.wait();
      if (receipt && receipt.events && receipt.events.find(e => e.event === 'Borrow')) {
        setDialog({ step: 'success', withApproval: false });
      }
    } else {
      // error
      setDialog({ step: null, withApproval: false });
    }
    setLoading(false);
  };

  const payback = async withApproval => {
    setDialog({ step: 'repaying', withApproval });
    // if amount is equal debt, user repays their whole debt (-1)

    // let unFormattedAmount = parseUnits(amount, decimals).eq(debtBalance) ? '-1' : amount;

    // another check when user wants to repay max
    // pass just the max amount of their balance and no -1
    // because they probably don't have to repay the accrued interest

    // TODO ask Boyan
    const unFormattedAmount =
      parseUnits(amount, decimals).eq(debtBalance) && debtBalance.eq(unFormattedBalance)
        ? formatUnits(unFormattedBalance, decimals)
        : amount;

    const gasLimit = await GasEstimator(contracts[vault.name], 'payback', [
      parseUnits(unFormattedAmount, decimals),
      { value: borrowAsset.isERC20 ? 0 : parseUnits(unFormattedAmount, decimals) },
    ]);

    const res = await tx(
      contracts[vault.name].payback(parseUnits(unFormattedAmount, decimals), {
        value: borrowAsset.isERC20 ? 0 : parseUnits(unFormattedAmount, decimals),
        gasLimit,
      }),
    );

    if (res && res.hash) {
      const receipt = await res.wait();
      if (receipt && receipt.events && receipt.events.find(e => e.event === 'Payback')) {
        setDialog({ step: 'success', withApproval });
      }
    } else {
      // error
      setDialog({ step: null, withApproval: false });
    }
    setLoading(false);
  };

  const approve = async infiniteApproval => {
    let unFormattedAmount = amount;
    // when repaying max debt, amount needs to be scaled by 2%
    // so that user approves a bit more in order to account for
    // the accrued interest
    // TODO add message to inform user
    if (parseUnits(amount, decimals).eq(debtBalance)) {
      unFormattedAmount = (Number(amount) * 1.02).toFixed(6);
    }

    const base = BigNumber.from(2);
    const e = BigNumber.from(256);
    const approveAmount = infiniteApproval
      ? base.pow(e).sub(1)
      : parseUnits(unFormattedAmount, decimals);
    setDialog({ step: 'approvalPending', withApproval: true });
    const res = await tx(
      contracts[borrowAsset.name].approve(
        contracts[vault.name].address,
        BigNumber.from(approveAmount),
      ),
    );

    if (res && res.hash) {
      const receipt = await res.wait();
      if (receipt && receipt.events && receipt.events.find(ev => ev.event === 'Approval')) {
        payback(true);
      }
    } else {
      // error
      setDialog({ step: null, withApproval: false });
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    if (action === Action.Repay) {
      if (borrowAsset.isERC20) {
        if (parseUnits(amount, decimals).gt(allowance)) {
          setDialog({ step: 'approval', withApproval: true });
        } else {
          payback(false);
        }
      } else {
        payback(false);
      }
    } else {
      borrow();
    }
  };

  const onConfirmation = () => {
    setDialog({ step: 'deltaRatios', withApproval: false });
  };

  const dialogContents = {
    deltaRatios: {
      title: 'Postion Ratio Changes',
      content: (
        <DeltaPositionRatios
          vault={vault}
          currentCollateral={collateralBalance}
          currentDebt={debtBalance}
          newCollateral={collateralBalance}
          newDebt={
            !debtBalance || !amount
              ? 0
              : action === Action.Repay
              ? debtBalance.sub(parseUnits(amount, decimals))
              : debtBalance.add(parseUnits(amount, decimals))
          }
        />
      ),
      actions: () => (
        <DialogActions>
          <Button
            onClick={() => {
              setDialog({ step: null, withApproval: false });
              onSubmit();
            }}
            block
            noResizeOnResponsive
          >
            Confirm
          </Button>
        </DialogActions>
      ),
    },
    approval: {
      title: 'Approving... 1 of 2',
      content: <DialogContentText>You need first to approve a spending limit.</DialogContentText>,
      actions: () => (
        <DialogActions>
          <Button onClick={() => approve(false)} block noResizeOnResponsive>
            Approve {Number(amount).toFixed(0)} {borrowAsset.name}
          </Button>
          <Button onClick={() => approve(true)} block noResizeOnResponsive>
            Infinite Approve
          </Button>
        </DialogActions>
      ),
    },
    success: {
      title: 'Transaction successful',
      content: (
        <DialogContentText>
          You have successfully {action === Action.Repay ? 'repay' : 'borrow'}ed {amount}{' '}
          {borrowAsset.name}.
        </DialogContentText>
      ),
      actions: () => (
        <DialogActions>
          <Button
            onClick={() => {
              setDialog({ step: null, withApproval: false });
              setAmount('');
              setValue('amount', '', { shouldValidate: false });
            }}
            block
            noResizeOnResponsive
          >
            Close
          </Button>
        </DialogActions>
      ),
    },
  };

  const getBtnContent = () => {
    if (action === Action.Repay) {
      if (!loading) {
        return 'Repay';
      }

      if (dialog.step === 'approvalPending') {
        return 'Approving... 1 of 2';
      }
      if (dialog.step === 'repaying') {
        return `Repaying... ${dialog.withApproval ? '2 of 2' : ''}`;
      }
    }

    return loading ? 'Borrowing...' : 'Borrow';
  };

  return (
    <Grid container direction="column">
      <Dialog
        open={['approval', 'success', 'deltaRatios'].includes(dialog.step)}
        aria-labelledby="form-dialog-title"
      >
        <div
          className="close"
          onClick={() => {
            setDialog({ step: null, withApproval: false });
            setValue('amount', '', { shouldValidate: false });
            setLoading(false);
          }}
        >
          <HighlightOff />
        </div>
        <DialogTitle id="form-dialog-title">{dialogContents[dialog.step]?.title}</DialogTitle>
        <DialogContent>{dialogContents[dialog.step]?.content}</DialogContent>
        {dialogContents[dialog.step]?.actions()}
      </Dialog>
      <Grid item className="section-title">
        <SectionTitle fontSize={isMobile ? '16px' : '20px'}>Debt</SectionTitle>

        {!isMobile && !isTablet && (
          <Tooltip>
            <InfoOutlined />
            <span>
              <IntenseSpan>Repay</IntenseSpan> {borrowAsset.name} from your wallet balance or
              <IntenseSpan> borrow</IntenseSpan> more from it against your free collateral.
            </span>
          </Tooltip>
        )}
      </Grid>
      <Grid item>
        {/* <Grid item className="toggle-button"> */}
        {/* <div className="button">
          <input
            onChange={({ target }) => setAction(target.checked ? Action.Borrow : Action.Repay)}
            type="checkbox"
            className="checkbox"
          />
          <div className="knobs">
            <span className="toggle-options" data-toggle="Borrow">
              <span>Repay</span>
            </span>
          </div>
          <div className="layer" />
        </div> */}

        <ToggleSwitch
          firstOption="Repay"
          secondOption="Borrow"
          onSwitch={selected => setAction(selected === 'Repay' ? Action.Repay : Action.Borrow)}
          mb="1.5rem"
        />
      </Grid>

      <Grid item>
        <TextInput
          id="debtAmount"
          name="amount"
          type="number"
          step="any"
          onChange={value => setAmount(value)}
          onFocus={() => setFocus(true)}
          onBlur={() => clearErrors()}
          ref={register({
            required: { value: true, message: 'insufficient-amount' },
            min: { value: 0, message: 'insufficient-amount' },
            max: {
              value: action === Action.Repay ? balance : leftToBorrow,
              message: 'insufficient-balance',
            },
          })}
          subTitle={action === Action.Repay ? 'Available to repay:' : 'Available to borrow:'}
          subTitleInfo={
            action === Action.Repay
              ? `${balance ? Number(balance).toFixed(2) : '...'} ${borrowAsset.name}`
              : `${leftToBorrow ? Number(leftToBorrow).toFixed(3) : '...'} ${borrowAsset.name}`
          }
          startAdornmentImage={borrowAsset.icon}
          endAdornment={{
            type: 'component',
            component: (
              <InputAdornment position="end">
                {focus && (
                  <MaxButton
                    onClick={() => {
                      const debt = formatUnits(debtBalance, decimals);
                      const maxRepay = Number(debt) > Number(balance) ? balance : debt;

                      setAmount(action === Action.Repay ? maxRepay : leftToBorrow);
                      setValue('amount', action === Action.Repay ? maxRepay : leftToBorrow, {
                        shouldValidate: true,
                        shouldDirty: true,
                      });
                    }}
                  >
                    max
                  </MaxButton>
                )}
                <Label>{borrowAsset.name}</Label>
              </InputAdornment>
            ),
          }}
          errorComponent={
            errors?.amount?.message === 'insufficient-amount' ? (
              <Typography className="error-input-msg" variant="body2">
                Please, type the amount you like to {action === Action.Repay ? 'repay' : 'borrow'}
              </Typography>
            ) : errors?.amount?.message === 'insufficient-balance' && action === Action.Repay ? (
              <Typography className="error-input-msg" variant="body2">
                Insufficient {borrowAsset.name} balance
              </Typography>
            ) : (
              errors?.amount?.message === 'insufficient-balance' &&
              action === Action.Borrow && (
                <Typography className="error-input-msg" variant="body2">
                  You can borrow max. {leftToBorrow} {borrowAsset.name}. Provide more collateral!
                </Typography>
              )
            )
          }
        />
      </Grid>
      <Grid item>
        <Button onClick={handleSubmit(onConfirmation)} block fontWeight={600} disabled={loading}>
          <Flex flexDirection="row" justifyContent="center" alignItems="center">
            {loading && (
              <CircularProgress
                style={{
                  width: 25,
                  height: 25,
                  marginRight: '16px',
                  color: 'rgba(0, 0, 0, 0.26)',
                }}
              />
            )}
            {getBtnContent()}
          </Flex>
        </Button>
      </Grid>
    </Grid>
  );
}

export default DebtForm;
