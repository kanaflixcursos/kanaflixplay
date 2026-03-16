import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Outlet } from "react-router-dom";

import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCourses from "@/pages/admin/Courses";
import CourseForm from "@/pages/admin/CourseForm";
import CourseDetail from "@/pages/admin/CourseDetail";
import AdminStudents from "@/pages/admin/Students";
import AdminStudentProfile from "@/pages/admin/StudentProfile";
import AdminOrders from "@/pages/admin/Orders";
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

const AdminLayoutWrapper = () => (
  <ProtectedRoute requiredRole="admin">
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  </ProtectedRoute>
);

export const adminRoutes = (
  <Route path="/admin" element={<AdminLayoutWrapper />}>
    <Route index element={<AdminDashboard />} />
    <Route path="courses" element={<AdminCourses />} />
    <Route path="courses/new" element={<CourseForm />} />
    <Route path="courses/:courseId" element={<CourseDetail />} />
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
    
    <Route path="marketing/combos" element={<AdminMarketingCombos />} />
    <Route path="marketing/combos/new" element={<AdminComboForm />} />
    <Route path="marketing/combos/:comboId/edit" element={<AdminComboForm />} />
  </Route>
);
