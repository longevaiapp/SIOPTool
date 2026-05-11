// Meeting types and analyzer configurations
// Based on the 10 AI analyzers defined in ANALYZERS.md

import { BaseRecord } from './common';

export type MeetingType =
    | 'lead_qualification'
    | 'discovery_rfq'
    | 'sales_followup'
    | 'siop_weekly'
    | 'project_kickoff'
    | 'sprint_review'
    | 'client_qbr'
    | 'pmo_review'
    | 'compliance_audit'
    | 'supplier_negotiation'
    // Delivery cycle
    | 'daily_standup'
    | 'sprint_planning'
    | 'client_weekly_status'
    | 'internal_kickoff'
    | 'sprint_retro'
    | 'uat_session'
    | 'incident_postmortem'
    | 'change_request'
    // Module-coverage expansion (Day 23)
    | 'proposal_review'
    | 'contract_review'
    | 'cs_checkin'
    | 'supplier_review'
    | 'one_on_one'
    // Role-coverage expansion (Day 24)
    | 'backlog_refinement'
    | 'architecture_review'
    | 'bug_triage'
    | 'steering_committee'
    | 'capacity_planning'
    | 'onboarding_call'
    | 'renewal_call'
    | 'win_loss_review'
    | 'hiring_panel'
    | 'performance_review'
    // Voz → cotización automática (MXN) → contrato
    | 'cost_estimation';

export type MeetingStatus = 'draft' | 'recording' | 'processing' | 'analyzed' | 'failed';

export interface Meeting extends BaseRecord {
    title: string;
    meeting_type: MeetingType;
    status: MeetingStatus;
    scheduled_at?: string;
    duration_minutes?: number;
    
    // Participants
    participants: MeetingParticipant[];
    
    // Related entities
    deal_id?: string;
    project_id?: string;
    client_name?: string;
    
    // Content
    transcript?: string;
    audio_url?: string;
    notes?: string;
    
    // AI Analysis
    ai_outputs?: MeetingAIOutput;
}

export interface MeetingParticipant {
    name: string;
    email?: string;
    role: 'internal' | 'external';
    title?: string;
}

export interface MeetingAIOutput {
    summary?: string;
    key_points?: string[];
    action_items?: ActionItem[];
    extracted_data?: Record<string, unknown>;
    sentiment?: 'positive' | 'neutral' | 'negative';
    next_steps?: string[];
}

export interface ActionItem {
    text: string;
    assignee?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    module_target?: string; // Which module this feeds into
    accepted?: boolean;
}

