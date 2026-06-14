import * as THREE from 'three';
import { Boid, loadBoidModel } from './Boids';
import { Target } from './Target';
import { BOUNDS } from './constants';
import { SpatialPartition } from './SpatialPartition';
//@ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';
import { Octree3D } from './Octree3D';

const selector = document.createElement('select');
selector.id = 'structSelector';
selector.style.position = 'absolute';
selector.style.top = '40px';
selector.style.left = '10px';
selector.innerHTML = `
  <option value="spatial" selected>Spatial Partition/Mapping</option>
  <option value="octree">Octree</option>
`;

const label = document.createElement('label');
label.htmlFor = 'structSelector';
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

const boid_amount = document.createElement('fieldset')
boid_amount.id = 'amountSelector'
boid_amount.style.position = 'absolute';
boid_amount.style.top = '80px';
boid_amount.style.left = '10px';
boid_amount.style.background = 'rgba(255,255,255,0.7)';
boid_amount.style.borderRadius = '4px';

const boidAmountLegend = document.createElement('legend');
boidAmountLegend.textContent = 'Boids';
boid_amount.appendChild(boidAmountLegend);

const boidAmountInput = document.createElement('input');
boidAmountInput.type = 'number';
boidAmountInput.min = '1';
boidAmountInput.max = '10000';
boidAmountInput.step = '100';
boidAmountInput.value = '1000';
boidAmountInput.style.width = '90px';
boid_amount.appendChild(boidAmountInput);

document.body.appendChild(boid_amount);

let boidAmount: number = Number(boidAmountInput.value);

boidAmountInput.addEventListener('change', (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    boidAmount = Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1000;
    boidAmountInput.value = String(boidAmount);
    updateBoidCount(boidAmount);
})

const targetControls = document.createElement('fieldset');
targetControls.id = 'targetControls';
targetControls.style.position = 'absolute';
targetControls.style.top = '80px';
targetControls.style.left = '130px';
targetControls.style.background = 'rgba(255,255,255,0.7)';
targetControls.style.borderRadius = '4px';

const targetLegend = document.createElement('legend');
targetLegend.textContent = 'Targets';
targetControls.appendChild(targetLegend);

const targetAmountInput = document.createElement('input');
targetAmountInput.type = 'number';
targetAmountInput.min = '0';
targetAmountInput.max = '20';
targetAmountInput.step = '1';
targetAmountInput.value = '0';
targetAmountInput.style.width = '90px';
targetControls.appendChild(targetAmountInput);

document.body.appendChild(targetControls);

let targetAmount: number = Number(targetAmountInput.value);

targetAmountInput.addEventListener('change', (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    targetAmount = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 1;
    targetAmountInput.value = String(targetAmount);
    updateTargetCount(targetAmount);
});

const behaviorControls = document.createElement('fieldset');
behaviorControls.id = 'behaviorControls';
behaviorControls.style.position = 'absolute';
behaviorControls.style.top = '145px';
behaviorControls.style.left = '10px';
behaviorControls.style.background = 'rgba(255,255,255,0.7)';
behaviorControls.style.borderRadius = '4px';

const behaviorLegend = document.createElement('legend');
behaviorLegend.textContent = 'Behavior';
behaviorControls.appendChild(behaviorLegend);

const separationInput = document.createElement('input');
separationInput.type = 'number';
separationInput.step = '0.1';
separationInput.min = '0';
separationInput.value = '12';
separationInput.style.width = '90px';

const cohesionInput = document.createElement('input');
cohesionInput.type = 'number';
cohesionInput.step = '0.01';
cohesionInput.min = '0';
cohesionInput.value = '0.15';
cohesionInput.style.width = '90px';

const alignmentInput = document.createElement('input');
alignmentInput.type = 'number';
alignmentInput.step = '0.01';
alignmentInput.min = '0';
alignmentInput.value = '0.9';
alignmentInput.style.width = '90px';

const separationLabel = document.createElement('label');
separationLabel.textContent = 'Separation';
separationLabel.style.display = 'block';
separationLabel.appendChild(separationInput);

const cohesionLabel = document.createElement('label');
cohesionLabel.textContent = 'Cohesion';
cohesionLabel.style.display = 'block';
cohesionLabel.appendChild(cohesionInput);

const alignmentLabel = document.createElement('label');
alignmentLabel.textContent = 'Alignment';
alignmentLabel.style.display = 'block';
alignmentLabel.appendChild(alignmentInput);

