"""Idempotent Seeder for UK Council Service Criticality Catalog."""
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

from app.core.database import SyncSessionLocal, sync_engine, Base
from app.models.tenant import CouncilTenant, AuthorityType
from app.models.council_service import CouncilService, ServiceTier, TIER_WEIGHTS

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def find_council_services_file() -> Path:
    """Locate data/council_services.json searching upwards from current working directory."""
    candidates = [
        Path.cwd() / "data" / "council_services.json",
        Path.cwd().parent / "data" / "council_services.json",
        Path(__file__).resolve().parent.parent.parent.parent / "data" / "council_services.json",
    ]
    for p in candidates:
        if p.is_file():
            return p
    raise FileNotFoundError("Could not find data/council_services.json in standard locations.")


def seed_council_services_data(session=None, tenant_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Parses data/council_services.json and upserts standard UK local authority services
    idempotently for all tenants (or a specific target tenant).
    If no tenants exist, initializes a default demo council tenant.
    """
    seed_file = find_council_services_file()
    logger.info(f"Loading Council Services catalog from {seed_file}")

    with open(seed_file, "r", encoding="utf-8") as f:
        services_data = json.load(f)

    close_session_at_end = False
    if session is None:
        Base.metadata.create_all(bind=sync_engine)
        session = SyncSessionLocal()
        close_session_at_end = True
    else:
        Base.metadata.create_all(bind=session.get_bind())

    stats = {
        "tenants_processed": 0,
        "services_created": 0,
        "services_updated": 0,
        "tier_1_count": 0,
        "tier_2_count": 0,
        "tier_3_count": 0,
    }

    try:
        if tenant_id:
            tenants = session.query(CouncilTenant).filter_by(id=tenant_id).all()
        else:
            tenants = session.query(CouncilTenant).all()

        if not tenants:
            logger.info("No council tenants found in database. Initializing default 'Borsetshire Council'...")
            default_tenant = CouncilTenant(
                name="Borsetshire Council",
                authority_type=AuthorityType.UNITARY,
            )
            session.add(default_tenant)
            session.flush()
            tenants = [default_tenant]

        for tenant in tenants:
            stats["tenants_processed"] += 1
            for item in services_data:
                tier_enum = ServiceTier(item["tier"])
                weight = item.get("weight_multiplier", TIER_WEIGHTS.get(tier_enum, 1.0))

                existing = (
                    session.query(CouncilService)
                    .filter_by(tenant_id=tenant.id, name=item["name"])
                    .first()
                )

                if not existing:
                    service = CouncilService(
                        tenant_id=tenant.id,
                        name=item["name"],
                        description=item.get("description"),
                        tier=tier_enum,
                        weight_multiplier=weight,
                        is_active=item.get("is_active", True),
                    )
                    session.add(service)
                    stats["services_created"] += 1
                else:
                    existing.description = item.get("description")
                    existing.tier = tier_enum
                    existing.weight_multiplier = weight
                    existing.is_active = item.get("is_active", True)
                    stats["services_updated"] += 1

                if tier_enum == ServiceTier.TIER_1:
                    stats["tier_1_count"] += 1
                elif tier_enum == ServiceTier.TIER_2:
                    stats["tier_2_count"] += 1
                elif tier_enum == ServiceTier.TIER_3:
                    stats["tier_3_count"] += 1

        session.commit()
        logger.info(
            f"Successfully seeded Council Services: "
            f"{stats['services_created']} created, {stats['services_updated']} updated "
            f"across {stats['tenants_processed']} tenant(s). "
            f"(Tier 1: {stats['tier_1_count']}, Tier 2: {stats['tier_2_count']}, Tier 3: {stats['tier_3_count']})"
        )
        return stats
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding Council Services: {e}")
        raise
    finally:
        if close_session_at_end:
            session.close()


def main():
    parser = argparse.ArgumentParser(description="Seed UK Council Services Criticality Catalog")
    parser.add_argument("--tenant-id", type=str, help="Target specific tenant ID", default=None)
    args = parser.parse_args()
    seed_council_services_data(tenant_id=args.tenant_id)


if __name__ == "__main__":
    main()
