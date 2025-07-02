import { IDataService } from './interfaces';
import { StatusItem } from '../models/types';
import { configItems, statusItems } from '../models/sampleData';
import { longConfigItems, longStatusItems, getTestDataForWidth } from '../models/testData';

export class DataService implements IDataService {
    private useTestData: boolean;
    private terminalWidth: number | null;

    constructor() {
        this.useTestData = process.env.TUI_TEST_DATA === 'true';
        this.terminalWidth = process.env.TUI_TEST_WIDTH ? parseInt(process.env.TUI_TEST_WIDTH) : null;
    }

    getConfigItems(): string[] {
        if (this.useTestData) {
            if (this.terminalWidth) {
                return getTestDataForWidth(this.terminalWidth).configItems;
            }
            return longConfigItems;
        }
        return configItems;
    }

    getStatusItems(): StatusItem[] {
        if (this.useTestData) {
            if (this.terminalWidth) {
                return getTestDataForWidth(this.terminalWidth).statusItems;
            }
            return longStatusItems;
        }
        return statusItems;
    }
}