behaviorControls.appendChild(separationLabel);
behaviorControls.appendChild(cohesionLabel);
behaviorControls.appendChild(alignmentLabel);
document.body.appendChild(behaviorControls);

const metricsControls = document.createElement('fieldset');
metricsControls.id = 'metricsControls';
metricsControls.style.position = 'absolute';
metricsControls.style.top = '260px';
// metricsControls.style.left = '150px';
metricsControls.style.background = 'rgba(255,255,255,0.7)';
metricsControls.style.borderRadius = '4px';

const metricsLegend = document.createElement('legend');
metricsLegend.textContent = 'Metrics';
metricsControls.appendChild(metricsLegend);

const flockingRadiusInput = document.createElement('input');
flockingRadiusInput.type = 'text';
flockingRadiusInput.value = '-';
flockingRadiusInput.readOnly = true;
flockingRadiusInput.style.width = '180px';

const polarizationInput = document.createElement('input');
polarizationInput.type = 'text';
polarizationInput.value = '-';
polarizationInput.readOnly = true;
polarizationInput.style.width = '180px';

const angularMomentumInput = document.createElement('input');
angularMomentumInput.type = 'text';
angularMomentumInput.value = '-';
angularMomentumInput.readOnly = true;
angularMomentumInput.style.width = '180px';

const dispersionInput = document.createElement('input');
dispersionInput.type = 'text';
dispersionInput.value = '-';
dispersionInput.readOnly = true;
dispersionInput.style.width = '180px';

const averageSpeedInput = document.createElement('input');
averageSpeedInput.type = 'text';
averageSpeedInput.value = '-';
averageSpeedInput.readOnly = true;
averageSpeedInput.style.width = '180px';

//Flocking Radius, Determines how closely boids are grouped together by calculating 
// the mean distance from each boid to the center of mass
const flockingRadiusLabel = document.createElement('label');
flockingRadiusLabel.textContent = 'Flocking Radius/Clustering';
flockingRadiusLabel.style.display = 'block';
flockingRadiusLabel.appendChild(flockingRadiusInput);

// Group Polarization, Measures the overall alignment of the flock. It is calculated by 
// taking the absolute value of the average velocity vector of all boids
const polarizationLabel = document.createElement('label');
polarizationLabel.textContent = 'Group Polarization';
polarizationLabel.style.display = 'block';
polarizationLabel.appendChild(polarizationInput);

// Group Angular Momentum, Measures the degree of rotation (swirling) of the group around its center
const angularMomentumLabel = document.createElement('label');
angularMomentumLabel.textContent = 'Group Angular Momentum';
angularMomentumLabel.style.display = 'block';
angularMomentumLabel.appendChild(angularMomentumInput);

const dispersionLabel = document.createElement('label');
dispersionLabel.textContent = 'Dispersion';
dispersionLabel.style.display = 'block';
dispersionLabel.appendChild(dispersionInput);

const averageSpeedLabel = document.createElement('label');
averageSpeedLabel.textContent = 'Average Speed';
averageSpeedLabel.style.display = 'block';
averageSpeedLabel.appendChild(averageSpeedInput);

const calculateMetricsButton = document.createElement('button');
calculateMetricsButton.type = 'button';
calculateMetricsButton.textContent = 'Calculate Metrics';
calculateMetricsButton.style.marginTop = '6px';

metricsControls.appendChild(flockingRadiusLabel);
metricsControls.appendChild(polarizationLabel);
metricsControls.appendChild(angularMomentumLabel);
metricsControls.appendChild(dispersionLabel);
metricsControls.appendChild(averageSpeedLabel);
metricsControls.appendChild(calculateMetricsButton);
document.body.appendChild(metricsControls);

let separationStr = Number(separationInput.value);
let cohesionStr = Number(cohesionInput.value);
let alignmentStr = Number(alignmentInput.value);

separationInput.addEventListener('change', (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    separationStr = Number.isFinite(value) ? Math.max(0, value) : 12;
});

cohesionInput.addEventListener('change', (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    cohesionStr = Number.isFinite(value) ? Math.max(0, value) : 0.15;
});

alignmentInput.addEventListener('change', (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    alignmentStr = Number.isFinite(value) ? Math.max(0, value) : 0.9;
});

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
scene.background = new THREE.Color(0x223355)

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
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

