import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";
import Home from "./components/pages/Home";
import "./App.css";

const Login = lazy(() => import("./components/pages/Login"));
const Register = lazy(() => import("./components/pages/Register"));
const Profile = lazy(() => import("./components/pages/Profile"));
const MapPage = lazy(() => import("./components/Map/MapPage"));

function RouteFallback() {
  return (
    <main className="route-fallback" aria-label="Sayfa yukleniyor">
      <span className="mini-emblem" aria-hidden="true" />
      <strong>NOW Here</strong>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/map"
              element={
                <ProtectedRoute>
                  <MapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
