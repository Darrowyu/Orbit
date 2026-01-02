import React, { useState, useEffect } from 'react';
import { userApi } from '../services/api';

// AI 服务商及其可用模型列表
const AI_PROVIDERS: {
    value: string;
    label: string;
    description: string;
    defaultUrl: string;
    models: { value: string; label: string }[];
}[] = [
        {
            value: 'gemini',
            label: 'Google Gemini',
            description: '需要代理',
            defaultUrl: '',
            models: [
                { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (推荐)' },
                { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
            ]
        },
        {
            value: 'openai',
            label: 'OpenAI',
            description: '需要代理',
            defaultUrl: 'https://api.openai.com/v1',
            models: [
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini (推荐)' },
                { value: 'gpt-4o', label: 'GPT-4o' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
            ]
        },
        {
            value: 'deepseek',
            label: 'DeepSeek',
            description: '国内直连',
            defaultUrl: 'https://api.deepseek.com/v1',
            models: [
                { value: 'deepseek-chat', label: 'DeepSeek Chat (推荐)' },
                { value: 'deepseek-coder', label: 'DeepSeek Coder' },
                { value: 'deepseek-reasoner', label: 'DeepSeek R1' },
            ]
        },
        {
            value: 'moonshot',
            label: 'Moonshot (Kimi)',
            description: '国内直连',
            defaultUrl: 'https://api.moonshot.cn/v1',
            models: [
                { value: 'moonshot-v1-8k', label: 'Moonshot V1 8K (推荐)' },
                { value: 'moonshot-v1-32k', label: 'Moonshot V1 32K' },
                { value: 'moonshot-v1-128k', label: 'Moonshot V1 128K' },
            ]
        },
        {
            value: 'zhipu',
            label: '智谱 AI (GLM)',
            description: '国内直连',
            defaultUrl: 'https://open.bigmodel.cn/api/paas/v4',
            models: [
                { value: 'glm-4-flash', label: 'GLM-4 Flash (推荐)' },
                { value: 'glm-4-plus', label: 'GLM-4 Plus' },
                { value: 'glm-4', label: 'GLM-4' },
                { value: 'glm-4-air', label: 'GLM-4 Air' },
            ]
        },
        {
            value: 'custom',
            label: '自定义 (OpenAI 兼容)',
            description: '任意 OpenAI 格式 API',
            defaultUrl: '',
            models: [] // 自定义不提供预设模型列表
        },
    ];

export const AiConfigPanel: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    // 表单状态
    const [provider, setProvider] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [modelName, setModelName] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);

    // 加载现有配置
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const { data } = await userApi.getAiConfig();
            setProvider(data.aiProvider || '');
            setApiKey(data.aiApiKey || '');
            setBaseUrl(data.aiBaseUrl || '');
            setModelName(data.aiModelName || '');
            setAiPrompt(data.aiPrompt || '');
            setIsConfigured(data.isConfigured);
        } catch { /* 加载配置失败静默处理 */
        } finally {
            setLoading(false);
        }
    };

    // 当选择 provider 时，自动填充默认 URL 和默认模型
    const handleProviderChange = (value: string) => {
        setProvider(value);
        const selected = AI_PROVIDERS.find(p => p.value === value);
        if (selected) {
            // 自动填充 Base URL
            if (selected.defaultUrl) {
                setBaseUrl(selected.defaultUrl);
            } else {
                setBaseUrl('');
            }
            // 自动选择第一个推荐模型
            if (selected.models && selected.models.length > 0) {
                setModelName(selected.models[0].value);
            } else {
                setModelName('');
            }
        }
        setTestResult(null);
    };

    // 保存配置
    const handleSave = async () => {
        setSaving(true);
        try {
            await userApi.saveAiConfig({
                aiProvider: provider || undefined,
                aiApiKey: apiKey.startsWith('sk-****') ? undefined : apiKey,
                aiBaseUrl: baseUrl || undefined,
                aiModelName: modelName || undefined,
                aiPrompt: aiPrompt || undefined,
            });
            if (provider) setIsConfigured(true);
            setTestResult({ success: true, message: '配置已保存' });
        } catch (e: unknown) {
            setTestResult({ success: false, message: (e as { response?: { data?: { message?: string } } }).response?.data?.message || '保存失败' });
        } finally {
            setSaving(false);
        }
    };

    // 清除配置
    const handleClear = async () => {
        setSaving(true);
        try {
            await userApi.saveAiConfig({ clearConfig: true });
            setProvider('');
            setApiKey('');
            setBaseUrl('');
            setModelName('');
            setAiPrompt('');
            setIsConfigured(false);
            setTestResult({ success: true, message: '已恢复使用系统默认' });
        } catch {
            setTestResult({ success: false, message: '清除失败' });
        } finally {
            setSaving(false);
        }
    };

    // 测试连接
    const handleTest = async () => {
        if (!provider || !apiKey || apiKey.startsWith('sk-****')) {
            setTestResult({ success: false, message: '请输入有效的 API Key' });
            return;
        }
        setTesting(true);
        setTestResult(null);
        try {
            const { data } = await userApi.testAiConfig({
                aiProvider: provider,
                aiApiKey: apiKey,
                aiBaseUrl: baseUrl || undefined,
                aiModelName: modelName || undefined,
            });
            setTestResult(data);
        } catch (e: unknown) {
            setTestResult({ success: false, message: (e as { response?: { data?: { message?: string } } }).response?.data?.message || '连接测试失败' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500">加载中...</div>;
    }

    const selectedProvider = AI_PROVIDERS.find(p => p.value === provider);

    return (
        <div className="space-y-6">
            {/* 配置状态 */}
            <div className={`p-4 rounded-xl border ${isConfigured ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConfigured ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {isConfigured ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        )}
                    </div>
                    <div>
                        <p className={`font-medium ${isConfigured ? 'text-emerald-800' : 'text-amber-800'}`}>
                            {isConfigured ? '已配置自定义 AI 模型' : '使用系统默认 AI 模型'}
                        </p>
                        <p className={`text-sm ${isConfigured ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {isConfigured ? `当前使用: ${selectedProvider?.label || provider}` : '您可以配置自己的 API Key 以使用其他模型'}
                        </p>
                    </div>
                </div>
            </div>

            {/* 选择服务商 */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">AI 服务商</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {AI_PROVIDERS.map(p => (
                        <button
                            key={p.value}
                            onClick={() => handleProviderChange(p.value)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${provider === p.value
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                        >
                            <p className={`font-medium ${provider === p.value ? 'text-indigo-700' : 'text-slate-800'}`}>{p.label}</p>
                            <p className="text-xs text-slate-500">{p.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* API Key */}
            {provider && (
                <div className="space-y-2 animate-fade-in">
                    <label className="block text-sm font-semibold text-slate-700">API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={`输入您的 ${selectedProvider?.label} API Key`}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <p className="text-xs text-slate-400">您的 API Key 将被安全存储，仅用于调用 AI 服务</p>
                </div>
            )}

            {/* Base URL (非 Gemini) */}
            {provider && provider !== 'gemini' && (
                <div className="space-y-2 animate-fade-in">
                    <label className="block text-sm font-semibold text-slate-700">Base URL</label>
                    <input
                        type="text"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                        placeholder={selectedProvider?.defaultUrl || 'https://api.example.com/v1'}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            )}

            {/* 模型选择 (所有服务商) */}
            {provider && (
                <div className="space-y-2 animate-fade-in">
                    <label className="block text-sm font-semibold text-slate-700">选择模型</label>
                    {selectedProvider?.models && selectedProvider.models.length > 0 ? (
                        <select
                            value={modelName}
                            onChange={e => setModelName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '20px' }}
                        >
                            <option value="">使用默认模型</option>
                            {selectedProvider.models.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    ) : (
                        // 自定义模式：允许手动输入
                        <input
                            type="text"
                            value={modelName}
                            onChange={e => setModelName(e.target.value)}
                            placeholder="输入模型名称，如 gpt-4o-mini"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                    )}
                </div>
            )}

            {/* AI 提示词配置 - 独立分隔区域 */}
            <div className="border-t border-slate-200 pt-6 mt-2">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-semibold text-slate-700">自定义 AI 提示词</label>
                        <span className="text-xs text-slate-400">用于任务智能生成时的指令</span>
                    </div>

                    {/* 预置模板 */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { label: '默认', value: '' },
                            { label: '简洁风格', value: '你是一个高效的项目经理。请用简洁专业的语言生成任务内容，避免冗余描述。任务标题: {title}' },
                            { label: '详细分解', value: '你是一个资深项目经理。请详细分解任务 "{title}"，包括：1. 详尽的任务描述（背景、目标、验收标准） 2. 5-8个具体可执行的子任务 3. 合理的优先级建议' },
                            { label: '敏捷开发', value: '你是一个敏捷教练。请将任务 "{title}" 拆解为符合敏捷开发理念的用户故事格式。每个子任务应该是一个可在1-2天内完成的小增量。' },
                        ].map(tpl => (
                            <button
                                key={tpl.label}
                                onClick={() => setAiPrompt(tpl.value)}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-all ${aiPrompt === tpl.value ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                            >
                                {tpl.label}
                            </button>
                        ))}
                    </div>

                    {/* 提示词输入框 */}
                    <div className="relative">
                        <textarea
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            placeholder="留空使用默认提示词，或编写自定义指令..."
                            rows={4}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        />
                        {aiPrompt && (
                            <button
                                onClick={() => setAiPrompt('')}
                                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">提示：使用 <code className="bg-slate-100 px-1 rounded">{'{title}'}</code> 作为任务标题占位符</p>
                </div>
            </div>

            {/* 测试结果 */}
            {testResult && (
                <div className={`p-4 rounded-lg ${testResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} animate-fade-in`}>
                    <p className="text-sm font-medium">{testResult.message}</p>
                </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 mt-2">
                {provider && (
                    <button
                        onClick={handleTest}
                        disabled={!provider || testing}
                        className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {testing ? '测试中...' : '测试连接'}
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? '保存中...' : '保存设置'}
                </button>
                {(isConfigured || aiPrompt) && (
                    <button
                        onClick={handleClear}
                        disabled={saving}
                        className="px-5 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    >
                        重置全部
                    </button>
                )}
            </div>
        </div>
    );
};
