"""Fetch California-Quebec joint cap-and-trade auction settlement results.

Source: CARB master Summary of Auction Settlement Prices and Results PDF.
URL:    https://ww2.arb.ca.gov/sites/default/files/2020-08/results_summary.pdf

The PDF is a six-column table covering joint auctions from #16 (August 2018)
forward. Earlier auctions (CA-only, May 2018 and prior) are not in this PDF
and need to be backfilled from a separate source.

Output: data/auctions/california.csv with one row per auction, columns:
    auction_number, auction_date, current_offered, current_sold,
    current_settlement_price_usd, advance_offered, advance_sold,
    advance_settlement_price_usd

Run from the repo root:
    python3 data/fetchers/california_auctions.py
"""
from __future__ import annotations

import csv
import datetime as dt
import io
import re
import sys
import urllib.request
from pathlib import Path

import pdfplumber

PDF_URL = "https://ww2.arb.ca.gov/sites/default/files/2020-08/results_summary.pdf"

REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_CSV = REPO_ROOT / "data" / "auctions" / "california.csv"

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}

AUCTION_NAME_RE = re.compile(
    r"^(?P<month>[A-Za-z]+)\s+(?P<year>\d{4})\s+Joint Auction\s+#(?P<num>\d+)$"
)


def fetch_pdf(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=30) as resp:
        return resp.read()


_NUM_CLEAN = str.maketrans("", "", " $, \t\n\r")


def parse_money(s: str) -> float | None:
    s = s.translate(_NUM_CLEAN)
    if not s or s in {"-", "—", "N/A"}:
        return None
    return float(s)


def parse_int(s: str) -> int | None:
    s = s.translate(_NUM_CLEAN)
    if not s or s in {"-", "—", "N/A"}:
        return None
    return int(s)


def auction_date(name: str) -> str:
    """Map an auction name like 'February 2026 Joint Auction #46' to a date.

    CARB doesn't publish an exact date in this PDF; we use a canonical date
    that's good enough for a chart x-axis. CARB schedules quarterly auctions
    in February, May, August, and November, typically on the third Wednesday.
    We approximate with the 15th of the month — close enough for a yearly
    x-axis and avoids fake precision.
    """
    m = AUCTION_NAME_RE.match(name.strip())
    if not m:
        raise ValueError(f"unrecognized auction name: {name!r}")
    month = MONTHS[m.group("month").lower()]
    year = int(m.group("year"))
    return f"{year:04d}-{month:02d}-15"


def parse_table(pdf_bytes: bytes) -> list[dict]:
    """Parse the CARB auction master PDF.

    pdfplumber returns ~21 columns per row because of how the PDF lays out
    cells (with empty filler cells between data cells, varying based on row
    shading). We coerce by stripping None/empty cells from each row, which
    leaves exactly 7 logical fields: name + 6 data values.
    """
    rows: list[dict] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables() or []:
                for raw in table:
                    cells = [c for c in raw if c is not None and c.strip() != ""]
                    if len(cells) != 7:
                        continue
                    name = cells[0].strip()
                    if not AUCTION_NAME_RE.match(name):
                        continue
                    rows.append({
                        "auction_number": int(name.rsplit("#", 1)[1]),
                        "auction_date": auction_date(name),
                        "current_offered": parse_int(cells[1]),
                        "current_sold": parse_int(cells[2]),
                        "current_settlement_price_usd": parse_money(cells[3]),
                        "advance_offered": parse_int(cells[4]),
                        "advance_sold": parse_int(cells[5]),
                        "advance_settlement_price_usd": parse_money(cells[6]),
                    })
    rows.sort(key=lambda r: r["auction_number"])
    return rows


def write_csv(rows: list[dict], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "auction_number", "auction_date",
        "current_offered", "current_sold", "current_settlement_price_usd",
        "advance_offered", "advance_sold", "advance_settlement_price_usd",
    ]
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def main() -> int:
    print(f"fetching {PDF_URL}", file=sys.stderr)
    pdf = fetch_pdf(PDF_URL)
    rows = parse_table(pdf)
    if not rows:
        print("no auction rows parsed — PDF format may have changed", file=sys.stderr)
        return 1
    write_csv(rows, OUTPUT_CSV)
    first, last = rows[0], rows[-1]
    print(
        f"wrote {len(rows)} auctions to {OUTPUT_CSV.relative_to(REPO_ROOT)} "
        f"({first['auction_date']} #{first['auction_number']} "
        f"→ {last['auction_date']} #{last['auction_number']}, "
        f"latest current settlement ${last['current_settlement_price_usd']:.2f})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
