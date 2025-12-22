import React, { useState } from 'react';
import { aiApi } from '../services/api';
import { Task } from '../types';

interface Props { tasks: Task[]; }

export const RiskAlert: React.FC<Props> = ({ tasks }) => {
  const [risks, setRisks] = useState<{ taskId: string; riskLevel: string; reasons: string[]; suggestions: string[] }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const detectRisks = async () => {
    setLoading(true);
    try {
      const { data } = await aiApi.detectRisks(tasks);
      setRisks(data);
      if (data.length > 0) setIsOpen(true);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const highRisks = risks.filter(r => r.riskLevel === 'high');

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {!isOpen ? (
        <button onClick={() => { setIsOpen(true); if (risks.length === 0 && tasks.length > 0) detectRisks(); }} className="relative bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span className="font-medium">{risks.length === 0 ? '风险分析' : highRisks.length > 0 ? `${highRisks.length} 个高风险` : `${risks.length} 个风险`}</span>
          {highRisks.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping" />}
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow-2xl w-96 max-h-[500px] overflow-hidden flex flex-col">
          <div className="p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <h3 className="font-semibold">风险预警</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 rounded p-1 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {risks.map((risk) => {
              const task = tasks.find(t => t.id === risk.taskId);
              if (!task) return null;
              return (
                <div key={risk.taskId} className={`p-3 rounded-lg border-l-4 ${risk.riskLevel === 'high' ? 'bg-red-50 border-red-500' : risk.riskLevel === 'medium' ? 'bg-yellow-50 border-yellow-500' : 'bg-blue-50 border-blue-500'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm text-gray-900">{task.title}</div>
                    <span className={`text-xs px-2 py-0.5 rounded ${risk.riskLevel === 'high' ? 'bg-red-100 text-red-700' : risk.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{risk.riskLevel === 'high' ? '高风险' : risk.riskLevel === 'medium' ? '中风险' : '低风险'}</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div><span className="font-medium">风险原因：</span>{risk.reasons.join('、')}</div>
                    <div><span className="font-medium">建议：</span>{risk.suggestions.join('；')}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-100">
            <button onClick={detectRisks} disabled={loading} className="w-full px-3 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50">{loading ? '分析中...' : '🔄 重新分析'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
