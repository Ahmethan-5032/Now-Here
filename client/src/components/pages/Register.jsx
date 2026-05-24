import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { registerUser, requestVerificationCode } from "../../lib/api";
import { prepareProfilePhoto } from "../../lib/imageTools";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    avatarName: "",
    email: "",
    password: "",
    code: "",
    profilePhoto: "",
  });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Profil fotoğrafı için görsel dosyası seç.");
      return;
    }

    try {
      const photo = await prepareProfilePhoto(file);
      setForm((current) => ({ ...current, profilePhoto: photo }));
      setError("");
    } catch (err) {
      setError(err.message || "Profil fotoğrafı hazırlanamadı.");
    }
  }

  async function handleRequestCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await requestVerificationCode({
        email: form.email,
      });
      setNotice(result.message || "Kod gönderildi.");
      setStep("code");
    } catch (err) {
      setError(err.message || "Kod gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await registerUser(form);
      applySession(result);
      navigate("/map");
    } catch (err) {
      setError(err.message || "Kayıt oluşturulamadı.");
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

      <div className="auth-layout register-layout">
        <aside className="auth-showcase" aria-hidden="true">
          <div className="auth-compass">
            <span />
          </div>
          <div className="auth-showcase-copy">
            <strong>İlk anını haritaya ekle</strong>
            <span>Profilini oluştur, konumunu aç ve çevrendeki paylaşımlara katıl.</span>
          </div>
          <div className="auth-mini-feed">
            <span>Yeni üye</span>
            <strong>Keşif akışı hazır</strong>
          </div>
        </aside>

        <section className="auth-card wide-auth-card" aria-labelledby="register-title">
          <div className="auth-header">
            <p className="auth-kicker">Yeni hesap</p>
            <h1 id="register-title">Haritadaki profilini kur</h1>
            <p>Adını, avatarını ve e-postanı ekle; paylaşımlarında görünecek kimliğini hazırla.</p>
          </div>

          <div className="auth-stepper" aria-label="Kayıt adımları">
            <span className={step === "details" ? "is-current" : "is-done"}>Profil</span>
            <span className={step === "code" ? "is-current" : ""}>Doğrulama</span>
            <span>Harita</span>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          {step === "details" ? (
            <form className="auth-form" onSubmit={handleRequestCode}>
              <div className="form-grid two">
                <label>
                  <span>Ad</span>
                  <input name="firstName" value={form.firstName} onChange={updateField} required />
                </label>
                <label>
                  <span>Soyad</span>
                  <input name="lastName" value={form.lastName} onChange={updateField} required />
                </label>
              </div>

              <label>
                <span>Avatar adı</span>
                <input
                  name="avatarName"
                  value={form.avatarName}
                  onChange={updateField}
                  placeholder="Haritada görünecek isim"
                  required
                />
              </label>

              <label>
                <span>E-posta</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
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
                  autoComplete="new-password"
                  minLength={10}
                  pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{10,128}"
                  title="En az 10 karakter, bir buyuk harf, bir kucuk harf ve bir rakam kullan."
                  value={form.password}
                  onChange={updateField}
                  required
                />
              </label>

              <label className="avatar-upload">
                <span>Profil fotoğrafı</span>
                <input type="file" accept="image/*" onChange={handlePhoto} />
                {form.profilePhoto ? (
                  <img src={form.profilePhoto} alt="Profil önizlemesi" />
                ) : (
                  <small>İstersen profil sayfasından daha sonra da değiştirebilirsin.</small>
                )}
              </label>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Kod hazırlanıyor..." : "Doğrulama kodu gönder"}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <div className="code-panel">
                <strong>{notice || "Kod gönderildi"}</strong>
                <span>{form.email}</span>
                <small>Gelen kutusu, spam ve tüm postalar klasörlerini kontrol et.</small>
              </div>

              <label>
                <span>6 haneli kod</span>
                <input
                  name="code"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.code}
                  onChange={updateField}
                  required
                />
              </label>

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Kayıt tamamlanıyor..." : "Kaydı tamamla"}
              </button>
              <button type="button" className="auth-soft-button" onClick={() => setStep("details")}>
                Bilgileri düzenle
              </button>
            </form>
          )}

          <p className="auth-switch">
            Zaten hesabın var mı? <Link to="/login">Giriş yap</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
