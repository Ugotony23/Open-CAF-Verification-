"""Idempotent Seeder for official NCSC CAF v4.0 Taxonomy."""
import json
import logging
from pathlib import Path
from typing import Dict, Any

from app.core.database import SyncSessionLocal, sync_engine, Base
from app.models.caf import Objective, Principle, ContributingOutcome, IGP, IGPLevel

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

def find_seed_file() -> Path:
    """Locate data/caf_v4_seed.json searching upwards from current working directory."""
    candidates = [
        Path.cwd() / "data" / "caf_v4_seed.json",
        Path.cwd().parent / "data" / "caf_v4_seed.json",
        Path(__file__).resolve().parent.parent.parent.parent / "data" / "caf_v4_seed.json",
    ]
    for p in candidates:
        if p.is_file():
            return p
    raise FileNotFoundError("Could not find data/caf_v4_seed.json in standard locations.")

def seed_caf_data(session=None) -> Dict[str, int]:
    """
    Parses caf_v4_seed.json and upserts all objectives, principles,
    contributing outcomes, and IGPs idempotently.
    """
    seed_file = find_seed_file()
    logger.info(f"Loading CAF v4.0 data from {seed_file}")

    with open(seed_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    close_session_at_end = False
    if session is None:
        Base.metadata.create_all(bind=sync_engine)
        session = SyncSessionLocal()
        close_session_at_end = True
    else:
        Base.metadata.create_all(bind=session.get_bind())

    stats = {
        "objectives": 0,
        "principles": 0,
        "outcomes": 0,
        "igps": 0,
    }

    try:
        for obj_data in data.get("objectives", []):
            obj = session.query(Objective).filter_by(id=obj_data["id"]).first()
            if not obj:
                obj = Objective(
                    id=obj_data["id"],
                    code=obj_data["code"],
                    title=obj_data["title"],
                    description=obj_data["description"],
                )
                session.add(obj)
                session.flush()
                stats["objectives"] += 1
            else:
                obj.title = obj_data["title"]
                obj.description = obj_data["description"]
                obj.code = obj_data["code"]

            for prin_data in obj_data.get("principles", []):
                prin = session.query(Principle).filter_by(id=prin_data["id"]).first()
                if not prin:
                    prin = Principle(
                        id=prin_data["id"],
                        objective_id=obj.id,
                        code=prin_data["code"],
                        title=prin_data["title"],
                        description=prin_data["description"],
                    )
                    session.add(prin)
                    session.flush()
                    stats["principles"] += 1
                else:
                    prin.title = prin_data["title"]
                    prin.description = prin_data["description"]
                    prin.code = prin_data["code"]
                    prin.objective_id = obj.id

                for outcome_data in prin_data.get("outcomes", []):
                    outcome = session.query(ContributingOutcome).filter_by(id=outcome_data["id"]).first()
                    if not outcome:
                        outcome = ContributingOutcome(
                            id=outcome_data["id"],
                            principle_id=prin.id,
                            code=outcome_data["code"],
                            title=outcome_data["title"],
                            description=outcome_data["description"],
                            guidance_notes=outcome_data.get("guidance_notes"),
                        )
                        session.add(outcome)
                        session.flush()
                        stats["outcomes"] += 1
                    else:
                        outcome.title = outcome_data["title"]
                        outcome.description = outcome_data["description"]
                        outcome.code = outcome_data["code"]
                        outcome.principle_id = prin.id
                        outcome.guidance_notes = outcome_data.get("guidance_notes")

                    for igp_data in outcome_data.get("igps", []):
                        level_enum = IGPLevel[igp_data["level"]]
                        igp = (
                            session.query(IGP)
                            .filter_by(outcome_id=outcome.id, level=level_enum)
                            .first()
                        )
                        if not igp:
                            igp = IGP(
                                outcome_id=outcome.id,
                                level=level_enum,
                                description=igp_data["description"],
                                sort_order=igp_data.get("sort_order", 0),
                            )
                            session.add(igp)
                            stats["igps"] += 1
                        else:
                            igp.description = igp_data["description"]
                            igp.sort_order = igp_data.get("sort_order", 0)

        session.commit()
        logger.info(
            f"Successfully seeded CAF v4.0 data: "
            f"{stats['objectives']} objectives, "
            f"{stats['principles']} principles, "
            f"{stats['outcomes']} outcomes, "
            f"{stats['igps']} IGPs created."
        )
        return stats
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding CAF data: {e}")
        raise
    finally:
        if close_session_at_end:
            session.close()

if __name__ == "__main__":
    seed_caf_data()
