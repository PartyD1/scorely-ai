"""Utility to create and seed rubrics into the database.

Usage:
    Interactive mode: python add_rubric.py
    Seed from JSON:   python add_rubric.py --seed ../rubrics/project_management.json
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.database import SessionLocal
from app.services.rubric_service import create_rubric


def seed_from_json(json_path: str) -> None:
    """Load a rubric from a JSON file and save to database."""
    with open(json_path) as f:
        data = json.load(f)

    event_name = data["event"]
    db = SessionLocal()
    try:
        rubric = create_rubric(db, event_name, data)
        print(f"Rubric saved: {rubric.event_name} (id={rubric.id})")
    finally:
        db.close()


def interactive_mode() -> None:
    """Interactively create a rubric via CLI prompts."""
    event_name = input("Event name: ").strip()
    total_points = int(input("Total points (default 100): ").strip() or "100")
    num_sections = int(input("Number of sections: ").strip())

    sections = []
    for i in range(num_sections):
        print(f"\nSection {i + 1}:")
        name = input("  Name: ").strip()
        max_points = int(input("  Max points: ").strip())
        description = input("  Description: ").strip()

        scoring_guide = {}
        print("  Enter scoring guide tiers (empty line to finish):")
        while True:
            tier = input("    Point range (e.g. 9-10): ").strip()
            if not tier:
                break
            desc = input(f"    Description for {tier}: ").strip()
            scoring_guide[tier] = desc

        sections.append({
            "name": name,
            "max_points": max_points,
            "description": description,
            "scoring_guide": scoring_guide,
        })

    rubric_data = {
        "event": event_name,
        "total_points": total_points,
        "sections": sections,
    }

    # Validate points sum
    section_sum = sum(s["max_points"] for s in sections)
    if section_sum != total_points:
        print(f"\nWarning: Section points sum to {section_sum}, not {total_points}")

    preview = input("\nPreview rubric JSON? [y/n]: ").strip().lower()
    if preview == "y":
        print(json.dumps(rubric_data, indent=2))

    save = input("\nSave to database? [y/n]: ").strip().lower()
    if save == "y":
        db = SessionLocal()
        try:
            rubric = create_rubric(db, event_name, rubric_data)
            print(f"Rubric saved: {rubric.event_name} (id={rubric.id})")
        finally:
            db.close()
    else:
        print("Not saved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Add or seed rubrics")
    parser.add_argument("--seed", type=str, help="Path to rubric JSON file to seed")
    args = parser.parse_args()

    if args.seed:
        seed_from_json(args.seed)
    else:
        interactive_mode()
