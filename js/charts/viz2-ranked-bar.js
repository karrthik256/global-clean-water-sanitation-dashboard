// Author: Sivananthan A/L Seliyan (1221102320)
// viz2-ranked-bar.js — Q1: "Which countries are the most critically
// underserved?" Ranks the 10 lowest and 10 highest countries by the same
// "safely managed" metric shown on the Viz 1 map.
//
// Interactive elements (per proposal Table 5): hover tooltips, topic
// toggle, linked to the region filter (ranking recomputed within the
// selected region when one is chosen).

const Viz2RankedBar = (() => {
  const margin = { top: 10, right: 50, bottom: 40, left: 230 };
  let svg, gBars, x, y;
  let width, innerWidth, innerHeight;
  let countries = [];

  function metricFor(topic) {
    return topic === "water" ? "wat_sm_t" : "san_sm_t";
  }

  function render(containerSelector, data) {
    countries = data;
    const container = d3.select(containerSelector);
    width = container.node().clientWidth || 600;
    innerWidth = width - margin.left - margin.right;
    innerHeight = 20 * 20; // 20 bars (top10 + bottom10) at 20px each

    svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${innerHeight + margin.top + margin.bottom}`)
      .attr("class", "viz2-svg");

    x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    y = d3.scaleBand().range([0, innerHeight]).padding(0.2);

    const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    root.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`));

    root.append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 34)
      .attr("text-anchor", "middle")
      .text("Safely managed access (%)");

    gBars = root.append("g").attr("class", "bars");

    buildLegend(container);

    update(AppState.get());
    AppState.subscribe(update);
  }

  function buildLegend(container) {
    const legend = container.append("div").attr("class", "viz2-legend");
    [
      { label: "Top 10 (best access)", cls: "rank-bar--best" },
      { label: "Bottom 10 (most underserved)", cls: "rank-bar--worst" },
    ].forEach((it) => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span").attr("class", `legend-swatch ${it.cls}`);
      item.append("span").attr("class", "legend-label").text(it.label);
    });
  }

  function ranked(state) {
    const metric = metricFor(state.topic);
    const pool = countries.filter(
      (d) =>
        d.year === state.year &&
        d[metric] != null &&
        (state.region === "All" || d.region_sdg === state.region)
    );
    const sorted = [...pool].sort((a, b) => d3.descending(a[metric], b[metric]));
    // Cap each half so a small region (e.g. only 1-15 countries with data)
    // can't produce overlapping/duplicate top & bottom groups.
    const half = Math.min(10, Math.floor(sorted.length / 2));
    const top = sorted.slice(0, half);
    const bottom = sorted.slice(sorted.length - half).reverse();
    top.forEach((d) => (d._group = "best"));
    bottom.forEach((d) => (d._group = "worst"));
    return [...top, ...bottom];
  }

  function update(state) {
    const metric = metricFor(state.topic);
    const rows = ranked(state);
    y.domain(rows.map((d, i) => i));

    const bars = gBars.selectAll("g.bar-row").data(rows, (d, i) => `${d.name}-${i}`);

    const enter = bars.enter().append("g").attr("class", "bar-row");
    enter.append("rect");
    enter.append("text").attr("class", "bar-label");
    enter.append("text").attr("class", "bar-value");

    const merged = enter.merge(bars);
    merged.attr("transform", (d, i) => `translate(0,${y(i)})`);

    merged
      .select("rect")
      .attr("x", 0)
      .attr("height", y.bandwidth())
      .attr("class", (d) => `rank-bar ${d._group === "best" ? "rank-bar--best" : "rank-bar--worst"}`)
      .attr("width", (d) => x(d[metric] ?? 0))
      .on("mousemove", (event, d) => {
        const label = state.topic === "water" ? "Safely managed water" : "Safely managed sanitation";
        ChartUtil.showTooltip(
          `<strong>${d.name}</strong><br/>${label}: ${ChartUtil.pct(d[metric])}%<br/>Region: ${d.region_sdg}`,
          event
        );
      })
      .on("mouseleave", () => ChartUtil.hideTooltip());

    merged
      .select("text.bar-label")
      .attr("x", -8)
      .attr("y", y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "end")
      .text((d) => d.name);

    merged
      .select("text.bar-value")
      .attr("x", (d) => x(d[metric] ?? 0) + 6)
      .attr("y", y.bandwidth() / 2)
      .attr("dy", "0.35em")
      .text((d) => `${ChartUtil.pct(d[metric])}%`);

    bars.exit().remove();
  }

  return { render };
})();
