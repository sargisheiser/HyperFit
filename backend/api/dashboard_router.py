"""Dashboard routes aggregating workout and nutrition data."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.models.dashboard import DashboardOverview
from backend.models.user import User
from backend.services.dashboard_service import get_dashboard_overview

router = APIRouter()


@router.get("/overview", response_model=DashboardOverview)
def dashboard_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> DashboardOverview:
    """Return aggregated stats for dashboard widgets."""

    return get_dashboard_overview(current_user, db)









