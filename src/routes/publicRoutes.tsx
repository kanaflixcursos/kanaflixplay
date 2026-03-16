import { Route } from "react-router-dom";

import Login from "@/pages/auth/Login";
import ResetPassword from "@/pages/auth/ResetPassword";
import Checkout from "@/pages/public/Checkout";
import ComboCheckout from "@/pages/public/ComboCheckout";
import Index from "@/pages/public/Index";
import NotFound from "@/pages/public/NotFound";

export const publicRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/checkout/combo/:comboId" element={<ComboCheckout />} />
    <Route path="/checkout/:courseId" element={<Checkout />} />
    <Route path="*" element={<NotFound />} />
  </>
);
