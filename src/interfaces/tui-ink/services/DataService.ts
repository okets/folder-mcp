import { IDataService } from './interfaces.js';
import { StatusItem } from '../models/types.js';
import { configItems, statusItems } from '../models/sampleData.js';

export class DataService implements IDataService {
    getConfigItems(): string[] {
        return configItems;
    }

    getStatusItems(): StatusItem[] {
        return statusItems;
    }
}