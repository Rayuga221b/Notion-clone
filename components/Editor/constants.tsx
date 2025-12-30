import React from 'react';
import { BlockType } from '../../types';
import {
    Type, Heading1, Heading2, Heading3, Heading4, Heading5,
    CheckSquare, List, ListOrdered, ChevronRight, Code, Quote, Info, Minus, FileText, Link
} from 'lucide-react';

export const BLOCK_TYPES = [
    { type: BlockType.Text, label: 'Text', icon: <Type size={16} /> },
    { type: BlockType.Page, label: 'Page', icon: <FileText size={16} /> },
    { type: BlockType.PageLink, label: 'Link Page', icon: <Link size={16} /> },
    { type: BlockType.Heading1, label: 'Heading 1', icon: <Heading1 size={16} /> },
    { type: BlockType.Heading2, label: 'Heading 2', icon: <Heading2 size={16} /> },
    { type: BlockType.Heading3, label: 'Heading 3', icon: <Heading3 size={16} /> },
    { type: BlockType.Heading4, label: 'Heading 4', icon: <Heading4 size={16} /> },
    { type: BlockType.Heading5, label: 'Heading 5', icon: <Heading5 size={16} /> },
    { type: BlockType.Todo, label: 'To-do List', icon: <CheckSquare size={16} /> },
    { type: BlockType.Bullet, label: 'Bullet List', icon: <List size={16} /> },
    { type: BlockType.Number, label: 'Numbered List', icon: <ListOrdered size={16} /> },
    { type: BlockType.Toggle, label: 'Toggle List', icon: <ChevronRight size={16} /> },
    { type: BlockType.Code, label: 'Code', icon: <Code size={16} /> },
    { type: BlockType.Quote, label: 'Quote', icon: <Quote size={16} /> },
    { type: BlockType.Callout, label: 'Callout', icon: <Info size={16} /> },
    { type: BlockType.Divider, label: 'Divider', icon: <Minus size={16} /> },
];
