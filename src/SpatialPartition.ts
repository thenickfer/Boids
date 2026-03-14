import * as THREE from 'three';

type CellIndex = readonly [number, number, number];
export class SpatialPartition<B> {
    private _spatialPartitionGrid: Map<number, Map<number, Map<number, B[]>>>;
    private _objectCellMap: Map<B, CellIndex>;
    private cellSize: number;
    private neighborCellsOffset: number;

    constructor(cellSize: number, neighborCellsOffset: number) {
        this._spatialPartitionGrid = new Map();
        this._objectCellMap = new Map();

        this.cellSize = cellSize;
        this.neighborCellsOffset = neighborCellsOffset;
    }

    findNear(vector: THREE.Vector3) {
        const [ix, iy, iz] = this.getIndex(vector);
        const results: B[] = [];

        for (let x = -this.neighborCellsOffset; x <= this.neighborCellsOffset; x++) {
            for (let y = -this.neighborCellsOffset; y <= this.neighborCellsOffset; y++) {
                for (let z = -this.neighborCellsOffset; z <= this.neighborCellsOffset; z++) {
                    const bucket = this.getBucket(ix + x, iy + y, iz + z);
                    if (bucket) results.push(...bucket);
                    /* const neighborIndex = new THREE.Vector3(
                        index.x + x,
                        index.y + y,
                        index.z + z
                    );
                    const key = `${neighborIndex.x},${neighborIndex.y},${neighborIndex.z}`;
                    this._spatialPartitionGrid.get(key)?.forEach((obj: B) => {
                        results.push(obj);
                    }) */

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
        const [x, y, z] = this.getIndex(index);
        this.addByIndex(x, y, z, obj);
    }

    rm(index: THREE.Vector3, obj: B) {
        const [x, y, z] = this.getIndex(index);
        this.rmByIndex(x, y, z, obj);
    }

    private getIndex(v: THREE.Vector3): CellIndex {
        return [
            Math.floor(v.x / this.cellSize),
            Math.floor(v.y / this.cellSize),
            Math.floor(v.z / this.cellSize)
        ] as const;
    }

    private getBucket(x: number, y: number, z: number): B[] | undefined {
        return this._spatialPartitionGrid.get(x)?.get(y)?.get(z);
    }

    private ensureBucket(x: number, y: number, z: number): B[] {
        let yMap = this._spatialPartitionGrid.get(x);
        if (!yMap) {
            yMap = new Map();
            this._spatialPartitionGrid.set(x, yMap);
        }

        let zMap = yMap.get(y);
        if (!zMap) {
            zMap = new Map();
            yMap.set(y, zMap);
        }

        let bucket = zMap.get(z);
        if (!bucket) {
            bucket = [];
            zMap.set(z, bucket);
        }

        return bucket;
    }

    private addByIndex(x: number, y: number, z: number, obj: B) {
        const prevIndex = this._objectCellMap.get(obj);
        if (prevIndex) {
            if (prevIndex[0] !== x || prevIndex[1] !== y || prevIndex[2] !== z) {
                this.rmByIndex(prevIndex[0], prevIndex[1], prevIndex[2], obj);
                console.log("a")
            } else return
        }

        const bucket = this.ensureBucket(x, y, z);
        bucket.push(obj);
        this._objectCellMap.set(obj, [x, y, z] as const);

        /* if (!this._spatialPartitionGrid.has(key)) {
            this._spatialPartitionGrid.set(key, []);
        }
        this._spatialPartitionGrid.get(key)!.push(obj);
        this._objectCellMap.set(obj, index); */

    }

    private rmByIndex(x: number, y: number, z: number, obj: B) {
        const yMap = this._spatialPartitionGrid.get(x);
        const zMap = yMap?.get(y);
        const bucket = zMap?.get(z);

        if (bucket) {
            const i = bucket.indexOf(obj);
            if (i !== -1) bucket.splice(i, 1);

            if (bucket.length === 0) {
                zMap!.delete(z);
                if (zMap!.size === 0) {
                    yMap!.delete(y);
                    if (yMap!.size === 0) {
                        this._spatialPartitionGrid.delete(x);
                    }
                }
            }
        }
        /*  
         if (this._spatialPartitionGrid.has(key)) {
             const arr = this._spatialPartitionGrid.get(key)!;
             const i = arr.indexOf(obj);
             if (i !== -1) {
                 this._spatialPartitionGrid.get(key)?.splice(i, 1)
             }
             if (arr.length < 1) {
                 this._spatialPartitionGrid.delete(key);
             }
         } */
        this._objectCellMap.delete(obj);

    }

}