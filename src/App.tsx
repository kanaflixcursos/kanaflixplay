import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

import Index from "./pages/Index";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

import StudentLayout from "@/components/layouts/StudentLayout";
import StudentProfile from "@/pages/student/Profile";
import CourseView from "@/pages/student/CourseView";
import NotificationsPage from "@/pages/student/Notifications";
import PurchasesPage from "@/pages/student/Purchases";
import PointsPage from "@/pages/student/Points";
import StudentCoursesPage from "@/pages/student/Courses";
import CatalogPage from "@/pages/student/Catalog";

import AdminLayout from "@/components/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCourses from "@/pages/admin/Courses";
import CourseForm from "@/pages/admin/CourseForm";
import CourseDetail from "@/pages/admin/CourseDetail";
import AdminStudents from "@/pages/admin/Students";
import AdminStudentProfile from "@/pages/admin/StudentProfile";
import AdminOrders from "@/pages/admin/Orders";
import AdminWallet from "@/pages/admin/Wallet";
import AdminComments from "@/pages/admin/Comments";
import AdminFeaturedBanner from "@/pages/admin/FeaturedBanner";
import AdminMarketing from "@/pages/admin/Marketing";
import AdminMarketingLeads from "@/pages/admin/MarketingLeads";
import AdminMarketingForms from "@/pages/admin/MarketingForms";
import AdminMarketingEmail from "@/pages/admin/MarketingEmail";
import AdminFormDetail from "@/pages/admin/FormDetail";
import AdminCampaignEditor from "@/pages/admin/CampaignEditor";
import AdminMarketingCoupons from "@/pages/admin/MarketingCoupons";
import AdminCouponForm from "@/pages/admin/CouponForm";
import AdminMarketingCombos from "@/pages/admin/MarketingCombos";
import AdminComboForm from "@/pages/admin/ComboForm";
import ComboCheckout from "@/pages/ComboCheckout";

import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

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
              
              <Route path="/checkout/combo/:comboId" element={<ComboCheckout />} />
              <Route path="/checkout/:courseId" element={<Checkout />} />
              
              {/* Student Routes */}
              <Route path="/" element={<Index />} />
              <Route
                path="/courses/:courseId"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <CourseView />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <StudentCoursesPage />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/catalog"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <CatalogPage />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/points"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <PointsPage />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <StudentProfile />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <NotificationsPage />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchases"
                element={
                  <ProtectedRoute>
                    <StudentLayout>
                      <PurchasesPage />
                    </StudentLayout>
                  </ProtectedRoute>
                }
              />
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminCourses />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses/:courseId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <CourseDetail />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses/new"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <CourseForm />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses/:courseId/edit"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <CourseForm />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminStudents />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students/:userId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminStudentProfile />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminOrders />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/wallet"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminWallet />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/comments"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminComments />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/featured-banner"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminFeaturedBanner />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminMarketing />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/leads"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminMarketingLeads />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/forms"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminMarketingForms />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/forms/:formId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminFormDetail />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/email"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminMarketingEmail />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/email/:campaignId"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminCampaignEditor />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/coupons"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminMarketingCoupons />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/coupons/new"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminCouponForm />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/coupons/:couponId/edit"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminCouponForm />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/combos"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminMarketingCombos />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/combos/new"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminComboForm />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/marketing/combos/:comboId/edit"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout>
                      <AdminComboForm />
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

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