// == Pokemon Embed Script ==
(async () => {
  const SUPABASE_URL = "https://goptnxkxuligthfvefes.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcHRueGt4dWxpZ3RoZnZlZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTY3MjcsImV4cCI6MjA1ODk5MjcyN30.4qh8BWbnwsrfbPHg7PfPG2B-0aTKpgipOATLqHq9MN0";
  const EXCHANGE_RATE_API = "https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP";

  const exchangeRates = await fetch(EXCHANGE_RATE_API)
    .then(r => r.json())
    .then(data => ({
      eur: data.rates.EUR,
      gbp: data.rates.GBP
    }))
    .catch(() => ({ eur: 0.92, gbp: 0.78 }));

  const chartJsScript = document.createElement("script");
  chartJsScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
  chartJsScript.onload = () => initEmbeds();
  document.head.appendChild(chartJsScript);

  const style = document.createElement("style");
  style.textContent = `
    .poke-embed {
      background: #394042;
      color: white;
      border-radius: 8px;
      padding: 1em;
      margin: 1em 0;
      display: flex;
      gap: 1em;
      border: 2px solid #5c696d;
      align-items: center;
    }
    .poke-card-image img {
      width: 250px;
      border-radius: 4px;
      cursor: zoom-in;
      display: block;
      margin: 0 auto;
    }
    .poke-info {
      flex: 1;
      min-width: 200px;
    }
    .poke-info h3 {
      margin-top: 0;
      color: white;
    }
    .poke-rarity {
      margin-bottom: 0.5em;
      color: #ccc;
    }
    .poke-price-label {
      font-weight: bold;
      margin-top: 0.5em;
    }
    .poke-currency-buttons, .poke-range-buttons {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.5em;
      margin-top: 0.5em;
    }
    .poke-currency-buttons button, .poke-range-buttons button {
      padding: 4px 8px;
      cursor: pointer;
      border: none;
      background: #ccc;
      border-radius: 4px;
    }
    .poke-currency-buttons button.active, .poke-range-buttons button.active {
      background-color: #d8232f;
      color: white;
    }
    canvas.poke-price-chart {
      max-width: 100%;
      margin: 1em auto 0 auto;
      background: white;
      border-radius: 4px;
      display: block;
    }
    .poke-price-note {
      font-size: 0.8em;
      margin-top: 4px;
      color: #ccc;
      text-align: center;
    }
    @media (max-width: 768px) {
      .poke-embed {
        flex-direction: column;
        align-items: center;
      }
    }
  `;
  document.head.appendChild(style);

  function initEmbeds() {
    const regex = /embed::\[\[(.+?)\s+\((.+?)\)\]\]/g;
    document.querySelectorAll("p").forEach(async p => {
      let match;
      while ((match = regex.exec(p.innerHTML)) !== null) {
        const [fullMatch, name, id] = match;
        const [set, number] = id.split("-");
        const rarity = await fetch(`https://api.pokemontcg.io/v2/cards/${id}`)
          .then(res => res.json())
          .then(json => json?.data?.rarity || "")
          .catch(() => "");

        const container = document.createElement("div");
        container.className = "poke-embed";
        container.innerHTML = `
          <div class="poke-card-image">
            <img src="https://images.pokemontcg.io/${set}/${number}.png" alt="${name}" data-hires="https://images.pokemontcg.io/${set}/${number}_hires.png" />
          </div>
          <div class="poke-info">
            <h3>${name}</h3>
            <div class="poke-rarity">${rarity}</div>
            <div class="poke-price-label">Current Market Price: <span class="poke-current-price">...</span></div>
            <div class="poke-currency-buttons">
              <button class="active" data-currency="usd">USD</button>
              <button data-currency="eur">EUR</button>
              <button data-currency="gbp">GBP</button>
            </div>
            <canvas class="poke-price-chart"></canvas>
            <div class="poke-range-buttons">
              <button class="active" data-range="7">7d</button>
              <button data-range="30">30d</button>
              <button data-range="180">6mo</button>
              <button data-range="365">1yr</button>
            </div>
            <div class="poke-price-note">Prices provided by TCGplayer</div>
          </div>
        `;
        p.replaceWith(container);

        container.querySelector("img").addEventListener("click", e => {
          const url = e.target.getAttribute("data-hires");
          if (url) window.open(url, "_blank");
        });

        loadPriceChart(id, container);
      }
    });
  }

  // The loadPriceChart function remains unchanged from the previous version.
})();
