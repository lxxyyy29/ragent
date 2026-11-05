import * as React from "react";
import { isRouteErrorResponse, useLocation, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";

/**
 * 路由级错误兜底页
 * <p>
 * react-router 默认的错误页会把堆栈直接甩给用户，既没用又吓人。
 * 这里给一句人话 + 两个动作：刷新（绝大多数渲染期错误刷新即恢复）、回首页。
 * <p>
 * 同时采集诊断信息（路由、视口、UA、组件栈），便于把问题反馈给开发者定位。
 */
export function RouterErrorPage() {
  const error = useRouteError();
  const location = useLocation();
  const [copied, setCopied] = React.useState(false);
  const [reloading, setReloading] = React.useState(false);

  const message = isRouteErrorResponse(error)
    ? `页面加载失败（${error.status} ${error.statusText || ""}）`
    : error instanceof Error
      ? error.message
      : "页面出了点问题";

  // React 在开发模式下会往异常上挂 componentStack，这是定位「哪个组件炸的」的关键
  const errorObj = error instanceof Error ? error : null;
  const componentStack = (errorObj as unknown as { componentStack?: string })?.componentStack ?? "";
  const errorStack = errorObj?.stack ?? "";

  const handleReload = () => {
    setReloading(true);
    window.location.reload();
  };

  const buildDiagnostics = () =>
    JSON.stringify(
      {
        time: new Date().toISOString(),
        url: window.location.href,
        route: location.pathname + location.search,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        message,
        componentStack,
        stack: errorStack,
        // 出错前的操作轨迹（仅开发环境采集）
        trail: (window as unknown as { __diagTrail?: string[] }).__diagTrail ?? []
      },
      null,
      2
    );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildDiagnostics());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // 剪贴板不可用（非 https / 权限拒绝）时退化为选中输出
      window.prompt("复制以下诊断信息：", buildDiagnostics());
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 py-10 text-center">
      <div className="chat-surface w-full max-w-xl rounded-3xl p-8 text-left">
        <p className="font-display text-xl font-semibold">页面出了点问题</p>
        <p className="mt-3 break-words text-sm text-muted-foreground">{message}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={handleReload} disabled={reloading}>
            {reloading ? "正在刷新…" : "刷新页面"}
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            回首页
          </Button>
          <Button variant="ghost" onClick={handleCopy}>
            {copied ? "已复制 ✓" : "复制诊断信息"}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          如果反复出现，请按 Ctrl + Shift + R 强制刷新；仍不行请把诊断信息发给开发者
        </p>

        {/* 诊断明细默认折叠，不影响正常阅读 */}
        {(componentStack || errorStack) && (
          <details className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer select-none text-muted-foreground">
              诊断明细（点击展开）
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed">
              {buildDiagnostics()}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
