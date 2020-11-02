// "use strict";
let renderer = null,
  VideoMesh = null,
  threejsCanvas,
  VideoTexture = null;
const _settings = {
  rotationOffsetX: 0, //negative -> look upper. in radians
  pivotOffsetYZ: [0.4, 0.2], //[0.2,0.2], //XYZ of the distance between the center of the cube and the pivot. enable _settings.isDebugPivotPoint to set this value

  detectionThreshold: 0.8, //sensibility, between 0 and 1. Less -> more sensitive
  detectionHysteresis: 0.05,

  tweakMoveYRotateY: 0.5, //tweak value: move detection window along Y axis when rotate the face

  cameraMinVideoDimFov: 46, //Field of View for the smallest dimension of the video in degrees

  isDebugPivotPoint: false //display a small cube for the pivot point
};
let _maxFaces = -1,
  _isMultiFaces = false,
  _detect_callback = null,
  _isVideoTextureReady = false,
  _isSeparateThreejsCanvas = false,
  _faceFilterCv = null,
  _videoElement = null,
  _isDetected = false;

const _threeCompositeObjects = [],
  _threePivotedObjects = [];

let _gl = null,
  _glVideoTexture = null,
  _glShpCopy = null;

let faceObjects, faceObject;

let THREECAMERA = null, camera, scene;
let threeStuffs;
let threeGlasses;
let _scaleW = 1;
let obj2;
let faceMesh;
let specglass;
let glass, frame;
let mesh;
const envMapURL = "sky.jpg";
let textureEquirec = new THREE.TextureLoader().load(envMapURL);
textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
textureEquirec.magFilter = THREE.LinearFilter;
textureEquirec.minFilter = THREE.LinearMipMapLinearFilter;
// callback : launched if a face is detected or lost.
red = () => {
  frame.material.color.setHex(0xFF0000);
  frame.material.opacity = 1;
}
framecolor = (e) => {
  let colors = e;
  colors = e;
  colors = parseInt(colors, 16);
  frame.material.transparent = false;
  // console.log(colors);
  frame.material.color.setHex(colors);
  frame.material.transparent = false;
  
}
glasscolor = (e) => {
  let colors = e;
  colors = e;
  colors = parseInt(colors, 16);
  // console.log(colors);
  glass.material.color.setHex(colors);
  glass.material.opacity = 0.4;
}

detect_callback = (faceIndex, isDetected) => {
  if (isDetected) {
    // console.log('Face : Detected');
  } else {
    // console.log('Face: lost');
  }
}
facemask = (faceURL) => {
  const occluderMesh = new THREE.Mesh();
  new THREE.BufferGeometryLoader().load(faceURL, function (occluderGeometry) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: THREE.ShaderLib.basic.vertexShader,
      fragmentShader: "precision lowp float;\n void main(void){\n gl_FragColor=vec4(1.,0.,0.,1.);\n }",
      uniforms: THREE.ShaderLib.basic.uniforms,
      colorWrite: false
    });

    occluderMesh.renderOrder = -1; //render first
    occluderMesh.material = mat;
    occluderMesh.geometry = occluderGeometry;
    if (typeof (callback) !== 'undefined' && callback) callback(occluderMesh);
  });

  // const faceMesh = THREE.JeelizHelper.create_threejsOccluder(spec.occluderURL);
  faceMesh = occluderMesh;
  faceMesh.rotation.set(0.3, 0, 0);
  faceMesh.position.set(0, 0.1, -0.04);
  faceMesh.scale.multiplyScalar(0.0084);
  faceObject.add(faceMesh);

}
threeGlassFace = (spec) => {
  console.log(spec);
  mesh = new THREE.Object3D();
  new THREE.BufferGeometryLoader().load(spec.frameMeshURL, function (framegeometry) {
    framegeometry.computeVertexNormals();
    // console.log(framegeometry);
    framegeometry.name = "glass";
    // custom material with fading at the end of the branches:
    const us = THREE.ShaderLib.standard.uniforms;
    const uniforms = {
      roughness: { value: 0 },
      metalness: { value: 0.05 },
      reflectivity: { value: 1 },
      envMap: { value: textureEquirec },
      envMapIntensity: { value: 1 },
      diffuse: { value: new THREE.Color().setHex(0xffffff) },
      uBranchFading: { value: new THREE.Vector2(-100, 60) } // first value: position (lower -> to the back), second: transition brutality
    };

    // tweak vertex shader to give the Z of the current point:
    let vertexShaderSource = "varying float vPosZ;\n" + THREE.ShaderLib.standard.vertexShader;
    vertexShaderSource = vertexShaderSource.replace('#include <fog_vertex>', 'vPosZ = position.z;');

    // tweak fragment shader to apply transparency at the end of the branches:
    let fragmentShaderSource = "uniform vec2 uBranchFading;\n varying float vPosZ;\n" + THREE.ShaderLib.standard.fragmentShader;
    const GLSLcomputeAlpha = 'gl_FragColor.a = smoothstep(uBranchFading.x - uBranchFading.y*0.5, uBranchFading.x + uBranchFading.y*0.5, vPosZ);'
    fragmentShaderSource = fragmentShaderSource.replace('#include <fog_fragment>', GLSLcomputeAlpha);

    const mat = new THREE.MeshBasicMaterial({
      envMap: textureEquirec,
      // opacity: 0.4,
      color: 0x000000,
      transparent: true,
      // fog: true
    });

    // mat.envMap = textureEquirec;
    const glassesFramesMesh = new THREE.Mesh(framegeometry, mat);
    glassesFramesMesh.name = 'frame';
    frame = glassesFramesMesh;
    // console.log(glassesFramesMesh);
    mesh.add(frame);

    window.debugMatFrames = mat; // to debug the material il the JS console
  });

  // glasses lenses:
  new THREE.BufferGeometryLoader().load(spec.lensesMeshURL, function (glassesLensesGeometry) {
    glassesLensesGeometry.computeVertexNormals();
    const mat = new THREE.MeshBasicMaterial({
      // envMap: textureEquirec,
      opacity: 0.4,
      color: 0x00c8ff,
      transparent: true,
      fog: true
    });
    const glassesLensesMesh = new THREE.Mesh(glassesLensesGeometry, mat);
    glassesLensesMesh.name = 'lense';
    // console.log(glassesLensesMesh); new THREE.Color().setHex(0x2233aa)
    glass = glassesLensesMesh
    mesh.add(glass);
    // obj2 = glassesLensesMesh;
    window.debugMatLens = mat; // to debug the material il the JS console
  });

  specglass = mesh;
  specglass.position.set(0, 0.07, 0.4);
  specglass.scale.multiplyScalar(0.006);
  console.log(mesh);
  faceObject.add(specglass);
  // return {
  //   FrameGlass: mesh,
  //  };
}

