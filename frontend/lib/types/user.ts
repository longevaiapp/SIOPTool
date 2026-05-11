// User roles and permissions
// Used for role-based navigation and access control

export type UserRole = 'admin' | 'executive' | 'sales' | 'pm' | 'developer' | 'client';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    avatar?: string;
    workspace_id: string;
}

// Role display names and colors
export const ROLE_CONFIG: Record<UserRole, { labelKey: string; color: string; descriptionKey: string }> = {
    admin: {
        labelKey: 'role.admin',
        color: '#ff453a',
        descriptionKey: 'role.admin_desc'
    },
    executive: {
        labelKey: 'role.executive',
        color: '#bf5af2',
        descriptionKey: 'role.executive_desc'
    },
    sales: {
        labelKey: 'role.sales',
        color: '#30d158',
        descriptionKey: 'role.sales_desc'
    },
    pm: {
        labelKey: 'role.pm',
        color: '#007aff',
        descriptionKey: 'role.pm_desc'
    },
    developer: {
        labelKey: 'role.developer',
        color: '#5856d6',
        descriptionKey: 'role.developer_desc'
    },
    client: {
        labelKey: 'role.client',
        color: '#ff9f0a',
        descriptionKey: 'role.client_desc'
    },
};

// Modules each role can access
export const ROLE_MODULES: Record<UserRole, string[]> = {
    admin: ['*'], // All modules
    executive: [
        'overview',
        'meetings',
        'siop-engine',
        'analytics',
        'pmo',
        'ai-insights',
        'command',
        'crm', // View only
        'audit-log',
        'approvals',
    ],
    sales: [
        'overview',
        'meetings',
        'crm',
        'rfq',
        'quotes',
        'proposals',
        'contracts',
        'change-orders',
        'documents',
        'invoices',
    ],
    pm: [
        'overview',
        'meetings',
        'pm-tab',
        'customer-health',
        'suppliers',
        'pmo',
        'change-orders',
        'documents',
        'invoices',
        'approvals',
    ],
    developer: [
        'overview',
        'meetings',
        'pm-tab',
    ],
    client: [
        'workspace',
    ],
};

// Demo users for quick login (development only)
export const DEMO_USERS: User[] = [
    {
        id: 'demo-admin',
        email: 'admin@longevai.com',
        name: 'Alex Admin',
        role: 'admin',
        workspace_id: 'ws-demo',
    },
    {
        id: 'demo-exec',
        email: 'ceo@longevai.com',
        name: 'Elena CEO',
        role: 'executive',
        workspace_id: 'ws-demo',
    },
    {
        id: 'demo-sales',
        email: 'sarah@longevai.com',
        name: 'Sarah Sales',
        role: 'sales',
        workspace_id: 'ws-demo',
    },
    {
        id: 'demo-pm',
        email: 'pedro@longevai.com',
        name: 'Pedro PM',
        role: 'pm',
        workspace_id: 'ws-demo',
    },
    {
        id: 'demo-dev',
        email: 'diana@longevai.com',
        name: 'Diana Dev',
        role: 'developer',
        workspace_id: 'ws-demo',
    },
    {
        id: 'demo-client',
        email: 'cliente@genomicsco.com',
        name: 'Carlos Cliente',
        role: 'client',
        workspace_id: 'ws-demo',
    },
];
