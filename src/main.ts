import * as THREE from 'three';
import { Boid } from './Boids';
import { Target } from './Target';
import { BOUNDS } from './constants';
import { SpatialPartition } from './SpatialPartition';
//@ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { Octree3D } from './Octree3D';
import { GLTFLoader, GPUComputationRenderer } from 'three/examples/jsm/Addons.js';

const selector = document.createElement('select');
selector.id = 'mySelector';
selector.style.position = 'absolute';
selector.style.top = '40px';
selector.style.left = '10px';
selector.innerHTML = `
  <option value="spatial" selected>Spatial Partition/Mapping</option>
  <option value="octree">Octree</option>
`;

const label = document.createElement('label');
label.htmlFor = 'mySelector';
label.textContent = 'Choose a data structure: ';
label.style.position = 'absolute';
label.style.top = '10px';
label.style.left = '10px';
label.style.color = 'black';
label.style.fontWeight = 'bold';
label.style.background = 'rgba(255,255,255,0.7)';
label.style.padding = '2px 6px';
label.style.borderRadius = '4px';
document.body.appendChild(label);
document.body.appendChild(selector);


let choiceData: string = selector.value;
let choiceView: boolean;
selector.addEventListener('change', (e) => {
    choiceData = (e.target as HTMLSelectElement).value;
    switch (choiceData) {
        case "spatial":
            octree.clear();
            if (octree.cellVizMesh) {
                scene.remove(octree.cellVizMesh);
                octree.cellVizMesh.geometry.dispose();
                if (Array.isArray(octree.cellVizMesh.material)) {
                    octree.cellVizMesh.material.forEach(mat => mat.dispose());
                } else {
                    octree.cellVizMesh.material.dispose();
                }
                octree.cellVizMesh = null;
            }
            break;
        case "octree":
            spatialPartition.reset();
            if (cellVizMesh) {
                scene.remove(cellVizMesh);
                cellVizMesh.geometry.dispose();
                if (Array.isArray(cellVizMesh.material)) {
                    cellVizMesh.material.forEach(mat => mat.dispose());
                } else {
                    cellVizMesh.material.dispose();
                }
                cellVizMesh = null;
            }
            break;
    }
});

const checkView = document.createElement('input');
checkView.type = 'checkbox'
checkView.id = 'checkView'
checkView.style.position = 'absolute';
checkView.style.top = '70px';
checkView.style.left = '10px';
checkView.style.color = 'black';

const checkLabel = document.createElement('label');
checkLabel.htmlFor = 'checkView';
checkLabel.textContent = 'View Structure';
checkLabel.style.position = 'absolute';
checkLabel.style.top = '70px';
checkLabel.style.left = '30px'; // Place it to the right of the checkbox
checkLabel.style.color = 'black';

document.body.appendChild(checkView);
document.body.appendChild(checkLabel);

checkView.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    choiceView = input.checked;
    if (!choiceView) {
        if (cellVizMesh) {
            scene.remove(cellVizMesh);
            cellVizMesh.geometry.dispose();
            if (Array.isArray(cellVizMesh.material)) {
                cellVizMesh.material.forEach(mat => mat.dispose());
            } else {
                cellVizMesh.material.dispose();
            }
            cellVizMesh = null;
        }
        if (octree.cellVizMesh) {
            scene.remove(octree.cellVizMesh);
            octree.cellVizMesh.geometry.dispose();
            if (Array.isArray(octree.cellVizMesh.material)) {
                octree.cellVizMesh.material.forEach(mat => mat.dispose());
            } else {
                octree.cellVizMesh.material.dispose();
            }
            octree.cellVizMesh = null;
        }
    }
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x58baff)

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    700
);

camera.rotation.order = 'YXZ';

camera.position.set(-200, 150, 200);

camera.lookAt(new THREE.Vector3(0, -25, 0));



//camera.rotation.y = THREE.MathUtils.degToRad(-35);
//camera.rotation.x = THREE.MathUtils.degToRad(-30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
stats.showPanel(0);
stats.dom.style.position = 'absolute';
stats.dom.style.left = 'unset';
stats.dom.style.right = '10px';
stats.dom.style.top = '10px';
document.body.appendChild(stats.dom);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0); // Center of rotation
controls.update();

const sceneGeometry = new THREE.BoxGeometry(200, 200, 200);
const sceneEdges = new THREE.EdgesGeometry(sceneGeometry);
const lines = new THREE.LineSegments(
    sceneEdges,
    new THREE.LineBasicMaterial({ color: 0x000000 })
);

scene.add(lines);

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 100);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(-5, -10, 10);
scene.add(pointLight);


const floorTexture = new THREE.TextureLoader().load('/assets/floor.jpeg');
const floorGeometry = new THREE.PlaneGeometry(BOUNDS * 2, BOUNDS * 2);
const flooMaterial = new THREE.MeshStandardMaterial({ map: floorTexture })
const floor = new THREE.Mesh(floorGeometry, flooMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -100;
scene.add(floor);

const boids: Boid[] = [];
const target = new Target(5, 0xff0000);

const NUM_BOIDS = 1000;

let instancedMesh: THREE.InstancedMesh | null = null;

const loader = new GLTFLoader();
loader.load('/assets/fish_low_poly/scene.gltf', (gltf) => {
    const model = gltf.scene;

    let baseMesh: THREE.Mesh | undefined;

    model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            baseMesh = child as THREE.Mesh;
        }
    })
    if (!baseMesh) {
        console.error("No mesh found in GLTF.");
        return;
    }

    const geometry = baseMesh.geometry;
    const material = baseMesh.material;

    instancedMesh = new THREE.InstancedMesh(geometry, material, NUM_BOIDS);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    for (let i = 0; i < NUM_BOIDS; i++) {
        boids.push(new Boid(target, i))
    }
    animate();
});

