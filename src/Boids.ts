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

const _vec1 = new THREE.Vector3();
const _vec2 = new THREE.Vector3();
const _vec3 = new THREE.Vector3();
const _vec4 = new THREE.Vector3();
const _quat1 = new THREE.Quaternion();
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

        const separationStrength = 10;
        const cohesionStrength = 0.005;
        const alignmentStrength = 0.008;
        const steeringStrength = 0.05;
        const separationRadius = 12;
        const neighborRadius = 10;

        const targetPosition = this.target.mesh.position;
        const currentPosition = this.mesh.position;

        _vec1.subVectors(targetPosition, currentPosition).normalize(); // targetDirection
        _quat1.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _vec1);
        this.mesh.quaternion.slerp(_quat1, 0.05);

        const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
        this.speed = 0.3 * distanceToTarget;

        _vec2.set(0, 0, 1).applyQuaternion(_quat1).multiplyScalar(this.speed);
        _vec3.subVectors(_vec2, this.velocity);
        this.velocity.add(_vec3.multiplyScalar(steeringStrength));


        const center = _vec4.set(0, 0, 0)
        const separation = new THREE.Vector3();
        const avgVelocity = new THREE.Vector3();
        let neighborCount = 0;
        let tooCloseCount = 0;

        const neighborRadiusSq = neighborRadius * neighborRadius;
        const separationRadiusSq = separationRadius * separationRadius;

        school.forEach((boid, index) => {
            if (index !== _index) {
                const otherPos = boid.mesh.position;
                const distanceSq = this.mesh.position.distanceToSquared(otherPos); //Usar isso melhorou um pouco a performance
                if (distanceSq < neighborRadiusSq) {
                    center.add(otherPos);
                    avgVelocity.add(boid.velocity);
                    neighborCount++;
                }
                if (distanceSq < separationRadiusSq && distanceSq > 0) {
                    tooCloseCount++;
                    _vec1.subVectors(this.mesh.position, otherPos).normalize().divideScalar(Math.sqrt(distanceSq));
                    separation.add(_vec1);
                }
            }
        });

        //aqui, normalizar ou nao, ainda nao decidi
        if (neighborCount > 0) {
            center.divideScalar(neighborCount);//coesao
            _vec1.subVectors(center, this.mesh.position)/* .normalize() */.multiplyScalar(cohesionStrength);
            this.velocity.add(_vec1);

            avgVelocity.divideScalar(neighborCount).multiplyScalar(alignmentStrength);
            this.velocity.add(avgVelocity);//alinhamento
        }
        if (tooCloseCount > 0) {
            separation.divideScalar(tooCloseCount)/* .normalize() */;
            separation.multiplyScalar(separationStrength);
            this.velocity.add(separation);
        }

        this.velocity.multiplyScalar(0.98);

        const maxSpeed = 90;
        if (this.velocity.lengthSq() > maxSpeed * maxSpeed) {
            this.velocity.setLength(maxSpeed + (Math.random() / 10 - 0.05));
        }

        this.velocity.y * 0.9;

        this.velocity.x += (Math.random() - 0.5) * 0.01;
        this.velocity.y += (Math.random() - 0.5) * 0.01;
        this.velocity.z += (Math.random() - 0.5) * 0.01;

        _vec1.copy(this.velocity).multiplyScalar(delta)
        this.mesh.position.add(_vec1);
    }
}