const sceneGeometry = new THREE.BoxGeometry(BOUNDS * 2, BOUNDS * 2, BOUNDS * 2);
const sceneEdges = new THREE.EdgesGeometry(sceneGeometry);
const lines = new THREE.LineSegments(
    sceneEdges,
    new THREE.LineBasicMaterial({ color: 0x000000 })
);

scene.add(lines);

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffddff, 1);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);


const floorTexture = new THREE.TextureLoader().load('/assets/floor.jpeg');
const floorGeometry = new THREE.PlaneGeometry(BOUNDS * 2, BOUNDS * 2);
const flooMaterial = new THREE.MeshStandardMaterial({ map: floorTexture })
const floor = new THREE.Mesh(floorGeometry, flooMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -BOUNDS;
//floor.position.z = -100;
scene.add(floor);


const targets: Target[] = [];
const boids: Boid[][] = [];
//const SPHERE_RADIUS = 5;

const cellSize = 5;
const neighborCellsOffset = 3;
const cellCapacity = 8;

/* function randomPointInSphere(radius: number): THREE.Vector3 {
    let u = Math.random();
    let v = Math.random();
    let theta = 2 * Math.PI * u;
    let phi = Math.acos(2 * v - 1);
    let r = Math.cbrt(Math.random()) * radius;
    let sinPhi = Math.sin(phi);
    return new THREE.Vector3(
        r * sinPhi * Math.cos(theta),
        r * sinPhi * Math.sin(theta),
        r * Math.cos(phi)
    );
} */ //Nao vi vantagem em inicializar eles como esfera

function randomPointInRectangle(): THREE.Vector3 {
    const x = Math.random() * BOUNDS * 2 - BOUNDS;
    const y = Math.random() * BOUNDS * 2 - BOUNDS;
    const z = Math.random() * BOUNDS * 2 - BOUNDS;

    return new THREE.Vector3(
        x, y, z
    );
}

const spatialPartition = new SpatialPartition<Boid>(cellSize, neighborCellsOffset);
const octree = new Octree3D(scene, cellCapacity, BOUNDS * 2, BOUNDS * 2, BOUNDS * 2, cellSize, neighborCellsOffset);

let cellVizMesh: THREE.InstancedMesh | null = null;

function rebuildActiveStructure() {
    spatialPartition.reset();
    octree.clear();

    if (choiceData === "spatial") {
        for (const school of boids) {
            for (const boid of school) {
                spatialPartition.add(boid.mesh.position, boid);
            }
        }
    } else {
        for (const school of boids) {
            for (const boid of school) {
                octree.insert(boid.mesh.position, boid);
            }
        }
    }
}

function updateBoidCount(nextAmount: number) {
    const clampedAmount = Math.max(1, Math.floor(nextAmount));
    const schoolCount = Math.max(1, targets.length);

    while (boids.length > schoolCount) {
        const removedSchool = boids.pop();
        if (!removedSchool) continue;
        for (const boid of removedSchool) {
            scene.remove(boid.mesh);
        }
    }

    while (boids.length < schoolCount) {
        boids.push([]);
    }

    for (let j = 0; j < schoolCount; j++) {
        if (!boids[j]) {
            boids[j] = [];
        }

        const target = targets.length === 0 ? null : targets[j];

        for (const boid of boids[j]) {
            boid.target = target;
        }

        while (boids[j].length < clampedAmount) {
            const boid = new Boid(target);
            boid.mesh.position.copy(randomPointInRectangle());
            scene.add(boid.mesh);
            boids[j].push(boid);
        }

        while (boids[j].length > clampedAmount) {
            const boid = boids[j].pop();
            if (!boid) continue;
            scene.remove(boid.mesh);
        }
    }

    rebuildActiveStructure();
}

function updateTargetCount(nextAmount: number) {
    const clampedAmount = Math.max(0, Math.floor(nextAmount));

    while (targets.length < clampedAmount) {
        const target = new Target();
        scene.add(target.mesh);
        targets.push(target);
    }

    while (targets.length > clampedAmount) {
        const target = targets.pop();
        if (!target) continue;
        scene.remove(target.mesh);
    }

    updateBoidCount(boidAmount);
}


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

    const occupiedCells = [] /* Array.from(spatialPartition["_spatialPartitionGrid"].entries())
        .filter(([_, value]) => value !== null)
        .map(([key, value]) => [key.split(',').map(Number), value]); */
    const grid = spatialPartition["_spatialPartitionGrid"];
    for (const [x, yMap] of grid) {
        for (const [y, zMap] of yMap) {
            for (const [z, arr] of zMap) {
                if (arr !== null && arr.length > 0) occupiedCells.push([[x, y, z], arr]);
            }
        }
    }


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

loadBoidModel(false).then(() => {
    updateTargetCount(targetAmount);
    animate();
});

const _tmpPos = new THREE.Vector3();
const _centerOfMass = new THREE.Vector3();
const _sumDirection = new THREE.Vector3();
const _relativePosition = new THREE.Vector3();
const _cross = new THREE.Vector3();
let frameCount = 0;
const UPDATE_INTERVAL = 1;
const MAX_DELTA = 0.07;

function flattenBoids(): Boid[] {
    const all: Boid[] = [];
    for (const school of boids) {
        for (const boid of school) {
            all.push(boid);
        }
    }
    return all;
}

function calculateGroupMetrics() {
    const allBoids = flattenBoids();
    const count = allBoids.length;

    if (count === 0) {
        flockingRadiusInput.value = '-';
        polarizationInput.value = '-';
        angularMomentumInput.value = '-';
        dispersionInput.value = '-';
        averageSpeedInput.value = '-';
        return;
    }

    _centerOfMass.set(0, 0, 0);
    _sumDirection.set(0, 0, 0);

    for (const boid of allBoids) {
        _centerOfMass.add(boid.mesh.position);
        if (boid.velocity.lengthSq() > 1e-8) {
            _sumDirection.add(_tmpPos.copy(boid.velocity).normalize());
        }
    }

    _centerOfMass.divideScalar(count);

    let radiusSum = 0;
    let radiusSqSum = 0;
    let angularMomentumSum = 0;
    let speedSum = 0;

    for (const boid of allBoids) {
        _relativePosition.subVectors(boid.mesh.position, _centerOfMass);
        const distanceToCenter = _relativePosition.length();
        radiusSum += distanceToCenter;
        radiusSqSum += distanceToCenter * distanceToCenter;
        angularMomentumSum += _cross.copy(_relativePosition).cross(boid.velocity).length();
        speedSum += boid.velocity.length();
    }

    const flockingRadius = radiusSum / count;
    const clustering = 1 / (1 + flockingRadius);
    const polarization = _sumDirection.length() / count;
    const angularMomentum = angularMomentumSum / count;
    const radiusVariance = Math.max(0, (radiusSqSum / count) - (flockingRadius * flockingRadius));
    const dispersion = Math.sqrt(radiusVariance);
    const averageSpeed = speedSum / count;

    flockingRadiusInput.value = `${flockingRadius.toFixed(2)} / ${clustering.toFixed(3)}`;
    polarizationInput.value = polarization.toFixed(3);
    angularMomentumInput.value = angularMomentum.toFixed(2);
    dispersionInput.value = dispersion.toFixed(2);
    averageSpeedInput.value = averageSpeed.toFixed(2);
}

calculateMetricsButton.addEventListener('click', () => {
    calculateGroupMetrics();
});

let lastTime = performance.now();
function animate() {
    stats.begin();

    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, MAX_DELTA);
    lastTime = now;

    frameCount++;

    if (frameCount % UPDATE_INTERVAL === 0) {
        frameCount = 0;
        if (choiceData === "spatial") {
            if (choiceView) {
                cellViz(scene);
            }
            spatialPartition.reset(); //technically no need to reset, it would still work, but after testing, performance seems to be better this way
            for (const school of boids) {
                for (const boid of school) {
                    spatialPartition.add(boid.mesh.position, boid);
                }
            }
        }

        if (choiceData === "octree") {
            if (choiceView) {
                octree.show();
            }
            octree.clear();
            for (const school of boids) {
                for (const boid of school) {
                    octree.insert(boid.mesh.position, boid);
                }
            }
        }
    }
    boids.forEach(school => {
        school.forEach((boid, index) => {
            _tmpPos.copy(boid.mesh.position);
            switch (choiceData) {
                case "spatial":
                    const near = spatialPartition.findNear(_tmpPos);
                    boid.update(near, index, delta, separationStr, cohesionStr, alignmentStr)
                    spatialPartition.rm(_tmpPos, boid);
                    spatialPartition.add(boid.mesh.position, boid);
                    break;
                case "octree":
                    const close = octree.findNear(_tmpPos) as Boid[];
                    boid.update(close, index, delta, separationStr, cohesionStr, alignmentStr);
                    break;
            }


        }
        )
    });



    targets.forEach(target => target.update(delta));

    renderer.render(scene, camera);
    stats.end();

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});