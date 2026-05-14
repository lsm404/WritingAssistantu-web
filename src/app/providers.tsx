"use client";

import { App, ConfigProvider } from "antd";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#0f172a",
          colorInfo: "#0f172a",
          colorLink: "#4856c5",
          borderRadius: 16,
          colorBorder: "#e7e5e4",
          colorBgBase: "#ffffff",
          fontFamily: '"HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", sans-serif',
        },
        components: {
          Button: {
            controlHeight: 42,
            borderRadius: 999,
            primaryShadow: "none",
          },
          Card: {
            borderRadiusLG: 26,
          },
          Drawer: {
            colorBgElevated: "#ffffff",
          },
          Input: {
            activeBorderColor: "#5b43ff",
            hoverBorderColor: "#cbd5e1",
          },
          Select: {
            activeBorderColor: "#5b43ff",
            hoverBorderColor: "#cbd5e1",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
