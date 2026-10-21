// Author: Karrthik A/L Nadarajan (1211111427)
// viz6-grouped-bar.js — Q3: compares average safely-managed water vs
// sanitation coverage across income groups, making the wealth-coverage
// link explicit and showing whether the two services move together within
// each income tier.
//
// Interactive elements (per proposal Table 5): hover tooltips comparing
// water vs sanitation, topic toggle (emphasizes the matching bar series),
// region filter (recomputes averages within the selected region).

const Viz6GroupedBar = (() => {
  const margin = { top: 20, right: 20, bottom: 48, left: 52 };
  const INCOME_ORDER = ["Low income", "Lower middle income", "Upper middle income", "High income"];
  const COLORS = { water: "#4f8fe8", sanitation: "#34d399" };

  let svg, gInner, x0, x1, y;
  let innerWidth, innerHeight;
  let countriesRef = [];

  function render(containerSelector, countries) {
    countriesRef = countries;
    const container = d3.select(containerSelector);
    const width = container.node().clientWidth || 600;
    innerWidth = width - margin.left - margin.right;
    innerHeight = 300;

    x0 = d3.scaleBand().domain(INCOME_ORDER).range([0, innerWidth]).padding(0.3);
    x1 = d3.scaleBand().domain(["water", "sanitation"]).range([0, x0.bandwidth()]).padding(0.15);
    y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${innerHeight + margin.top + margin.bottom}`)
      .attr("class", "viz6-svg");

    gInner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    gInner.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0).tickFormat((d) => d.replace(" income", "")));
    gInner.append("g").attr("class", "axis axis--y").call(d3.axisLeft(y).ticks(5).tickFormat((d) => `${d}%`));

    gInner.append("text")
      .attr("class", "axis-label")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 42)
      .attr("text-anchor", "middle")
      .text("Income group");

    gInner.append("text")
      .attr("class", "axis-label")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight / 2)
      .attr("y", -38)
      .attr("text-anchor", "middle")
      .text("Safely managed access (%)");

    gInner.append("g").attr("class", "groups");

    buildLegend(container);

    update(AppState.get());
    AppState.subscribe(update);
  }

  function weightedAvg(rows, key) {
    const valid = rows.filter((d) => d[key] != null);
    const totalPop = d3.sum(valid, (d) => d.pop_t) || 0;
    if (totalPop === 0) return null;
    return d3.sum(valid, (d) => d[key] * d.pop_t) / totalPop;
  }

  function update(state) {
    const filtered = countriesRef.filter(
      (d) => d.year === state.year && d.region_income && (state.region === "All" || d.region_sdg === state.region)
    );

    const byIncome = INCOME_ORDER.map((income) => {
      const rows = filtered.filter((d) => d.region_income === income);
      return {
        income,
        water: weightedAvg(rows, "wat_sm_t"),
        sanitation: weightedAvg(rows, "san_sm_t"),
      };
    });

    const groups = gInner.select(".groups").selectAll("g.income-group").data(byIncome, (d) => d.income);

    const groupsEnter = groups.enter().append("g").attr("class", "income-group");
    groupsEnter
      .merge(groups)
      .attr("transform", (d) => `translate(${x0(d.income)},0)`)
      .on("mousemove", (event, d) => {
        ChartUtil.showTooltip(
          `<strong>${d.income}</strong><br/>Water: ${d.water != null ? ChartUtil.pct(d.water) + "%" : "—"}<br/>Sanitation: ${d.sanitation != null ? ChartUtil.pct(d.sanitation) + "%" : "—"}`,
          event
        );
      })
      .on("mouseleave", () => ChartUtil.hideTooltip());

    ["water", "sanitation"].forEach((topic) => {
      const bars = groupsEnter.merge(groups).selectAll(`rect.bar--${topic}`).data((d) => [d]);
      bars
        .enter()
        .append("rect")
        .attr("class", `bar bar--${topic}`)
        .attr("x", x1(topic))
        .attr("width", x1.bandwidth())
        .attr("y", innerHeight)
        .attr("height", 0)
        .attr("fill", COLORS[topic])
        .merge(bars)
        .classed("bar--active", state.topic === topic)
        .transition()
        .duration(300)
        .attr("x", x1(topic))
        .attr("width", x1.bandwidth())
        .attr("y", (d) => (d[topic] != null ? y(d[topic]) : innerHeight))
        .attr("height", (d) => (d[topic] != null ? innerHeight - y(d[topic]) : 0));
    });

    groups.exit().remove();
  }

  function buildLegend(container) {
    const legend = container.append("div").attr("class", "viz6-legend");
    [
      { label: "Water", color: COLORS.water },
      { label: "Sanitation", color: COLORS.sanitation },
    ].forEach((it) => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span").attr("class", "legend-swatch").style("background", it.color);
      item.append("span").attr("class", "legend-label").text(it.label);
    });
  }

  return { render };
})();
