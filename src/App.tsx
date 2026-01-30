import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import StudentLayout from "@/components/layouts/StudentLayout";
import StudentProfile from "@/pages/student/Profile";
import CourseView from "@/pages/student/CourseView";

import AdminLayout from "@/components/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminCourses from "@/pages/admin/Courses";
import CourseLessons from "@/pages/admin/CourseLessons";
import CourseForm from "@/pages/admin/CourseForm";
import AdminStudents from "@/pages/admin/Students";

import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
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
              path="/profile"
              element={
                <ProtectedRoute>
                  <StudentLayout>
                    <StudentProfile />
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
              path="/admin/courses/:courseId/lessons"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout>
                    <CourseLessons />
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

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
