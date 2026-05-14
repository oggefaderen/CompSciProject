const csvFiles = {
  characters: "characters_enriched_v2.csv",
  karma: "karma_edges_v2.csv",
  top: "top100_outgoing_v2.csv",
  quotes: "characters_quotes.csv",
};

const houseColors = {
  Stark: "#4169a8",
  Lannister: "#b6292d",
  Targaryen: "#c65b36",
  Baratheon: "#c99a2e",
  Greyjoy: "#657a83",
  Tyrell: "#3f8d5a",
  Martell: "#c96f2d",
  Velaryon: "#247f7a",
  Frey: "#8269a8",
  "Night's Watch": "#272d33",
  Kingsguard: "#d8c781",
  Other: "#7b746c",
};

const state = {
  characters: [],
  karma: [],
  top: [],
  quotes: [],
  characterById: new Map(),
  topById: new Map(),
  karmaBySource: new Map(),
  quotesByCharacter: new Map(),
  selectedId: "Tyrion_Lannister",
  karmaMode: "highest",
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [charactersText, karmaText, topText, quotesText] = await Promise.all(
      Object.values(csvFiles).map((path) => fetch(path).then((response) => {
        if (!response.ok) throw new Error(`Could not load ${path}`);
        return response.text();
      })),
    );

    state.characters = rowsToObjects(parseCSV(charactersText));
    state.karma = rowsToObjects(parseCSV(karmaText)).filter((row) => isScore(row.karma_score));
    state.top = rowsToObjects(parseCSV(topText));
    state.quotes = rowsToObjects(parseCSV(quotesText));

    buildIndexes();
    renderAll();
    bindEvents();
  } catch (error) {
    console.error(error);
    document.querySelector(".hero-copy p").textContent =
      "The page shell loaded, but the CSV data could not be fetched. Serve this folder with a local web server or open it through GitHub Pages.";
  }
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((line) => line.some((cell) => cell.trim().length));
}

function rowsToObjects(rows) {
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
}

function buildIndexes() {
  state.characters.forEach((character) => {
    state.characterById.set(character.ID, character);
  });

  state.top.forEach((character) => {
    state.topById.set(character.ID, character);
  });

  state.karma.forEach((edge) => {
    const score = toNumber(edge.karma_score);
    if (!state.karmaBySource.has(edge.source_id)) {
      state.karmaBySource.set(edge.source_id, []);
    }
    state.karmaBySource.get(edge.source_id).push({ ...edge, score });
  });

  state.quotes.forEach((quote) => {
    [quote.ID, quote.speaker_id, quote.recipient_id].filter(Boolean).forEach((id) => {
      if (!state.quotesByCharacter.has(id)) state.quotesByCharacter.set(id, []);
      state.quotesByCharacter.get(id).push(quote);
    });
  });
}

function renderAll() {
  renderMetrics();
  renderDegreeBars();
  renderNetwork("hero-network", 38, { hero: true });
  renderNetwork("main-network", 62, { labels: true });
  renderKarmaDistribution();
  renderKarmaRankings();
  renderCharacterOptions();
  renderCharacterProfile(state.selectedId);
  renderWordCloud();
  renderQuotes();
  renderDownloads();
}

function bindEvents() {
  window.addEventListener("resize", debounce(() => {
    renderNetwork("hero-network", 38, { hero: true });
    renderNetwork("main-network", 62, { labels: true });
  }, 180));

  document.querySelectorAll("[data-karma-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.karmaMode = button.dataset.karmaMode;
      document.querySelectorAll("[data-karma-mode]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      renderKarmaRankings();
    });
  });

  document.getElementById("character-go").addEventListener("click", selectFromSearch);
  document.getElementById("character-search").addEventListener("change", selectFromSearch);

  document.getElementById("quote-search").addEventListener("input", debounce(renderQuotes, 120));
  document.getElementById("quote-clear").addEventListener("click", () => {
    document.getElementById("quote-search").value = "";
    renderQuotes();
  });
}

function renderMetrics() {
  const totalAffiliations = state.characters.reduce((sum, character) => sum + splitList(character.affiliated).length, 0);

  setText("metric-characters", formatNumber(state.characters.length));
  setText("metric-links", formatNumber(totalAffiliations));
  setText("metric-karma", formatNumber(state.karma.length));
  setText("metric-quotes", formatNumber(state.quotes.length));
}

function renderDegreeBars() {
  const rows = state.top.slice(0, 12).map((character) => ({
    label: character.name,
    value: toNumber(character.out_degree),
  }));
  const max = Math.max(...rows.map((row) => row.value));
  const container = document.getElementById("degree-bars");

  container.innerHTML = rows.map((row) => `
    <div class="bar-row">
      <strong>${escapeHTML(row.label)}</strong>
      <div class="bar-track" aria-hidden="true">
        <div class="bar-fill" style="width: ${(row.value / max) * 100}%"></div>
      </div>
      <span class="bar-value">${row.value}</span>
    </div>
  `).join("");
}

