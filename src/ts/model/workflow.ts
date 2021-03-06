import { Connector } from './connector';
import { EndItem } from './endItem';
import { EndLevel } from './endLevel';
import { IntermediateItem } from './intermediateItem';
import { IntermediateLevel } from './intermediateLevel';
import { Item } from './item';
import { Level } from './level';
import { LevelType } from './levelType';
import { StartItem } from './startItem';
import { StartLevel } from './startLevel';
import { WorkflowLevel } from './workflowLevel';

export class Workflow {
    private levels: Level [];
    private connectors: Connector [];

    constructor() {
        this.levels = [];
        this.connectors = [];

        // Initially workflow consists of a start level and an end level with an empty intermediate level in between
        const startLevel = new StartLevel();
        const endLevel = new EndLevel();
        const startItem = new StartItem();
        const endItem = new EndItem();

        startLevel.addItem(startItem);
        endLevel.addItem(endItem);

        this.levels.push(startLevel);
        this.levels.push(new IntermediateLevel());
        this.levels.push(endLevel);

        this.connectors.push(new Connector(startItem, endItem));
    }

    public addItem(level: number, item: Item) {
        this.addItemToLevel(this.getLevel(level), item);
    }

    public addItemToLevel(level: Level, item: Item) {
        this.addItemInternal(level, item);
        this.adjustConnectorsAfterItemAdd(level, item);
    }

    public insertItemAfter(level: number, item: Item) {
        this.insertItemAfterLevel(this.getLevel(level), item);
    }

    public insertItemAfterLevel(level: Level, item: Item) {
        const workflowLevel = this.insertWrokflowLevelAfter(level);
        this.addItemInternal(workflowLevel, item);

        this.adjustConnectorsAfterItemInsert(workflowLevel, item);
    }

    public removeItem(level: number, item: Item) {
        this.removeItemFromLevel(this.getLevel(level), item);
    }

    public removeItemFromLevel(level: Level, item: Item) {
        level.removeItem(item);

        if (level.hasItems) {
            this.adjustWorkflowAfterLevelItemsUpdate(level);
            this.adjustConnectorsAfterItemRemove(level, item);
        } else {
            // If last item, remove the level as well
            this.removeWorkflowLevel(level);
        }
    }

    public getLevels(): Level[] {
        return this.levels.filter(l => l.type !== LevelType.Intermediate);
    }

    public getAllLevels(): Level[] {
        return this.levels;
    }

    public getMaxLevel(): Level {
        const sortedLevels = this.levels.slice().sort((a: Level, b: Level) => {
            const aItemsCount = a.items.length;
            const bItemsCount = b.items.length;

            return bItemsCount - aItemsCount;   // sort descending
        });

        return sortedLevels[0];
    }

    public getAllItems(): Item[] {
        const result: Item[] = [];

        this.levels.forEach(level => {
            result.push(...level.items);
        });

        return result;
    }

    public getConnectors(): Connector[] {
        return this.connectors;
    }

    public getPreviousLevel(level: Level, previousCount = 1): Level {
        const levelIndex = this.getLevelIndex(level);

        if (levelIndex < 0) {
            throw Error('Level does not exist');
        }

        if (levelIndex - previousCount < 0) {
            throw Error('Previous level does not exist');
        }

        return this.levels[levelIndex - previousCount];
    }

    public getNextLevel(level: Level, nextCount = 1): Level {
        const levelIndex = this.getLevelIndex(level);

        if (levelIndex < 0) {
            throw Error('Level does not exist');
        }

        if (levelIndex + nextCount > this.levels.length - 1) {
            throw Error('Next level does not exist');
        }

        return this.levels[levelIndex + nextCount];
    }

    private getLevelIndex(level: Level): number {
        return this.levels.findIndex(l => l === level);
    }

    // There is an intermediate level between any 2 observable levels.
    // Therefore the observed level value is difreent from the internal level value
    private getInternalLevelValue(level: number) {
        return level * 2;
    }

    // Gets the observable level
    private getLevel(level: number) {
        const internalLevel = this.getInternalLevelValue(level);

        if (this.levels.length < internalLevel) {
            throw Error('Level does not exist');
        }

        return this.levels[internalLevel];
    }

    private addItemInternal(level: Level, item: Item) {
        level.addItem(item);

        this.adjustWorkflowAfterLevelItemsUpdate(level);
    }

    private insertWrokflowLevelAfter(level: Level) {
        const internalLevel = this.getLevelIndex(level);

        if (level.type === LevelType.End) {
            throw Error('Cannot insert level after the end level');
        }

        if (level.type === LevelType.Intermediate) {
            throw Error('Cannot insert level after an intermediate level');
        }

        const workflowLevel = new WorkflowLevel();

        // Insert intermediate level first because there is an intermediate level between any 2 levels
        this.levels.splice(internalLevel + 1, 0, new IntermediateLevel());
        this.levels.splice(internalLevel + 2, 0, workflowLevel);

        return workflowLevel;
    }

