import React from 'react';
import { Bold, Italic, Underline } from 'lucide-react';

interface FloatingToolbarProps {
    position: { top: number, left: number };
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({ position }) => {
    const handleFormat = (command: string) => {
        document.execCommand(command, false);
    };

    return (
        <div
            className="fixed z-50 bg-gray-900 dark:bg-gray-700 text-white rounded-lg px-2 py-1.5 flex items-center gap-1 shadow-xl animate-in fade-in zoom-in-95 duration-200"
            style={{ top: position.top, left: position.left }}
            onMouseDown={(e) => e.preventDefault()}
        >
            <ToolbarBtn onClick={() => handleFormat('bold')} icon={<Bold size={14} />} />
            <ToolbarBtn onClick={() => handleFormat('italic')} icon={<Italic size={14} />} />
            <ToolbarBtn onClick={() => handleFormat('underline')} icon={<Underline size={14} />} />
        </div>
    )
}

const ToolbarBtn = ({ onClick, icon }: { onClick: () => void, icon: React.ReactNode }) => (
    <button
        onClick={onClick}
        className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
    >
        {icon}
    </button>
)
