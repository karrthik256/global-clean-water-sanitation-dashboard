// Author: Laxman Pillai A/L Ramesh Pillai (1221102008)
// viz4-stacked-area.js — Q2: shows how the global population is distributed
// across the JMP water/sanitation service ladder (safely managed -> no
// service) from 2000-2024, and how that composition shifts over time.
//
// Interactive elements (per proposal Table 5): hover tooltips per year and
// service level, topic toggle, region filter.

const Viz4StackedArea = (() => {
  const margin = { top: 20, right: 20, bottom: 42, left: 52 };
  const BANDS = [
    { key: "safely_managed", label: "Safely managed", color: "#2b6cb0" },
    { key: "basic_only", label: "Basic", color: "#63b3ed" },
    { key: "limited", label: "Limited", color: "#f6c453" },
    { key: "unimproved", label: "Unimproved", color: "#ed8936" },
    { key: "no_service", label: "No service", color: "#e53e3e" },
  ];

  let svg, gInner, x, y, areaGen, stackGen;
  let innerWidth, innerHeight;
  let countriesRef = [];
  let currentLadder = [];

  function render(containerSelector, countries) {
    countriesRef = countries;
    const container = d3.select(containerSelector);
    const width = container.node().clientWidth || 600;
    innerWidth = width - margin.left - margin.right;
    innerHeight = 260;

    x = d3.scaleLinear().domain([2000, 2024]).range([0, innerWidth]);
    y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
    stackGen = d3.stack().keys(BANDS.map((b) => b.key));
    areaGen = d3.area()
      .x((d) => x(d.data.year))
      .y0((d) => y(d[0]))
      .y1((d) => y(d[1]));

    svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${innerHeight + margin.top + margin.bottom}`)
      .attr("class", "viz4-svg");

    gInner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    gInner.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8));

    gInner.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`));

    gInner.append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 36)
      .attr("text-anchor", "middle")
      .text("Year");

    gInner.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -38)
      .attr("text-anchor", "middle")
      .text("Share of population (%)");

    gInner.append("g").attr("class", "layers");

    const hoverRule = gInner.append("line").attr("class", "hover-rule").attr("y1", 0).attr("y2", innerHeight).style("display", "none");

    svg.append("rect")
      .attr("class", "overlay")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", (event) => onHover(event, hoverRule))
      .on("mouseleave", () => {
        hoverRule.style("display", "none");
        ChartUtil.hideTooltip();
      });

    buildLegend(container);

    update(AppState.get());
    AppState.subscribe(update);
  }

  function onHover(event, hoverRule) {
    const [mx] = d3.pointer(event);
    const yearHover = Math.min(2024, Math.max(2000, Math.round(x.invert(mx))));
    const row = currentLadder.find((d) => d.year === yearHover);
    if (!row) return;
    hoverRule.style("display", null).attr("x1", x(yearHover)).attr("x2", x(yearHover));
    const rows = BANDS.map((b) => `${b.label}: ${ChartUtil.pct(row[b.key])}%`).join("<br/>");
    ChartUtil.showTooltip(`<strong>${yearHover}</strong><br/>${rows}`, event);
  }

  function update(state) {
    const filtered = state.region === "All" ? countriesRef : countriesRef.filter((d) => d.region_sdg === state.region);
    currentLadder = WashData.globalYearlyLadder(filtered, state.topic);
    const stacked = stackGen(currentLadder);

    const layers = gInner.select(".layers").selectAll("path.layer").data(stacked, (d) => d.key);

    layers
      .enter()
      .append("path")
      .attr("class", "layer")
      .attr("fill", (d, i) => BANDS[i].color)
      .merge(layers)
      .transition()
      .duration(300)
      .attr("d", areaGen);

    layers.exit().remove();
  }

  function buildLegend(container) {
    const legend = container.append("div").attr("class", "viz4-legend");
    BANDS.forEach((b) => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span").attr("class", "legend-swatch").style("background", b.color);
      item.append("span").attr("class", "legend-label").text(b.label);
    });
  }

  return { render };
})();
