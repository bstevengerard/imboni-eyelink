import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect } from "react";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import PatientPortal from "./pages/PatientPortal";
import DoctorPortal from "./pages/DoctorPortal";
import AdminPortal from "./pages/AdminPortal";
import AboutPage from "./pages/AboutPage";
import ServicesPage from "./pages/ServicesPage";
import EducationPage from "./pages/EducationPage";
import HospitalsPage from "./pages/HospitalsPage";
import ContactPage from "./pages/ContactPage";
import FAQsPage from "./pages/FAQsPage";
import LegalPage from "./pages/LegalPage";
import NotFound from "./pages/NotFound";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResearchLibraryPage from "./pages/ResearchLibraryPage";
import DonatePage from "./pages/DonatePage";

const sonnerToasterProps = {
  theme: "light" as const,
  className: "bg-background text-foreground",
  toastOptions: {
    classNames: {
      toast: "bg-background border shadow-lg",
      success: "border-l-4 border-l-green-500",
      error: "border-l-4 border-l-red-500",
      warning: "border-l-4 border-l-yellow-500",
      info: "border-l-4 border-l-blue-500",
    },
  },
};

const queryClient = new QueryClient();

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [location.pathname, location.hash]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner {...sonnerToasterProps} />
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/education" element={<EducationPage />} />
              <Route path="/hospitals" element={<HospitalsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/faqs" element={<FAQsPage />} />
              <Route path="/privacy" element={<LegalPage />} />
              <Route path="/terms" element={<LegalPage />} />
              <Route path="/cookies" element={<LegalPage />} />
              <Route path="/research" element={<ResearchLibraryPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/donate" element={<DonatePage />} />

              <Route
                path="/patient/*"
                element={
                  <ProtectedRoute allowedRoles={["patient"]}>
                    <PatientPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/doctor/*"
                element={
                  <ProtectedRoute allowedRoles={["doctor", "optometrist"]}>
                    <DoctorPortal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
                    <AdminPortal />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

