import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import SupportFloatingButton from "./components/SupportFloatingButton";
import ConnectivityBanner from "./components/ConnectivityBanner";
import { GenericPageSkeleton } from "./components/PageSkeletons";

// Pages are lazy-loaded per route so opening the app only downloads the
// shell plus the page being opened, not every page at once. Loaded chunks
// are content-hashed /assets, which the service worker caches, so repeat
// opens stay fast.
const Welcome = lazy(() => import("./pages/Welcome"));
const ChooseFranchise = lazy(() => import("./pages/ChooseFranchise"));
const FranchiseIntro = lazy(() => import("./pages/FranchiseIntro"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Products = lazy(() => import("./pages/Products"));
const Purchases = lazy(() => import("./pages/Purchases"));
const Sales = lazy(() => import("./pages/Sales"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const SnkrShop = lazy(() => import("./pages/SnkrShop"));
const SnkrShopDetail = lazy(() => import("./pages/SnkrShopDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const Chyusen = lazy(() => import("./pages/Chyusen"));
const ChyusenHistory = lazy(() => import("./pages/ChyusenHistory"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Settings = lazy(() => import("./pages/Settings"));
const ActivityHistory = lazy(() => import("./pages/ActivityHistory"));
const Trash = lazy(() => import("./pages/Trash"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoading() {
  return <GenericPageSkeleton />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoading />}>
    <Switch>
      <Route path={"/"} component={Welcome} />
      <Route path={"/welcome"} component={Welcome} />
      <Route path={"/choose-franchise"} component={ChooseFranchise} />
      <Route path={"/intro/:franchise"} component={FranchiseIntro} />
      <Route path={"/login"} component={Login} />
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
      <Route path={"/shop-snkr"}>
        <ProtectedRoute component={SnkrShop} />
      </Route>
      <Route path={"/shop-snkr/:id"}>
        <ProtectedRoute component={SnkrShopDetail} />
      </Route>
      <Route path={"/chyusen"}>
        <ProtectedRoute component={Chyusen} />
      </Route>
      <Route path="/lich-su-chyusen">
        <ProtectedRoute component={ChyusenHistory} />
      </Route>

      <Route path={"/thong-bao"}>
        <ProtectedRoute component={Notifications} />
      </Route>
      <Route path={"/cai-dat"}>
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path={"/thung-rac"}>
        <ProtectedRoute component={Trash} />
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
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster position="bottom-right" richColors />
          <ConnectivityBanner />
          <Router />
          <SupportFloatingButton />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
