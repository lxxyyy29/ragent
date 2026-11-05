import * as React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

import { Button } from "@/components/ui/button";

/**
 * 路由级错误兜底页
 * <p>
 * react-router 默认的错误页会把堆栈直接甩给用户，既没用又吓人。
 * 这里给一句人话 + 两个动作：刷新（绝大多数渲染期错误刷新即恢复）、回首页。
 * <p>
 * 挂在各路由的 errorElement 上；挂在根路由时会兜住所有子路由的渲染异常
 */
export function RouterErrorPage() {
  const error = useRouteError();
  const [reloading, setReloading] = React.useState(false);

  const message = isRouteErrorResponse(error)
    ? `页面加载失败（${error.status} ${error.statusText || ""}）`
    : error instanceof Error
      ? error.message
      : "页面出了点问题";

  const handleReload = () => {
    setReloading(true);
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="chat-surface max-w-md rounded-3xl p-8">
        <p className="font-display text-xl font-semibold">页面出了点问题</p>
        <p className="mt-3 break-words text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={handleReload} disabled={reloading}>
            {reloading ? "正在刷新…" : "刷新页面"}
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/")}>
            回首页
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          如果反复出现，请按 Ctrl + Shift + R 强制刷新
        </p>
      </div>
    </div>
  );
}
