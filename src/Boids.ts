import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Target } from './Target';

let model: THREE.Object3D | null = null;

export function loadBoidModel(): Promise<void> {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load('/fish_low_poly/scene.gltf', (gltf) => {
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
        ).normalize().multiplyScalar(0.05);
    }

    update(school: Boid[], _index: number) {

        const separationStrength = 0.7;
        const cohesionStrength = 0.03;
        const alignmentStrength = 0.03;
        const steeringStrength = 0.05;
        const separationRadius = 3;
        const targetWeight = 0.3;
        const neighborRadius = 5;



        this.mesh.lookAt(this.target.mesh.position);

        const distanceToTarget = this.mesh.position.distanceTo(this.target.mesh.position);
        const spring = 0.8;
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

        if (neighborCount > 0) {
            center.divideScalar(neighborCount);
            const cohesion = new THREE.Vector3().subVectors(center, this.mesh.position).normalize().multiplyScalar(cohesionStrength);
            this.velocity.add(cohesion);

            avgVelocity.divideScalar(neighborCount);
            const alignment = avgVelocity.clone().normalize().multiplyScalar(alignmentStrength);
            this.velocity.add(alignment);
        }
        if (tooCloseCount > 0) {
            separation.divideScalar(tooCloseCount).normalize();
            separation.multiplyScalar(separationStrength);
            this.velocity.add(separation);
        }

        this.velocity.multiplyScalar(0.98);

        const maxSpeed = 0.12;
        if (this.velocity.length() > maxSpeed) {
            this.velocity.setLength(maxSpeed);
        }

        this.mesh.position.add(this.velocity);
    }
}