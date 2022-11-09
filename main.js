import { ACESFilmicToneMapping, BackSide, BoxGeometry, Color, CylinderGeometry, DoubleSide, EquirectangularReflectionMapping, Euler, FrontSide, Group, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, RingGeometry, Scene, sRGBEncoding, Vector2, Vector3, WebGLRenderer } from 'three'
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import './style.css'

const scene = new Scene()
scene.background = new Color('#212121')

const camera = new PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000)
camera.position.set(0, 0, 10);

const renderer = new WebGLRenderer({ antialias: true})
renderer.setSize( innerWidth, innerHeight)
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

const mousePos = new Vector2(0, 0)

window.addEventListener('mousemove', e => {
  const x = e.clientX - innerWidth/2
  const y = e.clientY - innerHeight/2

  mousePos.x = x * 0.001
  mousePos.y = y * 0.001
})

const customRing = (envmap, thickness, color) => {
  const frontRing = new Mesh(
    new RingGeometry(2, 2 + thickness, 70),
    new MeshStandardMaterial({
      envMap: envmap,
      roughness: 0,
      metalness: 0.4,
      side: FrontSide,
      color,
      envMapIntensity: 1
    })
  )
  
  const ringSize = 0.25

  const outerCylinder = new Mesh(
    new CylinderGeometry(2 + thickness, 2 + thickness, ringSize, 70, 1, true),
    new MeshStandardMaterial({
      envMap: envmap,
      roughness: 0,
      metalness: 0.4, 
      side: DoubleSide,
      color,
      envMapIntensity: 1
    })
  )
  outerCylinder.rotation.x = Math.PI/2
  outerCylinder.position.z -= ringSize/2

  const innerCylinder = new Mesh(
    new CylinderGeometry(2, 2, ringSize, 70, 1, true),
    new MeshStandardMaterial({
      envMap: envmap,
      roughness: 0,
      metalness: 0.4,
      side: DoubleSide,
      color,
      envMapIntensity: 1
    })
  )
  innerCylinder.rotation.x = Math.PI/2
  innerCylinder.position.z -= ringSize/2

  const backRing = new Mesh(
    new RingGeometry(2, 2 + thickness, 70),
    new MeshStandardMaterial({
      envMap: envmap,
      roughness: 0,
      metalness: 0.4,
      side: BackSide,
      color,
      envMapIntensity: 1
    })
  )
  backRing.position.z -= ringSize

  const group = new Group();
  group.add(frontRing, outerCylinder, innerCylinder, backRing)
  group.position.z += ringSize/2

  return group
}

const customLine = (width, height, depth, envmap, color) => {
  const material = new MeshStandardMaterial({
    envMap: envmap,
    roughness: 0,
    metalness: 0.4,
    side: DoubleSide,
    color,
    envMapIntensity: 1.5
  })

  const box = new Mesh( new BoxGeometry(width, height, depth), material)

  const topCap = new Mesh( new CylinderGeometry(width/2, width/2, depth, 20), material)

  const bottomCap = new Mesh( new CylinderGeometry(width/2, width/2, depth, 20), material)

  let caps = [topCap, bottomCap]
  caps.forEach(cap => cap.rotation.x = Math.PI/2)
  topCap.position.set(0, height/2, 0)
  bottomCap.position.set(0, -height/2, 0)

  const group = new Group()
  group.add(box, topCap, bottomCap)

  return group
}

const rotateLine = (line, angle, ringRotation, topTranslation, depthTranslation) => {
  const tmatrix = new Matrix4().makeTranslation(0, topTranslation, depthTranslation)
  const rmatrix = new Matrix4().makeRotationAxis(new Vector3(0, 0, 1), -angle)
  const r1matrix = new Matrix4().makeRotationFromEuler(new Euler().copy(ringRotation))
  const fmatrix = new Matrix4().multiply(r1matrix).multiply(rmatrix).multiply(tmatrix)

  line.matrix.copy(fmatrix)
  line.matrixAutoUpdate = false
  line.matrixWorldNeedsUpdate = false
}

const clockLines = (envMap) => {
  const group = new Group()

  for(let i = 0; i < 12; i++){
    const line = customLine(0.075, 0.1, 0.025, envMap, 'white')
    group.add(line)
  }

  return group
} 

const init = async () => {
  const pmrem = new PMREMGenerator(renderer)
  const envmapTexture = await new RGBELoader().loadAsync('./assets/envmap.hdr')
  const envmap = pmrem.fromEquirectangular(envmapTexture).texture

  const innerRing = customRing(envmap, 0.65, new Color('cyan'))
  innerRing.scale.set(0.75, 0.75)
  scene.add(innerRing)

  const middleRing = customRing(envmap, 0.35, new Color('teal'))
  middleRing.scale.set(1.05, 1.05)
  scene.add(middleRing)

  const outerRing = customRing(envmap, 0.15, new Color('cyan'))
  outerRing.scale.set(1.3, 1.3)
  scene.add(outerRing)

  const cLines = clockLines(envmap)
  scene.add(cLines)

  const hourLine = customLine(0.15, 0.4, 0.07, envmap, 'white')
  scene.add(hourLine)

  const minutesLine = customLine(0.135, 0.8, 0.07, envmap, 'white')
  scene.add(minutesLine)

  const secondsLine = customLine(0.075, 1, 0.07, envmap, 'darkturquoise')
  scene.add(secondsLine)

  renderer.setAnimationLoop(() => {
    // Exponential Averaging
    // value = 95% of previousValue + 5%(aimValue) 
    // if value != aimValue; value exponentially increases until value == aimValue

    innerRing.rotation.x = innerRing.rotation.x * 0.95 + (mousePos.y * 1.2) * 0.05
    innerRing.rotation.y = innerRing.rotation.y * 0.95 + (mousePos.x * 1.2) * 0.05

    middleRing.rotation.x = middleRing.rotation.x * 0.95 + (mousePos.y * .3) * 0.05
    middleRing.rotation.y = middleRing.rotation.y * 0.95 + (mousePos.x * .3) * 0.05

    outerRing.rotation.x = outerRing.rotation.x * 0.95 - (mousePos.y * .2) * 0.05
    outerRing.rotation.y = outerRing.rotation.y * 0.95 - (mousePos.x * .2) * 0.05

    const date = new Date()

    const hourAngle = date.getHours() / 12 * Math.PI * 2
    rotateLine(hourLine, hourAngle, innerRing.rotation, 1.0, -0.1)
    
    const minutesAngle = date.getMinutes() / 60 * Math.PI * 2
    rotateLine(minutesLine, minutesAngle, innerRing.rotation, 0.8, 0)

    const secondsAngle = date.getSeconds() / 60 * Math.PI * 2
    rotateLine(secondsLine, secondsAngle, innerRing.rotation, 0.75, 0.1)

    cLines.children.forEach((line, i) => {
      rotateLine(line, i / 12 * Math.PI * 2, innerRing.rotation, 1.75, 0.15)
    })

    controls.update()
    renderer.render(scene, camera)
  })
}

await init()