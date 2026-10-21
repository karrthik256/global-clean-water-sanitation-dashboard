// Author: Sivananthan A/L Seliyan (1221102320)
// viz1-choropleth.js — Q1: "Which regions/countries are the most critically
// underserved, geographically?"
//
// Interactive elements (per proposal Table 5): zoom/pan, year slider,
// hover tooltip per country, topic toggle. Metric shown is the "safely
// managed" indicator for the active topic, matching the proposal mockup.

const Viz1Choropleth = (() => {
  let svg, g, path, colorScale;
  let byIso3Year = new Map();
  let topoIdToIso3 = {};
  let width, height;

  function metricFor(topic) {
    return topic === "water" ? "wat_sm_t" : "san_sm_t";
  }

  async function render(containerSelector, countries) {
    const container = d3.select(containerSelector);
    width = container.node().clientWidth || 800;
    height = Math.max(320, width * 0.52);

    byIso3Year = new Map(countries.map((d) => [`${d.iso3}__${d.year}`, d]));

    const [topology, idMap] = await Promise.all([
      d3.json("lib/world-110m.json"),
      d3.json("lib/topo-id-to-iso3.json"),
    ]);
    topoIdToIso3 = idMap;

    const geo = topojson.feature(topology, topology.objects.countries);
    const projection = d3.geoNaturalEarth1().fitSize([width, height], geo);
    path = d3.geoPath(projection);

    colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]);

    svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("class", "viz1-svg");

    g = svg.append("g");

    g.selectAll("path")
      .data(geo.features)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("data-iso3", (d) => topoIdToIso3[d.id] || "")
      .on("mousemove", handleHover)
      .on("mouseleave", () => ChartUtil.hideTooltip());

    svg.call(
      d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    buildLegend(container);
    update(AppState.get());
    AppState.subscribe(update);
  }

  function handleHover(event, d) {
    const iso3 = topoIdToIso3[d.id];
    const { topic, year } = AppState.get();
    const row = byIso3Year.get(`${iso3}__${year}`);
    const value = row ? row[metricFor(topic)] : null;
    const name = row ? row.name : d.properties && d.properties.name;
    const label = topic === "water" ? "Safely managed water" : "Safely managed sanitation";
    const html = value == null
      ? `<strong>${name || "No data"}</strong><br/>No data for ${year}`
      : `<strong>${name}</strong><br/>${label}: ${ChartUtil.pct(value)}%<br/>Year: ${year}`;
    ChartUtil.showTooltip(html, event);
  }

  function buildLegend(container) {
    const stops = [0, 20, 40, 60, 80, 100];
    const legend = container.append("div").attr("class", "viz1-legend");
    stops.forEach((v, i) => {
      if (i === stops.length - 1) return;
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span")
        .attr("class", "legend-swatch")
        .style("background", colorScale(v + 10));
      item.append("span").attr("class", "legend-label").text(`${v}-${stops[i + 1]}%`);
    });

    const noData = legend.append("div").attr("class", "legend-item");
    noData.append("span").attr("class", "legend-swatch legend-swatch--nodata");
    noData.append("span").attr("class", "legend-label").text("No data reported");
  }

  function update(state) {
    const metric = metricFor(state.topic);
    g.selectAll("path.country")
      .transition()
      .duration(300)
      .attr("fill", (d) => {
        const iso3 = topoIdToIso3[d.id];
        const row = byIso3Year.get(`${iso3}__${state.year}`);
        const value = row ? row[metric] : null;
        return value == null ? "#3a3f4b" : colorScale(value);
      });
  }

  return { render };
})();
