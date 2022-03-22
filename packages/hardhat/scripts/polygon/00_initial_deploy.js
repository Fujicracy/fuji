const chalk = require("chalk");
const ora = require("ora");
const { deployController } = require("../tasks/deployController");
const { deployFlasher } = require("../tasks/deployFlasher");
const { deployFliquidator } = require("../tasks/deployFliquidator");
const { deployFujiAdmin } = require("../tasks/deployFujiAdmin");
const { deployFujiERC1155 } = require("../tasks/deployFujiERC1155");
const { deployFujiOracle } = require("../tasks/deployFujiOracle");
const { deployProvider } = require("../tasks/deployProvider");
const { deploySwapper } = require("../tasks/deploySwapper");
const { deployVault } = require("../tasks/deployVault");
const { deployVaultHarvester } = require("../tasks/deployVaultHarvester");
const { updateController } = require("../tasks/updateController");
const { updateFlasher } = require("../tasks/updateFlasher");
const { updateFujiAdmin } = require("../tasks/updateFujiAdmin");
const { updateFujiERC1155 } = require("../tasks/updateFujiERC1155");
const { updateFujiFliquidator } = require("../tasks/updateFujiFliquidator");
const { updateVault } = require("../tasks/updateVault");
const { setDeploymentsPath, network } = require("../utils");
const { ASSETS, QUICK_ROUTER_ADDR } = require("./consts");

global.progressPrefix = __filename.split("/").pop();
global.progress = ora().start(progressPrefix + ": Starting...");
global.console.log = (...args) => {
  progress.text = `${progressPrefix}: ${args.join(" ")}`;
}

const deployContracts = async () => {
  console.log("📡 Deploying...");

  const treasury = "0x40578F7902304e0e34d7069Fb487ee57F841342e";
  // Functional Contracts
  const fujiadmin = await deployFujiAdmin();
  const fliquidator = await deployFliquidator();
  const flasher = await deployFlasher();
  const controller = await deployController();
  const f1155 = await deployFujiERC1155();
  const oracle = await deployFujiOracle([
    Object.values(ASSETS).map((asset) => asset.address),
    Object.values(ASSETS).map((asset) => asset.oracle),
  ]);

  // Provider Contracts
  const aaveMATIC = await deployProvider("ProviderAaveMATIC");
  const kashi = await deployProvider("ProviderKashi");
  const wePiggy = await deployProvider("ProviderWePiggy");

  // Deploy Core Money Handling Contracts
  // const vaultharvester = await deployVaultHarvester();
  const swapper = await deploySwapper();

  const vaultdai = await deployVault("VaultMATICDAI", [
    fujiadmin,
    oracle,
    ASSETS.MATIC.address,
    ASSETS.DAI.address,
  ]);
  const vaultusdc = await deployVault("VaultMATICUSDC", [
    fujiadmin,
    oracle,
    ASSETS.MATIC.address,
    ASSETS.USDC.address,
  ]);

  // General Plug-ins and Set-up Transactions
  await updateFujiAdmin(fujiadmin, {
    flasher,
    fliquidator,
    treasury,
    controller,
    // vaultharvester,
    swapper,
  });

  await updateFujiFliquidator(fliquidator, {
    fujiadmin,
    oracle,
    swapper: QUICK_ROUTER_ADDR,
  });
  await updateFlasher(flasher, fujiadmin);
  await updateController(controller, fujiadmin);
  await updateFujiERC1155(f1155, [vaultdai, vaultusdc, fliquidator]);

  // Vault Set-up
  await updateVault("VaultMATICDAI", vaultdai, {
    providers: [aaveMATIC, kashi, wePiggy],
    fujiadmin,
    f1155,
  });
  await updateVault("VaultMATICUSDC", vaultusdc, {
    providers: [aaveMATIC, kashi, wePiggy],
    fujiadmin,
    f1155,
  });

  progress.succeed(progressPrefix);
};

const main = async () => {
  if (network !== "polygon") {
    throw new Error("Please set 'NETWORK=polygon' in ./packages/hardhat/.env");
  }

  await setDeploymentsPath("core");
  await deployContracts();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(chalk.red(`\n${error}\n`));
    process.exit(1);
  });
