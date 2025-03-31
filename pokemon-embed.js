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
  document.head.appendChild(chartJsScript);
  chartJsScript.onload = () => initEmbeds();

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
      display: flex;
      flex-direction: column;
      justify-content: center;
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
      width: 100%;
      height: 300px;
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

  function aggregateData(data, intervalDays) {
    const grouped = [];
    let temp = [];
    let lastDate = new Date(data[0].date);

    for (const point of data) {
      const currentDate = new Date(point.date);
      const diffDays = (currentDate - lastDate) / (1000 * 60 * 60 * 24);
      if (diffDays < intervalDays) {
        temp.push(point);
      } else {
        if (temp.length) grouped.push(temp);
        temp = [point];
        lastDate = currentDate;
      }
    }
    if (temp.length) grouped.push(temp);

    return grouped.map(group => {
      const avg = group.reduce((sum, d) => sum + d.price_usd, 0) / group.length;
      return {
        date: group[0].date,
        price_usd: parseFloat(avg.toFixed(2))
      };
    });
  }

  async function setupEmbed(container, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_card_prices?select=date,price_usd&card_id=eq.${id}&order=date.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });

    if (!res.ok) return console.error("Price fetch failed", await res.text());
    let rawData = await res.json();
    if (!rawData.length) return;

    const ctx = container.querySelector("canvas").getContext("2d");
    const latest = rawData[rawData.length - 1].price_usd;
    const currentPriceEl = container.querySelector(".poke-current-price");
    currentPriceEl.textContent = `$${latest}`;

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: rawData.slice(-7).map(d => d.date),
        datasets: [{
          label: "Price (USD)",
          data: rawData.slice(-7).map(d => d.price_usd),
          borderColor: "#d8232f",
          backgroundColor: "rgba(216,35,47,0.2)",
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: true },
          y: { beginAtZero: false },
        },
      }
    });

    container.querySelectorAll(".poke-range-buttons button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelector(".poke-range-buttons .active").classList.remove("active");
        btn.classList.add("active");
        const range = parseInt(btn.dataset.range);
        let dataset = rawData;

        if (range === 180) dataset = aggregateData(rawData.slice(-180), 14);
        else if (range === 365) dataset = aggregateData(rawData.slice(-365), 30);
        else dataset = rawData.slice(-range);

        chart.data.labels = dataset.map(d => d.date);
        chart.data.datasets[0].data = dataset.map(d => d.price_usd);
        chart.data.datasets[0].label = "Price (USD)";
        chart.update();
      });
    });

    container.querySelectorAll(".poke-currency-buttons button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelector(".poke-currency-buttons .active").classList.remove("active");
        btn.classList.add("active");
        const currency = btn.dataset.currency;
        const rate = currency === "eur" ? exchangeRates.eur : currency === "gbp" ? exchangeRates.gbp : 1;
        const label = `Price (${currency.toUpperCase()})`;

        chart.data.datasets[0].label = label;
        chart.data.datasets[0].data = chart.data.datasets[0].data.map(p => parseFloat((p * rate).toFixed(2)));
        chart.update();

        currentPriceEl.textContent = `${currency === "usd" ? "$" : currency === "eur" ? "€" : "£"}${(latest * rate).toFixed(2)}`;
      });
    });

    container.querySelector("img").addEventListener("click", e => {
      window.open(e.target.dataset.hires, "_blank");
    });
  }
})();
