const { Storage } = require('@google-cloud/storage');

const contractList = require("../src/contracts/contracts.js");

// The ID of GCS bucket
const bucketName = 'fuji-mainnet-eth';

// Creates a client
const storage = new Storage();

async function download(file) {
  try {
    await storage.bucket(bucketName)
      .file(`contracts/${file}`)
      .download({
        destination: `./src/contracts/${file}`
      });
    console.log(`Downloaded ${file} from bucket ${bucketName}`);
  } catch(e) {
    console.error(e.message);
  }
}

async function downloadContractsData() {
  for (let i = 0; i < contractList.length; i++) {
    const contractName = contractList[i];

    await download(`${contractName}.address.js`);
    await download(`${contractName}.abi.js`);
    await download(`${contractName}.bytecode.js`);
  }
}

downloadContractsData();
