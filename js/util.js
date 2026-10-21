// util.js — small shared helpers used by multiple chart files (hover
// tooltip, number formatting). Kept separate from data.js/state.js so each
// concern lives in its own file.

const ChartUtil = (() => {
  let tooltipEl = null;

  function tooltip() {
    if (!tooltipEl) {
      tooltipEl = d3.select("body")
        .append("div")
        .attr("class", "viz-tooltip")
        .style("opacity", 0);
    }
    return tooltipEl;
  }

  function showTooltip(html, event) {
    tooltip()
      .html(html)
      .style("left", `${event.pageX + 14}px`)
      .style("top", `${event.pageY - 12}px`)
      .style("opacity", 1);
  }

  function moveTooltip(event) {
    tooltip()
      .style("left", `${event.pageX + 14}px`)
      .style("top", `${event.pageY - 12}px`);
  }

  function hideTooltip() {
    tooltip().style("opacity", 0);
  }

  const pct = d3.format(".1f");

  return { showTooltip, moveTooltip, hideTooltip, pct };
})();
