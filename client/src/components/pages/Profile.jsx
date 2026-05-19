import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { prepareProfilePhoto } from "../../lib/imageTools";
import "./Profile.css";

const categoryLabels = {
  genel: "Genel",
  diger: "Genel",
  kafe: "Kafe",
  doga: "Doga",
  etkinlik: "Etkinlik",
  spor: "Spor",
  sanat: "Sanat",
  yemek: "Yemek",
  alisveris: "Alisveris",
};

const themeOptions = [
  { value: "lime", label: "Lime" },
  { value: "aqua", label: "Aqua" },
  { value: "amber", label: "Amber" },
  { value: "violet", label: "Violet" },
];

function formatKm(meters = 0) {
  return `${(meters / 1000).toFixed(1)} km`;
}

function buildProfileForm(user = {}) {
  return {
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    avatarName: user.avatarName || "",
    profilePhoto: user.profilePhoto || "",
    bio: user.bio || "",
    city: user.city || "",
    website: user.website || "",
    statusText: user.statusText || "Kesifte",
    interestsText: (user.interests || []).join(", "),
    profileTheme: user.profileTheme || "lime",
  };
}

function parseInterests(value) {
  return value
    .split(",")
    .map((item) => item.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 8);
}

function safeDate(value) {
  if (!value) return "Yeni";
  try {
    return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(new Date(value));
  } catch {
    return "Yeni";
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, loadingProfile, logout, updateProfile } = useAuth();
  const stats = profile?.stats || {
    postsCount: 0,
    receivedLikes: 0,
    likesGiven: 0,
    commentsGiven: 0,
    distanceMeters: 0,
    tagsUsed: 0,
    favoriteCategory: "genel",
    profileCompleteness: 0,
    score: 0,
    level: 1,
  };
  const displayUser = profile?.user || user || {};
  const initials = `${displayUser.firstName?.[0] || "N"}${displayUser.lastName?.[0] || "H"}`;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => buildProfileForm(displayUser));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const interestPreview = useMemo(() => parseInterests(form.interestsText), [form.interestsText]);
  const joinedAt = displayUser.createdAt ? safeDate(displayUser.createdAt) : "Yeni";

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Lutfen gorsel dosyasi sec.");
      return;
    }

    try {
      const photo = await prepareProfilePhoto(file);
      setForm((current) => ({ ...current, profilePhoto: photo }));
      setError("");
    } catch (err) {
      setError(err.message || "Profil fotografi hazirlanamadi.");
    }
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        avatarName: form.avatarName,
        profilePhoto: form.profilePhoto,
        bio: form.bio,
        city: form.city,
        website: form.website,
        statusText: form.statusText,
        interests: interestPreview,
        profileTheme: form.profileTheme,
      });
      setEditing(false);
    } catch (err) {
      setError(err.message || "Profil kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  function handleToggleEdit() {
    if (!editing) {
      setForm(buildProfileForm(displayUser));
      setError("");
      setEditing(true);
      return;
    }

    setEditing(false);
    setError("");
    setForm(buildProfileForm(displayUser));
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <main className={`profile-page theme-${displayUser.profileTheme || "lime"}`}>
      <div className="profile-motion" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className="profile-nav">
        <Link to="/" className="profile-brand">
          <span className="mini-emblem" aria-hidden="true" />
          NOW Here
        </Link>
        <nav>
          <Link to="/map">Harita</Link>
          <button type="button" onClick={handleLogout}>
            Cikis
          </button>
        </nav>
      </header>

      <section className={`profile-hero ${editing ? "is-editing" : ""}`}>
        <div className="profile-avatar">
          {displayUser.profilePhoto ? <img src={displayUser.profilePhoto} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="profile-copy">
          <p className="profile-kicker">Seviye {stats.level} · {displayUser.statusText || "Kesifte"}</p>
          <h1>{displayUser.avatarName || displayUser.displayName}</h1>
          <p>
            {displayUser.firstName} {displayUser.lastName} · {displayUser.city || "Konum belirtilmedi"}
          </p>
          {displayUser.bio && <p className="profile-bio">{displayUser.bio}</p>}
          <div className="profile-mini-metrics" aria-label="Hizli istatistikler">
            <span>{stats.postsCount} paylasim</span>
            <span>{stats.receivedLikes} alinan begeni</span>
            <span>{formatKm(stats.distanceMeters)} rota</span>
            <span>%{stats.profileCompleteness} profil</span>
          </div>
        </div>
        <button type="button" className="profile-edit-button" onClick={handleToggleEdit}>
          {editing ? "Vazgec" : "Profili duzenle"}
        </button>
      </section>

      {editing && (
        <form className="profile-edit-card" onSubmit={handleSave}>
          {error && <p className="profile-error">{error}</p>}
          <div className="profile-edit-preview" aria-hidden="true">
            <div className="profile-avatar preview-avatar">
              {form.profilePhoto ? <img src={form.profilePhoto} alt="" /> : <span>{initials}</span>}
            </div>
            <div>
              <span>Canli onizleme</span>
              <strong>{form.avatarName || "Avatar adi"}</strong>
              <small>
                {form.statusText || "Kesifte"} · {form.city || "Sehir yok"}
              </small>
            </div>
          </div>
          <div className="profile-form-grid is-expanded">
            <label>
              <span>Ad</span>
              <input name="firstName" value={form.firstName} onChange={updateField} required />
            </label>
            <label>
              <span>Soyad</span>
              <input name="lastName" value={form.lastName} onChange={updateField} required />
            </label>
            <label>
              <span>Avatar adi</span>
              <input name="avatarName" value={form.avatarName} onChange={updateField} required />
            </label>
            <label>
              <span>Sehir</span>
              <input name="city" value={form.city} onChange={updateField} placeholder="Izmir, Yalova..." />
            </label>
            <label>
              <span>Durum</span>
              <input name="statusText" value={form.statusText} onChange={updateField} maxLength={80} />
            </label>
            <label>
              <span>Website</span>
              <input name="website" value={form.website} onChange={updateField} placeholder="https://..." />
            </label>
            <label>
              <span>Tema</span>
              <select name="profileTheme" value={form.profileTheme} onChange={updateField}>
                {themeOptions.map((theme) => (
                  <option value={theme.value} key={theme.value}>{theme.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Profil fotografi</span>
              <input type="file" accept="image/*" onChange={handlePhoto} />
            </label>
            <label className="profile-wide-field">
              <span>Bio</span>
              <textarea name="bio" value={form.bio} onChange={updateField} maxLength={220} rows={3} />
            </label>
            <label className="profile-wide-field">
              <span>Ilgi alanlari</span>
              <input name="interestsText" value={form.interestsText} onChange={updateField} placeholder="kahve, doga, oyun, kod" />
            </label>
          </div>
          {!!interestPreview.length && (
            <div className="profile-interest-preview">
              {interestPreview.map((item) => <span key={item}>#{item}</span>)}
            </div>
          )}
          <div className="profile-edit-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button type="button" className="secondary-profile-button" onClick={handleToggleEdit}>
              Iptal
            </button>
          </div>
        </form>
      )}

      <section className="profile-command" aria-label="Profil seviyesi">
        <article>
          <span>Skor</span>
          <strong>{stats.score}</strong>
          <small>Paylasim, begeni, yorum, rota ve profil dolulugu ile hesaplanir.</small>
        </article>
        <article>
          <span>Favori kategori</span>
          <strong>{categoryLabels[stats.favoriteCategory] || "Genel"}</strong>
          <small>En cok kullandigin paylasim tipi.</small>
        </article>
        <article>
          <span>Katılım tarihi</span>
          <strong>{joinedAt}</strong>
          <small>{displayUser.email}</small>
        </article>
      </section>

      <section className="profile-stats" aria-label="Profil istatistikleri">
        <article>
          <strong>{stats.postsCount}</strong>
          <span>Paylasim</span>
          <i style={{ "--fill": `${Math.min(stats.postsCount * 18, 100)}%` }} />
        </article>
        <article>
          <strong>{stats.receivedLikes}</strong>
          <span>Alinan begeni</span>
          <i style={{ "--fill": `${Math.min(stats.receivedLikes * 12, 100)}%` }} />
        </article>
        <article>
          <strong>{stats.likesGiven}</strong>
          <span>Attigin begeni</span>
          <i style={{ "--fill": `${Math.min(stats.likesGiven * 10, 100)}%` }} />
        </article>
        <article>
          <strong>{stats.commentsGiven}</strong>
          <span>Yorum</span>
          <i style={{ "--fill": `${Math.min(stats.commentsGiven * 14, 100)}%` }} />
        </article>
        <article>
          <strong>{formatKm(stats.distanceMeters)}</strong>
          <span>Kaydedilen rota</span>
          <i style={{ "--fill": `${Math.min((stats.distanceMeters / 1000) * 8, 100)}%` }} />
        </article>
      </section>

      <section className="profile-grid">
        <article className="profile-card profile-card-wide">
          <h2>Profil katmanlari</h2>
          <div className="profile-layer-grid">
            <div>
              <span>Profil dolulugu</span>
              <strong>%{stats.profileCompleteness}</strong>
            </div>
            <div>
              <span>Toplam etiket</span>
              <strong>{stats.tagsUsed}</strong>
            </div>
            <div>
              <span>Ilgi alanlari</span>
              <strong>{displayUser.interests?.length || 0}</strong>
            </div>
          </div>
          <div className="profile-interest-preview permanent">
            {(displayUser.interests || []).length ? (
              displayUser.interests.map((item) => <span key={item}>#{item}</span>)
            ) : (
              <span>Ilgi alani eklenmedi</span>
            )}
          </div>
        </article>

        <article className="profile-card">
          <h2>Rozetler</h2>
          <div className="badge-grid">
            {(profile?.badges || []).map((badge) => (
              <div className={`badge-card ${badge.unlocked ? "is-unlocked" : ""}`} key={badge.id}>
                <span className="badge-status">{badge.unlocked ? "Acildi" : "Kilitli"}</span>
                <strong>{badge.title}</strong>
                <span>{badge.description}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-card">
          <h2>Son aktivite</h2>
          <div className="history-list">
            {loadingProfile && <p>Yukleniyor...</p>}
            {!loadingProfile && !profile?.recentActivity?.length && <p>Henuz aktivite yok.</p>}
            {profile?.recentActivity?.map((item) => (
              <div className="history-item" key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
                <small>{item.type === "post" ? "Paylasim" : "Yorum"} · {safeDate(item.createdAt)}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="profile-card">
          <h2>Paylasimlarim</h2>
          <HistoryList loading={loadingProfile} items={profile?.posts} empty="Henuz paylasim yok." />
        </article>

        <article className="profile-card">
          <h2>Begendigim postlar</h2>
          <HistoryList loading={loadingProfile} items={profile?.likedPosts} empty="Henuz begendigin post yok." />
        </article>

        <article className="profile-card">
          <h2>Yorumlarim</h2>
          <div className="history-list">
            {loadingProfile && <p>Yukleniyor...</p>}
            {!loadingProfile && !profile?.comments?.length && <p>Henuz yorum yok.</p>}
            {profile?.comments?.map((comment) => (
              <div className="history-item" key={comment._id}>
                <strong>{comment.postTitle}</strong>
                <span>{comment.text}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function HistoryList({ items = [], empty, loading }) {
  return (
    <div className="history-list">
      {loading && <p>Yukleniyor...</p>}
      {!loading && !items.length && <p>{empty}</p>}
      {items.map((item) => (
        <div className="history-item" key={item._id}>
          <strong>{item.placeName || "Konum"}</strong>
          <span>{item.description || "Fotografli paylasim"}</span>
          {!!item.tags?.length && (
            <small>{item.tags.map((tag) => `#${tag}`).join(" ")}</small>
          )}
          <small>
            {item.likes || 0} begeni · {(item.comments || []).length} yorum · {item.rating || 0}/5
          </small>
        </div>
      ))}
    </div>
  );
}
