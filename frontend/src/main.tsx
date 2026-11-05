import React from "react";
import ReactDOM from "react-dom/client";

import App from "@/App";
import { useAuthStore } from "@/stores/authStore";
import { useThemeStore } from "@/stores/themeStore";
import "@/styles/globals.css";

useThemeStore.getState().initialize();
useAuthStore.getState().checkAuth();

let scrollIdleTimer: ReturnType<typeof setTimeout> | null = null;
const handleScrollActivity = () => {
  document.documentElement.classList.add("is-scrolling");
  if (scrollIdleTimer) clearTimeout(scrollIdleTimer);
  scrollIdleTimer = setTimeout(() => {
    document.documentElement.classList.remove("is-scrolling");
  }, 800);
};
window.addEventListener("scroll", handleScrollActivity, { capture: true, passive: true });
window.addEventListener("wheel", handleScrollActivity, { capture: true, passive: true });
window.addEventListener("touchmove", handleScrollActivity, { capture: true, passive: true });

// 开发环境诊断：记录最近的操作轨迹，渲染期异常时随错误页一起带出，便于定位触发动作
if (import.meta.env.DEV) {
  const trail: string[] = [];
  const pushTrail = (entry: string) => {
    trail.push(`${new Date().toISOString()} ${entry}`);
    if (trail.length > 40) trail.shift();
  };
  (window as unknown as { __diagTrail?: string[] }).__diagTrail = trail;
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const label = (target.textContent || target.getAttribute("aria-label") || "").trim().slice(0, 40);
      pushTrail(`click <${target.tagName.toLowerCase()}> ${label}`);
    },
    { capture: true }
  );
  window.addEventListener("popstate", () => pushTrail(`navigate ${window.location.pathname}`));
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
