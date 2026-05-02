import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import UserWall from "./pages/UserWall.tsx";
import UserWallDashboard from "./pages/UserWallDashboard.tsx";
import SetupWall from "./pages/SetupWall.tsx";
import Profiles from "./pages/Profiles.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useParams } from "react-router-dom";

const SharedWallRedirect = () => {
  const params = new URLSearchParams(window.location.search);
  const username = params.get("wall")?.trim().toLowerCase();
  if (!username) return <Index />;
  return <Navigate to={`/u/${encodeURIComponent(username)}`} replace />;
};

const DeyalAliasRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const safe = (username || "").trim().toLowerCase();
  if (!safe) return <Navigate to="/" replace />;
  return <Navigate to={`/u/${encodeURIComponent(safe)}`} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SharedWallRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/setup-wall" element={<SetupWall />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/deyal=:username" element={<DeyalAliasRedirect />} />
            <Route path="/u/:username" element={<UserWall />} />
            <Route path="/wall/:username/dashboard" element={<UserWallDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
