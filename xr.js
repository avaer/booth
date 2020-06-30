import * as THREE from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {TextMesh} from './textmesh-standalone.esm.js'
import {makeCredentials, executeTransaction, executeScript} from 'https://flow.webaverse.com/flow.js';

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setClearColor(new THREE.Color(0x000000), 0);
// renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
// renderer.gammaFactor = 1;
renderer.xr.enabled = true;

const scene = new THREE.Scene();
// scene.background = new THREE.Color(0xCCCCCC);

const camera = new THREE.PerspectiveCamera();

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 3);
directionalLight.position.set(2, 2, 2);
scene.add(directionalLight);
const directionalLight2 = new THREE.DirectionalLight(0xFFFFFF, 3);
directionalLight2.position.set(0, 1, -1);
scene.add(directionalLight2);
const ambientLight = new THREE.AmbientLight(0x808080);
scene.add(ambientLight);

const booth = (() => {
  const object = new THREE.Object3D();

  new GLTFLoader().load('booth.glb', o => {
    o = o.scene;
    object.add(o);
  }, function onProgress() {
    // nothing
  }, err => {
    console.warn(err);
  });

  return object;
})();
scene.add(booth);

renderer.setAnimationLoop(render);
function render() {
  renderer.render(scene, camera);
}

navigator.xr.addEventListener('secure', async e => {
  console.log('got user contract address', e.data);
  /* const {packageAddress, credentials} = e.data;

  await executeTransaction(credentials, `
    // Transaction2.cdc

    import FungibleToken from 0x${packageAddress}

    // This transaction configures an account to store and receive tokens defined by
    // the FungibleToken contract.
    transaction {
      prepare(acct: AuthAccount) {
        // Store the vault in the account storage
        let vaultRef = acct.borrow<&FungibleToken.Vault>(from: /storage/MainVault)
        if (vaultRef == nil) {
          // Create a new empty Vault object
          let vaultA <- FungibleToken.createEmptyVault()
          acct.save<@FungibleToken.Vault>(<-vaultA, to: /storage/MainVault)
        }

        log("Empty Vault stored")

        // Create a public Receiver capability to the Vault
        let ReceiverRef = acct.link<&FungibleToken.Vault{FungibleToken.Receiver, FungibleToken.Balance}>(/public/MainReceiver, target: /storage/MainVault)

        log("References created")
      }

        post {
            // Check that the capabilities were created correctly
            getAccount(0x${credentials.address}).getCapability(/public/MainReceiver)!
                            .check<&FungibleToken.Vault{FungibleToken.Receiver}>():  
                            "Vault Receiver Reference was not created correctly"
        }
    }
  `);
  setInterval(async () => {
    const result = await executeScript(`
      import FungibleToken from 0x${packageAddress}

      pub fun main() : UFix64 {
        let publicAccount = getAccount(0x${credentials.address})
        let capability = publicAccount.getCapability(/public/MainReceiver)!
        let vaultRef = capability.borrow<&FungibleToken.Vault{FungibleToken.Receiver, FungibleToken.Balance}>()!
        return vaultRef.balance
      }
    `);
    const crd = parseFloat(result.encodedData.value);
    console.log('got result', crd, result);
    card.creditTextMesh.text = `${crd} CRD`;
    card.creditTextMesh.sync();
  }, 1000); */
});

{
  let currentSession = null;

  function onSessionStarted( session ) {
    session.addEventListener( 'end', onSessionEnded);
    renderer.xr.setSession(session);
    currentSession = session;
  }

  function onSessionEnded(/*event*/) {
    currentSession.removeEventListener('end', onSessionEnded);
    currentSession = null;
  }
  
  const sessionInit = {optionalFeatures: ['local-floor', 'bounded-floor']};
  navigator.xr && navigator.xr.requestSession('immersive-vr', sessionInit ).then( onSessionStarted);
}