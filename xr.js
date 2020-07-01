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

const _makeTextMesh = (text, fontSize, anchorX, anchorY) => {
  const textMesh = new TextMesh();
  textMesh.text = text;
  textMesh.font = './GeosansLight.ttf';
  textMesh.fontSize = fontSize;
  // textMesh.position.set(0, 1, -2);
  textMesh.color = 0xFFFFFF;
  textMesh.anchorX = anchorX;
  textMesh.anchorY = anchorY;
  textMesh.frustumCulled = false;
  textMesh.sync();
  return textMesh;
};

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

  const button = new THREE.Mesh(new THREE.PlaneBufferGeometry(0.5, 0.3), new THREE.MeshBasicMaterial({
    color: 0xef5350,
    side: THREE.DoubleSide,
  }));
  const textMesh = _makeTextMesh('Buy', 0.15, 'center', 'middle');
  textMesh.position.z = 0.01;
  button.add(textMesh);
  button.position.y = 1;
  object.add(button);
  object.button = button;

  return object;
})();
scene.add(booth);

const ray = new THREE.Mesh(
  new THREE.CylinderBufferGeometry(0.01, 0.01, 10, 3, 1)
    .applyMatrix4(new THREE.Matrix4().makeTranslation(0, 10/2, 0))
    .applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI/2))),
  new THREE.MeshBasicMaterial({
    color: 0x64b5f6,
  })
);
ray.frustumCulled = false;
scene.add(ray);

const raycaster = new THREE.Raycaster();
let lastClicked = false;
renderer.setAnimationLoop(render);
function render(timestamp, frame) {
  if (currentSession) {
    const vrCamera = renderer.xr.getCamera(camera);
    if (vrCamera.cameras.length >= 2) {
      // vrCamera.cameras[0].matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
      camera.matrix.copy(vrCamera.cameras[0].matrixWorld);
    }
  }

  ray.material.color.setHex(0x64b5f6);
  booth.button.material.color.setHex(0xef5350);

  let clicked = false;

  if (currentSession && frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const inputSources = Array.from(currentSession.inputSources);
    const inputSource = inputSources.find(inputSource => inputSource.handedness === 'right');
    if (inputSource) {
      let pose, gamepad;
      if ((pose = frame.getPose(inputSource.targetRaySpace, referenceSpace)) && (gamepad = inputSource.gamepad)) {
        new THREE.Matrix4().fromArray(pose.transform.matrix).decompose(ray.position, ray.quaternion, ray.scale);

        clicked = gamepad.buttons[0].pressed;
        if (clicked) {
          ray.material.color.multiplyScalar(0.5);
        }

        raycaster.ray.origin.copy(ray.position);
        raycaster.ray.direction.set(0, 0, -1).applyQuaternion(ray.quaternion);
        const intersects = raycaster.intersectObjects([booth.button]);
        if (intersects.length > 0) {
          booth.button.material.color.multiplyScalar(0.5);

          if (clicked && !lastClicked && packageAddress) {
            console.log('clicked');

            navigator.xr.emit('paymentrequest', {
              address: packageAddress,
            }, async response => {
              console.log('got payment reponse', response);

              const res = await fetch('https://packages.exokit.org/lightsaber');
              const j = await res.json();
              const {dataHash} = j;
              const p = await XRPackage.download(dataHash);
              /* dialog.position.copy(camera.position)
                .add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion));
              dialog.quaternion.copy(camera.quaternion); */
              const matrix = xrpackage.package.matrix.clone()
                .multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
              p.setMatrix(matrix);
              await xrpackage.engine.add(p);
            });
          }
        }
      }
    }
  }

  lastClicked = clicked;

  renderer.render(scene, camera);
}

let packageAddress = null;
navigator.xr.addEventListener('secure', async e => {
  packageAddress = e.data.packageAddress;
  const {credentials} = e.data;
});

let currentSession = null;
{
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