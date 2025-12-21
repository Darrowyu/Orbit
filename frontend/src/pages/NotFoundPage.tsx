import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="text-center max-w-md animate-fade-in-up">
                {/* 404 动画图形 */}
                <div className="relative mb-8">
                    <div className="text-[180px] font-bold gradient-text leading-none">404</div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse">
                            <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 mb-4">页面未找到</h1>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    抱歉，您访问的页面不存在或已被移动。<br />
                    请检查 URL 是否正确，或返回首页重新开始。
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => navigate('/')} size="lg" className="btn-press">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        返回首页
                    </Button>
                    <Button onClick={() => navigate(-1)} variant="secondary" size="lg" className="btn-press">
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        返回上页
                    </Button>
                </div>

                {/* 装饰元素 */}
                <div className="mt-16 flex justify-center gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`w-2 h-2 rounded-full bg-indigo-${i * 100 + 200} animate-pulse`} style={{ animationDelay: `${i * 200}ms` }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
