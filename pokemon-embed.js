// ==Pokemon Embed Script==
(async () => {
  const SUPABASE_URL = "https://goptnxkxuligthfvefes.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvcHRueGt4dWxpZ3RoZnZlZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTY3MjcsImV4cCI6MjA1ODk5MjcyN30.4qh8BWbnwsrfbPHg7PfPG2B-0aTKpgipOATLqHq9MN0";

  const EMBED_PATTERN = /embed::\[\[([^\]]+?) \(([^\]]+?)\)\]\]/g;

  const container = document.createElement("div");
  container.id = "pokemon-embeds";
  document.body.appendChild(container);

  const chartJsScript = document.createElement("script");
  chartJsScript.src = "https://cdn.jsdelivr.net/npm/chart.js";
  document.head.appendChild(chartJsScript);

  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  function parseCardId(id) {
    const match = id.match(/^([a-z0-9]+)[-\/](\d+)$/i);
    return match ? { set: match[1], number: match[2] } : null;
  }

  function buildImageUrl(set, number) {
    return `https://images.pokemontcg.io/${set}/${number}.png`;
  }

  function buildHiResImageUrl(set, number) {
    return `https://images.pokemontcg.io/${set}/${number}_hires.png`;
  }

  function createEmbedElement(name, cardId) {
    const parsed = parseCardId(cardId);
    if (!parsed) return null;

    const embedDiv = document.createElement("div");
    embedDiv.className = "pokemon-embed-container";

    const img = document.createElement("img");
    img.src = buildImageUrl(parsed.set, parsed.number);
    img.alt = name;
    img.className = "pokemon-embed-image";
    img.addEventListener("click", () => {
      window.open(buildHiResImageUrl(parsed.set, parsed.number), "_blank");
    });

    const details = document.createElement("div");
    details.className = "pokemon-embed-details";

    const title = document.createElement("h3");
    title.textContent = name;
    title.className = "pokemon-embed-name";

    const chartCanvas = document.createElement("canvas");
    chartCanvas.width = 400;
    chartCanvas.height = 200;

    const currencyControls = document.createElement("div");
    currencyControls.className = "pokemon-embed-controls";
    ["usd", "eur", "gbp"].forEach(curr => {
      const btn = document.createElement("button");
      btn.textContent = curr.toUpperCase();
      btn.onclick = () => renderChart(chart, chartData, curr);
      currencyControls.appendChild(btn);
    });

    details.appendChild(title);
    details.appendChild(chartCanvas);
    details.appendChild(currencyControls);

    embedDiv.appendChild(img);
    embedDiv.appendChild(details);

    container.appendChild(embedDiv);
    return { chartCanvas, parsed };
  }

  let chart;
  let chartData = {};

  async function fetchPrices(cardId) {
    const { data, error } = await supabase
      .from("pokemon_card_prices")
      .select("date,price_usd,price_eur,price_gbp")
      .eq("card_id", cardId)
      .order("date", { ascending: true });

    if (error) {
      console.error("Error fetching price data:", error);
      return null;
    }
    return data;
  }

  function renderChart(chartInstance, data, currency = "usd") {
    const labels = data.map(row => row.date);
    const prices = data.map(row => row[`price_${currency}`]);

    if (chartInstance) chartInstance.destroy();
    chart = new Chart(chartCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `Price (${currency.toUpperCase()})`,
          data: prices,
          borderWidth: 2,
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
  }

  document.querySelectorAll("p").forEach(p => {
    const html = p.innerHTML;
    let match;
    while ((match = EMBED_PATTERN.exec(html)) !== null) {
      const [_, name, cardId] = match;
      const embedInfo = createEmbedElement(name, cardId);
      if (!embedInfo) continue;
      fetchPrices(cardId).then(data => {
        if (data) {
          chartData = data;
          renderChart(chart, chartData, "usd");
        }
      });
    }
  });
})();
