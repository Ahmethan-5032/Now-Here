/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { fetchProfile, sanitizeStoredSession, updateProfile as updateProfileRequest } from "../lib/api";

const AuthContext = createContext(null);

function readInitialSession() {
  const token = sanitizeStoredSession();
  let user = null;

  if (!token) {
    return { token: "", user: null };
  }

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  return { token, user };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readInitialSession);
  const { token, user } = session;
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(token));

  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (!token) {
      return;
    }

    let alive = true;
    fetchProfile()
      .then((nextProfile) => {
        if (!alive) return;
        setProfile(nextProfile);
        if (nextProfile.user) {
          setSession((current) => ({ ...current, user: nextProfile.user }));
          localStorage.setItem("user", JSON.stringify(nextProfile.user));
        }
      })
      .catch(() => {
        if (!alive) return;
        setProfile(null);
      })
      .finally(() => {
        if (alive) setLoadingProfile(false);
      });

    return () => {
      alive = false;
    };
  }, [token]);

  function applySession(result) {
    localStorage.setItem("token", result.token);
    localStorage.setItem("user", JSON.stringify(result.user));
    setLoadingProfile(true);
    setSession({ token: result.token, user: result.user });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession({ token: "", user: null });
    setProfile(null);
  }

  async function refreshProfile() {
    const nextProfile = await fetchProfile();
    setProfile(nextProfile);
    setSession((current) => ({ ...current, user: nextProfile.user }));
    localStorage.setItem("user", JSON.stringify(nextProfile.user));
    return nextProfile;
  }

  async function updateProfile(payload) {
    const result = await updateProfileRequest(payload);
    setSession((current) => ({ ...current, user: result.user }));
    localStorage.setItem("user", JSON.stringify(result.user));
    await refreshProfile();
    return result.user;
  }

  const value = {
    token,
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
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
