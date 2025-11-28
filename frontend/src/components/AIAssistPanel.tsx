import React, { useState } from 'react';
import { aiApi } from '../services/api';
import { User } from '../types';

interface Props {
  taskTitle: string;
  description: string;
  subtasks: string[];
  teamMembers: User[];
  taskHistory: any[];
  onAssigneeRecommend: (id: string) => void;
  onWorkloadEstimate: (hours: number) => void;
}

export const AIAssistPanel: React.FC<Props> = ({ taskTitle, description, subtasks, teamMembers, taskHistory, onAssigneeRecommend, onWorkloadEstimate }) => {
  const [workload, setWorkload] = useState<{ hours: number; confidence: string; factors: string[] } | null>(null);
  const [recommendation, setRecommendation] = useState<{ recommendedId: string; reason: string; alternatives: { id: string; reason: string }[] } | null>(null);
  const [loading, setLoading] = useState<'workload' | 'assignee' | null>(null);

  const handleEstimateWorkload = async () => {
    if (!taskTitle) return;
    setLoading('workload');
    try {
      const { data } = await aiApi.estimateWorkload(taskTitle, description, subtasks);
      setWorkload(data);
      onWorkloadEstimate(data.hours);
    } catch (err) { console.error(err); }
    finally { setLoading(null); }
  };

  const handleRecommendAssignee = async () => {
    if (!taskTitle || !teamMembers.length) return;
    setLoading('assignee');
    try {
      const { data } = await aiApi.recommendAssignee(taskTitle, description, teamMembers, taskHistory);
      setRecommendation(data);
    } catch (err) { console.error(err); }
    finally { setLoading(null); }
  };

  const applyRecommendation = (id: string) => {
    onAssigneeRecommend(id);
    setRecommendation(null);
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
        AI 智能助手
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleEstimateWorkload} disabled={loading === 'workload' || !taskTitle} className="px-3 py-2 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 transition-colors disabled:opacity-50">
          {loading === 'workload' ? '分析中...' : '📊 工作量预估'}
        </button>
        <button onClick={handleRecommendAssignee} disabled={loading === 'assignee' || !taskTitle} className="px-3 py-2 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700 transition-colors disabled:opacity-50">
          {loading === 'assignee' ? '推荐中...' : '👤 智能推荐负责人'}
        </button>
      </div>
      {workload && (
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">预估工作量</span>
            <span className={`text-xs px-2 py-0.5 rounded ${workload.confidence === 'high' ? 'bg-green-100 text-green-700' : workload.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{workload.confidence === 'high' ? '高置信度' : workload.confidence === 'medium' ? '中等置信度' : '低置信度'}</span>
          </div>
          <div className="text-2xl font-bold text-indigo-600 mb-2">{workload.hours} 小时</div>
          <div className="text-xs text-gray-500">
            <div className="font-medium mb-1">影响因素：</div>
            <ul className="list-disc list-inside space-y-0.5">{workload.factors.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
        </div>
      )}
      {recommendation && (
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <div className="text-sm font-medium text-gray-700 mb-2">推荐负责人</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-indigo-50 rounded border border-indigo-200">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${teamMembers.find(m => m.id === recommendation.recommendedId)?.color || 'bg-gray-200'}`}>{teamMembers.find(m => m.id === recommendation.recommendedId)?.avatar}</div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{teamMembers.find(m => m.id === recommendation.recommendedId)?.name}</div>
                  <div className="text-xs text-gray-500">{recommendation.reason}</div>
                </div>
              </div>
              <button onClick={() => applyRecommendation(recommendation.recommendedId)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors">采纳</button>
            </div>
            {recommendation.alternatives.map((alt, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${teamMembers.find(m => m.id === alt.id)?.color || 'bg-gray-200'}`}>{teamMembers.find(m => m.id === alt.id)?.avatar}</div>
                  <div>
                    <div className="text-xs font-medium text-gray-700">{teamMembers.find(m => m.id === alt.id)?.name}</div>
                    <div className="text-xs text-gray-400">{alt.reason}</div>
                  </div>
                </div>
                <button onClick={() => applyRecommendation(alt.id)} className="px-2 py-0.5 text-indigo-600 hover:bg-indigo-50 text-xs rounded transition-colors">选择</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
