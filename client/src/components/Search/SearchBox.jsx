export default function SearchBox({
  search,
  suggestions,
  loading,
  onSearchChange,
  onSelectPlace,
  onRouteToPlace,
  className = "",
}) {
  function submitSearch(event) {
    event.preventDefault();
    if (suggestions[0]) {
      onSelectPlace(suggestions[0]);
    }
  }

  return (
    <section className={`map-search ${loading ? "is-searching" : ""} ${className}`.trim()} aria-label="Yer arama">
      <form onSubmit={submitSearch}>
        <label htmlFor="place-search">Yer ara</label>
        <div className="search-input-wrap">
          <span className="search-icon" aria-hidden="true" />
          <input
            id="place-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Mekan, mahalle veya adres"
            autoComplete="off"
          />
          <button type="submit" disabled={!suggestions.length}>
            Git
          </button>
        </div>
      </form>

      {(loading || suggestions.length > 0) && (
        <div className="suggestions" role="listbox">
          {loading && <p>Araniyor...</p>}
          {!loading &&
            suggestions.map((suggestion) => (
              <div className="suggestion-row" key={`${suggestion.place_id}-${suggestion.lat}`}>
                <button type="button" onClick={() => onSelectPlace(suggestion)}>
                  <span className="suggestion-pin" aria-hidden="true" />
                  {suggestion.display_name}
                </button>
                <button type="button" className="route-mini" onClick={() => onRouteToPlace(suggestion)}>
                  Rota
                </button>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
