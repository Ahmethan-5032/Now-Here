import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  commentPost,
  createPost,
  fetchPosts,
  fetchRoute,
  likePost,
  recordRouteDistance,
  searchPlaces,
} from "../../lib/api";
import SearchBox from "../Search/SearchBox";
import PostPanel from "../Post/PostPanel";
import MapView from "./MapView";
import "./Map.css";

const DEFAULT_LOCATION = [41.0082, 28.9784];

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

const categoryLegend = Object.entries(categoryLabels).filter(([key]) => key !== "diger");
const moodLabels = {
  calm: "Sakin",
  social: "Sosyal",
  focus: "Odak",
  energy: "Enerjik",
  view: "Manzara",
};
const MIN_TRACKED_ROUTE_METERS = 25;

function formatDistance(meters) {
  if (!meters) return "";
  return meters > 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes > 60 ? `${Math.floor(minutes / 60)} sa ${minutes % 60} dk` : `${minutes} dk`;
}

function normalizeText(value = "") {
  return String(value).trim().toLocaleLowerCase("tr-TR");
}

function pointInsideBounds(lat, lng, bounds) {
  if (!bounds) return true;
  if (![lat, lng, bounds.north, bounds.south, bounds.east, bounds.west].every(Number.isFinite)) {
    return false;
  }

  const insideLat = lat <= bounds.north && lat >= bounds.south;
  const insideLng =
    bounds.west <= bounds.east
      ? lng >= bounds.west && lng <= bounds.east
      : lng >= bounds.west || lng <= bounds.east;

  return insideLat && insideLng;
}

function placeToBounds(place) {
  const box = place?.boundingbox;
  if (!Array.isArray(box) || box.length < 4) return null;
  const [south, north, west, east] = box.map(Number);
  if (![north, south, east, west].every(Number.isFinite)) return null;
  return { north, south, east, west };
}

