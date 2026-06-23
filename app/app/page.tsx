"use client";

import { useEffect, useState } from "react";
import { AppHeader, type TabId } from "@/components/layout/AppHeader";
import { TabContent } from "@/components/layout/TabContent";
import { EHSSelector } from "@/components/ehs/EHSSelector";
import { initQuizPageTokenOnLoad } from "@/lib/quiz-client";

export default function EmployeeAppPage() {
  const [activeTab, setActiveTab] = useState<TabId>("inicio");
  const [userName, setUserName] = useState("Colaborador");

  useEffect(() => {
    initQuizPageTokenOnLoad();
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setUserName(data.name);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader userName={userName} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "inicio" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <EHSSelector showLoginButton={false} compact />
        </div>
      ) : (
        <TabContent tab={activeTab} />
      )}
    </div>
  );
}
