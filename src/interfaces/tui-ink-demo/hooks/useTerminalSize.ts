import { useState, useEffect } from 'react';

export const useTerminalSize = () => {
    const getSize = () => ({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24
    });

    const [size, setSize] = useState(getSize());

    useEffect(() => {
        const handleResize = () => {
            setSize(getSize());
        };

        // Update size immediately in case it wasn't available at mount
        handleResize();

        process.stdout.on('resize', handleResize);
        
        return () => {
            process.stdout.off('resize', handleResize);
        };
    }, []);

    return {
        ...size,
        isNarrow: size.columns < 100
    };
};