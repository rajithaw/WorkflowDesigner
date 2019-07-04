import { Item } from './item';
import { ItemType } from './itemType';
import { Level } from './level';
import { LevelType } from './levelType';

export class IntermediateLevel extends Level {

    constructor() {
        super();
        this._type = LevelType.Intermediate;
    }

    public addItem(item: Item): void {
        if (item.type !== ItemType.Intermediate) {
            throw Error('Cannot add items other than intermediate items');
        }

        if (this._items.length > 0) {
            throw Error('Cannot contain more than one intermediate item');
        }

        super.addItem(item);
    }

    public removeItem(item: Item): void {
        this._items.pop();
    }
}
