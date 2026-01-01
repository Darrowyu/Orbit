// AI 服务相关类型定义

export interface AIResponse {
  description: string;
  subtasks: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface UserAiConfig {
  aiProvider: string | null;
  aiApiKey: string | null;
  aiBaseUrl: string | null;
  aiModelName: string | null;
}

export interface WorkloadEstimate {
  hours: number;
  confidence: 'high' | 'medium' | 'low';
  factors: string[];
}

export interface TeamMemberInfo {
  id: string;
  name: string;
  skills?: string[];
}

export interface TaskInfo {
  id: string;
  title: string;
  status: string;
  assigneeId?: string;
}

export interface AssigneeRecommendation {
  recommendedId: string;
  reason: string;
  alternatives: { id: string; reason: string }[];
}

export interface RiskDetection {
  taskId: string;
  riskLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  suggestions: string[];
}
