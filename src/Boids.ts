import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Target } from './Target';

export class Boid {
    target: Target;
    speed: number;
    velocity: THREE.Vector3;
    position: THREE.Vector3;
    index: number;
    quaternion: THREE.Quaternion;
    constructor(target: Target, index: number) {

        this.speed = 0;

        this.target = target;

        this.index = index;
        this.position = new THREE.Vector3(
            Math.random() * 50 - 25,
            Math.random() * 50 - 25,
            Math.random() * 50 - 25
        );
        this.velocity = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );
        this.quaternion = new THREE.Quaternion();
        this.target = target;
    }

    update(school: Boid[], _index: number, delta: number) {

        const separationStrength = 8;
        const cohesionStrength = 0.008;
        const alignmentStrength = 0.008;
        const steeringStrength = 0.05;
        const separationRadius = 10;
        const neighborRadius = 8;

        const targetPosition = this.target.mesh.position.clone();
        const currentPosition = this.position.clone();
        const targetDirection = new THREE.Vector3().subVectors(targetPosition, currentPosition).normalize();
        const targ = new THREE.Quaternion();
        targ.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetDirection)
        this.quaternion.slerp(targ, 0.05);
        //this.mesh.lookAt(this.target.mesh.position);

        const distanceToTarget = this.position.distanceTo(this.target.mesh.position);
        const spring = 0.9;
        this.speed = spring * distanceToTarget;

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion).multiplyScalar(this.speed);

        const steering = new THREE.Vector3().subVectors(forward, this.velocity);
        this.velocity.add(steering.multiplyScalar(steeringStrength));


        const center = new THREE.Vector3();
        const separation = new THREE.Vector3();
        const avgVelocity = new THREE.Vector3();
        let neighborCount = 0;
        let tooCloseCount = 0;

        school.forEach((boid, index) => {
            if (index !== _index) {
                const distance = this.position.distanceTo(boid.position);
                if (distance < neighborRadius) {
                    center.add(boid.position);
                    avgVelocity.add(boid.velocity);
                    neighborCount++;
                }
                if (distance < separationRadius && distance > 0) {
                    tooCloseCount++;
                    const dist = new THREE.Vector3().subVectors(this.position, boid.position);
                    separation.add(dist.normalize().divideScalar(distance));
                }
            }
        });

        //aqui, normalizar ou nao, ainda nao decidi
        if (neighborCount > 0) {
            center.divideScalar(neighborCount);
            const cohesion = new THREE.Vector3().subVectors(center, this.position)/* .normalize() */.multiplyScalar(cohesionStrength);
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

        this.position.add(this.velocity.clone().multiplyScalar(delta));
    }
}