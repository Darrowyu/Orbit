import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';

export const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50/50 p-6">
            <div className="text-center max-w-sm animate-fade-in-up">
                {/* 极简 404 */}
                <div className="mb-8">
                    <div className="text-[120px] font-semibold text-neutral-200 leading-none tracking-tight">404</div>
                </div>

                <h1 className="text-xl font-semibold text-neutral-900 mb-2">页面未找到</h1>
                <p className="text-neutral-400 mb-8 text-sm leading-relaxed">
                    抱歉，您访问的页面不存在或已被移动。
                </p>

                <div className="flex gap-3 justify-center">
                    <Button onClick={() => navigate('/')}>
                        返回首页
                    </Button>
                    <Button onClick={() => navigate(-1)} variant="secondary">
                        返回上页
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
