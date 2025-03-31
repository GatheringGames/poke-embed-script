// == Pokemon Embed Script ==
(async () => {
  const SUPABASE_URL = "https://goptnxkxuligthfvefes.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcHRueGt4dWxpZ3RoZnZlZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTY3MjcsImV4cCI6MjA1ODk5MjcyN30.4qh8BWbnwsrfbPHg7PfPG2B-0aTKpgipOATLqHq9MN0";

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
      flex-wrap: wrap;
      gap: 1em;
      border: 2px solid #5c696d;
    }
    .poke-embed img {
      width: 250px;
      border-radius: 4px;
      cursor: zoom-in;
    }
    .poke-info {
      flex: 1;
      min-width: 200px;
    }
    .poke-info h3 {
      margin-top: 0;
      color: white;
    }
    .poke-currency-buttons {
      margin-top: 1em;
    }
    .poke-currency-buttons button {
      margin-right: 8px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .poke-currency-buttons button.active {
      background-color: #d8232f;
      color: white;
    }
    canvas.poke-price-chart {
      max-width: 100%;
      margin-top: 1em;
      background: white;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);

  function initEmbeds() {
    const regex = /embed::\[\[(.+?)\s+\((.+?)\)\]\]/g;
    document.querySelectorAll("p").forEach(p => {
      let match;
      while ((match = regex.exec(p.innerHTML)) !== null) {
        const [fullMatch, name, id] = match;

        const [setCode, cardNumber] = id.split("-");
        const container = document.createElement("div");
        container.className = "poke-embed";
        container.innerHTML = `
          <div class="poke-card-image">
            <img src="https://images.pokemontcg.io/${setCode}/${cardNumber}.png" alt="${name}" data-hires="https://images.pokemontcg.io/${setCode}/${cardNumber}_hires.png" />
          </div>
          <div class="poke-info">
            <h3>${name}</h3>
            <div class="poke-currency-buttons">
              <button class="active" data-currency="usd">USD</button>
              <button data-currency="eur">EUR</button>
              <button data-currency="gbp">GBP</button>
            </div>
            <canvas class="poke-price-chart"></canvas>
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

  async function getExchangeRates() {
    try {
      const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=EUR,GBP");
      const data = await res.json();
      return {
        eur: data.rates.EUR,
        gbp: data.rates.GBP
      };
    } catch (e) {
      console.error("Failed to fetch exchange rates", e);
      return { eur: 0.9, gbp: 0.8 };
    }
  }

  async function loadPriceChart(cardId, container) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_card_prices?select=date,price_usd&card_id=eq.${cardId}&order=date.asc`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) return console.error("Failed to fetch price data for", cardId);
    const data = await res.json();
    if (!data.length) return;

    const rates = await getExchangeRates();
    const dates = data.map(d => d.date);
    const prices = {
      usd: data.map(d => d.price_usd),
      eur: data.map(d => parseFloat((d.price_usd * rates.eur).toFixed(2))),
      gbp: data.map(d => parseFloat((d.price_usd * rates.gbp).toFixed(2))),
    };

    const ctx = container.querySelector("canvas").getContext("2d");
    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dates,
        datasets: [{
          label: "Price (USD)",
          data: prices.usd,
          borderColor: "#d8232f",
          backgroundColor: "rgba(216, 35, 47, 0.2)",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        }],
      },
      options: {
        responsive: true,
        scales: {
          x: { display: true },
          y: { beginAtZero: true },
        },
        plugins: {
          legend: { display: true },
        }
      }
    });

    const buttons = container.querySelectorAll(".poke-currency-buttons button");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const cur = btn.dataset.currency;
        chart.data.datasets[0].data = prices[cur];
        chart.data.datasets[0].label = `Price (${cur.toUpperCase()})`;
        chart.update();
      });
    });
  }
})();
