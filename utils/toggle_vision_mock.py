#!/usr/bin/env python3
"""
Utility to toggle the VISION_MOCK_MODE flag inside the project `.env`.

Usage:
    python utils/toggle_vision_mock.py on      # enable mock mode
    python utils/toggle_vision_mock.py off     # disable mock mode
    python utils/toggle_vision_mock.py status  # show current value
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = PROJECT_ROOT / ".env"
ENV_KEY = "VISION_MOCK_MODE"


def _read_env() -> str:
    if ENV_FILE.exists():
        return ENV_FILE.read_text(encoding="utf-8")
    return ""


def _write_env(content: str) -> None:
    ENV_FILE.write_text(content, encoding="utf-8")


def _update_flag(content: str, value: str) -> str:
    pattern = re.compile(rf"^{ENV_KEY}\s*=.*$", re.MULTILINE)
    entry = f"{ENV_KEY}={value}"
    if pattern.search(content):
        return pattern.sub(entry, content)
    if content and not content.endswith("\n"):
        content += "\n"
    return content + entry + "\n"


def _extract_value(content: str) -> str | None:
    pattern = re.compile(rf"^{ENV_KEY}\s*=\s*(?P<value>.+)$", re.MULTILINE)
    match = pattern.search(content)
    if match:
        return match.group("value").strip()
    return None


def handle(args: argparse.Namespace) -> int:
    content = _read_env()
    current = _extract_value(content)

    if args.mode == "status":
        print(f"{ENV_KEY}={current or 'unset'}")
        return 0

    desired = "true" if args.mode == "on" else "false"
    updated = _update_flag(content, desired)
    if updated != content:
        _write_env(updated)
        print(f"{ENV_KEY} set to {desired} in {ENV_FILE}")
    else:
        print(f"{ENV_KEY} already set to {desired}")
    return 0


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Toggle VISION_MOCK_MODE in .env")
    parser.add_argument(
        "mode",
        choices=("on", "off", "status"),
        help="Desired mock mode state.",
    )
    return parser.parse_args(argv)


def main() -> int:
    return handle(parse_args())


if __name__ == "__main__":
    raise SystemExit(main())







