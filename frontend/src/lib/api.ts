import {
  Project,
  Review,
  DashboardStats,
  DemoRole,
  Document,
  DocumentDetail,
  PageText,
  TextBlock,
  ExtractedField,
  ReviewFieldsResponse,
  Checklist,
  ChecklistVersion,
  ChecklistRule,
  Finding,
  FindingStatus,
  FindingDecision,
  ActivityEvent,
  ActivityListResponse,
  ActivityTypeCount,
  ReviewEvaluationResponse,
  DiffItem,
  DiffSummaryResponse,
  DiffPromoteRequest,
  ReportPreview,
  ChatMessageResponse,
  ClinicalImpactSummary,
} from '../types';

const BASE_URL = '/api';

export function getStoredRole(): DemoRole {
  return (localStorage.getItem('mediscript_demo_role') as DemoRole) || 'reviewer';
}

export function setStoredRole(role: DemoRole): void {
  localStorage.setItem('mediscript_demo_role', role);
}

const ROLE_LABELS: Record<DemoRole, string> = {
  reviewer: 'Dr. Sarah Lin (Regulatory Reviewer)',
  quality_lead: 'Marcus Vance (Quality Lead)',
  admin: 'System Admin',
};

export function getRoleLabel(role: DemoRole): string {
  return ROLE_LABELS[role] || 'System';
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const role = getStoredRole();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Actor-Role', getRoleLabel(role));

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Error ${response.status}: ${response.statusText}`;
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.detail) {
        errorMessage = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail);
      }
    } catch {
      if (errorText) errorMessage = errorText;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchJson<{ status: string; app: string; version: string; engine: string }>('/health'),
  getStats: () => fetchJson<DashboardStats>('/stats'),
  
  // Projects
  getProjects: (includeArchived: boolean = false) =>
    fetchJson<Project[]>(`/projects?include_archived=${includeArchived}`),
  getProject: (id: string) => fetchJson<Project>(`/projects/${id}`),
  createProject: (data: { name: string; description?: string }) =>
    fetchJson<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: { name?: string; description?: string }) =>
    fetchJson<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveProject: (id: string) =>
    fetchJson<Project>(`/projects/${id}/archive`, { method: 'POST' }),

  // Reviews
  getReviews: (projectId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.append('project_id', projectId);
    if (status) params.append('status', status);
    const qs = params.toString();
    return fetchJson<Review[]>(`/reviews${qs ? `?${qs}` : ''}`);
  },
  getReview: (id: string) => fetchJson<Review>(`/reviews/${id}`),
  createReview: (data: {
    project_id: string;
    name: string;
    checklist_version_id?: string;
    baseline_document_id?: string;
    revised_document_id?: string;
  }) => fetchJson<Review>('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  updateReviewStatus: (id: string, status: string) =>
    fetchJson<Review>(`/reviews/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Documents & PDF Ingestion
  uploadDocument: async (
    file: File,
    role: 'baseline' | 'revised',
    reviewId?: string,
    projectId?: string
  ): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('role', role);
    if (reviewId) formData.append('review_id', reviewId);
    if (projectId) formData.append('project_id', projectId);
    formData.append('actor', getRoleLabel(getStoredRole()));

    const response = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'X-Actor-Role': getRoleLabel(getStoredRole()),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      let msg = `Upload failed (${response.status})`;
      try {
        const p = JSON.parse(err);
        if (p.detail) msg = p.detail;
      } catch {
        if (err) msg = err;
      }
      throw new Error(msg);
    }
    return response.json();
  },
  getDocument: (id: string) => fetchJson<Document>(`/documents/${id}`),
  getDocumentDetail: (id: string) => fetchJson<DocumentDetail>(`/documents/${id}/detail`),
  getDocumentPages: (id: string) => fetchJson<PageText[]>(`/documents/${id}/pages`),
  getPageDetails: (id: string, pageNumber: number) =>
    fetchJson<{ page: PageText; blocks: TextBlock[] }>(`/documents/${id}/pages/${pageNumber}`),
  getPagePreviewUrl: (id: string, pageNumber: number, dpi: number = 150) =>
    `${BASE_URL}/documents/${id}/pages/${pageNumber}/preview?dpi=${dpi}`,
  attachDocument: (documentId: string, reviewId: string, role: 'baseline' | 'revised') =>
    fetchJson<Document>(`/documents/${documentId}/attach`, {
      method: 'POST',
      body: JSON.stringify({ review_id: reviewId, role }),
    }),
  getReviewDocuments: (reviewId: string) => fetchJson<Document[]>(`/documents/review/${reviewId}`),

  // Structured Medical Entities
  getDocumentFields: (documentId: string) =>
    fetchJson<ExtractedField[]>(`/documents/${documentId}/fields`),
  extractDocumentFields: (documentId: string) =>
    fetchJson<ExtractedField[]>(`/documents/${documentId}/extract-fields`, {
      method: 'POST',
    }),
  updateField: (fieldId: string, value: string, overrideReason: string) =>
    fetchJson<ExtractedField>(`/fields/${fieldId}`, {
      method: 'PATCH',
      body: JSON.stringify({ value, override_reason: overrideReason }),
    }),
  revertField: (fieldId: string) =>
    fetchJson<ExtractedField>(`/fields/${fieldId}/revert`, {
      method: 'POST',
    }),
  getReviewFields: (reviewId: string) =>
    fetchJson<ReviewFieldsResponse>(`/reviews/${reviewId}/fields`),

  // Requirements & Checklists System
  getChecklists: () => fetchJson<Checklist[]>('/checklists'),
  getChecklist: (id: string) => fetchJson<Checklist>(`/checklists/${id}`),
  createChecklist: (data: {
    name: string;
    jurisdiction: string;
    source_reference?: string;
    description?: string;
    initial_version?: string;
    rules?: Partial<ChecklistRule>[];
  }) => fetchJson<Checklist>('/checklists', { method: 'POST', body: JSON.stringify(data) }),
  getVersion: (versionId: string) =>
    fetchJson<ChecklistVersion>(`/checklists/versions/${versionId}`),
  createVersion: (
    checklistId: string,
    data: {
      version: string;
      clone_from_version_id?: string;
      changelog_summary?: string;
      effective_date?: string;
      rules?: Partial<ChecklistRule>[];
    }
  ) =>
    fetchJson<ChecklistVersion>(`/checklists/${checklistId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  publishVersion: (versionId: string) =>
    fetchJson<ChecklistVersion>(`/checklists/versions/${versionId}/publish`, {
      method: 'PUT',
    }),
  addRule: (versionId: string, rule: Partial<ChecklistRule>) =>
    fetchJson<ChecklistRule>(`/checklists/versions/${versionId}/rules`, {
      method: 'POST',
      body: JSON.stringify(rule),
    }),
  updateRule: (ruleId: string, update: Partial<ChecklistRule>) =>
    fetchJson<ChecklistRule>(`/checklists/rules/${ruleId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    }),
  deleteRule: (ruleId: string) =>
    fetchJson<{ status: string; message: string }>(`/checklists/rules/${ruleId}`, {
      method: 'DELETE',
    }),
  uploadChecklist: async (file: File, targetChecklistId?: string): Promise<Checklist> => {
    const formData = new FormData();
    formData.append('file', file);
    if (targetChecklistId) formData.append('target_checklist_id', targetChecklistId);

    const response = await fetch(`${BASE_URL}/checklists/upload`, {
      method: 'POST',
      headers: {
        'X-Actor-Role': getRoleLabel(getStoredRole()),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      let msg = `Upload failed (${response.status})`;
      try {
        const p = JSON.parse(err);
        if (p.detail) {
          if (typeof p.detail === 'string') msg = p.detail;
          else if (p.detail.errors) msg = p.detail.errors.join('\n');
        }
      } catch {
        if (err) msg = err;
      }
      throw new Error(msg);
    }
    return response.json();
  },
  getTemplateUrl: (format: 'csv' | 'json') => `${BASE_URL}/checklists/template?format=${format}`,
  getExportVersionUrl: (versionId: string, format: 'csv' | 'json') =>
    `${BASE_URL}/checklists/versions/${versionId}/export?format=${format}`,

  // Findings & Evaluation
  evaluateReview: (reviewId: string) =>
    fetchJson<ReviewEvaluationResponse>(`/reviews/${reviewId}/evaluate`, { method: 'POST' }),
  getReviewFindings: (reviewId: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
    }
    const qs = params.toString();
    return fetchJson<Finding[]>(`/reviews/${reviewId}/findings${qs ? `?${qs}` : ''}`);
  },
  getFinding: (findingId: string) => fetchJson<Finding>(`/findings/${findingId}`),
  updateFindingStatus: (
    findingId: string,
    status: FindingStatus | string,
    explanation?: string
  ) =>
    fetchJson<Finding>(`/findings/${findingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, explanation }),
    }),

  // Revision Diff
  generateReviewDiff: (reviewId: string) =>
    fetchJson<DiffSummaryResponse>(`/reviews/${reviewId}/diff/generate`, { method: 'POST' }),
  getReviewDiff: (reviewId: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, v);
      });
    }
    const qs = params.toString();
    return fetchJson<DiffItem[]>(`/reviews/${reviewId}/diff${qs ? `?${qs}` : ''}`);
  },
  promoteDiffToFinding: (
    reviewId: string,
    diffId: string,
    data: DiffPromoteRequest
  ) =>
    fetchJson<{ finding: Finding; diff_item: DiffItem }>(
      `/reviews/${reviewId}/diff/${diffId}/promote`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  // Finding Decisions & Audit History
  recordFindingDecision: (
    findingId: string,
    data: { new_status: FindingStatus | string; note?: string; actor?: string; actor_role?: string }
  ) => {
    const role = getStoredRole();
    const actor = data.actor || getRoleLabel(role);
    return fetchJson<FindingDecision>(`/findings/${findingId}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ ...data, actor, actor_role: role }),
    });
  },
  getFindingDecisions: (findingId: string) =>
    fetchJson<FindingDecision[]>(`/findings/${findingId}/decisions`),

  // Activity Audit Trail
  getActivityEvents: (filters?: {
    project_id?: string;
    review_id?: string;
    event_type?: string;
    actor?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
      });
    }
    const qs = params.toString();
    return fetchJson<ActivityListResponse>(`/activity${qs ? `?${qs}` : ''}`);
  },
  getActivityTypes: () => fetchJson<ActivityTypeCount[]>('/activity/types'),
  getActivityEvent: (id: string) => fetchJson<ActivityEvent>(`/activity/${id}`),

  // Reports & Formal Audit Export
  getReportPreview: (reviewId: string) =>
    fetchJson<ReportPreview>(`/reviews/${reviewId}/reports/preview`),

  getPdfReportUrl: (reviewId: string, reviewerName?: string, reviewerRole?: string) => {
    const params = new URLSearchParams();
    if (reviewerName) params.append('reviewer_name', reviewerName);
    if (reviewerRole) params.append('reviewer_role', reviewerRole);
    const qs = params.toString();
    return `${BASE_URL}/reviews/${reviewId}/reports/pdf${qs ? `?${qs}` : ''}`;
  },

  getJsonPackageUrl: (reviewId: string) => `${BASE_URL}/reviews/${reviewId}/reports/json`,

  downloadPdfReport: async (reviewId: string, reviewerName?: string, reviewerRole?: string) => {
    const role = getStoredRole();
    const actor = reviewerName || getRoleLabel(role);
    const params = new URLSearchParams();
    params.append('reviewer_name', actor);
    if (reviewerRole) params.append('reviewer_role', reviewerRole);

    const res = await fetch(`${BASE_URL}/reviews/${reviewId}/reports/pdf?${params.toString()}`, {
      headers: {
        'X-Actor-Role': getRoleLabel(role),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to download PDF report: ${res.statusText}`);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `MediScript_Audit_Report_${reviewId}.pdf`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  downloadJsonPackage: async (reviewId: string) => {
    const role = getStoredRole();
    const res = await fetch(`${BASE_URL}/reviews/${reviewId}/reports/json`, {
      headers: {
        'X-Actor-Role': getRoleLabel(role),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to export JSON package: ${res.statusText}`);
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `MediScript_Review_Package_${reviewId}.json`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Phase 10: Bounded AI Assistance & Grounded Chat
  sendReviewChat: (
    reviewId: string,
    query: string,
    documentRole: string = 'revised'
  ): Promise<ChatMessageResponse> =>
    fetchJson<ChatMessageResponse>(`/reviews/${reviewId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ query, document_role: documentRole }),
    }),

  getDiffClinicalImpact: (
    reviewId: string,
    diffId: string
  ): Promise<ClinicalImpactSummary> =>
    fetchJson<ClinicalImpactSummary>(`/reviews/${reviewId}/diffs/${diffId}/impact`),

  // Phase 10: 1-Click Synthetic Demo Showcase
  loadDemoReview: (): Promise<{
    success: boolean;
    review_id: string;
    project_id: string;
    message: string;
  }> =>
    fetchJson<{
      success: boolean;
      review_id: string;
      project_id: string;
      message: string;
    }>('/demo/load', {
      method: 'POST',
    }),
};
