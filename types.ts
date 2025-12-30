export enum BlockType {
  Text = 'text',
  Heading1 = 'h1',
  Heading2 = 'h2',
  Heading3 = 'h3',
  Heading4 = 'h4',
  Heading5 = 'h5',
  Heading6 = 'h6',
  Todo = 'todo',
  Bullet = 'bullet',
  Number = 'number',
  Quote = 'quote',
  Divider = 'divider',
  Toggle = 'toggle',
  Code = 'code',
  Callout = 'callout',
  Image = 'image',
  File = 'file',
  Page = 'page',
  PageLink = 'page-link'
}

export interface Block {
  id: string;
  type: BlockType;
  content: string; // Stores HTML content
  checked?: boolean; // For Todo
  isOpen?: boolean; // For Toggle
  language?: string; // For Code
  url?: string; // For Image/File
  caption?: string; // For Image/File
  pageId?: string; // For embedded Page blocks
}

export interface Page {
  id: string;
  title: string;
  icon?: string;
  coverImage?: string;
  blocks: Block[];
  updatedAt: Date;
  parentId: string | null;
  childIds: string[];
  isFavorite: boolean;
  isExpanded: boolean;
}

export interface Transaction {
  id: string;
  date: string; // ISO Date string
  merchant: string;
  amount: number;
  category: string;
  paymentMethod?: string;
  status: 'cleared' | 'pending';
  notes?: string;
}

export interface ExpenseSummary {
  category: string;
  amount: number;
  color: string;
}

export enum ViewMode {
  Page = 'PAGE',
  Dashboard = 'DASHBOARD',
  Expenses = 'EXPENSES',
  Settings = 'SETTINGS'
}