import { Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import StudentLayout from "@/components/layouts/StudentLayout";
import { Outlet } from "react-router-dom";

import StudentProfile from "@/pages/student/Profile";
import CourseView from "@/pages/student/CourseView";
import NotificationsPage from "@/pages/student/Notifications";
import PurchasesPage from "@/pages/student/Purchases";
import PointsPage from "@/pages/student/Points";
import StudentCoursesPage from "@/pages/student/Courses";
import CatalogPage from "@/pages/student/Catalog";

const StudentLayoutWrapper = () => (
  <ProtectedRoute>
    <StudentLayout>
      <Outlet />
    </StudentLayout>
  </ProtectedRoute>
);

export const studentRoutes = (
  <Route element={<StudentLayoutWrapper />}>
    <Route path="/courses/:courseId" element={<CourseView />} />
    <Route path="/courses" element={<StudentCoursesPage />} />
    <Route path="/catalog" element={<CatalogPage />} />
    <Route path="/points" element={<PointsPage />} />
    <Route path="/profile" element={<StudentProfile />} />
    <Route path="/notifications" element={<NotificationsPage />} />
    <Route path="/purchases" element={<PurchasesPage />} />
  </Route>
);