const size = Math.ceil(Math.sqrt(NUM_BOIDS));
const positionData = new Float32Array(size * size * 4);
const velocityData = new Float32Array(size * size * 4)

for (let i = 0; i < size * size; i++) {
    const i4 = i * 4;
    positionData[i4] = Math.random() * 100 - 50;
    positionData[i4 + 1] = Math.random() * 100 - 50;
    positionData[i4 + 2] = Math.random() * 100 - 50;
    positionData[i4 + 3] = 1.0;

    velocityData[i4] = Math.random() * 2 - 1;
    velocityData[i4 + 1] = Math.random() * 2 - 1;
    velocityData[i4 + 2] = Math.random() * 2 - 1;
    velocityData[i4 + 3] = 1.0;
}

const posTexture = new THREE.DataTexture(positionData, size, size, THREE.RGBAFormat, THREE.FloatType);
const velTexture = new THREE.DataTexture(velocityData, size, size, THREE.RGBAFormat, THREE.FloatType);
posTexture.needsUpdate = true;
velTexture.needsUpdate = true;


const cellSize = 5;
const neighborCellsOffset = 2;
const cellCapacity = 10;

const spatialPartition = new SpatialPartition<Boid>(cellSize, neighborCellsOffset);
const octree = new Octree3D(scene, cellCapacity, BOUNDS * 2, BOUNDS * 2, BOUNDS * 2, cellSize, neighborCellsOffset);

let cellVizMesh: THREE.InstancedMesh | null = null;




let lastTime = performance.now();
function animate() {
    stats.begin();

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    /* if (choiceData == "spatial") {
        if (choiceView) {
            cellViz(scene);
        }
        spatialPartition.reset();
        boids.forEach(boid => {

            spatialPartition.add(boid.position, boid);

        });
    }
    if (choiceData == "octree") {
        if (choiceView) {
            octree.show();
        }
        octree.clear();
        boids.forEach(boid => {

            octree.insert(boid.position, boid);

        });
    } */

    const dummyMatrix = new THREE.Matrix4();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3(1, 1, 1);

    octree.clear()
    boids.forEach(boid => {
        octree.insert(boid.position, boid);
    })

    boids.forEach((boid: Boid, index: number) => {

        const near: Boid[] = octree.findNear(boid.position) as Boid[];


        boid.update(near, index, delta);

        dummyMatrix.compose(boid.position, boid.quaternion, tempScale);
        if (instancedMesh) {
            instancedMesh.setMatrixAt(index, dummyMatrix);
        }


        /* switch (choiceData) {
            case "spatial":
                const prevPos = boid.position.clone()
                const near = spatialPartition.findNear(prevPos);
                boid.update(near, index, delta)
                spatialPartition.rm(prevPos, boid);
                spatialPartition.add(boid.position, boid);
                break;
            case "octree":
                const pos = boid.position.clone()
                const close = octree.findNear(pos) as Boid[];
                boid.update(close, index, delta);
                break;
        } */


    });

    octree.clear();

    instancedMesh!.instanceMatrix.needsUpdate = true;

    target.update(delta)

    renderer.render(scene, camera);
    stats.end();

    requestAnimationFrame(animate);
}


window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function cellViz(scene: THREE.Scene) { //This should've been an internal function in the SpatialPartition class, but it'd take too much work to change it now

    if (cellVizMesh) {
        scene.remove(cellVizMesh);
        cellVizMesh.geometry.dispose();
        if (Array.isArray(cellVizMesh.material)) {
            cellVizMesh.material.forEach(mat => mat.dispose());
        } else {
            cellVizMesh.material.dispose();
        }
        cellVizMesh = null;
    }

    const occupiedCells = Array.from(spatialPartition["_spatialPartitionGrid"].entries())
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => [key.split(',').map(Number), value]);

    if (occupiedCells.length === 0) return;

    const geometry = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true });
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
            '#include <color_vertex>',
            'vColor = instanceColor;'
        );
    };
    const mesh = new THREE.InstancedMesh(geometry, material, occupiedCells.length);
    const colors = new Float32Array(occupiedCells.length * 3);
    const color = new THREE.Color();

    const dummy = new THREE.Object3D();

    let maxCount = 0;
    const cellPositions: number[][] = [];

    for (let [key, boidArray] of occupiedCells) {
        maxCount = Math.max(maxCount, boidArray.length);
        cellPositions.push(key as number[]);
    }


    for (let i = 0; i < occupiedCells.length; i++) {
        const [cellPos, boidArray] = occupiedCells[i] as [number[], Boid[]];
        const [x, y, z] = cellPos;
        const count = boidArray.length;
        dummy.position.set(
            (x + 0.5) * cellSize,
            (y + 0.5) * cellSize,
            (z + 0.5) * cellSize
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const t = count / maxCount;
        color.setHSL(0.66 - 0.66 * t, 1.0, 0.5);
        color.toArray(colors, i * 3);
    }

    mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    cellVizMesh = mesh;
    scene.add(mesh);
}