# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

DTU course **02467 Computational Social Science** final project. Scrapes characters from *A Wiki of Ice and Fire* (awoiaf.westeros.org), builds a character network from each character's `affiliated` list, and combines network analysis (Louvain communities, modularity vs. ground truth) with NLP on scraped biographies.

Two deliverables (`project_description.md`):
1. A non-technical **website** telling the story with visualizations.
2. An **explainer notebook** in 4 sections: Motivation → Basic stats → Tools/theory/analysis → Discussion.

Bias toward analysis quality, clear visualizations, and explainer-style narrative over engineering polish.

## Environment

Dev shell is a **Nix flake** (`flake.nix`). Python packages provided via Nix: `ipykernel`, `tqdm`, `beautifulsoup4`, `requests`, `seaborn`, `pandas`, `numpy`, `networkx`, `nltk`, `python-louvain`, `wordcloud`. A `.venv` adds `jupyter`, `bash_kernel`, `netwulf` via pip.

- The flake only declares `x86_64-linux`. The user works on macOS/darwin — they may be running notebooks outside the flake. Don't assume the Nix shell is active.
- When suggesting new dependencies, prefer adding to the Nix package list.
- `.env` holds the Anthropic API key (used by `friend_enemy.ipynb` / `llm.ipynb`); it's gitignored.

Enter the dev shell (Linux): `nix develop`. Launch Jupyter inside: `jupyter lab`.

## Data pipeline

CSVs at repo root, produced in this order:

1. `scrape_characters.ipynb` → `characters.csv` (name, ID) and `characters_enriched.csv` (adds `father, mother, spouse, lover, issue, allegiance, affiliated`). **Requires a real browser `User-Agent`** — `python-requests/<ver>` is explicitly blocked by AWOIAF; any other non-empty UA works (`sanity_check.ipynb` confirms).
2. `scrape_character_bios.ipynb` → `characters_bio.csv` (adds full narrative `bio` text).
3. Analysis notebooks read from `characters_enriched.csv` / `characters_bio.csv`.

The **`affiliated` column** (semicolon-separated character IDs) is the edge source. The network is built undirected: edge A↔B if B appears in A's `affiliated` list.

### Analysis notebooks

- `network.ipynb` — base graph construction + interactive `netwulf` viz.
- `network_stats.ipynb` — degree distribution, LCC size, etc.
- `community_vs_allegiance.ipynb` — Louvain vs. house (Level 1 of the prediction analysis).
- `community_vs_region.ipynb` — Louvain vs. Westeros region (Level 3). Holds the canonical `REGION_TO_HOUSES` mapping plus the §2.5 allegiance-fallback + family inference and §3.5 neighbour-majority imputation logic. Other notebooks may need to re-implement or `%run` cells from here.
- `predict_house.ipynb` — newer "predict house from Louvain" notebook (Levels 1–4 sweep over top-N houses).
- `House_TF_IDF.ipynb` — TF-IDF text analysis per house from bios.
- `friend_enemy.ipynb` — POC: sends top-200 characters' bios + affiliations to Claude Haiku to classify friend/enemy. Caches under `relationships_cache/` (gitignored).
- `llm.ipynb` — LLM scratch/experimentation.

## Deliverables and deadline

**Project Assignment B is due Friday 2026-05-22, 23:59.** Two artifacts:
1. **Website** — non-technical, self-contained, viz-driven; must link to the explainer notebook (nbviewer OK), include dataset download links, and explain key dataset properties.
2. **Explainer notebook** — fixed 4-section structure: *Motivation → Basic stats → Tools, theory & analysis → Discussion*. The notebook must show genuine interpretation, not just outputs.

The final project counts for 50% of the course grade and is scored on six dimensions (0–3 each): Project Design, Explainer Notebook, Network Science Application, Text Analysis Methods, Website Quality, Excellence Markers (creativity + ethics/bias/limitations awareness).

## Course coverage map (02467 ComSocSci 2026)

Grading dimensions 3 (network science) and 4 (text analysis) reward demonstrating techniques across course weeks. Mapping of taught technique → notebook in this repo:

| Week | Technique | Where it lives |
|---|---|---|
| 1 | Web scraping + research ethics | `scrape_characters.ipynb`, `scrape_character_bios.ipynb`, `sanity_check.ipynb` |
| 2 | Data gathering (course used APIs; this project scrapes — **justify the choice** in Motivation) | scraping notebooks |
| 3 | Distributions, log vs. linear binning, PDFs | `network_stats.ipynb` |
| 4 | NetworkX basics, density, components, degree, strength | `network.ipynb`, `network_stats.ipynb` |
| 5 | Heavy-tailed degree, giant component, **random/null-model baselines**, small-world | partial — degree dist exists; **configuration-model null comparison likely a gap** |
| 6 | Louvain, modularity, **assortativity, configuration model via double edge swap**, closeness/eigenvector centrality, confusion matrices vs. ground truth | `community_vs_allegiance.ipynb`, `community_vs_region.ipynb`, `predict_house.ipynb` — **verify assortativity + null-significance test exist** |
| 7 | NLTK tokenization, Zipf's law, **collocations + chi-squared**, MWETokenizer | likely a gap — Zipf and collocations on bios may not exist yet |
| 8 | **TF-IDF per community + word clouds** | `House_TF_IDF.ipynb` (per-house). Consider also TF-IDF *per Louvain community* to mirror the week 8 exercise directly |

Before adding new analysis, audit which weeks are under-represented — gaps in weeks 5, 6, 7 have the highest marginal grade value.

## Known caveats

**Temporal smear**: the wiki collapses ~5,000 years of in-universe history into one static graph. Co-affiliation edges don't distinguish real interaction from genealogical reference (e.g. Daenerys clusters with ancient Targaryen kings). This is a documented limitation, not a bug — flag in any analysis that compares communities to ground truth. Proper fix (deferred per user) would require scraping `Born`/`Died` from infoboxes and dropping edges where lifetimes don't overlap.

## Working conventions

- **Never auto-save plots or CSVs.** Don't add `plt.savefig` / `fig.savefig` / `df.to_csv` in new code unless the user explicitly asks. Use `plt.show()` and keep results in-memory. Existing save calls are fine; this applies only to new code.
- **Don't modify the scraped CSVs.** Inference and enrichment logic (allegiance fallback, family inheritance, region imputation) lives inside notebooks and is recomputed each run — not persisted back to `characters_enriched.csv`.
- **Notebooks are the unit of work.** There's no `src/` package, no test suite, no lint config. Edits happen in `.ipynb` files; cells should be runnable top-to-bottom.

## Git

`.gitignore` excludes `flake.lock`, `.env`, `relationships_cache/`, and `CLAUDE.MD` (case-insensitive match — this file is also ignored on macOS's default filesystem).
