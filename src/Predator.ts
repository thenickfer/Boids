import * as THREE from 'three';
import type { Boid } from './Boids';
import { BOUNDS, BOUNDS_SOFTNESS, BOUNDS_STRENGTH } from './constants';
import type { Target } from './Target';
export class Predator {
    mesh: THREE.Mesh;
    speed: number;
    velocity: THREE.Vector3;
    targ: Target;
    constructor(targ: Target) {
        const geo = new THREE.BoxGeometry(0.5, 0.5, 2);
        const mat = new THREE.MeshToonMaterial({ color: 0xff8800 })
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.scale.set(3, 3, 3)
        this.speed = 0;
        this.velocity = new THREE.Vector3();
        this.targ = targ;
    }

    update(delta: number, nearPrey: Boid[]) {
        let nearestPreyPos = new THREE.Vector3();
        let closestDistance = Infinity;
        nearPrey.forEach(prey => {
            const distanceToTarget = this.mesh.position.distanceTo(prey.mesh.position);
            if (distanceToTarget < closestDistance) {
                nearestPreyPos = prey.mesh.position.clone();
                closestDistance = distanceToTarget;
            }
        })

        const pos = this.mesh.position;
        (['x', 'y', 'z'] as const).forEach(coord => {
            if (pos[coord] > BOUNDS - BOUNDS_SOFTNESS) {
                this.velocity[coord] -= (pos[coord] - (BOUNDS - BOUNDS_SOFTNESS)) * (BOUNDS_STRENGTH / BOUNDS_SOFTNESS);
            } else if (pos[coord] < BOUNDS_SOFTNESS - BOUNDS) {
                this.velocity[coord] += (-(BOUNDS - BOUNDS_SOFTNESS) - pos[coord]) * (BOUNDS_STRENGTH / BOUNDS_SOFTNESS);
            }
        })

        if (closestDistance >= 8) {
            const targetPosition = this.targ.mesh.position;
            const currentPosition = this.mesh.position;
            const tempVec = new THREE.Vector3().subVectors(targetPosition, currentPosition).normalize().multiplyScalar(this.speed);
            const tempQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tempVec);
            this.mesh.quaternion.slerp(tempQuat, 0.05);
            this.velocity.copy(tempVec)
            this.mesh.position.addScaledVector(this.velocity, delta);
            return;
        }

        this.speed = 30;

        const auxVec = new THREE.Vector3().subVectors(nearestPreyPos, this.mesh.position).normalize().multiplyScalar(0.9);
        const auxQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), auxVec);
        this.mesh.quaternion.slerp(auxQuat, 0.1);

        auxVec.set(0, 0, 1).applyQuaternion(auxQuat).multiplyScalar(this.speed);
        const newVec = new THREE.Vector3().subVectors(auxVec, this.velocity);
        this.velocity.add(newVec);

        const maxSpeed = 65;
        if (this.velocity.lengthSq() > maxSpeed * maxSpeed) {
            this.velocity.setLength(maxSpeed);
        }



        auxVec.copy(this.velocity).multiplyScalar(delta)

        pos.add(auxVec);

    }
}