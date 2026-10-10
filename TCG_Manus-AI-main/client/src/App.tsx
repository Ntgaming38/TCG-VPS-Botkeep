import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Marketplace from "./pages/Marketplace";
import Reports from "./pages/Reports";
import Chyusen from "./pages/Chyusen";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ActivityHistory from "./pages/ActivityHistory";
import DashboardLayout from "./components/DashboardLayout";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/thong-ke"}>
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path={"/san-pham"}>
        <ProtectedRoute component={Products} />
      </Route>
      <Route path={"/san-pham/:type"}>
        {(params) => (
          <DashboardLayout>
            <Products />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/mua-hang"}>
        <ProtectedRoute component={Purchases} />
      </Route>
      <Route path={"/ban-hang"}>
        <ProtectedRoute component={Sales} />
      </Route>
      <Route path={"/kho-hang"}>
        <ProtectedRoute component={Inventory} />
      </Route>
      <Route path={"/marketplace"}>
        <ProtectedRoute component={Marketplace} />
      </Route>
      <Route path={"/chyusen"}>
        <ProtectedRoute component={Chyusen} />
      </Route>
      <Route path={"/thong-bao"}>
        <ProtectedRoute component={Notifications} />
      </Route>
      <Route path={"/cai-dat"}>
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path={"/bao-cao"}>
        <ProtectedRoute component={Reports} />
      </Route>
      <Route path={"/lich-su"}>
        <ProtectedRoute component={ActivityHistory} />
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster position="bottom-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
