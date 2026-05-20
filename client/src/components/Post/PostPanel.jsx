import { useMemo, useState } from "react";
import Camera from "./Camera";
import "./PostPanel.css";

const categories = [
  { value: "genel", label: "Genel" },
  { value: "kafe", label: "Kafe" },
  { value: "doga", label: "Doga" },
  { value: "etkinlik", label: "Etkinlik" },
  { value: "spor", label: "Spor" },
  { value: "sanat", label: "Sanat" },
  { value: "yemek", label: "Yemek" },
  { value: "alisveris", label: "Alisveris" },
];

const moods = [
  { value: "calm", label: "Sakin" },
  { value: "social", label: "Sosyal" },
  { value: "focus", label: "Odak" },
  { value: "energy", label: "Enerjik" },
  { value: "view", label: "Manzara" },
];

function parseTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 6);
}

export default function PostPanel({ location, onSubmit, onClose }) {
  const [form, setForm] = useState({
    description: "",
    placeName: "Bulundugum nokta",
    category: "genel",
    mood: "calm",
    rating: 4,
    tagsText: "",
  });
  const [image, setImage] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tagPreview = useMemo(() => parseTags(form.tagsText), [form.tagsText]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "rating" ? Number(value) : value,
    }));
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Lutfen gorsel dosyasi sec.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setError("Gorsel 4 MB altinda olmali.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.description.trim() && !image) {
      setError("Bir not yaz veya fotograf ekle.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onSubmit({
        description: form.description.trim(),
        placeName: form.placeName.trim() || "Konum",
        category: form.category,
        mood: form.mood,
        rating: Number(form.rating) || 0,
        tags: tagPreview,
        image,
      });
    } catch (err) {
      setError(err.message || "Paylasim kaydedilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="post-overlay" role="dialog" aria-modal="true" aria-label="Yeni paylasim">
      {showCamera && (
        <Camera
          onCapture={(captured) => {
            setImage(captured);
            setShowCamera(false);
            setError("");
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <section className="post-panel">
        <header className="post-panel-header">
          <div>
            <p>Konumu isaretle</p>
            <h2>Yeni ani ekle</h2>
          </div>
          <button type="button" className="icon-close" onClick={onClose} aria-label="Paneli kapat">
            ×
          </button>
        </header>

        {error && <p className="post-error">{error}</p>}

        <form className="post-form" onSubmit={handleSubmit}>
          <div className="post-smart-grid">
            <label>
              <span>Mekan adi</span>
              <input
                name="placeName"
                value={form.placeName}
                onChange={updateField}
                placeholder="Ornek: Moda Sahil"
                maxLength={120}
              />
            </label>

            <label>
              <span>Etiketler</span>
              <input
                name="tagsText"
                value={form.tagsText}
                onChange={updateField}
                placeholder="kahve, manzara, sakin"
                maxLength={120}
              />
            </label>
          </div>

          <fieldset className="category-picker">
            <legend>Kategori</legend>
            <div>
              {categories.map((category) => (
                <button
                  type="button"
                  className={form.category === category.value ? "is-selected" : ""}
                  key={category.value}
                  onClick={() => setForm((current) => ({ ...current, category: category.value }))}
                >
                  <span className={`category-dot category-${category.value}`} aria-hidden="true" />
                  {category.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mood-picker">
            <legend>Atmosfer</legend>
            <div>
              {moods.map((mood) => (
                <button
                  type="button"
                  key={mood.value}
                  className={form.mood === mood.value ? "is-selected" : ""}
                  onClick={() => setForm((current) => ({ ...current, mood: mood.value }))}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="rating-control">
            <span>Yer puani: {form.rating}/5</span>
            <input name="rating" type="range" min="1" max="5" value={form.rating} onChange={updateField} />
          </label>

          <label>
            <span>Not</span>
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Burasi nasil bir yer? Kisa, net ve gercek bir izlenim yaz."
              maxLength={500}
              rows={4}
            />
          </label>
          <div className="character-row">
            <span>
              {location[0].toFixed(5)}, {location[1].toFixed(5)}
            </span>
            <span>{form.description.length} / 500</span>
          </div>

          {!!tagPreview.length && (
            <div className="tag-preview" aria-label="Etiket onizleme">
              {tagPreview.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          )}

          {image && (
            <figure className="image-preview">
              <img src={image} alt="Paylasim onizlemesi" />
              <button type="button" onClick={() => setImage("")}>
                Gorseli kaldir
              </button>
            </figure>
          )}

          <div className="media-actions">
            <button type="button" className="soft-button" onClick={() => setShowCamera(true)}>
              Kamera / On-Arka
            </button>
            <label className="soft-button file-button">
              Galeri
              <input type="file" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>

          <button type="submit" className="post-submit" disabled={loading}>
            {loading ? "Paylasiliyor..." : "Haritaya ekle"}
          </button>
        </form>
      </section>
    </div>
  );
}
