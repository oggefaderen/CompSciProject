"""GOT-styled matplotlib helpers for the AWOIAF allegiance exploration.

Palette + typography mirror the website (`website/styles.css`). Use:

    from got_style import apply_style, got_title, save_fig, PALETTE, diverging_colors
    apply_style()
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(...)
    got_title(fig, 'Headline', 'one-line subtitle')
    save_fig(fig, 'figures/my_plot.png')
"""
from pathlib import Path
import matplotlib as mpl
import numpy as np

PALETTE = {
    'bg':             '#0c0d11',
    'bg_alt':         '#11131a',
    'surface':        '#1a1c25',
    'ink':            '#ece5d1',
    'ink_soft':       '#c8c1ad',
    'muted':          '#8c8674',
    'line':           '#2e2f38',
    'line_strong':    '#3d3e48',
    'gold':           '#c9a661',
    'gold_bright':    '#e3c382',
    'gold_deep':      '#8a6f33',
    'crimson':        '#8b1d22',
    'crimson_bright': '#b3262d',
}

# Crimson (low) → olive middle → gold (high). Matches the karma_dist bar gradient.
DIVERGING = [
    '#b3262d', '#8b1d22', '#6e2424', '#5c4434',
    '#5e5640', '#6c684c', '#7e7654', '#8a6f33',
    '#c9a661', '#e3c382',
]

# Categorical sequence for community / house coloring (parchment-friendly).
CATEGORICAL = [
    '#c9a661', '#b3262d', '#6c8ea4', '#8a6f33',
    '#e3c382', '#8b1d22', '#456a83', '#a0824d',
    '#5e7d6a', '#cfa988', '#7e5a3d', '#9c6f6f',
]

_SERIF_STACK = ['Cinzel', 'EB Garamond', 'Trajan Pro',
                'Cormorant Garamond', 'Georgia',
                'Times New Roman', 'serif']


def apply_style():
    """Install GOT rcParams. Call once per notebook before plotting."""
    mpl.rcParams.update({
        'figure.facecolor':  PALETTE['bg'],
        'axes.facecolor':    PALETTE['bg'],
        'savefig.facecolor': PALETTE['bg'],
        'text.color':        PALETTE['ink'],
        'axes.labelcolor':   PALETTE['ink_soft'],
        'axes.edgecolor':    PALETTE['line_strong'],
        'axes.titlecolor':   PALETTE['ink'],
        'xtick.color':       PALETTE['ink_soft'],
        'ytick.color':       PALETTE['ink_soft'],
        'axes.spines.top':   False,
        'axes.spines.right': False,
        'axes.grid':         False,
        'grid.color':        PALETTE['line'],
        'grid.alpha':        0.4,
        'font.family':       'serif',
        'font.serif':        _SERIF_STACK,
        'axes.titleweight':  'bold',
        'axes.titlesize':    18,
        'axes.labelsize':    11,
        'xtick.labelsize':   10,
        'ytick.labelsize':   10,
        'legend.frameon':    False,
        'legend.labelcolor': PALETTE['ink'],
        'figure.dpi':        110,
        'savefig.dpi':       160,
        'savefig.bbox':      'tight',
    })


def got_title(fig, title, subtitle=None, x=0.04, top=0.97):
    """Big bold parchment title + optional muted subtitle, GOT-layout, anchored to figure."""
    fig.text(x, top, title, ha='left', va='top',
             fontsize=22, fontweight='bold',
             color=PALETTE['ink'], family='serif')
    if subtitle:
        fig.text(x, top - 0.06, subtitle, ha='left', va='top',
                 fontsize=11, color=PALETTE['ink_soft'],
                 family='serif', style='italic')


def save_fig(fig, path):
    """Save with bg preserved + parent dir auto-created."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(p, facecolor=PALETTE['bg'], edgecolor='none',
                bbox_inches='tight', dpi=160)


def diverging_colors(n):
    """Sample n colors evenly from the crimson→gold gradient."""
    idx = np.linspace(0, len(DIVERGING) - 1, n).astype(int)
    return [DIVERGING[i] for i in idx]


def categorical_colors(n):
    """Cycle the parchment-friendly categorical palette to length n."""
    return [CATEGORICAL[i % len(CATEGORICAL)] for i in range(n)]

# Loud, maximally-distinct 12-colour palette for cases where house separation
# matters more than the GOT aesthetic. Tuned for legibility on the dark bg.
HOUSE_DISTINCTIVE = [
    '#e74c3c',  # red
    '#f1c40f',  # gold
    '#3498db',  # blue
    '#2ecc71',  # green
    '#9b59b6',  # purple
    '#ff9800',  # bright orange
    '#1abc9c',  # turquoise
    '#ec407a',  # pink
    '#ffffff',  # white
    '#8d6e63',  # tan
    '#aed581',  # lime
    '#5dade2',  # sky blue
    '#ff5722',  # deep orange
    '#80deea',  # aqua
]


def distinctive_colors(n):
    """Cycle the loud distinctive palette to length n. Breaks GOT aesthetic by design."""
    return [HOUSE_DISTINCTIVE[i % len(HOUSE_DISTINCTIVE)] for i in range(n)]

