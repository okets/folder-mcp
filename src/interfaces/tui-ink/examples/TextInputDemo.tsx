import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { TextInput } from '../components/primitives/TextInput.js';
import { BorderedBox } from '../components/BorderedBox.js';
import { theme } from '../utils/theme.js';

export const TextInputDemo: React.FC = () => {
    const { exit } = useApp();
    const [activeInput, setActiveInput] = useState<'single' | 'port' | 'path' | null>('single');
    const [singleLineValue, setSingleLineValue] = useState('');
    const [portValue, setPortValue] = useState('3000');
    const [pathValue, setPathValue] = useState('/Users/example/documents');
    const [cursorPositions, setCursorPositions] = useState({
        single: 0,
        port: 4,
        path: 24
    });

    // Navigation between inputs
    useInput((input, key) => {
        if (key.escape || input === 'q') {
            exit();
        }
        
        if (key.upArrow) {
            if (activeInput === 'port') setActiveInput('single');
            else if (activeInput === 'path') setActiveInput('port');
        } else if (key.downArrow) {
            if (activeInput === 'single') setActiveInput('port');
            else if (activeInput === 'port') setActiveInput('path');
        }
    });

    const updateCursor = (field: 'single' | 'port' | 'path', position: number) => {
        setCursorPositions(prev => ({ ...prev, [field]: position }));
    };

    return (
        <Box flexDirection="column" paddingTop={1}>
            <Text color={theme.colors.accent} bold>TextInput Component Demo</Text>
            <Text color={theme.colors.textMuted}>Use ↑↓ to navigate, ←→ to move cursor, type to edit</Text>
            <Box marginTop={1} />

            {/* Single Line Input */}
            <BorderedBox
                title="Single Line Input"
                subtitle="Basic text input with placeholder"
                focused={activeInput === 'single'}
                width={60}
                height={5}
            >
                <TextInput
                    value={singleLineValue}
                    onChange={setSingleLineValue}
                    cursorPosition={cursorPositions.single}
                    onCursorMove={(pos) => updateCursor('single', pos)}
                    placeholder="Enter some text..."
                    isActive={activeInput === 'single'}
                    width={56}
                />
            </BorderedBox>

            {/* Port Number Input */}
            <Box marginTop={1}>
                <BorderedBox
                    title="Port Number"
                    subtitle="Numeric input with max length"
                    focused={activeInput === 'port'}
                    width={60}
                    height={5}
                >
                    <TextInput
                        value={portValue}
                        onChange={setPortValue}
                        cursorPosition={cursorPositions.port}
                        onCursorMove={(pos) => updateCursor('port', pos)}
                        placeholder="1024"
                        maxLength={5}
                        isActive={activeInput === 'port'}
                        width={56}
                    />
                </BorderedBox>
            </Box>

            {/* Path Input */}
            <Box marginTop={1}>
                <BorderedBox
                    title="Folder Path"
                    subtitle="Long text with truncation"
                    focused={activeInput === 'path'}
                    width={60}
                    height={5}
                >
                    <TextInput
                        value={pathValue}
                        onChange={setPathValue}
                        cursorPosition={cursorPositions.path}
                        onCursorMove={(pos) => updateCursor('path', pos)}
                        placeholder="/path/to/folder"
                        isActive={activeInput === 'path'}
                        width={56}
                    />
                </BorderedBox>
            </Box>

            <Box marginTop={1}>
                <Text color={theme.colors.textMuted}>
                    Press 'q' or ESC to exit
                </Text>
            </Box>
        </Box>
    );
};