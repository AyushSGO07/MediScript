export type ReviewStatus = 'Draft' | 'In Progress' | 'Completed' | 'Archived';
export type ProjectStatus = 'active' | 'archived';

export type DemoRole = 'reviewer' | 'quality_lead' | 'admin';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id?: string;
  review_id?: string;
  role: 'baseline' | 'revised' | 'supporting';
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  sha256: string;
  page_count: number;
  has_text_layer: boolean;
  upload_status: string;
  extraction_status: string;
  created_at: string;
  updated_at: string;
}

export interface PageText {
  id: string;
  document_id: string;
  page_number: number;
  width: number;
  height: number;
  extracted_text: string;
  char_count: number;
  word_count: number;
  has_text: boolean;
}

export interface TextBlock {
  id: string;
  page_number: number;
  block_index: number;
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  norm_x0: number;
  norm_y0: number;
  norm_x1: number;
  norm_y1: number;
  font_name?: string;
  font_size?: number;
  is_heading: boolean;
}

export interface DocumentDetail extends Document {
  pages: PageText[];
  text_blocks: TextBlock[];
}

export type ConfidenceState = 'EXTRACTED' | 'AMBIGUOUS' | 'NOT_READABLE' | 'NOT_FOUND';

export interface ExtractedField {
  id: string;
  document_id: string;
  review_id?: string;
  field_key: string;
  field_label: string;
  category: string;
  value?: string;
  raw_value?: string;
  normalized_value?: string;
  confidence_state: ConfidenceState;
  evidence_text?: string;
  evidence_page?: number;
  evidence_block_id?: string;
  norm_x0?: number;
  norm_y0?: number;
  norm_x1?: number;
  norm_y1?: number;
  is_iso_compliant?: boolean;
  is_expired?: boolean;
  days_until_expiration?: number;
  is_overridden: boolean;
  original_value?: string;
  original_confidence_state?: string;
  override_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface ReviewFieldsResponse {
  review_id: string;
  baseline_fields: ExtractedField[];
  revised_fields: ExtractedField[];
}

export interface Review {
  id: string;
  project_id: string;
  name: string;
  status: ReviewStatus;
  checklist_version_id?: string;
  baseline_document_id?: string;
  revised_document_id?: string;
  baseline_document?: Document;
  revised_document?: Document;
  findings_count?: number;
  critical_findings_count?: number;
  diff_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ActivitySummary {
  id: string;
  event_type: string;
  actor: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface DashboardStats {
  total_projects: number;
  total_reviews: number;
  draft_reviews: number;
  in_progress_reviews: number;
  completed_reviews: number;
  archived_reviews: number;
  open_findings_count: number;
  recent_activity: ActivitySummary[];
}

export type NavigationView =
  | 'overview'
  | 'projects'
  | 'reviews'
  | 'requirements'
  | 'reports'
  | 'activity'
  | 'settings';

export type SeverityLevel = 'Critical' | 'Major' | 'Minor';
export type RuleType =
  | 'REQUIRED_PRESENCE'
  | 'FORMAT_REGEX'
  | 'VALUE_MATCH'
  | 'DATE_EXPIRATION'
  | 'CROSS_FIELD_MATCH';
export type VersionStatus = 'draft' | 'published' | 'deprecated';

export interface ChecklistRule {
  id: string;
  checklist_version_id: string;
  rule_key: string;
  field_key: string;
  description: string;
  severity: SeverityLevel;
  rule_type: RuleType;
  expected_value?: string;
  config?: string;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistVersion {
  id: string;
  checklist_id: string;
  version: string;
  status: VersionStatus;
  effective_date?: string;
  changelog_summary?: string;
  created_by?: string;
  rule_count?: number;
  is_locked?: boolean;
  rules?: ChecklistRule[];
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  jurisdiction: string;
  source_reference?: string;
  is_demonstration: boolean;
  version_count?: number;
  latest_version?: string;
  versions?: ChecklistVersion[];
  created_at: string;
  updated_at: string;
}

export type FindingStatus = 'Open' | 'Accepted' | 'Resolved' | 'Under Investigation';
export type FindingCategory =
  | 'Identifiers'
  | 'Manufacturer'
  | 'Dates'
  | 'Regulatory'
  | 'Safety'
  | 'General';

export interface Finding {
  id: string;
  review_id: string;
  rule_id?: string;
  diff_item_id?: string;
  rule_key: string;
  checklist_version_id: string;
  category: FindingCategory | string;
  severity: SeverityLevel;
  status: FindingStatus;
  explanation: string;
  expected_value?: string;
  observed_value?: string;
  source_document_id?: string;
  document_role: 'baseline' | 'revised' | string;
  page_number?: number;
  evidence_snippet?: string;
  norm_x0?: number;
  norm_y0?: number;
  norm_x1?: number;
  norm_y1?: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewEvaluationResponse {
  review_id: string;
  checklist_version_id: string;
  evaluated_at: string;
  total_rules_evaluated: number;
  rules_passed: number;
  rules_failed: number;
  critical_count: number;
  major_count: number;
  minor_count: number;
  findings: Finding[];
}

export type DiffType = 'ADDED' | 'DELETED' | 'MODIFIED' | 'UNCHANGED';
export type DiffCategory =
  | 'Identifiers'
  | 'Dates'
  | 'Manufacturer'
  | 'Safety'
  | 'Regulatory'
  | 'General';

export interface WordTokenDiff {
  text: string;
  type: 'equal' | 'insert' | 'delete' | string;
}

export interface DiffItem {
  id: string;
  review_id: string;
  change_type: DiffType;
  category: DiffCategory | string;
  significance: 'High' | 'Medium' | 'Low' | string;
  baseline_text?: string;
  revised_text?: string;
  baseline_page?: number;
  revised_page?: number;
  baseline_block_id?: string;
  revised_block_id?: string;
  baseline_norm_x0?: number;
  baseline_norm_y0?: number;
  baseline_norm_x1?: number;
  baseline_norm_y1?: number;
  revised_norm_x0?: number;
  revised_norm_y0?: number;
  revised_norm_x1?: number;
  revised_norm_y1?: number;
  token_diffs?: WordTokenDiff[];
  is_promoted: boolean;
  promoted_finding_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DiffSummaryResponse {
  review_id: string;
  total_changes: number;
  added_count: number;
  deleted_count: number;
  modified_count: number;
  promoted_count: number;
  diff_items: DiffItem[];
}

export interface DiffPromoteRequest {
  severity?: 'Critical' | 'Major' | 'Minor' | string;
  explanation?: string;
}


