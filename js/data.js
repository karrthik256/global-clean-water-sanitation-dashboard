// data.js — loads, joins, and derives fields from the WHO/UNICEF JMP 2025
// world dataset (wat.csv + san.csv). Shared by every chart in the dashboard.

const WashData = (() => {

  // JMP "service ladder" columns per topic, all at national ("_t") level.
  // basal ("at least basic") already includes sm ("safely managed"), so
  // basic-only = basal - sm when building the stacked ladder.
  const LADDER_COLS = {
    water: { sm: "wat_sm_t", basal: "wat_basal_t", lim: "wat_lim_t", unimp: "wat_unimp_t", ns: "wat_ns_t" },
    sanitation: { sm: "san_sm_t", basal: "san_basal_t", lim: "san_lim_t", unimp: "san_unimp_t", ns: "san_ns_t" },
  };

  async function load() {
    const [wat, san] = await Promise.all([
      d3.csv("data/wat.csv", d3.autoType),
      d3.csv("data/san.csv", d3.autoType),
    ]);

    const sanByKey = new Map(san.map((d) => [`${d.name}__${d.year}`, d]));

    const countries = wat.map((w) => {
      const s = sanByKey.get(`${w.name}__${w.year}`) || {};
      return {
        name: w.name,
        iso3: w.iso3,
        year: w.year,
        pop_t: w.pop_t,
        prop_u: w.prop_u,
        region_sdg: w.region_sdg,
        region_income: w.region_income || null,

        wat_sm_t: w.wat_sm_t,
        wat_basal_t: w.wat_basal_t,
        wat_lim_t: w.wat_lim_t,
        wat_unimp_t: w.wat_unimp_t,
        wat_ns_t: w.wat_ns_t,

        san_sm_t: s.san_sm_t,
        san_basal_t: s.san_basal_t,
        san_lim_t: s.san_lim_t,
        san_unimp_t: s.san_unimp_t,
        san_ns_t: s.san_ns_t,
      };
    });

    return countries;
  }

  // Value accessor for a topic's "safely managed" / "at least basic" indicator,
  // used across charts so every viz reads the same field for a given topic.
  function accessor(topic, level) {
    const col = LADDER_COLS[topic][level];
    return (d) => d[col];
  }

  // Population-weighted global aggregate per year, split into the 5 JMP
  // service-ladder bands. Used by the Q2 multi-line and stacked-area charts.
  function globalYearlyLadder(countries, topic) {
    const cols = LADDER_COLS[topic];
    return Array.from(
      d3.rollup(
        countries.filter((d) => d[cols.sm] != null && d.pop_t != null),
        (rows) => {
          const totalPop = d3.sum(rows, (r) => r.pop_t) || 1;
          const weighted = (key) => d3.sum(rows, (r) => (r[key] || 0) * r.pop_t) / totalPop;
          const sm = weighted(cols.sm);
          const basal = weighted(cols.basal);
          return {
            year: rows[0].year,
            safely_managed: sm,
            basic_only: Math.max(basal - sm, 0),
            limited: weighted(cols.lim),
            unimproved: weighted(cols.unimp),
            no_service: weighted(cols.ns),
            basal_total: basal,
          };
        },
        (d) => d.year
      ).values()
    ).sort((a, b) => a.year - b.year);
  }

  return { load, accessor, globalYearlyLadder, LADDER_COLS };
})();