ThreeScene = (spec) => {
  _maxFaces = spec.maxFacesDetected;
  _glVideoTexture = spec.videoTexture;
  _gl = spec.GL;
  _faceFilterCv = spec.canvasElement;
  _isMultiFaces = (_maxFaces > 1);
  _videoElement = spec.videoElement;

  threejsCanvas = document.getElementById('canvas');
  if (typeof (detectCallback) !== 'undefined') {
    _detect_callback = detectCallback;
  }

  renderer = new THREE.WebGLRenderer({
    context: (_isSeparateThreejsCanvas) ? null : _gl,
    canvas: threejsCanvas,
    alpha: (_isSeparateThreejsCanvas || spec.alpha) ? true : false
  });

  scene = new THREE.Scene();

  // face object detect
  for (let i = 0; i < _maxFaces; ++i) {
    // COMPOSITE OBJECT WHICH WILL TRACK A DETECTED FACE
    // in fact we create 2 objects to be able to shift the pivot point
    const threeCompositeObject = new THREE.Object3D();
    threeCompositeObject.frustumCulled = false;
    threeCompositeObject.visible = false;

    const threeCompositeObjectPIVOTED = new THREE.Object3D();
    threeCompositeObjectPIVOTED.frustumCulled = false;
    threeCompositeObject.add(threeCompositeObjectPIVOTED);

    _threeCompositeObjects.push(threeCompositeObject);
    _threePivotedObjects.push(threeCompositeObjectPIVOTED);
    scene.add(threeCompositeObject);

    if (_settings.isDebugPivotPoint) {
      const pivotCubeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshNormalMaterial({
        side: THREE.DoubleSide,
        depthTest: false
      }));
      pivotCubeMesh.position.copy(threeCompositeObjectPIVOTED.position);
      threeCompositeObject.add(pivotCubeMesh);
      window.pivot = pivotCubeMesh;
      console.log('DEBUG in JeelizHelper: set the position of <pivot> in the console and report the value into JeelizThreejsHelper.js for _settings.pivotOffsetYZ');
    }
  }
  // videoscreen
  const videoScreenVertexShaderSource = "attribute vec2 position;\n\
      varying vec2 vUV;\n\
      void main(void){\n\
        gl_Position = vec4(position, 0., 1.);\n\
        vUV = 0.5+0.5*position;\n\
      }";
  const videoScreenFragmentShaderSource = "precision lowp float;\n\
      uniform sampler2D samplerVideo;\n\
      varying vec2 vUV;\n\
      void main(void){\n\
        gl_FragColor = texture2D(samplerVideo, vUV);\n\
      }";

  if (_isSeparateThreejsCanvas) {
    const compile_shader = function (source, type, typeString) {
      const shader = _gl.createShader(type);
      _gl.shaderSource(shader, source);
      _gl.compileShader(shader);
      if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {
        alert("ERROR IN " + typeString + " SHADER : " + _gl.getShaderInfoLog(shader));
        return false;
      }
      return shader;
    };
    const shader_vertex = compile_shader(videoScreenVertexShaderSource, _gl.VERTEX_SHADER, 'VERTEX');
    const shader_fragment = compile_shader(videoScreenFragmentShaderSource, _gl.FRAGMENT_SHADER, 'FRAGMENT');
    _glShpCopy = _gl.createProgram();
    _gl.attachShader(_glShpCopy, shader_vertex);
    _gl.attachShader(_glShpCopy, shader_fragment);
    _gl.linkProgram(_glShpCopy);
    const samplerVideo = _gl.getUniformLocation(_glShpCopy, 'samplerVideo');

    return;
  }

  //init video texture with red
  VideoTexture = new THREE.DataTexture(new Uint8Array([255, 0, 0]), 1, 1, THREE.RGBFormat);
  VideoTexture.needsUpdate = true;

  //CREATE THE VIDEO BACKGROUND
  const videoMaterial = new THREE.RawShaderMaterial({
    depthWrite: false,
    depthTest: false,
    vertexShader: videoScreenVertexShaderSource,
    fragmentShader: videoScreenFragmentShaderSource,
    uniforms: {
      samplerVideo: { value: VideoTexture }
    }
  });
  const videoGeometry = new THREE.BufferGeometry()
  const videoScreenCorners = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
  videoGeometry.addAttribute('position', new THREE.BufferAttribute(videoScreenCorners, 2));
  videoGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1));
  VideoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  // console.log(VideoMesh);
  if (_isVideoTextureReady) {
    return;
  }
  // console.log(VideoTexture);
  VideoMesh.onAfterRender = function () {
    // Replace VideoTexture.__webglTexture by the real video texture:
    try {
      renderer.properties.update(VideoTexture, '__webglTexture', _glVideoTexture);
      VideoTexture.magFilter = THREE.LinearFilter;
      VideoTexture.minFilter = THREE.LinearFilter;
      _isVideoTextureReady = true;
    } catch (e) {
      console.log('WARNING in THREE.JeelizHelper : the glVideoTexture is not fully initialized');
    }
    delete (VideoMesh.onAfterRender);
  };
  VideoMesh.renderOrder = -1000; //render first
  VideoMesh.frustumCulled = false;
  scene.add(VideoMesh);

  // handle device orientation change:
  window.addEventListener('orientationchange', function () {
    setTimeout(JEEFACEFILTERAPI.resize, 1000);
  }, false);

  if (_isMultiFaces) {
    faceObjects = _threePivotedObjects;
  } else {
    faceObject = _threePivotedObjects[0];
  }

  // improve WebGLRenderer settings:
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;

  // CREATE THE GLASSES AND ADD THEMff
  const faceURL = "assets/face.json";
  facemask(faceURL);
  threeGlassFace({
    frameMeshURL: "assets/glassesFramesBranchesBent.json",
    lensesMeshURL: "assets/glassesLenses.json",
  });
  // THREECAMERA = THREE.JeelizHelper.create_camera();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
  // console.log(threeCamera);
  const canvasElement = renderer.domElement;
  // console.log(canvasElement);
  const cvw = canvasElement.width;
  const cvh = canvasElement.height;
  const canvasAspectRatio = cvw / cvh;
  // console.log(canvasAspectRatio);
  // compute vertical field of view:
  const vw = spec.videoElement.videoWidth;
  const vh = spec.videoElement.videoHeight;
  const videoAspectRatio = vw / vh;
  const fovFactor = (vh > vw) ? (1.0 / videoAspectRatio) : 1.0;
  const fov = 46 * fovFactor;

  // compute X and Y offsets in pixels:
  let scale = 1.0;
  if (canvasAspectRatio > videoAspectRatio) {
    // the canvas is more in landscape format than the video, so we crop top and bottom margins:
    scale = cvw / vw;
  } else {
    // the canvas is more in portrait format than the video, so we crop right and left margins:
    scale = cvh / vh;
  }
  const cvws = vw * scale, cvhs = vh * scale;
  const offsetX = (cvws - cvw) / 2.0;
  const offsetY = (cvhs - cvh) / 2.0;
  // console.log(_scaleW);
  _scaleW = cvw / cvws;
  // console.log(_scaleW);

  // apply parameters:
  camera.aspect = canvasAspectRatio;
  camera.fov = fov;
  // console.log('INFO in update_camera() : camera vertical estimated FoV is', fov, 'deg');
  camera.setViewOffset(cvws, cvhs, offsetX, offsetY, cvw, cvh);
  camera.updateProjectionMatrix();
  renderer.setSize(cvw, cvh, false);
  renderer.setViewport(0, 0, cvw, cvh);
  THREECAMERA = camera;
}

