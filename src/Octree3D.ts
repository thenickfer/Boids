import * as THREE from 'three';

type element<B> = {
    obj: B;
    pos: THREE.Vector3;
}

type Range = {
    left: number;
    right: number;
    top: number;
    bottom: number;
    front: number;
    back: number;
};

class Cube<B> {
    coords: THREE.Vector3;
    width: number;
    height: number;
    depth: number;
    cellCapacity: number;
    children: Array<Cube<B>> | null;
    elements: element<B>[];

    constructor(coords: THREE.Vector3, width: number, height: number, depth: number, cellCapacity: number) {
        this.cellCapacity = cellCapacity;
        this.coords = coords;
        this.height = height;
        this.width = width;
        this.depth = depth;
        this.children = null;
        this.elements = [];
    }

    contains(point: THREE.Vector3) {
        return (
            point.x >= this.coords.x - this.width / 2 && point.x <= this.coords.x + this.width / 2 &&
            point.y >= this.coords.y - this.height / 2 && point.y <= this.coords.y + this.height / 2 &&
            point.z >= this.coords.z - this.depth / 2 && point.z <= this.coords.z + this.depth / 2
        );
    }

    insert(coords: THREE.Vector3, obj: B) {



        if (this.elements.length < this.cellCapacity && this.children == null) {
            this.elements.push({ obj: obj, pos: coords });
            return;
        }
        if (this.children == null) {
            this.subdivide();
            for (const e of this.elements) {
                for (let i = 0; i < 8; i++) {
                    if (this.children![i].contains(e.pos)) {
                        this.children![i].insert(e.pos, e.obj)
                    }
                }
            }
            this.elements = [];
        }

        for (let i = 0; i < 8; i++) {
            if (this.children![i].contains(coords)) {
                this.children![i].insert(coords, obj);
                return;
            }
        }



    }

    subdivide() {

        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const halfDepth = this.depth / 2;
        const quarterWidth = this.width / 4;
        const quarterHeight = this.height / 4;
        const quarterDepth = this.depth / 4;

        this.children = new Array<Cube<B>>(8);

        const offsets = [
            new THREE.Vector3(-quarterWidth, -quarterHeight, -quarterDepth), //frente esquerda inf
            new THREE.Vector3(quarterWidth, -quarterHeight, -quarterDepth), //frente direita inf
            new THREE.Vector3(-quarterWidth, quarterHeight, -quarterDepth), //frente esquerda sup
            new THREE.Vector3(quarterWidth, quarterHeight, -quarterDepth), //frente direita sup
            new THREE.Vector3(-quarterWidth, -quarterHeight, quarterDepth), //fundo esquerda inf
            new THREE.Vector3(quarterWidth, -quarterHeight, quarterDepth), //fundo direita inf
            new THREE.Vector3(-quarterWidth, quarterHeight, quarterDepth), //fundo esquerda sup
            new THREE.Vector3(quarterWidth, quarterHeight, quarterDepth), //fundo direita sup
        ];

        for (let i = 0; i < 8; i++) {
            const childCenter = this.coords.clone().add(offsets[i]);
            this.children[i] = new Cube<B>(childCenter, halfWidth, halfHeight, halfDepth, this.cellCapacity);
        }
    }

    findNear(range: Range) {
        const found: B[] = [];
        if (!this.intersects(range)) {
            return found;
        }
        if (this.children != null) {
            this.children.forEach((cube) => {
                found.push(...cube.findNear(range));
            })
        }
        if (this.elements.length > 0) {
            this.elements.forEach(element => found.push(element.obj))
        }
        return found;
    }

    private intersects(range: Range) {
        return !(range.top < this.coords.y - this.height / 2 ||
            range.bottom > this.coords.y + this.height / 2 ||
            range.left > this.coords.x + this.width / 2 ||
            range.right < this.coords.x - this.width / 2 ||
            range.front > this.coords.z + this.depth / 2 ||
            range.back < this.coords.z - this.depth / 2
        )
    }
}



export class Octree3D<B> {
    scene: THREE.Scene;
    root: Cube<B>;
    width: number;
    height: number;
    depth: number;
    cellCapacity: number;
    cellVizMesh: THREE.InstancedMesh | null = null;
    offset: number;


    constructor(scene: THREE.Scene, cellCapacity: number, width: number, height: number, depth: number, cellSize: number, neighborCellsOffset: number) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.cellCapacity = cellCapacity;
        this.root = new Cube(new THREE.Vector3(0, 0, 0), width, height, depth, cellCapacity);
        this.offset = cellSize * neighborCellsOffset;
    }

    insert(coords: THREE.Vector3, obj: B) {
        this.root.insert(coords, obj);
    }

    clear() {
        this.root = new Cube(new THREE.Vector3(0, 0, 0), this.width, this.height, this.depth, this.cellCapacity);
    }

    show() {
        if (this.cellVizMesh) {
            this.scene.remove(this.cellVizMesh);
            this.cellVizMesh.geometry.dispose();
            if (Array.isArray(this.cellVizMesh.material)) {
                this.cellVizMesh.material.forEach(mat => mat.dispose());
            } else {
                this.cellVizMesh.material.dispose();
            }
            this.cellVizMesh = null;
        }

        const cubes: { center: THREE.Vector3, size: THREE.Vector3 }[] = [];
        function traverse(node: Cube<B>) {
            cubes.push({
                center: node.coords.clone(),
                size: new THREE.Vector3(node.width, node.height, node.depth)
            });
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        }
        traverse(this.root);

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const mesh = new THREE.InstancedMesh(geometry, material, cubes.length);

        const tempMatrix = new THREE.Matrix4();
        for (let i = 0; i < cubes.length; i++) {
            const { center, size } = cubes[i];
            tempMatrix.compose(
                center,
                new THREE.Quaternion(),
                size
            );
            mesh.setMatrixAt(i, tempMatrix);
        }

        this.cellVizMesh = mesh;
        this.scene.add(mesh);
    }

    findNear(pos: THREE.Vector3) {
        const range: Range = {
            left: pos.x - this.offset,
            right: pos.x + this.offset,
            top: pos.y + this.offset,
            bottom: pos.y - this.offset,
            front: pos.z - this.offset,
            back: pos.z + this.offset
        };


        return this.root.findNear(range);

    }
}