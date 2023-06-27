import {Point} from './lib/point.js';
import {QuadTree} from './lib/tree.js';
import * as searchMode from './lib/search-mode.js';
import * as tileType from './lib/tile-type.js';

export const tree = new QuadTree();

// SR Nor Latch
tree.getTileData(new Point(0n, 2n), searchMode.make).type = tileType.io;
tree.getTileData(new Point(1n, 1n), searchMode.make).type = tileType.conjoinS;
tree.getTileData(new Point(1n, 2n), searchMode.make).type = tileType.conjoinE;
tree.getTileData(new Point(2n, 0n), searchMode.make).type = tileType.io;
tree.getTileData(new Point(2n, 1n), searchMode.make).type = tileType.disjoinS;
tree.getTileData(new Point(2n, 2n), searchMode.make).type = tileType.negate;
tree.getTileData(new Point(2n, 3n), searchMode.make).type = tileType.conjoinN;
tree.getTileData(new Point(2n, 4n), searchMode.make).type = tileType.io;
tree.getTileData(new Point(3n, 2n), searchMode.make).type = tileType.disjoinW;
tree.getTileData(new Point(3n, 3n), searchMode.make).type = tileType.conjoinW;
tree.getTileData(new Point(4n, 2n), searchMode.make).type = tileType.io;
