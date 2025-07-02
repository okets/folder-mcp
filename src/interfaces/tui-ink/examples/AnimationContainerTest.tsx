import React from 'react';
import { Box, Text } from 'ink';
import { AnimationContainer } from '../components/core/AnimationContainer.js';

/**
 * Test component to demonstrate AnimationContainer functionality
 */
export const AnimationContainerTest: React.FC = () => {
    // Braille spinner frames
    const brailleSpinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    
    // Dots animation
    const dotsAnimation = ['⋯', '·⋯', '··⋯', '···⋯'];
    
    // Progress bar animation (different lengths to test padding)
    const progressAnimation = [
        '▰',
        '▰▰',
        '▰▰▰',
        '▰▰▰▰',
        '▰▰▰▰▰',
        '▰▰▰▰▰▰',
        '▰▰▰▰▰▰▰',
        '▰▰▰▰▰▰▰▰',
        '▰▰▰▰▰▰▰▰▰',
        '▰▰▰▰▰▰▰▰▰▰'
    ];
    
    // Ball animation with spaces (tests width preservation)
    const ballAnimation = [
        '●         ',
        ' ●        ',
        '  ●       ',
        '   ●      ',
        '    ●     ',
        '     ●    ',
        '      ●   ',
        '       ●  ',
        '        ● ',
        '         ●',
        '        ● ',
        '       ●  ',
        '      ●   ',
        '     ●    ',
        '    ●     ',
        '   ●      ',
        '  ●       ',
        ' ●        ',
        '●         '
    ];
    
    return (
        <Box flexDirection="column" paddingTop={1}>
            <Text bold>AnimationContainer Test</Text>
            <Text dimColor>─────────────────────</Text>
            
            <Box marginTop={1}>
                <Text>Braille Spinner: </Text>
                <AnimationContainer 
                    frames={brailleSpinner} 
                    interval={80}
                    color="cyan"
                />
            </Box>
            
            <Box marginTop={1}>
                <Text>Dots Animation: </Text>
                <AnimationContainer 
                    frames={dotsAnimation} 
                    interval={300}
                    color="yellow"
                />
            </Box>
            
            <Box marginTop={1}>
                <Text>Progress Bar: </Text>
                <AnimationContainer 
                    frames={progressAnimation} 
                    interval={200}
                    color="green"
                />
            </Box>
            
            <Box marginTop={1}>
                <Text>Ball Animation: [</Text>
                <AnimationContainer 
                    frames={ballAnimation} 
                    interval={100}
                    color="magenta"
                />
                <Text>]</Text>
            </Box>
            
            <Box marginTop={1}>
                <Text dimColor>All animations should maintain consistent width</Text>
            </Box>
        </Box>
    );
};