// ============================================================
// نقطة الدخول الرئيسية للتطبيق
// ============================================================
import { Switch, Route, Router as WouterRouter, Redirect, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login        from "@/pages/Login";
import Dashboard    from "@/pages/Dashboard";
import Accounting   from "@/pages/Accounting";
import Appointments from "@/pages/Appointments";
import Statistics   from "@/pages/Statistics";
import Admin        from "@/pages/Admin";
import PatientFile  from "@/pages/PatientFile";

const queryClient = new QueryClient();

function isLoggedIn(): boolean {
  return localStorage.getItem("isLoggedIn") === "true";
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
      <div className="text-center">
        <p className="text-6xl font-bold text-sky-200 mb-4">404</p>
        <p className="text-gray-500">الصفحة غير موجودة</p>
      </div>
    </div>
  );
}

function PatientFilePage() {
  const params    = useParams<{ id: string }>();
  const patientId = parseInt(params.id || "0", 10);
  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400" dir="rtl">
        رقم الملف غير صحيح
      </div>
    );
  }
  return <PatientFile patientId={patientId} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />

      <Route path="/dashboard">
        {() => !isLoggedIn() ? <Redirect to="/" /> : <Dashboard />}
      </Route>

      <Route path="/patient/:id">
        {() => !isLoggedIn() ? <Redirect to="/" /> : <PatientFilePage />}
      </Route>

      <Route path="/appointments">
        {() => !isLoggedIn() ? <Redirect to="/" /> : <Appointments />}
      </Route>

      <Route path="/accounting">
        {() => !isLoggedIn() ? <Redirect to="/" /> : <Accounting />}
      </Route>

      <Route path="/statistics">
        {() => !isLoggedIn() ? <Redirect to="/" /> : <Statistics />}
      </Route>

      <Route path="/admin">
        {() => !isLoggedIn() ? <Redirect to="/" /> : <Admin />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
