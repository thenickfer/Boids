import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Target } from './Target';

let model: THREE.Object3D | null = null;

export function loadBoidModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('/assets/fish_low_poly/scene.gltf', (gltf) => {
            console.log(gltf.scene);
            model = gltf.scene;
            resolve();
        }, undefined, reject);
    });
}

export class Boid {
    mesh: THREE.Object3D;
    target: Target;
    speed: number;
    velocity: THREE.Vector3;
    constructor(target: Target) {

        this.mesh = model?.clone(true) ?? new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x000A1A })
        );
        this.mesh.scale.set(1, 1, 1);

        this.speed = 0;

        this.target = target;

        this.velocity = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
    }

    update(school: Boid[], _index: number, delta: number) {

        const separationStrength = 8;
        const cohesionStrength = 0.008;
        const alignmentStrength = 0.008;
        const steeringStrength = 0.05;
        const separationRadius = 10;
        const neighborRadius = 8;

        const targetPosition = this.target.mesh.position.clone();
        const currentPosition = this.mesh.position.clone();
        const targetDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition).normalize();
        const targ = new THREE.Quaternion();
        targ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetDirection)
        this.mesh.quaternion.slerp(targ, 0.05);
        //this.mesh.lookAt(this.target.mesh.position);

        const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);
        const spring = 0.9;
        this.speed = spring * distanceToTarget;

        const forward = new THREE.Vector3(0, 0, 1).applyEuler(this.mesh.rotation).multiplyScalar(this.speed);

        const steering = new THREE.Vector3().subVectors(forward, this.velocity);
        this.velocity.add(steering.multiplyScalar(steeringStrength));


        const center = new THREE.Vector3();
        const separation = new THREE.Vector3();
        const avgVelocity = new THREE.Vector3();
        let neighborCount = 0;
        let tooCloseCount = 0;

        school.forEach((boid, index) => {
            if (index !== _index) {
                const distance = this.mesh.position.distanceTo(boid.mesh.position);
                if (distance < neighborRadius) {
                    center.add(boid.mesh.position);
                    avgVelocity.add(boid.velocity);
                    neighborCount++;
                }
                if (distance < separationRadius && distance > 0) {
                    tooCloseCount++;
                    const dist = new THREE.Vector3().subVectors(this.mesh.position, boid.mesh.position);
                    separation.add(dist.normalize().divideScalar(distance));
                }
            }
        });

        //aqui, normalizar ou nao, ainda nao decidi
        if (neighborCount > 0) {
            center.divideScalar(neighborCount);
            const cohesion = new THREE.Vector3().subVectors(center, this.mesh.position)/* .normalize() */.multiplyScalar(cohesionStrength);
            this.velocity.add(cohesion);

            avgVelocity.divideScalar(neighborCount);
            const alignment = avgVelocity.clone()/* .normalize() */.multiplyScalar(alignmentStrength);
            this.velocity.add(alignment);
        }
        if (tooCloseCount > 0) {
            separation.divideScalar(tooCloseCount)/* .normalize() */;
            separation.multiplyScalar(separationStrength);
            this.velocity.add(separation);
        }

        this.velocity.multiplyScalar(0.98);

        const maxSpeed = 60;
        if (this.velocity.length() > maxSpeed) {
            this.velocity.setLength(maxSpeed + (Math.random() / 10 - 0.05));
        }

        const jitter = new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
        );
        this.velocity.add(jitter);

        this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    }
}