function renderNetwork(svgId, limit, options = {}) {
  const svg = document.getElementById(svgId);
  const bounds = svg.getBoundingClientRect();
  const width = Math.max(320, Math.floor(bounds.width || svg.parentElement.clientWidth || 800));
  const height = Math.max(options.hero ? 320 : 480, Math.floor(bounds.height || svg.parentElement.clientHeight || 620));
  const graph = buildGraph(limit);

  layoutGraph(graph.nodes, graph.edges, width, height, options.hero);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";

  const edgeGroup = svgEl("g", { opacity: options.hero ? 0.48 : 0.72 });
  graph.edges.forEach((edge) => {
    edgeGroup.appendChild(svgEl("line", {
      class: "network-edge",
      x1: edge.source.x,
      y1: edge.source.y,
      x2: edge.target.x,
      y2: edge.target.y,
      stroke: edgeColor(edge.score),
      "stroke-width": options.hero ? 0.85 : 1.2 + Math.max(0, edge.score - 5) * 0.18,
      opacity: options.hero ? 0.48 : 0.68,
    }));
  });
  svg.appendChild(edgeGroup);

  const nodeGroup = svgEl("g");
  graph.nodes.forEach((node, index) => {
    const radius = options.hero ? Math.max(4, Math.min(15, node.radius * 0.78)) : node.radius;
    const circle = svgEl("circle", {
      class: "network-node",
      cx: node.x,
      cy: node.y,
      r: radius,
      fill: node.color,
      opacity: options.hero ? 0.88 : 0.96,
    });
    circle.appendChild(svgEl("title", {}, `${node.name} - ${node.degree} links`));
    circle.addEventListener("click", () => selectCharacter(node.id));
    nodeGroup.appendChild(circle);

    if (options.labels && index < 15) {
      const labelOnLeft = node.x > width * 0.7;
      nodeGroup.appendChild(svgEl("text", {
        class: "network-label",
        x: labelOnLeft ? node.x - radius - 5 : node.x + radius + 5,
        y: node.y + 4,
        "text-anchor": labelOnLeft ? "end" : "start",
      }, node.name));
    }
  });
  svg.appendChild(nodeGroup);
}

function buildGraph(limit) {
  const topRows = state.top.slice(0, limit);
  const idSet = new Set(topRows.map((row) => row.ID));
  const nodes = topRows.map((row, index) => {
    const degree = toNumber(row.out_degree);
    return {
      id: row.ID,
      name: row.name,
      degree,
      radius: 5 + Math.sqrt(degree) * 1.2,
      color: allegianceColor(row.allegiance),
      seed: index,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeMap = new Map();

  state.karma.forEach((edge) => {
    if (!idSet.has(edge.source_id) || !idSet.has(edge.target_id)) return;
    const key = [edge.source_id, edge.target_id].sort().join("|");
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        source: nodeById.get(edge.source_id),
        target: nodeById.get(edge.target_id),
        score: toNumber(edge.karma_score),
      });
    }
  });

  if (edgeMap.size < limit) {
    state.characters.forEach((character) => {
      if (!idSet.has(character.ID)) return;
      splitList(character.affiliated).forEach((targetId) => {
        if (!idSet.has(targetId)) return;
        const key = [character.ID, targetId].sort().join("|");
        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            source: nodeById.get(character.ID),
            target: nodeById.get(targetId),
            score: 5,
          });
        }
      });
    });
  }

  return { nodes, edges: [...edgeMap.values()].filter((edge) => edge.source && edge.target).slice(0, limit * 3) };
}

function layoutGraph(nodes, edges, width, height, compact) {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * (compact ? 0.34 : 0.38);

  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2 + hashNumber(node.id) * 0.0001;
    node.x = centerX + Math.cos(angle) * radius * (0.55 + (hashNumber(`${node.id}x`) % 45) / 100);
    node.y = centerY + Math.sin(angle) * radius * (0.55 + (hashNumber(`${node.id}y`) % 45) / 100);
    node.vx = 0;
    node.vy = 0;
  });

  const iterations = compact ? 120 : 210;
  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x || 0.01;
        const dy = a.y - b.y || 0.01;
        const distanceSq = dx * dx + dy * dy;
        const force = (compact ? 720 : 980) / Math.max(80, distanceSq);
        const fx = dx * force;
        const fy = dy * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    edges.forEach((edge) => {
      const dx = edge.target.x - edge.source.x;
      const dy = edge.target.y - edge.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const desired = compact ? 96 : 132;
      const force = (distance - desired) * 0.006;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      edge.source.vx += fx;
      edge.source.vy += fy;
      edge.target.vx -= fx;
      edge.target.vy -= fy;
    });

    nodes.forEach((node) => {
      node.vx += (centerX - node.x) * 0.004;
      node.vy += (centerY - node.y) * 0.004;
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.82;
      node.vy *= 0.82;
      const margin = compact ? 26 : 42;
      node.x = Math.max(margin, Math.min(width - margin, node.x));
      node.y = Math.max(margin, Math.min(height - margin, node.y));
    });
  }
}

