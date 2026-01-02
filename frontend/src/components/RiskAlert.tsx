import { memo, useState } from 'react';
import { aiApi } from '../services/api';
import { Task } from '../types';
import { Button } from './ui';

interface RiskAlertProps { 
  tasks: Task[]; 
}

interface Risk {
  taskId: string;
  riskLevel: string;
  reasons: string[];
  suggestions: string[];
}

const RISK_STYLES = {
  high: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: '高风险' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: '中风险' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', label: '低风险' },
} as const;

export const RiskAlert = memo(function RiskAlert({ tasks }: RiskAlertProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const detectRisks = async () => {
    setLoading(true);
    try {
      const { data } = await aiApi.detectRisks(tasks);
      setRisks(data);
      if (data.length > 0) setIsOpen(true);
    } catch { /* 风险检测失败静默处理 */ 
    } finally { 
      setLoading(false); 
    }
  };

  const highRisks = risks.filter(r => r.riskLevel === 'high');
  const hasHighRisk = highRisks.length > 0;

  const handleOpen = () => {
    setIsOpen(true);
    if (risks.length === 0 && tasks.length > 0) detectRisks();
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button 
          onClick={handleOpen}
          className="group relative flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-lg hover:shadow-xl hover:border-slate-300 transition-all duration-200"
        >
          {/* 图标 */}
          <div className={`p-1.5 rounded-lg ${hasHighRisk ? 'bg-red-100' : 'bg-slate-100'} transition-colors`}>
            <svg className={`w-4 h-4 ${hasHighRisk ? 'text-red-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          {/* 文字 */}
          <span className="text-sm font-medium text-slate-700">
            {risks.length === 0 ? '风险分析' : hasHighRisk ? `${highRisks.length} 个高风险` : `${risks.length} 个风险`}
          </span>
          
          {/* 高风险指示器 */}
          {hasHighRisk && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </button>
      ) : (
        <div className="bg-white rounded-2xl shadow-2xl w-[380px] max-h-[480px] overflow-hidden flex flex-col border border-slate-200 animate-scale-in">
          {/* 头部 */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${hasHighRisk ? 'bg-red-100' : 'bg-slate-100'}`}>
                <svg className={`w-5 h-5 ${hasHighRisk ? 'text-red-600' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">风险预警</h3>
                <p className="text-xs text-slate-500">{risks.length} 个风险项</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {risks.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">点击下方按钮开始分析</p>
              </div>
            ) : (
              risks.map((risk) => {
                const task = tasks.find(t => t.id === risk.taskId);
                if (!task) return null;
                const style = RISK_STYLES[risk.riskLevel as keyof typeof RISK_STYLES] || RISK_STYLES.low;
                
                return (
                  <div 
                    key={risk.taskId} 
                    className={`p-4 rounded-xl border ${style.bg} ${style.border} transition-all hover:shadow-sm`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm text-slate-800 line-clamp-1">{task.title}</h4>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="text-slate-500 flex-shrink-0">原因:</span>
                        <span className="text-slate-700">{risk.reasons.join('、')}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-slate-500 flex-shrink-0">建议:</span>
                        <span className="text-slate-700">{risk.suggestions.join('；')}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 底部 */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <Button 
              onClick={detectRisks} 
              isLoading={loading}
              variant="secondary"
              isFullWidth
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              {loading ? '分析中...' : '重新分析'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
