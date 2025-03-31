(async () => {
  const SUPABASE_URL = "https://goptnxkxuligthfvefes.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcHRueGt4dWxpZ3RoZnZlZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTY3MjcsImV4cCI6MjA1ODk5MjcyN30.4qh8BWbnwsrfbPHg7PfPG2B-0aTKpgipOATLqHq9MN0";

  const chartJsScript = document.createElement("script");
  chartJsScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
  chartJsScript.onload = () => initEmbeds();
  document.head.appendChild(chartJsScript);

  const style = document.createElement("style");
  style.textContent = `
    .poke-embed { background: #394042; color: white; border-radius: 8px; padding: 1em; margin: 1em 0; display: flex; flex-wrap: wrap; gap: 1em; border: 2px solid #5c696d; align-items: center; }
    .poke-embed img { width: 250px; border-radius: 4px; cursor: zoom-in; }
    .poke-info { flex: 1; min-width: 200px; }
    .poke-info h3 { margin-top: 0; color: white; }
    .poke-currency-buttons, .poke-duration-buttons { margin-top: 1em; text-align: center; }
    .poke-currency-buttons button, .poke-duration-buttons button { margin-right: 8px; padding: 4px 8px; cursor: pointer; }
    .poke-currency-buttons button.active, .poke-duration-buttons button.active { background-color: #d8232f; color: white; }
    canvas.poke-price-chart { max-width: 100%; margin-top: 1em; background: white; border-radius: 4px; }
    .poke-rarity { font-size: 0.9em; }

    @media (max-width: 600px) {
      .poke-embed { flex-direction: column; }
      .poke-embed img { margin: 0 auto; }
    }
  `;
  document.head.appendChild(style);

  async function fetchCardInfo(cardId) {
    const res = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
    return res.ok ? (await res.json()).data : null;
  }

  async function initEmbeds() {
    const regex = /embed::\[\[(.+?)\s+\((.+?)\)\]\]/g;
    const elements = document.querySelectorAll("p");

    for (const p of elements) {
      const matches = [...p.innerHTML.matchAll(regex)];
      for (const match of matches) {
        const [fullMatch, name, id] = match;
        const container = document.createElement("div");
        container.className = "poke-embed";

        const cardInfo = await fetchCardInfo(id);
        const rarity = cardInfo ? cardInfo.rarity : "Unknown";

        container.innerHTML = `
          <div class="poke-card-image">
            <img src="https://images.pokemontcg.io/${id.replace('-', '/')}.png" alt="${name}" data-hires="https://images.pokemontcg.io/${id.replace('-', '/')}_hires.png" />
          </div>
          <div class="poke-info">
            <h3>${name}</h3>
            <div class="poke-rarity">Rarity: ${rarity}</div>
            <div class="poke-current-price">Current Market Price: Loading...</div>
            <div class="poke-currency-buttons">
              <button class="active" data-currency="usd">USD</button>
              <button data-currency="eur">EUR</button>
              <button data-currency="gbp">GBP</button>
            </div>
            <canvas class="poke-price-chart"></canvas>
            <div class="poke-duration-buttons">
              <button data-duration="7">7 days</button>
              <button data-duration="30">30 days</button>
              <button data-duration="180">6 months</button>
              <button data-duration="365">1 year</button>
            </div>
            <div style="text-align:center;font-size:0.8em;margin-top:0.5em;">Prices provided by TCGplayer</div>
          </div>
        `;
        p.replaceWith(container);

        container.querySelector("img").onclick = e => window.open(e.target.dataset.hires, "_blank");

        await loadPriceChart(id, container);
      }
    }
  }

  async function loadPriceChart(cardId, container) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pokemon_card_prices?select=date,price_usd&card_id=eq.${cardId}&order=date.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });

    if (!res.ok) return console.error("Failed to fetch price data for", cardId);

    const data = await res.json();
    if (data.length === 0) return;

    container.querySelector(".poke-current-price").textContent = `Current Market Price: $${data[data.length - 1].price_usd}`;

    const ctx = container.querySelector("canvas").getContext("2d");
    const chartData = data.map(d => ({ x: d.date, y: d.price_usd }));
    const chart = new Chart(ctx, {
      type: "line",
      data: { datasets: [{ label: "Price (USD)", data: chartData, borderColor: "#d8232f", backgroundColor: "rgba(216,35,47,0.2)", fill: true }] },
      options: { responsive: true, scales: { y: { beginAtZero: false }, x: { type: "time", time: { unit: "day" } } } }
    });

    const buttons = container.querySelectorAll(".poke-duration-buttons button");
    buttons.forEach(btn => btn.onclick = () => updateChart(chart, chartData, parseInt(btn.dataset.duration)));

    updateChart(chart, chartData, 7);
  }

  function updateChart(chart, data, days) {
    const filtered = data.filter(d => new Date(d.x) >= new Date(Date.now() - days * 86400000));
    chart.data.datasets[0].data = filtered;
    chart.update();
  }
})();