// Meeting type configurations
export const MEETING_TYPE_CONFIG: Record<MeetingType, {
    label: string;
    description: string;
    color: string;
    icon: string;
    feeds: string[];
    requiredFields: string[];
}> = {
    lead_qualification: {
        label: 'Lead Qualification',
        description: 'First call with a new prospect',
        color: '#007aff',
        icon: '🎯',
        feeds: ['CRM'],
        requiredFields: ['client_name', 'participants'],
    },
    discovery_rfq: {
        label: 'Discovery / RFQ',
        description: 'Deep dive into requirements and scope',
        color: '#30d158',
        icon: '🔍',
        feeds: ['CRM', 'RFQ'],
        requiredFields: ['client_name', 'deal_id', 'participants'],
    },
    sales_followup: {
        label: 'Sales Follow-up',
        description: 'Follow-up calls during sales cycle',
        color: '#ff9f0a',
        icon: '📞',
        feeds: ['CRM'],
        requiredFields: ['deal_id', 'participants'],
    },
    siop_weekly: {
        label: 'SIOP Weekly',
        description: 'Weekly S&OP review meeting',
        color: '#30b0c7',
        icon: '📊',
        feeds: ['SIOP Engine'],
        requiredFields: ['participants'],
    },
    project_kickoff: {
        label: 'Project Kickoff',
        description: 'New project kickoff with team and client',
        color: '#ff453a',
        icon: '🚀',
        feeds: ['Projects'],
        requiredFields: ['project_id', 'client_name', 'participants'],
    },
    sprint_review: {
        label: 'Sprint Review',
        description: 'Sprint demo and review with client',
        color: '#5856d6',
        icon: '🔄',
        feeds: ['Projects', 'Customer Health'],
        requiredFields: ['project_id', 'participants'],
    },
    client_qbr: {
        label: 'Quarterly Business Review',
        description: 'QBR with client leadership',
        color: '#ff2d55',
        icon: '📈',
        feeds: ['Customer Health', 'CRM'],
        requiredFields: ['project_id', 'client_name', 'participants'],
    },
    pmo_review: {
        label: 'PMO Review',
        description: 'Internal portfolio review',
        color: '#bf5af2',
        icon: '📋',
        feeds: ['PMO', 'AI Insights'],
        requiredFields: ['participants'],
    },
    compliance_audit: {
        label: 'Compliance Audit',
        description: 'Compliance review meeting',
        color: '#8e8e93',
        icon: '🔒',
        feeds: ['Compliance'],
        requiredFields: ['project_id', 'participants'],
    },
    supplier_negotiation: {
        label: 'Supplier Negotiation',
        description: 'Calls with vendors/suppliers',
        color: '#64d2ff',
        icon: '🤝',
        feeds: ['Suppliers'],
        requiredFields: ['participants'],
    },
    daily_standup: {
        label: 'Daily Standup',
        description: 'Team daily sync — task status & blockers',
        color: '#34c759',
        icon: '☕',
        feeds: ['Projects', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    sprint_planning: {
        label: 'Sprint Planning',
        description: 'Sprint goal, capacity & backlog assignment',
        color: '#5e5ce6',
        icon: '🗓️',
        feeds: ['Projects', 'Sprints', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    client_weekly_status: {
        label: 'Client Weekly Status',
        description: 'Recurring weekly sync with client',
        color: '#ffd60a',
        icon: '📅',
        feeds: ['Customer Health', 'Projects'],
        requiredFields: ['project_id', 'client_name', 'participants'],
    },
    internal_kickoff: {
        label: 'Internal Kickoff',
        description: 'Tech lead briefs the dev team',
        color: '#ff9500',
        icon: '👥',
        feeds: ['Projects', 'Sprints', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    sprint_retro: {
        label: 'Sprint Retrospective',
        description: 'What went well / wrong, improvement actions',
        color: '#af52de',
        icon: '🔁',
        feeds: ['AI Insights', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    uat_session: {
        label: 'UAT Session',
        description: 'User acceptance testing & sign-off',
        color: '#00c7be',
        icon: '✅',
        feeds: ['Projects', 'Tasks'],
        requiredFields: ['project_id', 'client_name', 'participants'],
    },
    incident_postmortem: {
        label: 'Incident Postmortem',
        description: 'Blameless root-cause analysis (5-whys)',
        color: '#ff3b30',
        icon: '🚨',
        feeds: ['Risks', 'AI Insights', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    change_request: {
        label: 'Change Request',
        description: 'Scope / timeline / budget change',
        color: '#a2845e',
        icon: '🔧',
        feeds: ['CRM', 'Projects', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    proposal_review: {
        label: 'Proposal Review',
        description: 'Walk the prospect through the formal proposal',
        color: '#0a84ff',
        icon: '📄',
        feeds: ['CRM'],
        requiredFields: ['deal_id', 'participants'],
    },
    cost_estimation: {
        label: 'Cotización por voz',
        description: 'Discovery → estima complejidad, equipo y precio en MXN automáticamente',
        color: '#34c759',
        icon: '💸',
        feeds: ['Quotes', 'CRM', 'Contracts'],
        requiredFields: ['participants'],
    },
    contract_review: {
        label: 'Contract Review',
        description: 'MSA / SOW / BAA negotiation & redlines',
        color: '#7c3aed',
        icon: '✍️',
        feeds: ['Contracts', 'Compliance'],
        requiredFields: ['client_name', 'participants'],
    },
    cs_checkin: {
        label: 'CS Check-in',
        description: 'Light recurring touchpoint with the client',
        color: '#e11d48',
        icon: '🩺',
        feeds: ['Customer Health'],
        requiredFields: ['client_name', 'participants'],
    },
    supplier_review: {
        label: 'Supplier Review',
        description: 'Periodic vendor performance review',
        color: '#4f46e5',
        icon: '📦',
        feeds: ['Suppliers'],
        requiredFields: ['participants'],
    },
    one_on_one: {
        label: '1:1',
        description: 'Manager / direct-report one-on-one',
        color: '#14b8a6',
        icon: '🪞',
        feeds: ['People'],
        requiredFields: ['participants'],
    },
    backlog_refinement: {
        label: 'Backlog Refinement',
        description: 'Grooming — estimates, splits, AC',
        color: '#22d3ee',
        icon: '🧹',
        feeds: ['Tasks', 'Sprints'],
        requiredFields: ['project_id', 'participants'],
    },
    architecture_review: {
        label: 'Architecture Review',
        description: 'Technical decision (ADR) & alternatives',
        color: '#6366f1',
        icon: '🏛️',
        feeds: ['AI Insights', 'Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    bug_triage: {
        label: 'Bug Triage',
        description: 'Routine prioritization & assignment',
        color: '#f97316',
        icon: '🐛',
        feeds: ['Tasks'],
        requiredFields: ['project_id', 'participants'],
    },
    steering_committee: {
        label: 'Steering Committee',
        description: 'Sponsor-level review & stage-gate',
        color: '#0d9488',
        icon: '🏛️',
        feeds: ['PMO', 'AI Insights'],
        requiredFields: ['project_id', 'participants'],
    },
    capacity_planning: {
        label: 'Capacity Planning',
        description: 'Cross-portfolio resource allocation',
        color: '#475569',
        icon: '📐',
        feeds: ['PMO', 'AI Insights'],
        requiredFields: ['participants'],
    },
    onboarding_call: {
        label: 'Onboarding Call',
        description: 'Post-signature, pre-kickoff implementation',
        color: '#10b981',
        icon: '🎒',
        feeds: ['Customer Health', 'Tasks'],
        requiredFields: ['client_name', 'participants'],
    },
    renewal_call: {
        label: 'Renewal Call',
        description: 'Renewal terms & uplift discussion',
        color: '#fbbf24',
        icon: '🔁',
        feeds: ['CRM', 'Customer Health'],
        requiredFields: ['client_name', 'participants'],
    },
    win_loss_review: {
        label: 'Win/Loss Review',
        description: 'Post-deal autopsy — lessons learned',
        color: '#9333ea',
        icon: '📊',
        feeds: ['CRM', 'AI Insights'],
        requiredFields: ['deal_id', 'participants'],
    },
    hiring_panel: {
        label: 'Hiring Panel',
        description: 'Hire/no-hire decision & scorecard',
        color: '#0ea5e9',
        icon: '🧑‍⚖️',
        feeds: ['People'],
        requiredFields: ['participants'],
    },
    performance_review: {
        label: 'Performance Review',
        description: 'Formal periodic review (not 1:1)',
        color: '#a855f7',
        icon: '📋',
        feeds: ['People'],
        requiredFields: ['participants'],
    },
};

// Group meeting types by the role that typically runs them. Used by the
// "New Meeting" picker so each user sees the analyzers relevant to them.
export const MEETING_ROLE_GROUPS: { role: string; description: string; types: MeetingType[] }[] = [
    {
        role: 'Sales',
        description: 'CRM — prospects, pipeline, deals',
        types: ['lead_qualification', 'cost_estimation', 'sales_followup', 'proposal_review', 'win_loss_review'],
    },
    {
        role: 'Pre-sales / RFQ',
        description: 'Discovery, scope, technical fit',
        types: ['discovery_rfq', 'cost_estimation'],
    },
    {
        role: 'Contracts / Legal',
        description: 'MSA, SOW, BAA, redlines',
        types: ['contract_review'],
    },
    {
        role: 'Customer Success',
        description: 'Onboarding, health, renewal',
        types: ['onboarding_call', 'cs_checkin', 'client_qbr', 'renewal_call'],
    },
    {
        role: 'Delivery / PM',
        description: 'Client-facing project orchestration',
        types: ['project_kickoff', 'internal_kickoff', 'client_weekly_status', 'change_request', 'steering_committee'],
    },
    {
        role: 'Tech Lead / Dev',
        description: 'Sprint cadence, design, grooming',
        types: ['daily_standup', 'sprint_planning', 'backlog_refinement', 'sprint_review', 'sprint_retro', 'architecture_review'],
    },
    {
        role: 'QA',
        description: 'Acceptance, sign-off, bug queue',
        types: ['uat_session', 'bug_triage'],
    },
    {
        role: 'PMO',
        description: 'Portfolio review & resource allocation',
        types: ['pmo_review', 'capacity_planning'],
    },
    {
        role: 'SIOP',
        description: 'S&OP weekly',
        types: ['siop_weekly'],
    },
    {
        role: 'SRE / Operations',
        description: 'Incidents & post-mortems',
        types: ['incident_postmortem'],
    },
    {
        role: 'Compliance',
        description: 'HIPAA / SOC2 / GDPR audits',
        types: ['compliance_audit'],
    },
    {
        role: 'Procurement',
        description: 'Vendor negotiation & reviews',
        types: ['supplier_negotiation', 'supplier_review'],
    },
    {
        role: 'People / HR',
        description: '1:1s, panels, formal reviews',
        types: ['one_on_one', 'hiring_panel', 'performance_review'],
    },
];

// Form fields for manual entry by meeting type
export const MEETING_FORM_FIELDS: Record<MeetingType, {
    label: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'currency' | 'date' | 'checkbox';
    placeholder?: string;
    options?: { value: string; label: string }[];
    required?: boolean;
}[]> = {
    lead_qualification: [
        { label: 'Company Name', name: 'client_name', type: 'text', required: true },
        { label: 'Contact Name', name: 'contact_name', type: 'text', required: true },
        { label: 'Contact Title', name: 'contact_title', type: 'text' },
        { label: 'Industry', name: 'industry', type: 'select', options: [
            { value: 'healthcare', label: 'Healthcare' },
            { value: 'biotech', label: 'Biotech' },
            { value: 'pharma', label: 'Pharma' },
            { value: 'medtech', label: 'MedTech' },
            { value: 'other', label: 'Other' },
        ]},
        { label: 'Lead Source', name: 'lead_source', type: 'select', options: [
            { value: 'referral', label: 'Referral' },
            { value: 'website', label: 'Website' },
            { value: 'conference', label: 'Conference' },
            { value: 'linkedin', label: 'LinkedIn' },
            { value: 'cold_outreach', label: 'Cold Outreach' },
        ]},
        { label: 'Estimated Budget', name: 'budget_estimate', type: 'currency' },
        { label: 'Timeline', name: 'timeline', type: 'text', placeholder: 'e.g., Q2 2026' },
        { label: 'Pain Points', name: 'pain_points', type: 'textarea', placeholder: 'What problems are they trying to solve?' },
        { label: 'Decision Maker Present?', name: 'decision_maker_present', type: 'checkbox' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    discovery_rfq: [
        { label: 'Project Scope', name: 'scope_summary', type: 'textarea', required: true },
        { label: 'Technical Requirements', name: 'tech_requirements', type: 'textarea' },
        { label: 'Integration Needs', name: 'integrations', type: 'textarea' },
        { label: 'Compliance Requirements', name: 'compliance', type: 'select', options: [
            { value: 'hipaa', label: 'HIPAA' },
            { value: 'soc2', label: 'SOC 2' },
            { value: 'gdpr', label: 'GDPR' },
            { value: 'fda', label: 'FDA 21 CFR Part 11' },
            { value: 'none', label: 'None specified' },
        ]},
        { label: 'Budget Range', name: 'budget_range', type: 'text', placeholder: '$150K - $200K' },
        { label: 'Desired Start Date', name: 'start_date', type: 'date' },
        { label: 'Expected Duration', name: 'duration', type: 'text', placeholder: '6 months' },
        { label: 'Success Criteria', name: 'success_criteria', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    sales_followup: [
        { label: 'Meeting Purpose', name: 'purpose', type: 'text', required: true },
        { label: 'Deal Temperature', name: 'temperature', type: 'select', options: [
            { value: 'hot', label: '🔥 Hot' },
            { value: 'warm', label: '☀️ Warm' },
            { value: 'cold', label: '❄️ Cold' },
        ]},
        { label: 'Buying Signals', name: 'buying_signals', type: 'textarea' },
        { label: 'Objections Raised', name: 'objections', type: 'textarea' },
        { label: 'Competitors Mentioned', name: 'competitors', type: 'text' },
        { label: 'Budget Confirmed?', name: 'budget_confirmed', type: 'checkbox' },
        { label: 'Budget Amount', name: 'budget_amount', type: 'currency' },
        { label: 'Next Steps', name: 'next_steps', type: 'textarea' },
        { label: 'Probability Change', name: 'probability_change', type: 'select', options: [
            { value: '+20', label: '📈 +20%' },
            { value: '+10', label: '📈 +10%' },
            { value: '0', label: '➡️ No change' },
            { value: '-10', label: '📉 -10%' },
            { value: '-20', label: '📉 -20%' },
        ]},
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    siop_weekly: [
        { label: 'Pipeline Changes', name: 'pipeline_changes', type: 'textarea', placeholder: 'New deals, deals at risk, closed deals...' },
        { label: 'Capacity Status', name: 'capacity_status', type: 'textarea', placeholder: 'Team utilization, bottlenecks...' },
        { label: 'Operations Updates', name: 'ops_updates', type: 'textarea', placeholder: 'Projects on track, at risk...' },
        { label: 'Gaps Identified', name: 'gaps', type: 'textarea', placeholder: 'Revenue gaps, resource gaps...' },
        { label: 'Decisions Made', name: 'decisions', type: 'textarea', placeholder: 'Key decisions from this meeting...' },
        { label: 'Action Items', name: 'action_items', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    project_kickoff: [
        { label: 'In Scope', name: 'in_scope', type: 'textarea', required: true },
        { label: 'Out of Scope', name: 'out_scope', type: 'textarea' },
        { label: 'Key Assumptions', name: 'assumptions', type: 'textarea' },
        { label: 'Key Milestones', name: 'milestones', type: 'textarea' },
        { label: 'Team Members', name: 'team_members', type: 'textarea' },
        { label: 'Client Expectations', name: 'client_expectations', type: 'textarea' },
        { label: 'Communication Cadence', name: 'cadence', type: 'text', placeholder: 'Weekly Thursday 2pm' },
        { label: 'Risks Identified', name: 'risks', type: 'textarea' },
        { label: 'Sprint 1 Scope', name: 'sprint1_scope', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    sprint_review: [
        { label: 'Features Demoed', name: 'features_demoed', type: 'textarea', required: true },
        { label: 'Client Feedback - Positive', name: 'feedback_positive', type: 'textarea' },
        { label: 'Client Feedback - Concerns', name: 'feedback_negative', type: 'textarea' },
        { label: 'Change Requests', name: 'change_requests', type: 'textarea' },
        { label: 'Blockers Discussed', name: 'blockers', type: 'textarea' },
        { label: 'Client Satisfaction', name: 'satisfaction', type: 'select', options: [
            { value: 'very_happy', label: '😄 Very Happy' },
            { value: 'satisfied', label: '🙂 Satisfied' },
            { value: 'neutral', label: '😐 Neutral' },
            { value: 'concerned', label: '😟 Concerned' },
            { value: 'unhappy', label: '😠 Unhappy' },
        ]},
        { label: 'Next Sprint Priorities', name: 'next_priorities', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    client_qbr: [
        { label: 'Achievements Reviewed', name: 'achievements', type: 'textarea', required: true },
        { label: 'Challenges Discussed', name: 'challenges', type: 'textarea' },
        { label: 'NPS Score', name: 'nps_score', type: 'number', placeholder: '0-100' },
        { label: 'Renewal Sentiment', name: 'renewal_sentiment', type: 'select', options: [
            { value: 'positive', label: '✅ Positive' },
            { value: 'neutral', label: '➡️ Neutral' },
            { value: 'at_risk', label: '⚠️ At Risk' },
        ]},
        { label: 'Expansion Opportunities', name: 'expansion_opps', type: 'textarea' },
        { label: 'Referral Potential?', name: 'referral_potential', type: 'checkbox' },
        { label: 'Action Items', name: 'action_items', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    pmo_review: [
        { label: 'Portfolio Health Score', name: 'portfolio_score', type: 'number', placeholder: '0-100' },
        { label: 'At Risk Projects', name: 'at_risk_projects', type: 'textarea' },
        { label: 'Resource Conflicts', name: 'resource_conflicts', type: 'textarea' },
        { label: 'Timeline Adjustments', name: 'timeline_adjustments', type: 'textarea' },
        { label: 'Escalations Needed', name: 'escalations', type: 'textarea' },
        { label: 'Decisions Made', name: 'decisions', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    compliance_audit: [
        { label: 'Controls Reviewed', name: 'controls_reviewed', type: 'textarea', required: true },
        { label: 'Status Updates', name: 'status_updates', type: 'textarea' },
        { label: 'Gaps Found', name: 'gaps_found', type: 'textarea' },
        { label: 'Audit Findings', name: 'audit_findings', type: 'textarea' },
        { label: 'Remediation Tasks', name: 'remediation', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    supplier_negotiation: [
        { label: 'Supplier Name', name: 'supplier_name', type: 'text', required: true },
        { label: 'Meeting Purpose', name: 'purpose', type: 'text' },
        { label: 'Current SLA Compliance', name: 'sla_compliance', type: 'text', placeholder: '98%' },
        { label: 'Issues Raised', name: 'issues', type: 'textarea' },
        { label: 'Pricing Discussion', name: 'pricing', type: 'textarea' },
        { label: 'Contract Terms', name: 'contract_terms', type: 'textarea' },
        { label: 'Action Items', name: 'action_items', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    daily_standup: [
        { label: 'Sprint', name: 'sprint_name', type: 'text' },
        { label: 'Blockers Raised', name: 'blockers', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    sprint_planning: [
        { label: 'Sprint Goal', name: 'sprint_goal', type: 'textarea', required: true },
        { label: 'Capacity (story points)', name: 'capacity_points', type: 'number' },
        { label: 'Sprint Start', name: 'start_date', type: 'date' },
        { label: 'Sprint End', name: 'end_date', type: 'date' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    client_weekly_status: [
        { label: 'Highlights', name: 'highlights', type: 'textarea' },
        { label: 'Client Concerns', name: 'concerns', type: 'textarea' },
        { label: 'Scope Hints', name: 'scope_hints', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    internal_kickoff: [
        { label: 'Tech Stack', name: 'tech_stack', type: 'textarea', required: true },
        { label: 'Team Assignments', name: 'team_assignments', type: 'textarea' },
        { label: 'Sprint 1 Goal', name: 'sprint1_goal', type: 'text' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    sprint_retro: [
        { label: 'What Went Well', name: 'went_well', type: 'textarea' },
        { label: 'What Went Wrong', name: 'went_wrong', type: 'textarea' },
        { label: 'Improvement Actions', name: 'improvements', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    uat_session: [
        { label: 'Test Scenarios', name: 'scenarios', type: 'textarea', required: true },
        { label: 'Bugs Found', name: 'bugs', type: 'textarea' },
        { label: 'Sign-off?', name: 'sign_off', type: 'checkbox' },
        { label: 'Client Signer', name: 'signer', type: 'text' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    incident_postmortem: [
        { label: 'Incident Title', name: 'incident_title', type: 'text', required: true },
        { label: 'Severity', name: 'severity', type: 'select', options: [
            { value: 'SEV1', label: 'SEV1 — critical' },
            { value: 'SEV2', label: 'SEV2 — major' },
            { value: 'SEV3', label: 'SEV3 — minor' },
        ]},
        { label: 'Root Cause', name: 'root_cause', type: 'textarea' },
        { label: 'Preventive Actions', name: 'preventive', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    change_request: [
        { label: 'Change Summary', name: 'change_summary', type: 'textarea', required: true },
        { label: 'Impact on Timeline (days)', name: 'delta_days', type: 'number' },
        { label: 'Impact on Budget', name: 'delta_value', type: 'currency' },
        { label: 'Client Approved?', name: 'client_approved', type: 'checkbox' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    proposal_review: [
        { label: 'Scope Summary', name: 'scope_summary', type: 'textarea', required: true },
        { label: 'Proposed Value', name: 'value_proposed', type: 'currency' },
        { label: 'Commercial Model', name: 'commercial_model', type: 'select', options: [
            { value: 'FIXED_PRICE', label: 'Fixed Price' },
            { value: 'TM', label: 'Time & Materials' },
            { value: 'RETAINER', label: 'Retainer' },
            { value: 'VALUE_BASED', label: 'Value-based' },
        ]},
        { label: 'Timeline Proposed', name: 'timeline_proposed', type: 'text' },
        { label: 'Pushback Points', name: 'pushback_points', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    cost_estimation: [
        { label: 'Resumen de alcance', name: 'scope_summary', type: 'textarea' },
        { label: 'Modelo comercial', name: 'commercial_model', type: 'select', options: [
            { value: 'FIXED_PRICE', label: 'Precio fijo' },
            { value: 'TM', label: 'Time & Materials' },
            { value: 'RETAINER', label: 'Retainer' },
            { value: 'VALUE_BASED', label: 'Value-based' },
        ]},
        { label: 'Notas de la junta', name: 'notes', type: 'textarea' },
    ],
    contract_review: [
        { label: 'Contract Type', name: 'contract_type', type: 'select', options: [
            { value: 'MSA', label: 'MSA' },
            { value: 'SOW', label: 'SOW' },
            { value: 'NDA', label: 'NDA' },
            { value: 'DPA', label: 'DPA' },
            { value: 'BAA', label: 'BAA' },
            { value: 'amendment', label: 'Amendment' },
            { value: 'other', label: 'Other' },
        ], required: true },
        { label: 'Status', name: 'status', type: 'select', options: [
            { value: 'draft', label: 'Draft' },
            { value: 'under_review', label: 'Under Review' },
            { value: 'redlines', label: 'Redlines' },
            { value: 'signed', label: 'Signed' },
            { value: 'terminated', label: 'Terminated' },
        ]},
        { label: 'Value', name: 'value', type: 'currency' },
        { label: 'Term (months)', name: 'term_months', type: 'number' },
        { label: 'PHI Involved?', name: 'phi_involved', type: 'checkbox' },
        { label: 'BAA Required?', name: 'baa_required', type: 'checkbox' },
        { label: 'Open Redlines', name: 'open_redlines', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    cs_checkin: [
        { label: 'Sentiment', name: 'sentiment', type: 'select', options: [
            { value: 'positive', label: 'Positive' },
            { value: 'neutral', label: 'Neutral' },
            { value: 'concerned', label: 'Concerned' },
            { value: 'frustrated', label: 'Frustrated' },
        ]},
        { label: 'Adoption', name: 'adoption_signal', type: 'select', options: [
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
        ]},
        { label: 'Renewal Signal', name: 'renewal_signal', type: 'select', options: [
            { value: 'renew', label: 'Renew' },
            { value: 'expand', label: 'Expand' },
            { value: 'risk', label: 'Risk' },
            { value: 'churn', label: 'Churn' },
            { value: 'too_early', label: 'Too early' },
        ]},
        { label: 'Feature Requests', name: 'feature_requests', type: 'textarea' },
        { label: 'Complaints', name: 'complaints', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    supplier_review: [
        { label: 'Supplier Name', name: 'supplier_name', type: 'text', required: true },
        { label: 'Period', name: 'period', type: 'text', placeholder: 'Q1 2026' },
        { label: 'SLA Compliance %', name: 'sla_compliance_pct', type: 'number' },
        { label: 'Quality Score', name: 'quality_score', type: 'number' },
        { label: 'Delivery Score', name: 'delivery_score', type: 'number' },
        { label: 'Cost Score', name: 'cost_score', type: 'number' },
        { label: 'Renewal Recommendation', name: 'renewal_recommendation', type: 'select', options: [
            { value: 'renew', label: 'Renew' },
            { value: 'renegotiate', label: 'Renegotiate' },
            { value: 'replace', label: 'Replace' },
            { value: 'terminate', label: 'Terminate' },
        ]},
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    one_on_one: [
        { label: 'Direct Report', name: 'report_name', type: 'text', required: true },
        { label: 'Manager', name: 'manager_name', type: 'text', required: true },
        { label: 'Morale', name: 'morale', type: 'select', options: [
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
        ]},
        { label: 'Burnout Risk', name: 'burnout_risk', type: 'select', options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
        ]},
        { label: 'Blockers', name: 'blockers', type: 'textarea' },
        { label: 'Growth Topics', name: 'growth_topics', type: 'textarea' },
        { label: 'Manager Follow-ups', name: 'follow_ups', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    backlog_refinement: [
        { label: 'Sprint Target', name: 'sprint_target', type: 'text', placeholder: 'Sprint 14' },
        { label: 'Items Ready Count', name: 'ready_count', type: 'number' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    architecture_review: [
        { label: 'Decision Title', name: 'adr_title', type: 'text', required: true },
        { label: 'Context', name: 'context', type: 'textarea' },
        { label: 'Decision', name: 'decision', type: 'textarea' },
        { label: 'Alternatives', name: 'alternatives', type: 'textarea' },
        { label: 'Owner', name: 'owner', type: 'text' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    bug_triage: [
        { label: 'Open Bugs', name: 'open_count', type: 'number' },
        { label: 'Critical Bugs', name: 'critical_open', type: 'number' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    steering_committee: [
        { label: 'Stage-gate Decision', name: 'gate_decision', type: 'select', options: [
            { value: 'go', label: 'Go' },
            { value: 'conditional_go', label: 'Conditional Go' },
            { value: 'hold', label: 'Hold' },
            { value: 'kill', label: 'Kill' },
        ]},
        { label: 'Conditions', name: 'conditions', type: 'textarea' },
        { label: 'Next Review', name: 'next_review_date', type: 'date' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    capacity_planning: [
        { label: 'Period', name: 'period', type: 'text', placeholder: 'Q3 2026' },
        { label: 'Hiring Asks', name: 'hiring_asks', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    onboarding_call: [
        { label: 'Client Name', name: 'client_name', type: 'text', required: true },
        { label: 'Target Kickoff Date', name: 'kickoff_date', type: 'date' },
        { label: 'Access Requests', name: 'access_requests', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    renewal_call: [
        { label: 'Current Term End', name: 'current_term_end', type: 'date' },
        { label: 'Decision', name: 'decision', type: 'select', options: [
            { value: 'renew', label: 'Renew' },
            { value: 'expand', label: 'Expand' },
            { value: 'downgrade', label: 'Downgrade' },
            { value: 'churn', label: 'Churn' },
            { value: 'undecided', label: 'Undecided' },
        ]},
        { label: 'New Value', name: 'new_value', type: 'currency' },
        { label: 'Uplift %', name: 'uplift_pct', type: 'number' },
        { label: 'Blockers', name: 'blockers', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    win_loss_review: [
        { label: 'Outcome', name: 'outcome', type: 'select', options: [
            { value: 'won', label: 'Won' },
            { value: 'lost', label: 'Lost' },
        ], required: true },
        { label: 'Competitor', name: 'competitor', type: 'text' },
        { label: 'Lessons Learned', name: 'lessons_learned', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    hiring_panel: [
        { label: 'Candidate Alias', name: 'candidate_alias', type: 'text', required: true, placeholder: 'First name or initials only' },
        { label: 'Role', name: 'role', type: 'text', required: true },
        { label: 'Level Assessed', name: 'level_assessed', type: 'select', options: [
            { value: 'junior', label: 'Junior' },
            { value: 'mid', label: 'Mid' },
            { value: 'senior', label: 'Senior' },
            { value: 'staff', label: 'Staff' },
        ]},
        { label: 'Decision', name: 'decision', type: 'select', options: [
            { value: 'hire', label: 'Hire' },
            { value: 'no_hire', label: 'No Hire' },
            { value: 'extend_loop', label: 'Extend Loop' },
            { value: 'hold', label: 'Hold' },
        ]},
        { label: 'Strengths', name: 'strengths', type: 'textarea' },
        { label: 'Concerns', name: 'concerns', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
    performance_review: [
        { label: 'Direct Report', name: 'report_name', type: 'text', required: true },
        { label: 'Manager', name: 'manager_name', type: 'text', required: true },
        { label: 'Rating', name: 'rating', type: 'select', options: [
            { value: 'exceeds', label: 'Exceeds' },
            { value: 'meets', label: 'Meets' },
            { value: 'developing', label: 'Developing' },
            { value: 'below', label: 'Below' },
        ]},
        { label: 'Promotion Signal', name: 'promotion_signal', type: 'select', options: [
            { value: 'ready_now', label: 'Ready Now' },
            { value: 'next_cycle', label: 'Next Cycle' },
            { value: 'not_yet', label: 'Not Yet' },
            { value: 'n/a', label: 'N/A' },
        ]},
        { label: 'Strengths', name: 'strengths', type: 'textarea' },
        { label: 'Growth Areas', name: 'growth_areas', type: 'textarea' },
        { label: 'Goals Next Cycle', name: 'goals_next_cycle', type: 'textarea' },
        { label: 'Meeting Notes', name: 'notes', type: 'textarea' },
    ],
};