function haversineMeters(from, to) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(to[0] - from[0]);
  const dLng = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function MapPage() {
  const { user, logout, refreshProfile } = useAuth();
  const geolocationSupported = "geolocation" in navigator;
  const boundsRefreshRef = useRef(null);
  const routeWatchRef = useRef(null);
  const routeLastPointRef = useRef(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [focusLocation, setFocusLocation] = useState(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState(
    geolocationSupported ? "Konum hazirlaniyor" : "Varsayilan konum kullaniliyor"
  );
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [showPostPanel, setShowPostPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [mapBounds, setMapBounds] = useState(null);
  const [regionQuery, setRegionQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState(null);
  const [regionLoading, setRegionLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [feedQuery, setFeedQuery] = useState("");
  const [routeProgress, setRouteProgress] = useState({
    active: false,
    trackedMeters: 0,
    points: 0,
    accuracy: 0,
  });
  const [mobilePanel, setMobilePanel] = useState("feed");

  const sortedPosts = useMemo(
    () =>
      [...posts].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ),
    [posts]
  );

  const visiblePosts = useMemo(() => {
    const regionText = normalizeText(regionFilter?.label);
    const regionBounds = regionFilter?.bounds;
    const feedText = normalizeText(feedQuery);

    return sortedPosts.filter((post) => {
      const lat = Number(post.lat);
      const lng = Number(post.lng);
      if (!pointInsideBounds(lat, lng, mapBounds)) return false;
      if (regionBounds && !pointInsideBounds(lat, lng, regionBounds)) return false;
      if (activeCategory !== "all" && post.category !== activeCategory) return false;

      const haystack = normalizeText(
        `${post.placeName || ""} ${post.description || ""} ${post.authorName || ""} ${post.category || ""} ${post.mood || ""} ${(post.tags || []).join(" ")}`
      );

      if (regionText && !haystack.includes(regionText) && !regionBounds) return false;
      if (feedText && !haystack.includes(feedText)) return false;
      return true;
    });
  }, [activeCategory, feedQuery, mapBounds, regionFilter, sortedPosts]);

  useEffect(() => {
    let alive = true;

    if (geolocationSupported) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!alive) return;
          const nextLocation = [position.coords.latitude, position.coords.longitude];
          setLocation(nextLocation);
          setFocusLocation(nextLocation);
          setLocationStatus("Canli konum hazir");
        },
        () => {
          if (!alive) return;
          setLocationStatus("Konum izni yok. Varsayilan konum kullaniliyor.");
        },
        { enableHighAccuracy: true, timeout: 9000 }
      );
    }

    fetchPosts().then((nextPosts) => {
      if (!alive) return;
      setPosts(nextPosts);
      setPostsLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [geolocationSupported]);

  useEffect(
    () => () => {
      if (boundsRefreshRef.current) {
        window.clearTimeout(boundsRefreshRef.current);
      }
      if (routeWatchRef.current) {
        navigator.geolocation.clearWatch(routeWatchRef.current);
      }
    },
    []
  );

  async function loadPosts({ silent = false } = {}) {
    if (!silent) setPostsLoading(true);
    try {
      const nextPosts = await fetchPosts();
      setPosts(nextPosts);
    } finally {
      if (!silent) setPostsLoading(false);
    }
  }

  const handleBoundsChange = useCallback((nextBounds) => {
    setMapBounds(nextBounds);
    if (boundsRefreshRef.current) {
      window.clearTimeout(boundsRefreshRef.current);
    }
    boundsRefreshRef.current = window.setTimeout(async () => {
      const nextPosts = await fetchPosts().catch(() => null);
      if (nextPosts) setPosts(nextPosts);
    }, 420);
  }, []);

  async function handleSearchChange(value) {
    setSearch(value);
    setMobilePanel("search");
    setNotice("");

    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchPlaces(value);
      setSuggestions(results);
      if (!results.length) {
        setNotice("Sonuc bulunamadi. Daha genel bir mekan veya ilce adi deneyebilirsin.");
      }
    } catch (err) {
      setNotice(err.message || "Arama servisine ulasilamadi.");
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSelectPlace(place) {
    const nextLocation = [Number(place.lat), Number(place.lon)];
    setSearch(place.display_name);
    setSuggestions([]);
    setFocusLocation(nextLocation);
    setNotice("Harita aradigin noktaya odaklandi.");
    setMobilePanel("feed");
  }

  function stopRouteTracking() {
    if (routeWatchRef.current) {
      navigator.geolocation.clearWatch(routeWatchRef.current);
      routeWatchRef.current = null;
    }
    routeLastPointRef.current = null;
    setRouteProgress((current) => ({ ...current, active: false }));
  }

  function startRouteTracking() {
    stopRouteTracking();
    routeLastPointRef.current = location;
    setRouteProgress({ active: true, trackedMeters: 0, points: 0, accuracy: 0 });

    if (!geolocationSupported) {
      setRouteProgress({ active: false, trackedMeters: 0, points: 0, accuracy: 0 });
      setNotice("Cihaz konumu desteklenmedigi icin rota mesafesi profile islenmeyecek.");
      return false;
    }

    routeWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = [position.coords.latitude, position.coords.longitude];
        const accuracy = Math.round(position.coords.accuracy || 0);
        setLocation(nextLocation);
        setLocationStatus(`Rota izleniyor - hassasiyet ${accuracy || "?"} m`);

        setRouteProgress((current) => {
          const previous = routeLastPointRef.current;
          const movedMeters = previous ? haversineMeters(previous, nextLocation) : 0;
          const isReliableMove =
            movedMeters >= 4 &&
            movedMeters <= 350 &&
            (!accuracy || accuracy <= 150 || movedMeters > accuracy * 0.7);

          if (isReliableMove || !previous) {
            routeLastPointRef.current = nextLocation;
          }

          return {
            active: true,
            trackedMeters: current.trackedMeters + (isReliableMove ? movedMeters : 0),
            points: current.points + 1,
            accuracy,
          };
        });
      },
      () => {
        setLocationStatus("Rota takibi icin konum izni gerekiyor.");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    return true;
  }

  async function getRoute(target) {
    const [userLat, userLng] = location;

    try {
      const currentRoute = await fetchRoute({
        fromLat: userLat,
        fromLng: userLng,
        toLat: target.lat,
        toLng: target.lng,
      });

      setRoute({ positions: currentRoute.positions, targetId: target._id || target.place_id });
      setRouteInfo({
        title: target.placeName || target.display_name || "Secili konum",
        distance: formatDistance(currentRoute.distance),
        duration: formatDuration(currentRoute.duration),
        distanceMeters: currentRoute.distance,
        durationSeconds: currentRoute.duration,
        steps: currentRoute.steps || [],
      });

      if (target._id) setSelectedPostId(target._id);
      setFocusLocation([target.lat, target.lng]);
      const trackingStarted = startRouteTracking();
      setMobilePanel("route");
      setNotice(
        trackingStarted
          ? "Rota baslatildi. Profil mesafesi sadece gercek GPS hareketinden yazilacak."
          : "Rota acildi fakat GPS takibi baslatilamadi."
      );
    } catch (err) {
      setNotice(err.message || "Rota hesaplarken bir sorun olustu.");
    }
  }

  async function handleFinishRoute() {
    const meters = Math.round(routeProgress.trackedMeters || 0);
    stopRouteTracking();
    setRoute(null);
    setRouteInfo(null);
    if (meters >= MIN_TRACKED_ROUTE_METERS) {
      await recordRouteDistance(meters).catch(() => null);
      await refreshProfile().catch(() => null);
      setNotice(`${formatDistance(meters)} gercek hareket profile islendi.`);
      setMobilePanel("feed");
    } else {
      setNotice("Gercek hareket algilanmadigi icin rota mesafesi profile eklenmedi.");
    }
    setMobilePanel("feed");
  }

  function handleClearRoute() {
    stopRouteTracking();
    setRoute(null);
    setRouteInfo(null);
    setNotice("Yol tarifi kapatildi.");
    setMobilePanel("feed");
  }

  async function handleRegionFilter(event) {
    event.preventDefault();
    const query = regionQuery.trim();
    if (query.length < 2) {
      setRegionFilter(null);
      setNotice("Bolge filtresi temizlendi.");
      return;
    }

    setRegionLoading(true);
    try {
      const results = await searchPlaces(query);
      const selected = results[0];
      if (!selected) {
        setRegionFilter({ label: query, bounds: null });
        setNotice("Harita bolgesi bulunamadi, paylasim metinlerinde arama yapiliyor.");
        return;
      }

      const bounds = placeToBounds(selected);
      const nextLocation = [Number(selected.lat), Number(selected.lon)];
      setRegionFilter({
        label: selected.display_name || query,
        shortLabel: query,
        bounds,
      });
      setFocusLocation(nextLocation);
      setNotice(`${query} bolgesi icin paylasimlar filtrelendi.`);
    } catch (err) {
      setNotice(err.message || "Bolge filtresi uygulanamadi.");
    } finally {
      setRegionLoading(false);
    }
  }

  function clearRegionFilter() {
    setRegionFilter(null);
    setRegionQuery("");
    setNotice("Bolge filtresi temizlendi.");
  }

  async function handleCreatePost(postData) {
    const newPost = await createPost({
      ...postData,
      lat: location[0],
      lng: location[1],
    });
    setPosts((current) => [newPost, ...current]);
    setSelectedPostId(newPost._id);
    setFocusLocation([newPost.lat, newPost.lng]);
    setShowPostPanel(false);
    setNotice("Paylasim haritaya eklendi.");
    setMobilePanel("feed");
    await refreshProfile().catch(() => null);
  }

  async function handleLike(postId) {
    const updated = await likePost(postId);
    if (!updated) return;
    setPosts((current) => current.map((post) => (post._id === postId ? updated : post)));
    await refreshProfile().catch(() => null);
  }

  async function handleComment(postId) {
    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    const updated = await commentPost(postId, text);
    setPosts((current) => current.map((post) => (post._id === postId ? updated : post)));
    setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    await refreshProfile().catch(() => null);
  }

  return (
    <main className="map-page">
      <MapView
        location={location}
        focusLocation={focusLocation}
        posts={visiblePosts}
        route={route}
        selectedPostId={selectedPostId}
        onBoundsChange={handleBoundsChange}
        onSelectPost={(post) => {
          setSelectedPostId(post._id);
          setFocusLocation([post.lat, post.lng]);
        }}
        onRoute={getRoute}
        onLike={handleLike}
      />

      <header className="map-topbar">
        <Link to="/" className="map-brand">
          <span className="mini-emblem" aria-hidden="true" />
          NOW Here
        </Link>
        <div className="map-top-actions">
          <Link to="/profile" className="profile-chip">
            {user?.profilePhoto ? <img src={user.profilePhoto} alt="" /> : <span>{user?.avatarName?.[0] || "N"}</span>}
            {user?.avatarName || "Profil"}
          </Link>
          <span className="status-pill">{locationStatus}</span>
          <button type="button" className="ghost-button" onClick={loadPosts}>
            Yenile
          </button>
          <button type="button" className="ghost-button" onClick={logout}>
            Cikis
          </button>
        </div>
      </header>

      <SearchBox
        search={search}
        suggestions={suggestions}
        loading={searchLoading}
        onSearchChange={handleSearchChange}
        onSelectPlace={handleSelectPlace}
        onRouteToPlace={(place) =>
          getRoute({
            ...place,
            lat: Number(place.lat),
            lng: Number(place.lon),
            placeName: place.display_name,
          })
        }
        className={mobilePanel === "search" ? "is-mobile-active" : ""}
      />

      <nav className="mobile-map-tabs" aria-label="Mobil harita panelleri">
        <button
          type="button"
          className={mobilePanel === "search" ? "is-active" : ""}
          aria-pressed={mobilePanel === "search"}
          onClick={() => setMobilePanel("search")}
        >
          Ara
        </button>
        <button
          type="button"
          className={mobilePanel === "feed" ? "is-active" : ""}
          aria-pressed={mobilePanel === "feed"}
          onClick={() => setMobilePanel("feed")}
        >
          Akis <span>{visiblePosts.length}</span>
        </button>
        {routeInfo && (
          <button
            type="button"
            className={mobilePanel === "route" ? "is-active" : ""}
            aria-pressed={mobilePanel === "route"}
            onClick={() => setMobilePanel("route")}
          >
            Rota
          </button>
        )}
      </nav>

      <aside className={`memory-panel ${mobilePanel === "feed" ? "is-mobile-active" : ""}`} aria-label="Paylasim akisi">
        <div className="memory-panel-header">
          <div>
            <p className="panel-kicker">Canli akis</p>
            <h1>Yakindaki anilar</h1>
          </div>
          <span className="count-pill">{postsLoading ? "..." : visiblePosts.length}</span>
        </div>

        {notice && <p className="map-notice">{notice}</p>}

        <form className="region-filter" onSubmit={handleRegionFilter}>
          <label htmlFor="region-filter-input">Bolgeye gore filtrele</label>
          <div>
            <input
              id="region-filter-input"
              value={regionQuery}
              onChange={(event) => setRegionQuery(event.target.value)}
              placeholder="Sehir, ilce veya bolge"
            />
            <button type="submit" disabled={regionLoading}>
              {regionLoading ? "..." : "Filtrele"}
            </button>
          </div>
          {regionFilter && (
            <button type="button" className="clear-region-button" onClick={clearRegionFilter}>
              {regionFilter.shortLabel || regionFilter.label} filtresini temizle
            </button>
          )}
        </form>

        <div className="feed-filter-card" aria-label="Akis filtreleri">
          <label htmlFor="feed-query-input">Akis icinde ara</label>
          <input
            id="feed-query-input"
            value={feedQuery}
            onChange={(event) => setFeedQuery(event.target.value)}
            placeholder="Etiket, mekan, yazar veya atmosfer"
          />
          <div className="active-filter-row">
            <button
              type="button"
              className={activeCategory === "all" ? "is-selected" : ""}
              onClick={() => setActiveCategory("all")}
            >
              Tumu
            </button>
            {categoryLegend.map(([key, label]) => (
              <button
                type="button"
                key={key}
                className={activeCategory === key ? "is-selected" : ""}
                onClick={() => setActiveCategory(key)}
              >
                <span className={`category-dot category-${key}`} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="viewport-summary" aria-label="Gorunen alan ozeti">
          <span>Ekrandaki alan</span>
          <strong>{visiblePosts.length}</strong>
          <small>{sortedPosts.length} toplam paylasimdan su an gorunenler</small>
        </div>

        <div className="category-legend" aria-label="Kategori renkleri">
          {categoryLegend.map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? "all" : key)}
              className={activeCategory === key ? "is-selected" : ""}
            >
              <span className={`category-dot category-${key}`} />
              {label}
            </button>
          ))}
        </div>

        <div className="memory-list">
          {postsLoading && <p className="empty-state">Paylasimlar yukleniyor...</p>}

          {!postsLoading && visiblePosts.length === 0 && (
            <p className="empty-state">Ekranda gorunen alanda paylasim yok. Haritayi kaydir, uzaklas veya filtreyi temizle.</p>
          )}

          {!postsLoading &&
            visiblePosts.map((post) => (
              <article
                className={`memory-item ${selectedPostId === post._id ? "is-active" : ""}`}
                key={post._id}
              >
                <button
                  type="button"
                  className="memory-main"
                  onClick={() => {
                    setSelectedPostId(post._id);
                    setFocusLocation([post.lat, post.lng]);
                  }}
                >
                  <span className={`category-dot category-${post.category || "genel"}`} />
                  <span className="memory-item-body">
                    <strong>{post.placeName || "Konum"}</strong>
                    <span>{post.description || "Fotografli paylasim"}</span>
                    <small>
                      {categoryLabels[post.category] || "Genel"} · {moodLabels[post.mood] || "Sakin"} · {post.rating || 0}/5 · {post.likes || 0} begeni · {(post.comments || []).length} yorum
                    </small>
                    {!!post.tags?.length && (
                      <small className="memory-tags">{post.tags.map((tag) => `#${tag}`).join(" ")}</small>
                    )}
                  </span>
                </button>

                {selectedPostId === post._id && (
                  <div className="memory-actions">
                    <button type="button" onClick={() => handleLike(post._id)}>
                      {post.viewerLiked ? "Begeniyi kaldir" : "Begen"}
                    </button>
                    <button type="button" onClick={() => getRoute(post)}>
                      Yol tarifi
                    </button>
                    <div className="comment-thread">
                      <div className="comment-thread-title">
                        <strong>Yorumlar</strong>
                        <span>{(post.comments || []).length}</span>
                      </div>
                      {(post.comments || []).length ? (
                        <div className="comment-list">
                          {(post.comments || []).map((comment) => (
                            <article key={comment._id} className="comment-bubble">
                              <strong>{comment.userName || "Gezgin"}</strong>
                              <p>{comment.text}</p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="comment-empty">Bu paylasima henuz yorum gelmemis.</p>
                      )}
                    </div>
                    <div className="comment-row">
                      <input
                        value={commentDrafts[post._id] || ""}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [post._id]: event.target.value,
                          }))
                        }
                        placeholder="Kisa yorum yaz"
                      />
                      <button type="button" onClick={() => handleComment(post._id)}>
                        Gonder
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
        </div>
      </aside>

      {routeInfo && (
        <section className={`navigation-panel ${mobilePanel === "route" ? "is-mobile-active" : ""}`} aria-label="Yol tarifi">
          <div className="navigation-header">
            <div>
              <p>Aktif rota</p>
              <h2>{routeInfo.title}</h2>
              <span>
                {routeInfo.distance} - {routeInfo.duration}
              </span>
            </div>
            <button type="button" onClick={handleClearRoute} aria-label="Rotayi kapat">
              x
            </button>
          </div>
          {routeInfo.steps[0] && (
            <div className="next-step-card">
              <span>Siradaki hamle</span>
              <strong>{routeInfo.steps[0].instruction}</strong>
              <small>{formatDistance(routeInfo.steps[0].distance)}</small>
            </div>
          )}
          <div className="route-tracker-card">
            <span>{routeProgress.active ? "GPS hareketi izleniyor" : "GPS takibi kapali"}</span>
            <strong>{formatDistance(routeProgress.trackedMeters)} gercek hareket</strong>
            <small>
              Profil mesafesi rota uzunlugundan degil, cihazdan algilanan hareketten yazilir.
            </small>
          </div>
          <ol className="route-steps">
            {routeInfo.steps.slice(0, 8).map((step) => (
              <li key={step.id}>
                <strong>{formatDistance(step.distance)}</strong>
                <span>{step.instruction}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="finish-route-button" onClick={handleFinishRoute}>
            Rotayi bitir ve mesafeyi profile isle
          </button>
        </section>
      )}

      <button type="button" className="share-fab" onClick={() => setShowPostPanel(true)}>
        <span aria-hidden="true">+</span>
        <strong>Paylas</strong>
      </button>

      {showPostPanel && (
        <PostPanel
          location={location}
          onSubmit={handleCreatePost}
          onClose={() => setShowPostPanel(false)}
        />
      )}
    </main>
  );
}