function renderKarmaDistribution() {
  const counts = new Map();
  state.karma.forEach((edge) => {
    const score = toNumber(edge.karma_score);
    counts.set(score, (counts.get(score) || 0) + 1);
  });
  const max = Math.max(...counts.values());
  const container = document.getElementById("karma-distribution");

  container.innerHTML = Array.from({ length: 10 }, (_, index) => index + 1).map((score) => {
    const value = counts.get(score) || 0;
    return `
      <div class="score-row">
        <strong>${score}</strong>
        <div class="bar-track" aria-hidden="true">
          <div class="bar-fill" style="width: ${(value / max) * 100}%"></div>
        </div>
        <span class="bar-value">${formatNumber(value)}</span>
      </div>
    `;
  }).join("");
}

function renderKarmaRankings() {
  const rows = [...state.karmaBySource.entries()]
    .map(([id, edges]) => ({
      id,
      name: displayName(id),
      average: average(edges.map((edge) => edge.score)),
      count: edges.length,
    }))
    .filter((row) => row.count >= 40)
    .sort((a, b) => state.karmaMode === "highest" ? b.average - a.average : a.average - b.average)
    .slice(0, 8);

  document.getElementById("karma-rankings").innerHTML = rows.map((row) => `
    <button class="karma-item reset-button" type="button" data-character-id="${escapeHTML(row.id)}">
      <strong>${escapeHTML(row.name)}</strong>
      <span>${row.average.toFixed(2)} average across ${row.count} scored relationships</span>
    </button>
  `).join("");

  document.querySelectorAll("#karma-rankings [data-character-id]").forEach((button) => {
    button.addEventListener("click", () => selectCharacter(button.dataset.characterId));
  });
}

function renderCharacterOptions() {
  const options = state.characters
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((character) => `<option value="${escapeHTML(character.name)}"></option>`)
    .join("");
  document.getElementById("character-options").innerHTML = options;
  document.getElementById("character-search").value = displayName(state.selectedId);
}

function renderCharacterProfile(id) {
  const character = state.characterById.get(id) || state.topById.get(id);
  if (!character) return;

  state.selectedId = id;
  document.getElementById("character-search").value = displayName(id);

  const topRow = state.topById.get(id);
  const outgoingIds = splitList(character.affiliated || topRow?.outgoing_edges);
  const karmaEdges = state.karmaBySource.get(id) || [];
  const quotes = state.quotesByCharacter.get(id) || [];
  const avgKarma = karmaEdges.length ? average(karmaEdges.map((edge) => edge.score)).toFixed(2) : "n/a";
  const allegiance = (character.allegiance || topRow?.allegiance || "Unknown").replaceAll("_", " ") || "Unknown";
  const sampleTargets = karmaEdges
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((edge) => `${displayName(edge.target_id)} (${edge.score})`);

  document.getElementById("character-profile").innerHTML = `
    <h3>${escapeHTML(displayName(id))}</h3>
    <p>${escapeHTML(allegiance)}</p>
    <div class="profile-stat-grid">
      <div class="profile-stat">
        <strong>${topRow ? toNumber(topRow.out_degree) : outgoingIds.length}</strong>
        <span>outgoing links</span>
      </div>
      <div class="profile-stat">
        <strong>${avgKarma}</strong>
        <span>average karma</span>
      </div>
      <div class="profile-stat">
        <strong>${karmaEdges.length}</strong>
        <span>scored ties</span>
      </div>
      <div class="profile-stat">
        <strong>${quotes.length}</strong>
        <span>quote records</span>
      </div>
    </div>
    <div>
      <div class="panel-title">Highest scored ties</div>
      <div class="pill-list">
        ${(sampleTargets.length ? sampleTargets : ["No scored ties in top-100 layer"]).map((item) => `<span class="pill">${escapeHTML(item)}</span>`).join("")}
      </div>
    </div>
    <div class="quote-results">
      ${quotes.slice(0, 3).map((quote) => quoteTemplate(quote)).join("") || "<p class=\"empty-state\">No quote records for this character.</p>"}
    </div>
  `;
}

