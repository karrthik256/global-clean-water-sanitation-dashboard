// Author: Karrthik A/L Nadarajan (1211111427)
// viz5-scatter.js — Q3: "How does income level relate to water/sanitation
// coverage, and do wealthier nations consistently outperform poorer ones?"
//
// Each dot is a country: safely-managed water (x) vs safely-managed
// sanitation (y) for the selected year, sized by population, coloured by
// income group. If wealthier nations consistently outperform, high-income
// dots cluster top-right while low-income dots spread toward bottom-left.
//
// Interactive elements (per proposal Table 5): hover tooltips per country
// (name, water %, sanitation %, income group), topic toggle (emphasizes
// the axis matching the active global topic, since both metrics are always
// plotted together here).

const Viz5Scatter = (() => {
  const margin = { top: 20, right: 20, bottom: 36, left: 46 };
  const INCOME_ORDER = ["Low income", "Lower middle income", "Upper middle income", "High income"];
  const INCOME_COLOR = d3.scaleOrdinal().domain(INCOME_ORDER).range(["#e8626f", "#f0b429", "#63b3ed", "#2b6cb0"]);

  let svg, gInner, x, y, r;
  let innerWidth, innerHeight;
  let countriesRef = [];

  function render(containerSelector, countries) {
    countriesRef = countries;
    const container = d3.select(containerSelector);
    const width = container.node().clientWidth || 600;
    innerWidth = width - margin.left - margin.right;
    innerHeight = 320;

    x = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);
    r = d3.scaleSqrt().domain([0, d3.max(countries, (d) => d.pop_t) || 1]).range([3, 26]);

    svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${innerHeight + margin.top + margin.bottom}`)
      .attr("class", "viz5-svg");

    gInner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    gInner.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`));
    gInner.append("g").attr("class", "axis axis--y").call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`));

    gInner.append("text")
      .attr("class", "axis-label axis-label--x")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 30)
      .attr("text-anchor", "middle")
      .text("Safely managed water access (%)");
    gInner.append("text")
      .attr("class", "axis-label axis-label--y")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -32)
      .attr("text-anchor", "middle")
      .text("Safely managed sanitation access (%)");

    // y = x reference line: equal water/sanitation access
    gInner.append("line")
      .attr("class", "parity-line")
      .attr("x1", x(0)).attr("y1", y(0))
      .attr("x2", x(100)).attr("y2", y(100));

    gInner.append("g").attr("class", "dots");

    buildLegend(container);

    update(AppState.get());
    AppState.subscribe(update);
  }

  function update(state) {
    const rows = countriesRef.filter(
      (d) => d.year === state.year && d.wat_sm_t != null && d.san_sm_t != null && d.region_income
    );

    const dots = gInner.select(".dots").selectAll("circle.dot").data(rows, (d) => d.iso3 || d.name);

    dots.exit().transition().duration(200).attr("r", 0).remove();

    dots
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", (d) => x(d.wat_sm_t))
      .attr("cy", (d) => y(d.san_sm_t))
      .attr("r", 0)
      .attr("fill", (d) => INCOME_COLOR(d.region_income))
      .on("mousemove", (event, d) => {
        ChartUtil.showTooltip(
          `<strong>${d.name}</strong><br/>Water: ${ChartUtil.pct(d.wat_sm_t)}%<br/>Sanitation: ${ChartUtil.pct(d.san_sm_t)}%<br/>Income: ${d.region_income}`,
          event
        );
      })
      .on("mouseleave", () => ChartUtil.hideTooltip())
      .merge(dots)
      .transition()
      .duration(300)
      .attr("cx", (d) => x(d.wat_sm_t))
      .attr("cy", (d) => y(d.san_sm_t))
      .attr("r", (d) => r(d.pop_t))
      .attr("fill", (d) => INCOME_COLOR(d.region_income));

    gInner.select(".axis-label--x").classed("axis-label--active", state.topic === "water");
    gInner.select(".axis-label--y").classed("axis-label--active", state.topic === "sanitation");
  }

  function buildLegend(container) {
    const legend = container.append("div").attr("class", "viz5-legend");
    INCOME_ORDER.forEach((label) => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span").attr("class", "legend-swatch legend-swatch--dot").style("background", INCOME_COLOR(label));
      item.append("span").attr("class", "legend-label").text(label);
    });
    const note = legend.append("div").attr("class", "legend-note");
    note.text("Bubble size = population");
  }

  return { render };
})();
