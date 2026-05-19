import { Link } from "react-router-dom";
import heroArt from "../../assets/hero.png";
import "./Home.css";

const highlights = [
  { value: "yakında", label: "Çevrendeki anılar" },
  { value: "anlık", label: "Haritaya düşen paylaşımlar" },
  { value: "rota", label: "Keşfe dönüşen hareket" },
];

const previewStats = [
  { value: "24", label: "yakındaki anı" },
  { value: "8.4 km", label: "bugünkü rota" },
  { value: "18", label: "yeni yorum" },
];

const orbitStats = [
  { value: "Konum", label: "yakındaki anıları bul" },
  { value: "Paylaş", label: "fotoğraf ve not ekle" },
  { value: "Rota", label: "keşfini mesafeye çevir" },
  { value: "Profil", label: "rozet ve geçmişini büyüt" },
];

const featureCards = [
  {
    title: "Yakındaki anıları gör",
    text: "Haritada baktığın bölgedeki fotoğraflı notlar, yorumlar ve kategori etiketleri tek akışta toplanır.",
  },
  {
    title: "Bölgeye odaklan",
    text: "Bir semt, sokak ya da mekân arayıp sadece o alandaki paylaşımları inceleyebilirsin.",
  },
  {
    title: "Anıyı hızlı paylaş",
    text: "Kameradan ya da galeriden fotoğraf seç, notunu yaz, atmosferini ve etiketlerini ekle.",
  },
  {
    title: "Profilin iz bırakır",
    text: "Paylaştığın anılar, gezdiğin mesafe, rozetlerin ve ilgi alanların profilinde birikir.",
  },
  {
    title: "Doğru yeri seç",
    text: "Kafe, doğa, sanat, yemek ya da etkinlik gibi kategorilerle haritadaki akış daha okunur hale gelir.",
  },
  {
    title: "Rotanı takip et",
    text: "Gitmek istediğin noktaya rota al, keşfini tamamladıkça hareketin profil skoruna yansısın.",
  },
];

const systemLayers = [
  "Konumunu aç",
  "Yakındaki anıları tara",
  "Paylaşımı kategorilendir",
  "Yorum ve beğeniyle katıl",
  "Rotayı takip et",
  "Profilini geliştir",
];

const flowItems = ["Konumu aç", "Haritayı tara", "Anıyı paylaş", "Etiket ekle", "Rotayı başlat", "Profili büyüt"];
const headlineWords = ["Şehrindeki", "anıları", "haritada", "keşfet"];