    private removeWorkflowLevel(level: Level) {
        if (level.type === LevelType.Start
            || level.type === LevelType.End) {
            throw Error('Cannot remove start or end levels');
        }

        const levelIndex = this.getLevelIndex(level);
        this.levels.splice(levelIndex, 2);   // Remove the specified level and the next intermediate level

        this.adjustWorkflowAfterLevelRemove(levelIndex);
        this.adjustConnectorsAfterLevelRemove(levelIndex);
    }

    private adjustWorkflowAfterLevelItemsUpdate(updatedLevel: Level) {
        const levelItemsCount = updatedLevel.items.length;
        const previousIntermediateLevel = this.getPreviousLevel(updatedLevel);
        const nextIntermediateLevel = this.getNextLevel(updatedLevel);

        if (levelItemsCount > 1) {
            const previousWorkflowLevel = this.getPreviousLevel(updatedLevel, 2);
            const previousWorkflowLevelItemsCount = previousWorkflowLevel.items.length;

            if (previousWorkflowLevelItemsCount > 1) {
                if (!previousIntermediateLevel.hasItems) {
                    // If item added workflow level has more than one item and previous
                    // workflow level has more than one item then previous intermediate level
                    // should have an intermediate item
                    previousIntermediateLevel.addItem(new IntermediateItem());
                }
            } else {
                // If previous workflow level has only one item then previous intermediate level
                // should not have an intermediate item
                previousIntermediateLevel.removeItem(null);
            }

            const nextWorkflowLevel = this.getNextLevel(updatedLevel, 2);
            const nextWorkflowLevelItemsCount = nextWorkflowLevel.items.length;

            if (nextWorkflowLevelItemsCount > 1) {
                if (!nextIntermediateLevel.hasItems) {
                    // If item added workflow level has more than one item and next workflow level has
                    // more than one item then next intermediate level should have an intermediate item
                    nextIntermediateLevel.addItem(new IntermediateItem());
                }
            } else {
                // If next workflow level has only one item then next intermediate level
                // should not have an intermediate item
                nextIntermediateLevel.removeItem(null);
            }
        } else {
            // If item added workflow level has only one item then next/previous intermediate levels
            // should not have an intermediate item
            previousIntermediateLevel.removeItem(null);
            nextIntermediateLevel.removeItem(null);
        }
    }

    private adjustWorkflowAfterLevelRemove(removedLevelIndex: number) {
        const currentLevelAtRemovedIndex = this.levels[removedLevelIndex];
        const levelItemsCount = currentLevelAtRemovedIndex.items.length;
        const previousIntermediateLevel = this.getPreviousLevel(currentLevelAtRemovedIndex);

        if (levelItemsCount > 1) {
            const previousLevel = this.getPreviousLevel(currentLevelAtRemovedIndex, 2);
            const previousLevelItemsCount = previousLevel.items.length;

            if (previousLevelItemsCount > 1) {
                // If workflow level at removed index and previous workflow level has more than one item
                // then there should be an intermediate item
                if (!previousIntermediateLevel.hasItems) {
                    previousIntermediateLevel.addItem(new IntermediateItem());
                }
            } else {
                // If previous workflow level has only one item then previous intermediate leve
                // should not have an intermediate item
                previousIntermediateLevel.removeItem(null);
            }
        } else {
            // If workflow level at removed index has only one item then previous intermediate level
            // should not have an intermediate item
            previousIntermediateLevel.removeItem(null);
        }

        // NOTE: Level removal does not affect the next next level connections
    }

    private adjustConnectorsAfterItemInsert(level: Level, item: Item) {
        const previousLevel = this.getPreviousLevel(level, 2);
        const previousLevelItems = previousLevel.items;
        const nextLevel = this.getNextLevel(level, 2);
        const nextLevelItems = nextLevel.items;

        // Remove all item connectors
        this.connectors = this.connectors.filter(c => c.source !== item && c.target !== item);

        previousLevelItems.forEach(prevLevelItem => {
            // Remove previous level item connector if exists
            this.connectors = this.connectors.filter(c => c.source !== prevLevelItem);

            // Add new connector to the inserted item
            const connector = new Connector(prevLevelItem, item);
            this.connectors.push(connector);
        });

        nextLevelItems.forEach(nextLevelItem => {
            // Remove next level item connector if exists
            this.connectors = this.connectors.filter(c => c.target !== nextLevelItem);

            // Add new connector to the inserted item
            const connector = new Connector(item, nextLevelItem);
            this.connectors.push(connector);
        });
    }

