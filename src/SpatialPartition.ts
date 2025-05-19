import * as THREE from 'three';
export class SpatialPartition<B> {
    private _spatialPartitionGrid: Map<string, B[]>;
    private _objectCellMap: Map<B, THREE.Vector3>;
    private cellSize: number;
    private neighborCellsOffset: number;

    constructor(cellSize: number, neighborCellsOffset: number) {
        this._spatialPartitionGrid = new Map<string, B[]>();
        this._objectCellMap = new Map<B, THREE.Vector3>();

        this.cellSize = cellSize;
        this.neighborCellsOffset = neighborCellsOffset;
    }

    findNear(vector: THREE.Vector3) {
        const index = this.getIndex(vector);
        const results: B[] = [];

        for (let x = -this.neighborCellsOffset; x <= this.neighborCellsOffset; x++) {
            for (let y = -this.neighborCellsOffset; y <= this.neighborCellsOffset; y++) {
                for (let z = -this.neighborCellsOffset; z <= this.neighborCellsOffset; z++) {
                    const neighborIndex = new THREE.Vector3(
                        index.x + x,
                        index.y + y,
                        index.z + z
                    );
                    const key = `${neighborIndex.x},${neighborIndex.y},${neighborIndex.z}`;
                    this._spatialPartitionGrid.get(key)?.forEach((obj: B) => {
                        results.push(obj);
                    })

                }
            }
        }
        return results;

    }

    reset() {
        this._spatialPartitionGrid.clear();
        this._objectCellMap.clear();
    }

    add(index: THREE.Vector3, obj: B) {
        index = this.getIndex(index);
        this.addByIndex(index, obj);
    }

    rm(index: THREE.Vector3, obj: B) {
        index = this.getIndex(index);
        this.rmByIndex(index, obj);
    }

    private getIndex(params: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3(
            Math.floor(params.x / this.cellSize),
            Math.floor(params.y / this.cellSize),
            Math.floor(params.z / this.cellSize)
        )
    }

    private addByIndex(index: THREE.Vector3, obj: B) {
        const key = `${index.x},${index.y},${index.z}`;

        const prevIndex = this._objectCellMap.get(obj);
        if (prevIndex && !prevIndex.equals(index)) {
            this.rmByIndex(prevIndex, obj);
        }

        if (!this._spatialPartitionGrid.has(key)) {
            this._spatialPartitionGrid.set(key, []);
        }
        this._spatialPartitionGrid.get(key)!.push(obj);
        this._objectCellMap.set(obj, index);

    }

    private rmByIndex(index: THREE.Vector3, obj: B) {
        const key = `${index.x},${index.y},${index.z}`;
        if (this._spatialPartitionGrid.has(key)) {
            const arr = this._spatialPartitionGrid.get(key)!;
            const i = arr.indexOf(obj);
            if (i !== -1) {
                this._spatialPartitionGrid.get(key)?.splice(i, 1)
            }
            if (arr.length < 1) {
                this._spatialPartitionGrid.delete(key);
            }
        }
        this._objectCellMap.delete(obj);

    }

}