import * as THREE from 'three';
import { SPEED, BOUNDS } from './constants';



export class Target {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    constructor(radius = 15, color = 0xff0000) {
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(new THREE.Vector3(
            Math.random() * BOUNDS * 2 - BOUNDS,
            Math.random() * BOUNDS * 2 - BOUNDS,
            Math.random() * BOUNDS * 2 - BOUNDS
        ));
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        this.velocity = direction.clone().multiplyScalar(SPEED * 0.2);

    }

    update() {
        this.mesh.position.add(this.velocity);

        (['x', 'y', 'z'] as const).forEach(axis => {
            if (Math.abs(this.mesh.position[axis]) > BOUNDS) {
                this.velocity[axis] *= -1;
                this.mesh.position[axis] = Math.sign(this.mesh.position[axis]) * BOUNDS;
            }
        });

    }
}