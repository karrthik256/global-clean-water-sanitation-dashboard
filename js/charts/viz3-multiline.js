// Author: Laxman Pillai A/L Ramesh Pillai (1221102008)
// viz3-multiline.js — Q2: "How has global access progressed 2000-2024, and
// is the world on track for the 2030 target?"
//
// Always plots both Water and Sanitation (global, population-weighted
// "safely managed" %) with a dashed linear projection to 2030 and a target
// reference line at 100%. This is the dashboard's required animation: the
// Play button drives the shared AppState.year forward, which also animates
// the Viz 1 map and Viz 2 ranking in lockstep (linked interaction).
//
// Interactive elements (per proposal Table 5): play/pause animation, hover
// tooltips per year, projection to 2030, topic toggle (highlights the
// active topic's line).

const Viz3Multiline = (() => {
  const margin = { top: 20, right: 24, bottom: 42, left: 52 };
  const COLORS = { water: "#4f8fe8", sanitation: "#34d399" };

  let svg, gInner, x, y, lineGen;
  let innerWidth, innerHeight;
  let series = {};
  let playTimer = null;
  let playing = false;

  function render(containerSelector, countries) {
    const container = d3.select(containerSelector);
    const width = container.node().clientWidth || 600;
    innerWidth = width - margin.left - margin.right;
    innerHeight = 300;

    series.water = buildSeries(countries, "water");
    series.sanitation = buildSeries(countries, "sanitation");

    const controls = container.append("div").attr("class", "viz3-controls");
    controls.append("button").attr("class", "play-btn").text("▶ Play").on("click", togglePlay);
    controls.append("span").attr("class", "viz3-year-readout");

    svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${innerHeight + margin.top + margin.bottom}`)
      .attr("class", "viz3-svg");

    x = d3.scaleLinear().domain([2000, 2030]).range([0, innerWidth]);
    y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

    gInner = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    gInner.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickValues([2000, 2005, 2010, 2015, 2020, 2024, 2030]).tickFormat(d3.format("d")));

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
      .text("Safely managed access (%)");

    gInner.append("line")
      .attr("class", "target-line")
      .attr("x1", 0).attr("x2", innerWidth)
      .attr("y1", y(100)).attr("y2", y(100));
    gInner.append("text")
      .attr("class", "target-label")
      .attr("x", innerWidth).attr("y", y(100) - 6)
      .attr("text-anchor", "end")
      .text("Target: 100% by 2030");

    lineGen = d3.line().x((d) => x(d.year)).y((d) => y(d.value)).defined((d) => d.value != null);

    ["water", "sanitation"].forEach((topic) => {
      const actual = series[topic].filter((d) => !d.projected);
      const lastActual = actual[actual.length - 1];
      const proj = series[topic].filter((d) => d.projected);
      gInner.append("path")
        .datum(actual)
        .attr("class", `line line--${topic}`)
        .attr("d", lineGen)
        .attr("stroke", COLORS[topic]);
      gInner.append("path")
        .datum([lastActual, ...proj])
        .attr("class", `line line--${topic} line--projected`)
        .attr("d", lineGen)
        .attr("stroke", COLORS[topic]);
    });

    const focus = gInner.append("g").attr("class", "focus").style("display", "none");
    focus.append("line").attr("class", "hover-rule").attr("y1", 0).attr("y2", innerHeight);
    ["water", "sanitation"].forEach((topic) => {
      focus.append("circle").attr("class", `hover-dot hover-dot--${topic}`).attr("r", 4).attr("fill", COLORS[topic]);
    });

    gInner.append("line").attr("class", "year-marker").attr("y1", 0).attr("y2", innerHeight);

    svg.append("rect")
      .attr("class", "overlay")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mousemove", (event) => onHover(event, focus))
      .on("mouseleave", () => {
        focus.style("display", "none");
        ChartUtil.hideTooltip();
      });

    buildLegend(container);

    updateTopicEmphasis(AppState.get().topic);
    updateYearMarker(AppState.get().year);
    AppState.subscribe((state) => {
      updateTopicEmphasis(state.topic);
      updateYearMarker(state.year);
    });
  }

  function onHover(event, focus) {
    const [mx] = d3.pointer(event);
    const yearHover = Math.min(2030, Math.max(2000, Math.round(x.invert(mx))));
    const wVal = valueAt(series.water, yearHover);
    const sVal = valueAt(series.sanitation, yearHover);

    focus.style("display", null);
    focus.select(".hover-rule").attr("x1", x(yearHover)).attr("x2", x(yearHover));
    focus.select(".hover-dot--water").attr("cx", x(yearHover)).attr("cy", y(wVal ?? 0)).style("opacity", wVal == null ? 0 : 1);
    focus.select(".hover-dot--sanitation").attr("cx", x(yearHover)).attr("cy", y(sVal ?? 0)).style("opacity", sVal == null ? 0 : 1);

    const tag = yearHover > 2024 ? " (projected)" : "";
    ChartUtil.showTooltip(
      `<strong>${yearHover}${tag}</strong><br/>Water: ${wVal != null ? ChartUtil.pct(wVal) + "%" : "—"}<br/>Sanitation: ${sVal != null ? ChartUtil.pct(sVal) + "%" : "—"}`,
      event
    );
  }

  function valueAt(arr, year) {
    const d = arr.find((d) => d.year === year);
    return d ? d.value : null;
  }

  function buildSeries(countries, topic) {
    const ladder = WashData.globalYearlyLadder(countries, topic);
    const actual = ladder.map((d) => ({ year: d.year, value: d.safely_managed, projected: false }));
    return [...actual, ...projectForward(actual, 2030)];
  }

  function projectForward(actual, targetYear) {
    const recent = actual.slice(-10);
    const { slope, intercept } = leastSquares(recent.map((d) => d.year), recent.map((d) => d.value));
    const lastYear = actual[actual.length - 1].year;
    const out = [];
    for (let yr = lastYear + 1; yr <= targetYear; yr++) {
      out.push({ year: yr, value: Math.min(100, intercept + slope * yr), projected: true });
    }
    return out;
  }

  function leastSquares(xs, ys) {
    const n = xs.length;
    const sumX = d3.sum(xs);
    const sumY = d3.sum(ys);
    const sumXY = d3.sum(xs.map((xv, i) => xv * ys[i]));
    const sumXX = d3.sum(xs.map((xv) => xv * xv));
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  function updateTopicEmphasis(topic) {
    gInner.selectAll(".line--water").classed("line--active", topic === "water");
    gInner.selectAll(".line--sanitation").classed("line--active", topic === "sanitation");
  }

  function updateYearMarker(year) {
    gInner.select(".year-marker").attr("x1", x(year)).attr("x2", x(year));
    d3.select(".viz3-year-readout").text(`Year: ${year}`);
  }

  function togglePlay() {
    playing = !playing;
    d3.select(".play-btn").text(playing ? "⏸ Pause" : "▶ Play");
    if (playing) {
      let yr = AppState.get().year;
      if (yr >= 2024) yr = 2000;
      playTimer = setInterval(() => {
        yr += 1;
        AppState.set({ year: yr });
        if (yr >= 2024) {
          clearInterval(playTimer);
          playing = false;
          d3.select(".play-btn").text("▶ Play");
        }
      }, 450);
    } else {
      clearInterval(playTimer);
    }
  }

  function buildLegend(container) {
    const items = [
      { label: "Water", color: COLORS.water, dashed: false },
      { label: "Sanitation", color: COLORS.sanitation, dashed: false },
      { label: "Projection", color: "#9aa1b1", dashed: true },
      { label: "2030 target", color: "#e8626f", dashed: true },
    ];
    const legend = container.append("div").attr("class", "viz3-legend");
    items.forEach((it) => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("span")
        .attr("class", `legend-swatch legend-swatch--line${it.dashed ? " legend-swatch--dashed" : ""}`)
        .style("background", it.dashed ? "none" : it.color)
        .style("border-color", it.color);
      item.append("span").attr("class", "legend-label").text(it.label);
    });
  }

  return { render };
})();
