// main.js — orchestration: loads the dataset, wires the shared control bar
// (topic toggle / year slider / region filter) to AppState, and mounts each
// chart into its container. Extended as more charts come online.

(async function init() {
  const countries = await WashData.load();

  setupControls(countries);

  await Viz1Choropleth.render("#viz1", countries);
  Viz2RankedBar.render("#viz2", countries);
  Viz3Multiline.render("#viz3", countries);
  Viz4StackedArea.render("#viz4", countries);
  Viz5Scatter.render("#viz5", countries);
  Viz6GroupedBar.render("#viz6", countries);
})();

function setupControls(countries) {
  const state = AppState.get();

  // Topic toggle
  d3.selectAll(".topic-btn").on("click", function () {
    const topic = d3.select(this).attr("data-topic");
    d3.selectAll(".topic-btn").classed("active", false);
    d3.select(this).classed("active", true);
    AppState.set({ topic });
  });

  // Year slider
  const yearInput = d3.select("#year-slider");
  const yearLabel = d3.select("#year-label");
  yearInput.property("value", state.year);
  yearLabel.text(state.year);
  yearInput.on("input", function () {
    const year = +this.value;
    yearLabel.text(year);
    AppState.set({ year });
  });

  // Region filter
  const regions = Array.from(new Set(countries.map((d) => d.region_sdg))).sort();
  const regionSelect = d3.select("#region-select");
  regionSelect
    .selectAll("option")
    .data(["All", ...regions])
    .join("option")
    .attr("value", (d) => d)
    .text((d) => d);
  regionSelect.on("change", function () {
    AppState.set({ region: this.value });
  });
}
