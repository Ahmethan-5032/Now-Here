import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./context/AuthContext";
import Home from "./components/pages/Home";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Profile from "./components/pages/Profile";
import MapPage from "./components/Map/MapPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
