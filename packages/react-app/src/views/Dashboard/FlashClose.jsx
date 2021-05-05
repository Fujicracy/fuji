import React, { useState } from "react";
import { Transactor, getVaultName } from "../../helpers";
import { DAI_ADDRESS, USDC_ADDRESS } from "../../constants";
import "./FlashClose.css";
import { parseUnits } from "@ethersproject/units";
//import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import CircularProgress from '@material-ui/core/CircularProgress';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';

async function getLiquidationProviderIndex(vaultName, contracts) {
  const providerIndex = {
    'aave': '0',
    'dydx': '1',
  };
  const { borrowAsset } = await contracts[vaultName].vAssets();
  const activeProvider = await contracts[vaultName].activeProvider();
  const dydxProviderAddr = contracts.ProviderDYDX.address;

  if ([DAI_ADDRESS, USDC_ADDRESS].includes(borrowAsset) && activeProvider !== dydxProviderAddr) {
    return providerIndex['dydx'];
  }
  return providerIndex['aave'];
}

function FlashClose({ borrowAsset, contracts, provider, address }) {
  const tx = Transactor(provider);

  const [dialog, setDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [amount, setAmount] = useState('');

  const decimals = borrowAsset === "USDC" ? 6 : 18;
  const onFlashClose = async () => {
    setLoading(true);
    const vaultName = getVaultName(borrowAsset);
    const providerIndex = await getLiquidationProviderIndex(vaultName, contracts);

    const res = await tx(
      contracts
      .Fliquidator
      .flashClose(
        parseUnits(amount, decimals),
        contracts[vaultName].address,
        providerIndex,
        { gasPrice: parseUnits("40", "gwei") }
      )
    );

    if (res && res.hash) {
      const receipt = await res.wait();
      if (receipt && receipt.events && receipt.events.find(e => e.event === "FlashClose")) {
        setConfirmation(true);
      }
    }
    setLoading(false);
    setAmount('');
  }

  return (
    <>
      <Dialog open={dialog} aria-labelledby="form-dialog-title">
        <div className="close" onClick={() => {
          setDialog(false);
          setAmount('');
        }}>
          <HighlightOffIcon />
        </div>
        <DialogTitle id="form-dialog-title">
          {confirmation ? "Success" : "Flash Close"}
        </DialogTitle>
        <DialogContent>{
          confirmation
            ? <DialogContentText>
                Your transaction have been processed.
              </DialogContentText>
            : <DialogContentText>
                You are about to repay your debt position with your collateral.
                We are going to use a flash loan for that purpose. <br/><br/>
                <span className="bold">Fee: 1%</span>
              </DialogContentText>
          }
        </DialogContent>
        <DialogActions>{
          confirmation
            ? <Button
                className="main-button"
                onClick={() => {
                  setDialog(false);
                  setConfirmation(false);
                }}
              >
                Close
              </Button>
            : <Button
                onClick={() => onFlashClose()}
                className="main-button"
                disabled={loading}
                startIcon={loading
                  ? <CircularProgress style={{ width: 25, height: 25, marginRight: "10px", color: "rgba(0, 0, 0, 0.26)" }} />
                  : ""}
              >
                {loading ? "Repaying..." : "Confirm"}
              </Button>
          }
        </DialogActions>
      </Dialog>
      <div className="flash-close">
        <div className="section-title">
          <h3>Flash Close</h3>
          <div className="tooltip-info">
            <InfoOutlinedIcon />
            <span className="tooltip">
              Repay your debt postion from your collateral by using a flash loan. Fee: 1%
            </span>
          </div>
        </div>

        <div className="content">
          <div className="description">
            Use a flash loan to repay your debt in a single transaction.
          </div>

          <div className="actions">
            <Button onClick={() => {
              setDialog(true);
              setAmount("-1");
            }}>
              Repay
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FlashClose;