function selectCharacter(id) {
  renderCharacterProfile(id);
  document.getElementById("character-profile").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function selectFromSearch() {
  const query = document.getElementById("character-search").value.trim().toLowerCase();
  if (!query) return;
  const match = state.characters.find((character) =>
    character.name.toLowerCase() === query ||
    character.ID.toLowerCase() === query ||
    character.name.toLowerCase().includes(query),
  );
  if (match) selectCharacter(match.ID);
}

function renderWordCloud() {
  const stop = new Set([
    "the", "and", "that", "you", "for", "with", "his", "her", "was", "are", "have", "not", "but", "from",
    "this", "your", "him", "she", "had", "will", "they", "their", "would", "there", "what", "when", "were",
    "lord", "lady", "ser", "king", "queen", "prince", "princess", "one", "all", "our", "can", "who", "has",
    "then", "than", "them", "only", "into", "out", "men", "man", "boy", "girl", "like", "more", "some",
    "also", "been", "before", "could", "even", "ever", "every", "good", "here", "know", "long", "made",
    "make", "might", "much", "must", "never", "said", "should", "still", "take", "think", "though", "told",
    "want", "well", "tyrion", "jon", "jaime", "cersei", "robert", "stark", "lannister", "baratheon",
    "targaryen",
  ]);
  const counts = new Map();

  state.quotes.forEach((quote) => {
    const words = quote.quote.toLowerCase().match(/[a-z][a-z']+/g) || [];
    words.forEach((word) => {
      if (word.length < 4 || stop.has(word)) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
  });

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 42);
  const max = ranked[0]?.[1] || 1;
  document.getElementById("word-cloud").innerHTML = ranked.map(([word, count]) => {
    const size = 0.95 + (count / max) * 2.15;
    const color = count > max * 0.66 ? "var(--red)" : count > max * 0.35 ? "var(--teal)" : "var(--charcoal)";
    return `<span style="font-size:${size.toFixed(2)}rem;color:${color}" title="${count} uses">${escapeHTML(word)}</span>`;
  }).join("");
}

function renderQuotes() {
  const query = (document.getElementById("quote-search")?.value || "").trim().toLowerCase();
  const quoteRows = state.quotes
    .filter((quote) => {
      if (!query) return ["power", "oath", "dragon", "wolf", "honor", "blood"].some((term) => quote.quote.toLowerCase().includes(term));
      return `${quote.quote} ${quote.name} ${quote.speaker_id} ${quote.recipient_id}`.toLowerCase().includes(query);
    })
    .slice(0, 7);

  document.getElementById("quote-results").innerHTML = quoteRows.length
    ? quoteRows.map((quote) => quoteTemplate(quote)).join("")
    : "<p class=\"empty-state\">No matching quote records.</p>";
}

function renderDownloads() {
  const downloads = [
    ["Cleaned character network", "characters_enriched_v2.csv", "Characters with allegiance and cleaned affiliation links."],
    ["Karma scored edges", "karma_edges_v2.csv", "Top-character source and target pairs with 1 to 10 scores."],
    ["Top 100 hubs", "top100_outgoing_v2.csv", "The highest outgoing-degree characters after the v2 cleanup."],
    ["Quote corpus", "characters_quotes.csv", "Per-character quotes with speaker and recipient IDs where available."],
    ["Character biographies", "characters_bio.csv", "Biography text used as context for analysis and scoring."],
    ["Network notebook", "network.ipynb", "The notebook that builds and explores the relationship graph."],
  ];

  document.getElementById("download-grid").innerHTML = downloads.map(([title, href, description]) => `
    <article class="download-card">
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      <a href="${escapeHTML(href)}" download>Download ${escapeHTML(fileExtension(href))}</a>
    </article>
  `).join("");
}

function quoteTemplate(quote) {
  const speaker = quote.speaker_id ? displayName(quote.speaker_id) : quote.name;
  const recipient = quote.recipient_id ? ` to ${displayName(quote.recipient_id)}` : "";
  return `
    <article class="quote-item">
      <div class="quote-meta">${escapeHTML(speaker)}${escapeHTML(recipient)}</div>
      <blockquote>${escapeHTML(truncate(quote.quote, 220))}</blockquote>
    </article>
  `;
}

function allegianceColor(allegiance = "") {
  const normalized = allegiance.replaceAll("_", " ");
  const key = Object.keys(houseColors).find((name) => normalized.includes(name));
  return houseColors[key || "Other"];
}

function edgeColor(score) {
  if (score <= 3) return "#b6292d";
  if (score >= 8) return "#3f8d5a";
  if (score >= 6) return "#c99a2e";
  return "rgba(255, 255, 255, 0.38)";
}

function displayName(id) {
  return state.characterById.get(id)?.name || state.topById.get(id)?.name || id.replaceAll("_", " ");
}

function splitList(value = "") {
  return value.split(";").map((item) => item.trim()).filter(Boolean);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isScore(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 10;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function fileExtension(path) {
  return path.split(".").pop().toUpperCase();
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function svgEl(name, attributes = {}, text = "") {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  if (text) element.textContent = text;
  return element;
}

function hashNumber(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function debounce(callback, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}