export default function Home() {
  return (
    <main className="home-page" style={{ "--hero-art": `url(${heroArt})` }}>
      <div className="zyra-space" aria-hidden="true">
        <span className="zyra-orbit orbit-a" />
        <span className="zyra-orbit orbit-b" />
        <span className="zyra-orbit orbit-c" />
        <span className="zyra-halo" />
        <span className="zyra-horizon" />
      </div>
      <div className="home-depth-wall" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="home-kinetic-bg" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <nav className="home-nav" aria-label="Ana gezinme">
        <Link to="/" className="brand-mark">
          <span className="brand-dot" aria-hidden="true" />
          NOW Here
        </Link>
        <div className="center-nav" aria-label="Bölümler">
          <a href="#vision">Vizyon</a>
          <a href="#layers">Özellikler</a>
          <a href="#system">Deneyim</a>
          <a href="#flow">Akış</a>
          <a href="#contact">İletişim</a>
        </div>
        <div className="home-actions">
          <Link to="/login" className="text-link">
            Giriş
          </Link>
          <Link to="/register" className="pill-link">
            Kayıt ol
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow reveal-line">Konum tabanlı sosyal harita</p>
          <h1 className="zyra-headline" aria-label="Şehrindeki anıları haritada keşfet">
            {headlineWords.map((word, index) => (
              <span style={{ "--delay": `${index * 90}ms` }} key={`${word}-${index}`}>
                {word}
              </span>
            ))}
          </h1>
          <p className="hero-text">
            NOW Here, etrafındaki anıları harita üzerinde görmeni ve kendi keşiflerini
            fotoğraf, not, kategori ve etiketlerle paylaşmanı sağlar. Yakındaki mekânları
            keşfet, rotanı oluştur, yorumlara katıl ve profilinde kendi şehir izini biriktir.
          </p>
          <div className="hero-buttons">
            <Link to="/map" className="primary-link">
              Haritayı keşfet
            </Link>
            <Link to="/register" className="secondary-link">
              Kayıt ol
            </Link>
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="preview-map">
            <div className="preview-scan" />
            <span className="pulse-marker marker-one" />
            <span className="pulse-marker marker-two" />
            <span className="pulse-marker marker-three" />
            <span className="pulse-marker marker-four" />
            <div className="preview-route" />
            <div className="preview-card preview-card-one">
              <strong>Karaköy</strong>
              <span>Kafe - #kahve - 18 beğeni</span>
            </div>
            <div className="preview-card preview-card-two">
              <strong>Moda sahil</strong>
              <span>Rota hazır - 12 dk</span>
            </div>
            <div className="preview-stats">
              {previewStats.map((item) => (
                <span key={item.label}>
                  <strong>{item.value}</strong>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <img src={heroArt} alt="" className="hero-art" />
        </div>
      </section>

      <section className="home-strip" aria-label="Özellikler">
        {highlights.map((item) => (
          <div className="strip-item" key={item.value}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="home-intel" id="vision">
        <div className="intel-copy">
          <p className="eyebrow">Şehrin canlı hafızası</p>
          <h2 className="scroll-title">Harita artık sadece yol gösteren bir ekran değil, paylaşılan bir deneyim.</h2>
          <p>
            Bir yerde çekilen fotoğraf, yazılan not ve verilen tepki o noktanın hikayesine
            eklenir. Böylece semtler, mekânlar ve rotalar sadece adres olmaktan çıkıp
            insanların anılarıyla zenginleşen bir akışa dönüşür.
          </p>
        </div>
        <div className="orbit-board" aria-hidden="true">
          <span className="orbit-ring ring-one" />
          <span className="orbit-ring ring-two" />
          <span className="orbit-core" />
          {orbitStats.map((item, index) => (
            <div className={`orbit-chip orbit-chip-${index + 1}`} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="feature-grid" id="layers" aria-label="Deneyim katmanları">
        {featureCards.map((card, index) => (
          <article className="feature-card scroll-card" style={{ "--delay": `${index * 80}ms` }} key={card.title}>
            <span />
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </section>

      <section className="system-board" id="system">
        <div>
          <p className="eyebrow">Tek bakışta deneyim</p>
          <h2 className="scroll-title">Keşfetmek, paylaşmak ve geri dönmek aynı akışta kalır.</h2>
        </div>
        <div className="system-grid">
          {systemLayers.map((layer, index) => (
            <span key={layer} style={{ "--delay": `${index * 70}ms` }}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              {layer}
            </span>
          ))}
        </div>
      </section>

      <section className="home-flow" id="flow">
        <div>
          <p className="eyebrow">Akışkan keşif</p>
          <h2 className="scroll-title">Paylaşımdan rotaya kadar tek ritim.</h2>
        </div>
        <div className="flow-rail" aria-label="Uygulama akışı">
          {flowItems.map((item, index) => (
            <span key={item}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="contact-board" id="contact" aria-label="Bizimle iletişime geçin">
        <div className="contact-map" aria-label="NOW Here ofis konumu">
          <iframe
            title="NOW Here ofis konumu"
            src="https://www.google.com/maps?q=Karakoy%2C%20Istanbul&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="contact-copy">
          <p className="eyebrow">Bizimle iletişime geçin</p>
          <h2>NOW Here ekibini haritada bul.</h2>
          <p>
            Uygulama, ortaklık ya da geri bildirim için bize ulaşabilirsin. Örnek ofis noktamızı
            haritada işaretledik; sen de yeni mekân önerilerini ve deneyim notlarını bizimle paylaş.
          </p>
          <div className="contact-details">
            <span>
              <strong>Ofis</strong>
              Karaköy, İstanbul
            </span>
            <span>
              <strong>Saatler</strong>
              Hafta içi 10:00 - 18:00
            </span>
          </div>
          <div className="contact-actions">
            <a href="mailto:baranaksoy213447@gmail.com" className="primary-link">
              Mail gönder
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Karakoy%2C%20Istanbul"
              className="secondary-link"
              target="_blank"
              rel="noreferrer"
            >
              Haritada aç
            </a>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="footer-main">
          <Link to="/" className="footer-brand" aria-label="NOW Here ana sayfa">
            <span className="brand-dot" aria-hidden="true" />
            <span className="footer-brand-copy">
              <strong>NOW Here</strong>
              <small>Şehrin canlı haritası</small>
            </span>
          </Link>
          <p>Yakındaki anıları keşfet, kendi rotanı oluştur ve şehrin hafızasına yeni bir iz bırak.</p>
        </div>

        <nav className="footer-links" aria-label="Alt menü">
          <span>Keşfet</span>
          <a href="#vision">Vizyon</a>
          <a href="#layers">Özellikler</a>
          <a href="#system">Deneyim</a>
          <a href="#contact">İletişim</a>
        </nav>

        <div className="footer-contact">
          <span>İletişim</span>
          <a href="mailto:baranaksoy213447@gmail.com">baranaksoy213447@gmail.com</a>
          <small>Karaköy, İstanbul</small>
        </div>

        <div className="footer-cta" aria-label="Hızlı işlemler">
          <span>Başlamak için</span>
          <Link to="/map" className="primary-link">
            Haritayı aç
          </Link>
          <Link to="/register" className="secondary-link">
            Kayıt ol
          </Link>
        </div>

        <div className="footer-bottom">
          <span>© 2026 NOW Here</span>
          <span>Konum tabanlı sosyal keşif platformu</span>
        </div>
      </footer>
    </main>
  );
}