intdetect = (detectState) => {
  const ds = (_isMultiFaces) ? detectState : [detectState];
  detect(ds);
}

init = () => {
  JEEFACEFILTERAPI.init({
    followZRot: true,
    canvasId: 'canvas',
    NNCpath: 'js/', // path of NNC.json file
    maxFacesDetected: 1,
    callbackReady: function (errCode, spec) {
      if (errCode) {
        console.log('AN ERROR HAPPENS. ERR =', errCode);
        return;
      }
      // console.log(spec);
      console.log('INFO: API IS READY');
      ThreeScene(spec);
    },

    callbackTrack: function (detectState) {
      render(detectState, THREECAMERA, _scaleW);
    }
  });
}
detect = (detectState) => {
  _threeCompositeObjects.forEach(function (threeCompositeObject, i) {
    _isDetected = threeCompositeObject.visible;
    const ds = detectState[i];
    if (_isDetected && ds.detected < _settings.detectionThreshold - _settings.detectionHysteresis) {

      // DETECTION LOST
      if (_detect_callback) _detect_callback(i, false);
      threeCompositeObject.visible = false;
    } else if (!_isDetected && ds.detected > _settings.detectionThreshold + _settings.detectionHysteresis) {

      // FACE DETECTED
      if (_detect_callback) _detect_callback(i, true);
      threeCompositeObject.visible = true;
    }
  }); //end loop on all detection slots
}
update_positions3D = (ds, camera, _scaleW) => {
  const halfTanFOV = Math.tan(camera.aspect * camera.fov * Math.PI / 360); //tan(<horizontal FoV>/2), in radians (camera.fov is vertical FoV)

  _threeCompositeObjects.forEach(function (threeCompositeObject, i) {
    if (!threeCompositeObject.visible) return;
    const detectState = ds[i];

    // tweak Y position depending on rx:
    const tweak = _settings.tweakMoveYRotateY * Math.tan(detectState.rx);
    const cz = Math.cos(detectState.rz), sz = Math.sin(detectState.rz);
    const s = detectState.s * _scaleW;

    const xTweak = sz * tweak * s;
    const yTweak = cz * tweak * (s * camera.aspect);

    // move the cube in order to fit the head:
    const W = s;    //relative width of the detection window (1-> whole width of the detection window)
    const D = 1 / (2 * W * halfTanFOV); //distance between the front face of the cube and the camera

    //coords in 2D of the center of the detection window in the viewport:
    const xv = (detectState.x * _scaleW + xTweak);
    const yv = (detectState.y + yTweak);

    // coords in 3D of the center of the cube (in the view coordinates system)
    const z = -D - 0.5;   // minus because view coordinate system Z goes backward. -0.5 because z is the coord of the center of the cube (not the front face)
    const x = xv * D * halfTanFOV;
    const y = yv * D * halfTanFOV / camera.aspect;

    // the pivot position depends on rz rotation:
    _threePivotedObjects[i].position.set(-sz * _settings.pivotOffsetYZ[0], -cz * _settings.pivotOffsetYZ[0], -_settings.pivotOffsetYZ[1]);

    // move and rotate the cube:
    threeCompositeObject.position.set(x, y + _settings.pivotOffsetYZ[0], z + _settings.pivotOffsetYZ[1]);
    threeCompositeObject.rotation.set(detectState.rx + _settings.rotationOffsetX, detectState.ry, detectState.rz, "ZXY");
  }); //end loop on composite objects
}
render = (detectState, camera, _scaleW) => {
  const ds = (_isMultiFaces) ? detectState : [detectState];

  //update detection states
  detect(ds);
  update_positions3D(ds, camera, _scaleW);
  // console.log(ds);
  if (_isSeparateThreejsCanvas) {
    //render the video texture on the faceFilter canvas :
    _gl.viewport(0, 0, _faceFilterCv.width, _faceFilterCv.height);
    _gl.useProgram(_glShpCopy);
    _gl.activeTexture(_gl.TEXTURE0);
    _gl.bindTexture(_gl.TEXTURE_2D, _glVideoTexture);
    _gl.drawElements(_gl.TRIANGLES, 3, _gl.UNSIGNED_SHORT, 0);
  } else {
    //reinitialize the state of THREE.JS because JEEFACEFILTER have changed stuffs
    // -> can be VERY costly !
    renderer.state.reset();
  }

  //trigger the render of the THREE.JS SCENE
  renderer.render(scene, camera);
}
init();

