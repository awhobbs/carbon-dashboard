# Data pipeline

Scripts in `data/fetchers/` pull current carbon-market data from upstream
sources and write CSVs into `data/<market>/`. The site reads those CSVs
directly. A GitHub Actions workflow (`.github/workflows/refresh-data.yml`)
runs the fetchers on a schedule and commits any updates.

## Fetchers

| Fetcher                              | Output                        | Source                                                                                       |
| ------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `fetchers/california_auctions.py`    | `auctions/california.csv`     | CARB master "Summary of Auction Settlement Prices and Results" PDF (joint auctions #1 – now) |

## Running locally

```sh
pip install -r data/requirements.txt
python3 data/fetchers/california_auctions.py
```

Each fetcher is idempotent: the output CSV is rewritten in full from the
upstream source on every run. If upstream hasn't changed, the file is
byte-identical and `git diff` is empty.

## Adding a new market

1. Drop a new script into `data/fetchers/` that writes to `data/<market>/<table>.csv`.
2. Pin any new pip deps in `data/requirements.txt`.
3. Add the script to the workflow's run list.
4. Wire the CSV into the front-end (D3 reads CSV directly).
