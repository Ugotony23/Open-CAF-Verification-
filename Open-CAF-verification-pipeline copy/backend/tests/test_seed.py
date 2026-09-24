"""Unit & Integration Tests for NCSC CAF v4.0 Seed Pipeline."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.caf import Objective, Principle, ContributingOutcome, IGP, IGPLevel
from app.cli.seed_caf import seed_caf_data

@pytest.fixture(scope="function")
def test_db():
    """Provides a fresh in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_caf_v4_seed_completeness(test_db):
    """
    Asserts official NCSC CAF v4.0 completeness:
    - Exactly 4 Objectives (A, B, C, D)
    - Exactly 14 Principles (A1-D2)
    - Exactly 39 Contributing Outcomes
    - At least 2 IGPs per Contributing Outcome
    """
    stats = seed_caf_data(session=test_db)

    # 1. Assert Objective counts & codes
    objectives = test_db.query(Objective).all()
    assert len(objectives) == 4, f"Expected 4 objectives, found {len(objectives)}"
    obj_ids = {o.id for o in objectives}
    assert obj_ids == {"A", "B", "C", "D"}

    # 2. Assert Principle counts
    principles = test_db.query(Principle).all()
    assert len(principles) == 14, f"Expected 14 principles, found {len(principles)}"
    expected_principles = {
        "A1", "A2", "A3", "A4",
        "B1", "B2", "B3", "B4", "B5", "B6",
        "C1", "C2",
        "D1", "D2"
    }
    assert {p.id for p in principles} == expected_principles

    # 3. Assert Contributing Outcomes count
    outcomes = test_db.query(ContributingOutcome).all()
    assert len(outcomes) == 39, f"Expected 39 contributing outcomes, found {len(outcomes)}"

    # Check breakdown per Objective
    obj_a_outcomes = [o for o in outcomes if o.id.startswith("A")]
    obj_b_outcomes = [o for o in outcomes if o.id.startswith("B")]
    obj_c_outcomes = [o for o in outcomes if o.id.startswith("C")]
    obj_d_outcomes = [o for o in outcomes if o.id.startswith("D")]

    assert len(obj_a_outcomes) == 9, f"Expected 9 outcomes for Objective A, got {len(obj_a_outcomes)}"
    assert len(obj_b_outcomes) == 20, f"Expected 20 outcomes for Objective B, got {len(obj_b_outcomes)}"
    assert len(obj_c_outcomes) == 5, f"Expected 5 outcomes for Objective C, got {len(obj_c_outcomes)}"
    assert len(obj_d_outcomes) == 5, f"Expected 5 outcomes for Objective D, got {len(obj_d_outcomes)}"

    # 4. Assert IGPs per outcome
    for outcome in outcomes:
        igps = test_db.query(IGP).filter_by(outcome_id=outcome.id).all()
        assert len(igps) >= 2, f"Outcome {outcome.id} should have at least 2 IGPs, got {len(igps)}"
        levels = {igp.level for igp in igps}
        assert IGPLevel.ACHIEVED in levels, f"Outcome {outcome.id} missing ACHIEVED IGP"
        assert IGPLevel.PARTIALLY_ACHIEVED in levels, f"Outcome {outcome.id} missing PARTIALLY_ACHIEVED IGP"

def test_caf_v4_seed_idempotency(test_db):
    """
    Asserts running the seed multiple times does not create duplicates or fail.
    """
    # First seed run
    seed_caf_data(session=test_db)
    initial_obj_count = test_db.query(Objective).count()
    initial_prin_count = test_db.query(Principle).count()
    initial_outcome_count = test_db.query(ContributingOutcome).count()
    initial_igp_count = test_db.query(IGP).count()

    # Second seed run (should update in-place without duplicating)
    second_stats = seed_caf_data(session=test_db)
    assert second_stats["objectives"] == 0
    assert second_stats["principles"] == 0
    assert second_stats["outcomes"] == 0
    assert second_stats["igps"] == 0

    assert test_db.query(Objective).count() == initial_obj_count == 4
    assert test_db.query(Principle).count() == initial_prin_count == 14
    assert test_db.query(ContributingOutcome).count() == initial_outcome_count == 39
    assert test_db.query(IGP).count() == initial_igp_count == 78
