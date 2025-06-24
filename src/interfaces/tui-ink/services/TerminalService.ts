import { ITerminalService } from './interfaces.js';
import { TerminalSize } from '../models/types.js';

export class TerminalService implements ITerminalService {
    private narrowBreakpoint = 100;

    getSize(): TerminalSize {
        const columns = process.stdout.columns || 80;
        const rows = process.stdout.rows || 24;
        
        return {
            columns,
            rows,
            isNarrow: columns < this.narrowBreakpoint
        };
    }

    isNarrow(): boolean {
        return this.getSize().isNarrow;
    }
}