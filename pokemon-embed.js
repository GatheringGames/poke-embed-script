// == Pokemon Embed Script ==
(async () => {
  const SUPABASE_URL = "https://goptnxkxuligthfvefes.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcHRueGt4dWxpZ3RoZnZlZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTY3MjcsImV4cCI6MjA1ODk5MjcyN30.4qh8BWbnwsrfbPHg7PfPG2B-0aTKpgipOATLqHq9MN0";
  const EXCHANGE_RATE_API = "https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP";

  const exchangeRates = await fetch(EXCHANGE_RATE_API)
    .then(r => r.json())
    .then(data => ({ eur: data.rates.EUR, gbp: data.rates.GBP }))
    .catch(() => ({ eur: 0.92, gbp: 0.78 }));

  const chartJsScript = document.createElement("script");
  chartJsScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
  document.head.appendChild(chartJsScript);
  chartJsScript.onload = () => initEmbeds();

  // Existing style code unchanged...

  async function initEmbeds() {
    const regex = /embed::\[\[(.+?)\s+\((.+?)\)\]\]/g;
    const paragraphs = Array.from(document.querySelectorAll("p"));

    for (const p of paragraphs) {
      const matches = [...p.innerHTML.matchAll(regex)];
      if (!matches.length) continue;

      for (const match of matches) {
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
            <div class="poke-price-label">Current Market Price: <span class="poke-current-price">Loading...</span></div>
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

        setupEmbed(container, id);
      }
    }
  }

  async function setupEmbed(container, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_card_prices?select=date,price_usd&card_id=eq.${id}&order=date.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });

    if (!res.ok) {
      console.error("Price data fetch failed", await res.text());
      return;
    }

    const data = await res.json();
    const ctx = container.querySelector("canvas").getContext("2d");
    const dates = data.map(d => d.date);
    const usdPrices = data.map(d => d.price_usd);

    function aggregateData(range, prices) {
      if (range <= 30) return prices.slice(-range);
      const groupedPrices = [];
      const step = range === 180 ? 14 : 30;
      for (let i = prices.length - range; i < prices.length; i += step) {
        const chunk = prices.slice(i, i + step);
        const avg = chunk.reduce((acc, p) => acc + p, 0) / chunk.length;
        groupedPrices.push(parseFloat(avg.toFixed(2)));
      }
      return groupedPrices;
    }

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates.slice(-7),
        datasets: [{ label: "Price (USD)", data: usdPrices.slice(-7), borderColor: "#d8232f", backgroundColor: "rgba(216,35,47,0.2)", fill: true }]
      }
    });

    container.querySelector(".poke-current-price").textContent = `$${usdPrices[usdPrices.length - 1]}`;

    container.querySelectorAll(".poke-range-buttons button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelector(".poke-range-buttons .active").classList.remove("active");
        btn.classList.add("active");
        const range = parseInt(btn.dataset.range);
        chart.data.labels = aggregateData(range, dates);
        chart.data.datasets[0].data = aggregateData(range, usdPrices);
        chart.update();
      });
    });

    container.querySelectorAll(".poke-currency-buttons button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelector(".poke-currency-buttons .active").classList.remove("active");
        btn.classList.add("active");
        const currency = btn.dataset.currency;
        const rate = currency === 'usd' ? 1 : exchangeRates[currency];
        const convertedPrices = usdPrices.map(p => parseFloat((p * rate).toFixed(2)));
        chart.data.datasets[0].label = `Price (${currency.toUpperCase()})`;
        chart.data.datasets[0].data = aggregateData(parseInt(container.querySelector(".poke-range-buttons .active").dataset.range), convertedPrices);
        chart.update();
        container.querySelector(".poke-current-price").textContent = `${currency.toUpperCase()} ${convertedPrices[convertedPrices.length - 1]}`;
      });
    });

    container.querySelector("img").addEventListener("click", e => window.open(e.target.dataset.hires, "_blank"));
  }
})();
