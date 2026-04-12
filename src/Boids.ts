import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { Target } from './Target';
import { BOUNDS, BOUNDS_SOFTNESS, BOUNDS_STRENGTH } from './constants';

let model: THREE.Object3D | null = null;

export function loadBoidModel(confirm: boolean): Promise<void> {
    if (!confirm) {
        return Promise.resolve();
    }
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
const _vec5 = new THREE.Vector3();
const _quat1 = new THREE.Quaternion();
const _forward = new THREE.Vector3(0, 0, 1);
export class Boid {
    mesh: THREE.Object3D;
    target: Target | null;
    speed: number;
    velocity: THREE.Vector3;
    constructor(target: Target | null) {

        this.mesh = model?.clone(true) ?? new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.5, 2),
            new THREE.MeshPhongMaterial({
                color: 0x00FFFF,
                shininess: 100,
                specular: 0xFF00AA
            })
        );
        this.mesh.scale.set(1.5, 1.5, 1.5);

        this.speed = 100;

        this.target = target;

        this.velocity = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
    }

    update(school: Boid[], _index: number, delta: number, separationStr: number, cohesionStr: number, alignmentStr: number) {

        const separationStrength = Number.isFinite(separationStr) ? separationStr : 4;
        const cohesionStrength = Number.isFinite(cohesionStr) ? cohesionStr : 0.012;
        const alignmentStrength = Number.isFinite(alignmentStr) ? alignmentStr : 0.03;
        const steeringStrength = 0.08;
        const separationRadius = 6;
        const neighborRadius = 14;
        const linearDamping = 0;
        const quadraticDrag = 0.001;
        const maxAcceleration = 45;
        const dtScale = Math.min(delta * 60, 2);
        const targetMaxSpeed = 24;

        _vec5.copy(this.velocity);

        if (this.target) {
            const targetPosition = this.target.mesh.position;
            const currentPosition = this.mesh.position;

            _vec1.subVectors(targetPosition, currentPosition).normalize().multiplyScalar(0.9);

            const distanceToTarget = this.mesh.position.distanceTo(targetPosition);
            this.speed = Math.min(targetMaxSpeed, 0.2 * distanceToTarget);

            _vec2.copy(_vec1).multiplyScalar(this.speed);
            _vec3.subVectors(_vec2, this.velocity);
            this.velocity.add(_vec3.multiplyScalar(steeringStrength * dtScale));
        }


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
            _vec1.subVectors(center, this.mesh.position)/* .normalize() */.multiplyScalar(cohesionStrength * dtScale);
            this.velocity.add(_vec1);

            avgVelocity.divideScalar(neighborCount);
            _vec1.subVectors(avgVelocity, this.velocity).multiplyScalar(alignmentStrength * dtScale);
            this.velocity.add(_vec1);//alinhamento (steering, not raw speed injection)
        }
        if (tooCloseCount > 0) {
            separation.divideScalar(tooCloseCount)/* .normalize() */;
            separation.multiplyScalar(separationStrength * dtScale);
            this.velocity.add(separation);
        }

        this.velocity.multiplyScalar(Math.exp(-linearDamping * delta));
        const speed = this.velocity.length();
        if (speed > 1e-6) {
            this.velocity.multiplyScalar(1 / (1 + quadraticDrag * speed * delta));
        }

        this.velocity.y *= Math.exp(-0.6 * delta);

        this.velocity.x += (Math.random() - 0.5) * 0.0015;
        this.velocity.y += (Math.random() - 0.5) * 0.0015;
        this.velocity.z += (Math.random() - 0.5) * 0.0015;

        // Limit per-step change in velocity instead of clipping absolute speed.
        const maxDeltaV = maxAcceleration * Math.max(delta, 1e-6);
        _vec3.subVectors(this.velocity, _vec5);
        if (_vec3.lengthSq() > maxDeltaV * maxDeltaV) {
            _vec3.setLength(maxDeltaV);
            this.velocity.copy(_vec5).add(_vec3);
        }

        const pos = this.mesh.position;
        const softZone = Math.max(BOUNDS_SOFTNESS, 8);
        const innerBound = BOUNDS - softZone;
        const boundaryGain = (BOUNDS_STRENGTH / softZone) * dtScale;

        (['x', 'y', 'z'] as const).forEach(coord => {
            const nextPos = pos[coord] + this.velocity[coord] * delta;
            if (nextPos > innerBound) {
                this.velocity[coord] -= (nextPos - innerBound) * boundaryGain;
            } else if (nextPos < -innerBound) {
                this.velocity[coord] += (-innerBound - nextPos) * boundaryGain;
            }
        });

        _vec1.copy(this.velocity).multiplyScalar(delta)

        pos.add(_vec1);

        // Keep orientation synced with movement even when target following is disabled.
        if (this.velocity.lengthSq() > 1e-6) {
            _vec1.copy(this.velocity).normalize();
            _quat1.setFromUnitVectors(_forward, _vec1);
            this.mesh.quaternion.slerp(_quat1, 0.1);
        }

    }
}