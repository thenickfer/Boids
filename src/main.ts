import * as THREE from 'three';
import { Boid, loadBoidModel } from './Boids';
import { Target } from './Target';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x58baff)

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 100;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 7);
directionalLight.position.set(5, 10, 100);
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 3);
pointLight.position.set(-5, -10, 10);
scene.add(pointLight);
const targets: Target[] = [];
const boids: Boid[][] = [];
const SPHERE_RADIUS = 10;

const NUM_BOIDS = 500;
const NUM_TARGETS = 7;

function randomPointInSphere(radius: number): THREE.Vector3 {
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
} //Nao vi vantagem em inicializar eles como esfera

function randomPointInRectangle(): THREE.Vector3 {
    const x = Math.random() * 50 - 25;
    const y = Math.random() * 50 - 25;
    const z = Math.random() * 80 - 40;

    return new THREE.Vector3(
        x, y, z
    );
}

loadBoidModel().then(() => {
    for (let j = 0; j < NUM_TARGETS; j++) {
        const target = new Target();
        scene.add(target.mesh);
        targets.push(target);

        boids[j] = [];

        for (let i = 0; i < NUM_BOIDS; i++) {
            const boid = new Boid(targets[j]);
            boid.mesh.position.copy(randomPointInRectangle());
            scene.add(boid.mesh);
            boids[j].push(boid);
        }
    }
    animate();
});

function animate() {
    requestAnimationFrame(animate);

    boids.forEach(school => {
        school.forEach((boid, index) => boid.update(school, index))
    });

    targets.forEach(target => target.update());

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});