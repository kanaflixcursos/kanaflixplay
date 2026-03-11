import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

// Layouts and Route Protection
import StudentLayout from "@/components/layouts/StudentLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";

// Page Components
import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentProfile from "@/pages/student/Profile";
import CourseView from "@/pages/student/CourseView";
import NotificationsPage from "@/pages/student/Notifications";
import PurchasesPage from "@/pages/student/Purchases";
import StudentCoursesPage from "@/pages/student/Courses";
import CatalogPage from "@/pages/student/Catalog";
import SupportPage from "@/pages/student/Support";
import TicketChatPage from "@/pages/student/TicketChat";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCourses from "@/pages/admin/Courses";
import CourseForm from "@/pages/admin/CourseForm";
import AdminStudents from "@/pages/admin/Students";
import AdminStudentProfile from "@/pages/admin/StudentProfile";
import AdminOrders from "@/pages/admin/Orders";
import AdminComments from "@/pages/admin/Comments";
import AdminSupport from "@/pages/admin/Support";
import AdminTicketChat from "@/pages/admin/TicketChat";
import AdminFeaturedBanner from "@/pages/admin/FeaturedBanner";
import AdminMarketing from "@/pages/admin/Marketing";
import AdminMarketingLeads from "@/pages/admin/MarketingLeads";
import AdminMarketingForms from "@/pages/admin/MarketingForms";
import AdminMarketingEmail from "@/pages/admin/MarketingEmail";
import AdminFormDetail from "@/pages/admin/FormDetail";
import AdminCampaignEditor from "@/pages/admin/CampaignEditor";
import AdminMarketingCoupons from "@/pages/admin/MarketingCoupons";
import AdminCouponForm from "@/pages/admin/CouponForm";

const queryClient = new QueryClient();

// Layout component for student routes
const StudentRoutesLayout = () => (
  <ProtectedRoute>
    <StudentLayout>
      <Outlet />
    </StudentLayout>
  </ProtectedRoute>
);

// Layout component for admin routes
const AdminRoutesLayout = () => (
  <ProtectedRoute requiredRole="admin">
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  </ProtectedRoute>
);

// Admin routes without the main layout (e.g., for full-screen pages)
const AdminRoutesNoLayout = () => (
    <ProtectedRoute requiredRole="admin">
        <Outlet />
    </ProtectedRoute>
);

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="kanaflix-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ScrollToTop />
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/checkout/:courseId" element={<Checkout />} />
              
              {/* Student Routes */}
              <Route path="/" element={<StudentRoutesLayout />}>
                <Route index element={<Index />} />
                <Route path="courses/:courseId" element={<CourseView />} />
                <Route path="courses" element={<StudentCoursesPage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="suporte" element={<SupportPage />} />
                <Route path="suporte/:ticketId" element={<TicketChatPage />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoutesLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="courses" element={<AdminCourses />} />
                <Route path="courses/new" element={<CourseForm />} />
                <Route path="courses/:courseId/edit" element={<CourseForm />} />
                <Route path="students" element={<AdminStudents />} />
                <Route path="students/:userId" element={<AdminStudentProfile />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="comments" element={<AdminComments />} />
                <Route path="featured-banner" element={<AdminFeaturedBanner />} />
                <Route path="marketing" element={<AdminMarketing />} />
                <Route path="marketing/leads" element={<AdminMarketingLeads />} />
                <Route path="marketing/forms" element={<AdminMarketingForms />} />
                <Route path="marketing/forms/:formId" element={<AdminFormDetail />} />
                <Route path="marketing/email" element={<AdminMarketingEmail />} />
                <Route path="marketing/email/:campaignId" element={<AdminCampaignEditor />} />
                <Route path="marketing/coupons" element={<AdminMarketingCoupons />} />
                <Route path="marketing/coupons/new" element={<AdminCouponForm />} />
                <Route path="marketing/coupons/:couponId/edit" element={<AdminCouponForm />} />
              </Route>

              {/* Admin routes that don't use the standard sidebar layout */}
              <Route element={<AdminRoutesNoLayout />}>
                <Route path="/admin/suporte" element={<AdminSupport />} />
                <Route path="/admin/suporte/:ticketId" element={<AdminTicketChat />} />
              </Route>
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
