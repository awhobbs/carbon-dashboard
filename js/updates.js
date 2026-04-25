// Renders the right-column "Auction Updates" panel from data/auctions/california.csv:
//   - Next scheduled auction (computed from the latest auction's quarter +1)
//   - Last 4 auctions with settlement price and quarter-over-quarter change
//
// Reads the same CSV that the price chart uses, so it's automatically in sync
// with the daily refresh-data.yml workflow.

(function () {
  // CARB joint auctions run on a fixed quarterly cadence: Feb / May / Aug / Nov.
  // Given any auction month, the next one is +3 months.
  var QUARTERS = [2, 5, 8, 11];
  var MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function nextAuctionFrom(year, month) {
    var idx = QUARTERS.indexOf(month);
    if (idx === -1) return null;
    if (idx === QUARTERS.length - 1) {
      return { year: year + 1, month: QUARTERS[0] };
    }
    return { year: year, month: QUARTERS[idx + 1] };
  }

  function fmtPrice(v) {
    return "$" + v.toFixed(2);
  }

  function fmtChange(curr, prev) {
    if (prev == null || prev === 0) return "";
    var pct = (curr - prev) / prev * 100;
    var sign = pct >= 0 ? "▲" : "▼";
    var cls  = pct >= 0 ? "up" : "down";
    return '<span class="chg ' + cls + '">' + sign + ' ' + Math.abs(pct).toFixed(1) + '%</span>';
  }

  d3.csv("data/auctions/california.csv", function (error, rows) {
    if (error || !rows || !rows.length) return;

    rows = rows
      .map(function (r) {
        var d = r.auction_date.split("-");
        return {
          number: +r.auction_number,
          year: +d[0],
          month: +d[1],
          price: +r.current_settlement_price_usd,
        };
      })
      .filter(function (r) { return !isNaN(r.price); })
      .sort(function (a, b) { return a.number - b.number; });

    var latest = rows[rows.length - 1];

    // ---- Next auction block ----
    var next = nextAuctionFrom(latest.year, latest.month);
    var nextEl = document.getElementById("next-auction");
    if (next && nextEl) {
      nextEl.innerHTML =
        '<h2 class="updates-heading">Next auction</h2>' +
        '<div class="next-auction-row">' +
          '<span class="next-auction-month">' + MONTH_NAMES[next.month - 1] + ' ' + next.year + '</span>' +
          '<span class="next-auction-num">#' + (latest.number + 1) + '</span>' +
        '</div>' +
        '<a class="updates-more" href="https://ww2.arb.ca.gov/our-work/programs/cap-and-trade-program/auction-information">Auction notice & details →</a>';
    }

    // ---- Recent auctions block ----
    var recent = rows.slice(-4).reverse();
    var html =
      '<h2 class="updates-heading">Recent results</h2>' +
      '<table class="recent-auctions"><tbody>';
    recent.forEach(function (r, i) {
      var prevPrice = i + 1 < recent.length ? recent[i + 1].price : null;
      html +=
        '<tr>' +
          '<td class="ra-date">' + MONTH_NAMES[r.month - 1] + " " + r.year + '</td>' +
          '<td class="ra-num">#' + r.number + '</td>' +
          '<td class="ra-price">' + fmtPrice(r.price) + '</td>' +
          '<td class="ra-chg">' + fmtChange(r.price, prevPrice) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    html += '<a class="updates-more" href="data/auctions/california.csv">All auctions (CSV) →</a>';
    var recentEl = document.getElementById("recent-auctions");
    if (recentEl) recentEl.innerHTML = html;
  });
})();
