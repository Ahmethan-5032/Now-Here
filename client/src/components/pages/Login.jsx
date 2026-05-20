import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginUser } from "../../lib/api";
import "./Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { applySession } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginUser(form);
      applySession(result);
      navigate(location.state?.from || "/map");
    } catch (err) {
      setError(err.message || "Giriş yapılamadı.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-motion-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <Link to="/" className="auth-brand">
        <span className="mini-emblem" aria-hidden="true" />
        NOW Here
      </Link>

      <div className="auth-layout">
        <aside className="auth-showcase" aria-hidden="true">
          <div className="auth-compass">
            <span />
          </div>
          <div className="auth-showcase-copy">
            <strong>Harita seni bekliyor</strong>
            <span>Yakındaki anıları, yorumları ve rotalarını tek ekranda tekrar aç.</span>
          </div>
          <div className="auth-mini-feed">
            <span>Bugünkü keşif</span>
            <strong>3.2 km rota</strong>
          </div>
        </aside>

        <section className="auth-card" aria-labelledby="login-title">
          <div className="auth-header">
            <p className="auth-kicker">Giriş</p>
            <h1 id="login-title">Haritana geri dön</h1>
            <p>Paylaştığın anıları, beğendiğin noktaları ve profil akışını kaldığın yerden aç.</p>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>E-posta</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="ornek@mail.com"
                value={form.email}
                onChange={updateField}
                required
              />
            </label>

            <label>
              <span>Şifre</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={updateField}
                required
              />
            </label>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <p className="auth-switch">
            Hesabın yok mu? <Link to="/register">Kayıt ol</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
