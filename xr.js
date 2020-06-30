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
  // console.log('secure event', e.data);
  const {packageAddress, credentials} = e.data;

  setInterval(async () => {
    navigator.xr.emit('paymentrequest', {
      address: packageAddress,
    }, response => {
      console.log('got payment reponse', response);
    });
  }, 1000);
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