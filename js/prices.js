// Renders the California carbon price chart from data/auctions/california.csv.
// One row per quarterly joint auction; we plot the current-vintage
// settlement price over time. D3 v3 (already loaded by index.html).

(function () {
  // top margin needs to fit the focus tooltip (rect at y=-45) above the chart
  var margin = { top: 55, right: 40, bottom: 30, left: 35 };
  var container = document.getElementById("pricediv");
  var width = container.offsetWidth - margin.left - margin.right;
  var height = 278;

  var parseDate = d3.time.format("%Y-%m-%d").parse;
  var bisectDate = d3.bisector(function (d) { return d.date; }).left;
  var formatDate = d3.time.format("%b %Y");
  var formatPrice = function (v) { return "$" + d3.format(",.2f")(v); };

  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .tickFormat(d3.time.format("'%y"))
    .ticks(d3.time.years, 1)
    .orient("bottom");

  var yAxis = d3.svg.axis()
    .scale(y)
    .tickFormat(function (v) { return "$" + v; })
    .orient("left");

  var line = d3.svg.line()
    .x(function (d) { return x(d.date); })
    .y(function (d) { return y(d.price); });

  d3.select("#pricediv").append("div")
    .attr("class", "subtext")
    .style("width", "120px")
    .html("$/Tonne CO<sub>2</sub>e");

  var svg = d3.select("#pricediv").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  d3.csv("data/auctions/california.csv", function (error, raw) {
    if (error) {
      d3.select("#pricediv").append("p")
        .attr("class", "subtext")
        .text("Couldn't load auction data: " + (error.statusText || error));
      return;
    }
    var data = raw
      .map(function (d) {
        return {
          date: parseDate(d.auction_date),
          price: +d.current_settlement_price_usd,
          number: +d.auction_number,
        };
      })
      .filter(function (d) { return d.date && !isNaN(d.price); });

    x.domain(d3.extent(data, function (d) { return d.date; }));
    y.domain([0, d3.max(data, function (d) { return d.price; }) * 1.1]);

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    svg.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line)
      .style("fill", "none")
      .style("stroke", "#B53C36")
      .style("stroke-width", 2);

    svg.selectAll(".dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "dot")
      .attr("cx", function (d) { return x(d.date); })
      .attr("cy", function (d) { return y(d.price); })
      .attr("r", 3)
      .style("fill", "#B53C36");

    var focus = svg.append("g").attr("class", "focus");
    focus.append("line")
      .attr("y1", 0)
      .attr("y2", height)
      .style("stroke", "#666")
      .style("stroke-dasharray", "2,2");
    focus.append("rect")
      .attr("width", 100)
      .attr("height", 38)
      .attr("x", -50)
      .attr("y", -45)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("fill", "#F5FAF9")
      .style("stroke", "#666")
      .style("stroke-width", 1);
    var dateLabel = focus.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -28)
      .attr("font-size", 12);
    var priceLabel = focus.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -12)
      .attr("font-size", 13)
      .style("font-weight", "bold");

    function showPoint(d) {
      focus.attr("transform", "translate(" + x(d.date) + ",0)");
      dateLabel.text(formatDate(d.date) + " (#" + d.number + ")");
      priceLabel.text(formatPrice(d.price));
    }
    showPoint(data[data.length - 1]);

    svg.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .style("fill", "none")
      .style("pointer-events", "all")
      .on("mouseout", function () { showPoint(data[data.length - 1]); })
      .on("mousemove", function () {
        var x0 = x.invert(d3.mouse(this)[0]);
        var i = bisectDate(data, x0, 1);
        var d0 = data[i - 1], d1 = data[i] || d0;
        var d = (x0 - d0.date > d1.date - x0) ? d1 : d0;
        showPoint(d);
      });
  });
})();
