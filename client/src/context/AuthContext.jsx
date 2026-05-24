/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  clearClientSession,
  fetchProfile,
  logoutUser,
  updateProfile as updateProfileRequest,
} from "../lib/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const isAuthenticated = Boolean(user);

  useEffect(() => {
    let alive = true;

    fetchProfile()
      .then((nextProfile) => {
        if (!alive) return;
        setProfile(nextProfile);
        if (nextProfile.user) {
          setUser(nextProfile.user);
          localStorage.setItem("user", JSON.stringify(nextProfile.user));
          localStorage.removeItem("token");
        }
      })
      .catch(() => {
        if (!alive) return;
        clearClientSession();
        setUser(null);
        setProfile(null);
      })
      .finally(() => {
        if (alive) setLoadingProfile(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  function applySession(result) {
    localStorage.removeItem("token");
    localStorage.setItem("user", JSON.stringify(result.user));
    setUser(result.user);
    setProfile((current) => (current ? { ...current, user: result.user } : current));
  }

  async function logout() {
    await logoutUser().catch(() => null);
    clearClientSession();
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    const nextProfile = await fetchProfile();
    setProfile(nextProfile);
    setUser(nextProfile.user);
    localStorage.setItem("user", JSON.stringify(nextProfile.user));
    localStorage.removeItem("token");
    return nextProfile;
  }

  async function updateProfile(payload) {
    const result = await updateProfileRequest(payload);
    setUser(result.user);
    localStorage.setItem("user", JSON.stringify(result.user));
    localStorage.removeItem("token");
    await refreshProfile();
    return result.user;
  }

  const value = {
    token: "",
    user,
    profile,
    loadingProfile,
    isAuthenticated,
    applySession,
    logout,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth AuthProvider icinde kullanilmali.");
  }
  return context;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loadingProfile } = useAuth();
  const location = useLocation();

  if (loadingProfile) {
    return <main className="auth-page" aria-busy="true" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
