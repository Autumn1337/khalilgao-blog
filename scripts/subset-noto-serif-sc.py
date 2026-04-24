#!/usr/bin/env python3
"""
subset-noto-serif-sc.py — re-subset NotoSerifSC to the CJK chars
actually used in src/content/posts/**/*.mdx.

Sources: fonts-source/NotoSerifSC-{400,500}.woff2 (full CJK block)
Outputs:
  - public/fonts/NotoSerifSC-{400,500}.woff2 — client-served subset
    covering only CJK chars actually used across posts.
  - fonts-source/NotoSerifSC-{400,500}-og.ttf — build-time TTF for
    satori's OG-image renderer; subset to a superset that covers
    every post title plus a common-CJK safety buffer.

Run:     npm run subset-fonts

Rerun whenever a new post introduces characters that weren't in the
existing subset. fonts-source/ is the source of truth — every subset
pass starts from the full CJK block there (not from the
already-trimmed public/fonts/*.woff2), so chars never get lost. It
lives outside public/ so these multi-MB sources never ship to dist/.

Dependencies: Python 3 + fonttools + brotli (already present on
most WSL setups).
"""

from __future__ import annotations

import pathlib
import sys

try:
    from fontTools.ttLib import TTFont
    from fontTools.subset import Subsetter, Options
except ImportError:
    sys.exit("missing dependency: pip install fonttools brotli")


ROOT = pathlib.Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "src" / "content" / "posts"
FONTS_SRC = ROOT / "fonts-source"
FONTS_DST = ROOT / "public" / "fonts"


def in_cjk_range(cp: int) -> bool:
    return (
        0x4E00 <= cp <= 0x9FFF   # CJK Unified Ideographs
        or 0x3000 <= cp <= 0x303F  # CJK Symbols & Punctuation
        or 0xFF00 <= cp <= 0xFFEF  # Halfwidth and Fullwidth Forms
        or 0x2000 <= cp <= 0x206F  # General Punctuation
    )


def scan_used_chars() -> set[str]:
    chars: set[str] = set()
    for path in POSTS_DIR.rglob("*.mdx"):
        text = path.read_text(encoding="utf-8")
        chars.update(c for c in text if in_cjk_range(ord(c)))

    # Safety buffer — punctuation and structural chars that are common
    # enough that a post without them today may add them tomorrow.
    # Costs <1 KB in the output woff2 and saves a resubset round trip.
    safety = (
        "，。、；：！？"
        "（）【】「」『』《》〈〉"
        "“”‘’"
        "…—–"
        "·•"
        "　"  # ideographic space
    )
    chars.update(c for c in safety if in_cjk_range(ord(c)))
    return chars


def subset_one(weight: int, unicodes: list[int]) -> None:
    src = FONTS_SRC / f"NotoSerifSC-{weight}.woff2"
    dst = FONTS_DST / f"NotoSerifSC-{weight}.woff2"
    if not src.exists():
        print(f"  skip: {src} missing")
        return

    size_before = dst.stat().st_size if dst.exists() else None

    font = TTFont(str(src))
    options = Options()
    options.flavor = "woff2"
    options.drop_tables += ["DSIG"]
    options.with_zopfli = False
    # keep GPOS/GSUB — CJK kerning and substitution rely on them.

    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font.save(str(dst))

    size_after = dst.stat().st_size
    before_str = f"{size_before // 1024} KB" if size_before else "n/a"
    print(
        f"  NotoSerifSC-{weight}: "
        f"{before_str} → {size_after // 1024} KB "
        f"({size_after} bytes, {len(unicodes)} glyphs)"
    )


def scan_title_chars() -> set[str]:
    """Characters that appear in post titles specifically — used to
    build a separate subset for the OG-image TTF so satori can always
    render titles even if the title uses a character that doesn't
    appear in the post body."""
    import re

    chars: set[str] = set()
    for path in POSTS_DIR.rglob("*.mdx"):
        text = path.read_text(encoding="utf-8")
        match = re.search(r"^title:\s*(.+)$", text, re.MULTILINE)
        if match:
            chars.update(match.group(1))
    return chars


def subset_ttf_for_og(weight: int, unicodes: list[int]) -> None:
    """Write a TTF copy of NotoSerifSC-{weight} subset to a superset
    covering body+title chars — satori's layout engine needs TTF, not
    woff2. Kept inside fonts-source/ so it never ships to clients."""
    src = FONTS_SRC / f"NotoSerifSC-{weight}.woff2"
    dst = FONTS_SRC / f"NotoSerifSC-{weight}-og.ttf"
    if not src.exists():
        return

    font = TTFont(str(src))
    options = Options()
    options.drop_tables += ["DSIG"]

    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    # Strip woff2 compression on the font object itself; the Options
    # flavor field only affects the subsetter's internal pass.
    font.flavor = None
    font.save(str(dst))

    size = dst.stat().st_size
    print(f"  NotoSerifSC-{weight}-og.ttf: {size // 1024} KB "
          f"({len(unicodes)} glyphs, for OG renderer)")


def main() -> None:
    body_chars = scan_used_chars()
    title_chars = scan_title_chars()
    # Body subset = body chars + safety buffer (already in body_chars).
    # OG subset  = body + title so the renderer always has the glyphs
    # it needs for post titles, even if the title uses rare chars.
    # Also add ASCII for title punctuation like "()—".
    og_chars = set(body_chars) | title_chars
    for cp in range(0x0020, 0x007F):
        og_chars.add(chr(cp))

    body_unicodes = sorted(ord(c) for c in body_chars)
    og_unicodes = sorted(set(ord(c) for c in og_chars))

    print(f"{len(body_unicodes)} CJK code-points used in post bodies")
    print(f"{len(og_unicodes)} code-points for OG-image TTF "
          f"(body + title + ASCII)")

    FONTS_DST.mkdir(parents=True, exist_ok=True)
    FONTS_SRC.mkdir(parents=True, exist_ok=True)

    for weight in (400, 500):
        subset_one(weight, body_unicodes)
    for weight in (400, 500):
        subset_ttf_for_og(weight, og_unicodes)


if __name__ == "__main__":
    main()
