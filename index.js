const { coreLogic } = require('./coreLogic');
const { app } = require('./init');
const {
  namespaceWrapper,
  taskNodeAdministered,
} = require('./namespaceWrapper');
const axios = require('axios');
const { Connection, PublicKey } = require('@_koii/web3.js');


/**
 * setup
 * @description sets up the task node, particularly the inter-process communication to start and stop the task
 * @returns {void}
 */
async function setup() {
  console.log('setup function called');
  // Run default setup
  await namespaceWrapper.defaultTaskSetup();
  process.on('message', m => {
    console.log('CHILD got message:', m);
    if (m.functionCall == 'submitPayload') {
      console.log('submitPayload called');
      coreLogic.submitTask(m.roundNumber);
    } else if (m.functionCall == 'auditPayload') {
      console.log('auditPayload called');
      coreLogic.auditTask(m.roundNumber);
    } else if (m.functionCall == 'executeTask') {
      console.log('executeTask called');
      coreLogic.task(m.roundNumber);
    } else if (m.functionCall == 'generateAndSubmitDistributionList') {
      console.log('generateAndSubmitDistributionList called');
      coreLogic.selectAndGenerateDistributionList(m.roundNumber, m.isPreviousRoundFailed);
    } else if (m.functionCall == 'distributionListAudit') {
      console.log('distributionListAudit called');
      coreLogic.auditDistribution(m.roundNumber, m.isPreviousRoundFailed);
    }
  });

}

if (taskNodeAdministered) {
  setup();
}

if (app) {
  //  Write your Express Endpoints here.
  //  For Example
  //  app.post('/accept-cid', async (req, res) => {})

  // Sample API that return your task state

  app.get('/taskState', async (req, res) => {
    const state = await namespaceWrapper.getTaskState();
    console.log('TASK STATE', state);

    res.status(200).json({ taskState: state });
  });

  app.get('/json', async(req, res) => {
    // const state = await namespaceWrapper.getTaskState();
    // const { task_metadata } = state;
    // const response = await axios.get(`https://ipfs-gateway.koii.live/ipfs/${task_metadata}/dataList.json`);
    // res.status(200).json({ data: response.data });

    const connection = new Connection('https://testnet.koii.network');
    const taskId = '4fDiLR99vCZSrxwLpCesSpCvavfeV4evFdLUx9XHpbyd';
    const accountInfo = await connection.getAccountInfo(new PublicKey(taskId));
    if (!accountInfo) {
      console.log(`${taskId} doesn't contain any distribution list data`);
      return null;
    }

    const data = JSON.parse(accountInfo.data.toString());
    const submissions = Object.values(data.submissions).map(item => Object.values(item)[0].submission_value);

    const response = await axios.get(`https://ipfs-gateway.koii.live/ipfs/${submissions[0]}/dataList.json`);
    res.status(200).json({ data: response.data });

  })

  app.use('/api/', require('./routes') );

}
