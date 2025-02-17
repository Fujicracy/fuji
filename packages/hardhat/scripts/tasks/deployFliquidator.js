const { deploy, redeployIf, networkSuffix } = require("../utils");

const deployFliquidator = async () => {
  const name = "Fliquidator";
  const contractName = networkSuffix("Fliquidator");

  const deployed = await redeployIf(name, contractName, deploy);
  return deployed;
};

const deployF2Fliquidator = async () => {
  const name = "Fliquidator";
  const contractName = "F2Fliquidator";

  const deployed = await redeployIf(name, contractName, deploy);
  return deployed;
};

module.exports = {
  deployFliquidator,
  deployF2Fliquidator,
};
