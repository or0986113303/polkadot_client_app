// Required imports
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { CodePromise, ContractPromise ,BlueprintPromise } = require('@polkadot/api-contract');
// import { BlueprintPromise } from '@polkadot/api-contract';
const { Keyring } = require('@polkadot/keyring');
const testKeyring = require('@polkadot/keyring/testing');
const { randomAsU8a } = require('@polkadot/util-crypto');


const ALICEACCOUNT = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOBACCOUNT = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'

/*
let metadata = require('./metadata_2.json');

const codeHash = '0xe8a6cc3ab74b3457460766f7528edf0b7b98bd09250d92b599018c50f955cf4a'

const scAddress = '5E8hC2HTFBD2KiM6gyjv8exiZc17zSkabftdrG24VHnMnZQv';

*/

let metadata = require('./metadata.json');

const codeHash = '0xc98181ff82bea53094fff81d1d65a13aefbadd43a56177333fbf8197f7dd0a58'

const scAddress = '5D12uUGigzPefbc5nzoV2JRXj3MMnxCf1w8ZmPP1AKqimBas';

// maximum gas to be consumed for the instantiation. if limit is too small the instantiation will fail.
const gasLimit = 100000n * 1000000n
// a limit to how much Balance to be used to pay for the storage created by the instantiation
// if null is passed, unlimited balance can be used
const storageDepositLimit = null

const serial = '123456789'
// used to derive contract address, 
// use null to prevent duplicate contracts
const salt = new Uint8Array()

const AMOUNT = 1000

async function main () {  

  // Initialise the provider to connect to the local node
  const provider = new WsProvider('ws://10.123.12.111:9944');

  // Create the API and wait until ready
  const api = await ApiPromise.create({ provider });

  await api.isReady;

  console.log('//====== Start to call balance transmit api ======//')
  console.log(api.genesisHash.toHex());
  
  // The amount required to create a new account
  console.log(api.consts.balances.existentialDeposit.toNumber());

  // Retrieve the account balance & nonce via the system module
  const [now, { nonce, data: balance }] = await Promise.all([
    api.query.timestamp.now(),
    api.query.system.account(ALICEACCOUNT)
  ]);
  
  console.log(`${now}: balance of ${balance.free} and a nonce of ${nonce}`);
  
  const blueprint = new BlueprintPromise(api, metadata, codeHash);
  
  // const tx = blueprint.tx.default({ gasLimit, storageDepositLimit, salt });

  const keyring = new Keyring({ type: 'sr25519' });
  const alicePair = keyring.addFromUri('//Alice');

  // success to transfer
  const transfer = api.tx.balances.transfer(BOBACCOUNT, AMOUNT);
  const tradhash = await transfer.signAndSend(alicePair);

  console.log('hash code : ', tradhash.toHex())

  console.log('//====== Start to call contract rpc message ======//')

  const contract = new ContractPromise(api, metadata, scAddress);

  await contract.tx.registed({ storageDepositLimit, gasLimit }, serial)
    .signAndSend(alicePair, result => {
      if (result.status.isInBlock) {
        console.log('get() message finished');
      } else if (result.status.isFinalized) {
        console.log('finalized');
      }
    });

    var { gasRequired, storageDeposit, result, output } = await contract.query.registed(
      alicePair.address,
      {
        gasLimit,
        storageDepositLimit,
      },
      serial,
    );
    
  
    // check if the call was successful
    if (result.isOk) {
      // output the return value
      console.log('Success, return value : ', output.toHuman());
    } else {
      console.error('Error', result.asErr);
    }
  /*
  for ( i=0 ; i < 5 ; i++ ){
    await contract.tx.get({ storageDepositLimit, gasLimit })
    .signAndSend(alicePair, result => {
      if (result.status.isInBlock) {
        console.log('get() message finished');
      } else if (result.status.isFinalized) {
        console.log('finalized');
      }
    });

    // call flip api by message
    await contract.tx
            .flip({storageDepositLimit, gasLimit})
            .signAndSend(alicePair, result => {
              if (result.status.isInBlock) {
                console.log('flip() message finished');
              } else if (result.status.isFinalized) {
                console.log('finalized');
              }
            });
    
            var { gasRequired, storageDeposit, result, output } = await contract.query.get(
      alicePair.address,
      {
        gasLimit,
        storageDepositLimit,
      }
    );
    
  
    // check if the call was successful
    if (result.isOk) {
      // output the return value
      console.log('Success, return value : ', output.toHuman());
    } else {
      console.error('Error', result.asErr);
    }   
  }
  */

  console.log('//====== Start to get onchain information ======//')

  // Retrieve the current block header
  const lastHdr = await api.rpc.chain.getHeader();

  // Get a decorated api instance at a specific block
  const apiAt = await api.at(lastHdr.hash);

  // query the balance at this point of the chain
  const { data: { free } } = await apiAt.query.system.account(BOBACCOUNT);

  // Display the free balance
  console.log(`The current free is ${free.toString()}`);

  // Retrieve the hash & size of the entry as stored on-chain
  const [entryHash, entrySize] = await Promise.all([
    api.query.system.account.hash(ALICEACCOUNT),
    api.query.system.account.size(ALICEACCOUNT)
  ]);

  // Output the info
  console.log(`The current size is ${entrySize} bytes with a hash of ${entryHash}`);
  // Extract the info
  const { meta, method, section } = api.query.system.account;
  // Display some info on a specific entry
  console.log(`${section}.${method}: ${meta}`);
  console.log(`query key: ${api.query.system.account.key(ALICEACCOUNT)}`);
    
  // Retrieve the chain & node information information via rpc calls
  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version()
  ]);
}

main().catch(console.error).finally(() => process.exit());