    private adjustConnectorsAfterItemAdd(level: Level, item: Item) {
        const levelItems = level.items;
        const previousLevel = this.getPreviousLevel(level, 2);
        const previousIntermediateLevel = this.getPreviousLevel(level);
        const nextLevel = this.getNextLevel(level, 2);
        const nextIntermediateLevel = this.getNextLevel(level);

        if (previousIntermediateLevel.hasItems) {
            const intermediateItem = previousIntermediateLevel.items[0];     // Intermediate levels only have one item
            const previousLevelConnectors = this.connectors.filter(c => c.source.level === previousLevel);

            if (levelItems.length === 2) {   // Previous intermediate level has been newly added
                previousLevelConnectors.forEach(previousLevelConnector => {
                    previousLevelConnector.target = intermediateItem;
                });

                levelItems.forEach(currentLevelItem => {
                    this.connectors.push(new Connector(intermediateItem, currentLevelItem));
                });
            }

            if (levelItems.length > 2) {   // Previous intermediate level already exists
                this.connectors.push(new Connector(intermediateItem, item));
            }
        } else {
            // Current level has multiple items
            // If there is no intermediate level then the previous level has only one item
            const previousLevelItem = previousLevel.items[0];
            this.connectors.push(new Connector(previousLevelItem, item));
        }

        if (nextIntermediateLevel.hasItems) {
            const intermediateItem = nextIntermediateLevel.items[0];     // Intermediate levels only have one item
            const nextLevelConnectors = this.connectors.filter(c => c.target.level === nextLevel);

            if (levelItems.length === 2) {   // Next intermediate level has been newly added
                nextLevelConnectors.forEach(nextLevelConnector => {
                    nextLevelConnector.source = intermediateItem;
                });

                levelItems.forEach(currentLevelItem => {
                    this.connectors.push(new Connector(currentLevelItem, intermediateItem));
                });
            }

            if (levelItems.length > 2) {   // Next intermediate level already exists
                this.connectors.push(new Connector(item, intermediateItem));
            }
        } else {
            // Current level has multiple item
            // If there is no intermediate level then the next level has only one item
            const nextLevelItem = nextLevel.items[0];
            this.connectors.push(new Connector(item, nextLevelItem));
        }
    }

    private adjustConnectorsAfterLevelRemove(removedLevelIndex: number) {
        const currentLevelAtRemovedIndex = this.levels[removedLevelIndex];
        const currentLevelItems = currentLevelAtRemovedIndex.items;
        const currentLevelConnectors = this.connectors.filter(c => c.target.level === currentLevelAtRemovedIndex);
        const previousIntermediateLevel = this.getPreviousLevel(currentLevelAtRemovedIndex);
        const previousLevel = this.getPreviousLevel(currentLevelAtRemovedIndex, 2);
        const previousLevelItems = previousLevel.items;
        const previousLevelConnectors = this.connectors.filter(c => c.source.level === previousLevel);

        if (previousIntermediateLevel.hasItems) {
            const intermediateItem = previousIntermediateLevel.items[0];

            previousLevelConnectors.forEach(previousLevelConnector => {
                previousLevelConnector.target = intermediateItem;
            });

            currentLevelConnectors.forEach(currentLevelConnector => {
                currentLevelConnector.source = intermediateItem;
            });
        } else {
            // At least one level has only one item. remove the connector attachted to that item
            // and adjust the connectors of the other level items

            if (currentLevelItems.length === 1) {
                const currentLevelItem = currentLevelItems[0];
                const levelItemConnectorIndex = this.connectors.findIndex(c => c.target === currentLevelItem);
                this.connectors.splice(levelItemConnectorIndex, 1);

                previousLevelConnectors.forEach(previousLevelConnector => {
                    previousLevelConnector.target = currentLevelItem;
                });
            } else {
                const previousLevelItem = previousLevelItems[0];
                const levelItemConnectorIndex = this.connectors.findIndex(c => c.source === previousLevelItem);
                this.connectors.splice(levelItemConnectorIndex, 1);

                currentLevelConnectors.forEach(currentLevelConnector => {
                    currentLevelConnector.source = previousLevelItem;
                });
            }
        }
    }

    private adjustConnectorsAfterItemRemove(level: Level, item: Item) {
        const levelItems = level.items;

        if (levelItems.length === 1) {
            // Remove all current level connectors
            this.connectors = this.connectors.filter(c =>
                (c.source.level !== level && c.target.level !== level));

            const levelItem = levelItems[0];
            const previousLevel = this.getPreviousLevel(level, 2);
            const previousLevelConnectors = this.connectors.filter(c => c.source.level === previousLevel);
            const nextLevel = this.getNextLevel(level, 2);
            const nextLevelConnectors = this.connectors.filter(c => c.target.level === nextLevel);

            if (previousLevelConnectors.length > 0) {
                // Intermediate levels might have been removed. re-adjust all previous level connectors
                previousLevelConnectors.forEach(previousLevelConnector => {
                    previousLevelConnector.target = levelItem;
                });
            } else {
                const previousLevelItems = previousLevel.items;

                previousLevelItems.forEach(i => {
                    this.connectors.push(new Connector(i, levelItem));
                });
            }

            if (nextLevelConnectors.length > 0) {
                // Intermediate levels might have been removed. re-adjust all next level connectors
                nextLevelConnectors.forEach(nextLevelConnector => {
                    nextLevelConnector.source = levelItem;
                });
            } else {
                const nextLevelItems = nextLevel.items;

                nextLevelItems.forEach(i => {
                    this.connectors.push(new Connector(levelItem, i));
                });
            }
        } else {
            const sourceConnectorIndex = this.connectors.findIndex(c => c.source === item);
            this.connectors.splice(sourceConnectorIndex, 1);

            const targetConnectorIndex = this.connectors.findIndex(c => c.target === item);
            this.connectors.splice(targetConnectorIndex, 1);
        }
    }
}
