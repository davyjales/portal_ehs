import { Suspense } from "react";
import LoginPage from "./LoginPage";

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <LoginPage />
    </Suspense>
  );
}
