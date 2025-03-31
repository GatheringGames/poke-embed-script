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
    .poke-embed { background: #394042; color: white; border-radius: 8px; padding: 1em; margin: 1em 0; display: flex; flex-wrap: wrap; gap: 1em; border: 2px solid #5c696d; }
    .poke-embed img { width: 250px; border-radius: 4px; cursor: zoom-in; display: block; margin: 0 auto; }
    .poke-info { flex: 1; min-width: 200px; }
    .poke-info h3 { margin-top: 0; color: white; }
    .poke-price-label { font-weight: bold; margin-top: 0.5em; }
    .poke-currency-buttons, .poke-range-buttons {
      text-align: center;
      margin-top: 0.5em;
    }
    .poke-currency-buttons button, .poke-range-buttons button {
      margin: 0.25em 0.5em 0.25em 0 !important; padding: 4px 8px;
      cursor: pointer; border: none; background: #ccc; border-radius: 4px;
    }
    .poke-currency-buttons button.active, .poke-range-buttons button.active {
      background-color: #d8232f; color: white;
    }
    canvas.poke-price-chart { max-width: 100%; margin-top: 1em; background: white; border-radius: 4px; display: block; margin-left: auto; margin-right: auto; }
    .poke-price-note { font-size: 0.8em; margin-top: 4px; color: #ccc; text-align: center; }
  `;
  document.head.appendChild(style);

  function initEmbeds() {
    const regex = /embed::\[\[(.+?)\s+\((.+?)\)\]\]/g;
    document.querySelectorAll("p").forEach(p => {
      let match;
      while ((match = regex.exec(p.innerHTML)) !== null) {
        const [fullMatch, name, id] = match;
        const [set, number] = id.split("-");
        const container = document.createElement("div");
        container.className = "poke-embed";
        container.innerHTML = `
          <div class="poke-card-image">
            <img src="https://images.pokemontcg.io/${set}/${number}.png" alt="${name}" data-hires="https://images.pokemontcg.io/${set}/${number}_hires.png" />
          </div>
          <div class="poke-info">
            <h3>${name}</h3>
            <div class="poke-price-label">Current Market Price: <span class="poke-current-price">...</span></div>
            <div class="poke-price-note">Prices provided by TCGplayer</div>
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

  async function loadPriceChart(cardId, container) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_card_prices?select=date,price_usd&card_id=eq.${cardId}&order=date.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    const data = await res.json();
    if (!data || !data.length) return;

    const dates = data.map(d => d.date);
    const pricesUSD = data.map(d => d.price_usd);
    const pricesEUR = pricesUSD.map(p => p * exchangeRates.eur);
    const pricesGBP = pricesUSD.map(p => p * exchangeRates.gbp);

    const currentUSD = pricesUSD[pricesUSD.length - 1] || 0;
    const currencyMap = { usd: pricesUSD, eur: pricesEUR, gbp: pricesGBP };
    const chartLabelMap = { usd: "USD", eur: "EUR", gbp: "GBP" };

    const priceDisplay = container.querySelector(".poke-current-price");
    priceDisplay.textContent = `$${currentUSD.toFixed(2)}`;

    const ctx = container.querySelector("canvas").getContext("2d");
    let chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: "Price (USD)",
          data: pricesUSD,
          borderColor: "#d8232f",
          backgroundColor: "rgba(216, 35, 47, 0.2)",
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        scales: {
          x: { display: true },
          y: { beginAtZero: false },
        },
      },
    });

    function updateChart(currency, range) {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - range);

      const filtered = data.filter(d => new Date(d.date) >= cutoff);
      const labels = filtered.map(d => d.date);
      const prices = currencyMap[currency].slice(-labels.length);

      let downsampledLabels = labels;
      let downsampledPrices = prices;

      if (range === 180) {
        [downsampledLabels, downsampledPrices] = averageOverIntervals(labels, prices, 14);
      } else if (range === 365) {
        [downsampledLabels, downsampledPrices] = averageOverMonths(labels, prices);
      }

      chart.data.labels = downsampledLabels;
      chart.data.datasets[0].data = downsampledPrices;
      chart.data.datasets[0].label = `Price (${chartLabelMap[currency]})`;
      chart.update();

      const latest = downsampledPrices[downsampledPrices.length - 1] || 0;
      const symbol = currency === "usd" ? "$" : currency === "eur" ? "€" : "£";
      priceDisplay.textContent = `${symbol}${latest.toFixed(2)}`;
    }

    function averageOverIntervals(dates, values, days) {
      const resultDates = [];
      const resultValues = [];
      let sum = 0, count = 0, startDate = new Date(dates[0]);

      for (let i = 0; i < dates.length; i++) {
        const current = new Date(dates[i]);
        sum += values[i];
        count++;

        if ((current - startDate) / (1000 * 60 * 60 * 24) >= days || i === dates.length - 1) {
          resultDates.push(dates[i]);
          resultValues.push(sum / count);
          sum = 0;
          count = 0;
          startDate = current;
        }
      }
      return [resultDates, resultValues];
    }

    function averageOverMonths(dates, values) {
      const resultDates = [];
      const resultValues = [];
      let sum = 0, count = 0, currentMonth = new Date(dates[0]).getMonth();

      for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]);
        if (d.getMonth() !== currentMonth && count > 0) {
          resultDates.push(dates[i - 1]);
          resultValues.push(sum / count);
          sum = 0;
          count = 0;
        }
        sum += values[i];
        count++;
        currentMonth = d.getMonth();
      }
      if (count > 0) {
        resultDates.push(dates[dates.length - 1]);
        resultValues.push(sum / count);
      }
      return [resultDates, resultValues];
    }

    // Default chart on load (7 days, USD)
    updateChart("usd", 7);

    container.querySelectorAll(".poke-currency-buttons button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".poke-currency-buttons button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const currency = btn.dataset.currency;
        const range = parseInt(container.querySelector(".poke-range-buttons button.active").dataset.range);
        updateChart(currency, range);
      });
    });

    container.querySelectorAll(".poke-range-buttons button").forEach(btn => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".poke-range-buttons button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const range = parseInt(btn.dataset.range);
        const currency = container.querySelector(".poke-currency-buttons button.active").dataset.currency;
        updateChart(currency, range);
      });
    });
  }
})();
