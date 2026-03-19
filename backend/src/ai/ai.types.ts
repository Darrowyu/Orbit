// AI 服务相关类型定义

export interface AIResponse {
  description: string;
  subtasks: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
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
  dueDate?: string | null;
  priority?: string;
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

// OpenAI 兼容 API 响应类型
export interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: { content?: string; role?: string };
    finish_reason?: string;
  }>;
  error?: { message: string; type: string };
}

// AI 原始 JSON 解析结果
export interface ParsedAITaskResponse {
  description: string;
  subtasks: string[];
  priority: string;
}

export interface ParsedAISubdivideResponse {
  steps?: string[];
}
