import { StatusItem } from './types';

// Test data with extremely long text for overflow testing
export const longConfigItems: string[] = [
    'This is an extremely long configuration item that should definitely overflow the available width of the container and test our truncation logic properly',
    'Another very long configuration item with lots of unnecessary text that goes on and on and on without any real purpose except to test overflow handling',
    'Short item',
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua',
    'The quick brown fox jumps over the lazy dog multiple times in this extremely verbose and unnecessarily long configuration item description',
    'A somewhat reasonable length item',
    'Yet another extremely verbose configuration item that contains way too much text and should definitely be truncated to fit within the container boundaries'
];

export const longStatusItems: StatusItem[] = [
    { 
        text: 'This is an extremely long status message that should overflow and test our layout logic', 
        status: '✓' 
    },
    { 
        text: 'Another very long status message with lots of text that goes on and on and on', 
        status: 'pending' 
    },
    { 
        text: 'Short status', 
        status: '✓' 
    },
    { 
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt', 
        status: 'error' 
    },
    { 
        text: 'The system is experiencing extremely verbose error messages that contain way too much information', 
        status: 'warning' 
    }
];

// Test data for specific terminal widths
export const getTestDataForWidth = (width: number) => {
    const padding = 'x'.repeat(Math.max(0, width - 20));
    return {
        configItems: [
            `Item that fits exactly at ${width} chars ${padding}`,
            `Item that overflows at ${width} chars ${padding} OVERFLOW`,
            'Normal item',
            `Another exact fit item ${padding}`,
            `Another overflow item ${padding} OVERFLOW TEXT`
        ],
        statusItems: [
            { text: `Status that fits at ${width} ${padding}`, status: '✓' },
            { text: `Status that overflows ${padding} OVERFLOW`, status: 'pending' },
            { text: 'Normal status', status: '✓' },
            { text: `Another fit status ${padding}`, status: 'error' },
            { text: `Another overflow ${padding} OVERFLOW`, status: 'warning' }
        ] as StatusItem[]
    };
};