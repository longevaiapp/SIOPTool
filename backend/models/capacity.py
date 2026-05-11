"""Pydantic models for capacity / forecast (M09 SIOP)."""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RoleCapacityBase(BaseModel):
    role: str = Field(min_length=1, max_length=100)
    available_fte: Decimal = Decimal("0")
    committed_fte: Decimal = Decimal("0")
    forecast_demand: Decimal = Decimal("0")
    week_start: Optional[date] = None


class RoleCapacityCreate(RoleCapacityBase):
    pass


class RoleCapacityUpdate(BaseModel):
    role: Optional[str] = None
    available_fte: Optional[Decimal] = None
    committed_fte: Optional[Decimal] = None
    forecast_demand: Optional[Decimal] = None
    week_start: Optional[date] = None


class RoleCapacityOut(RoleCapacityBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime


class DemandForecastBase(BaseModel):
    week_start: date
    project_id: Optional[str] = Field(default=None, max_length=36)
    role: Optional[str] = Field(default=None, max_length=100)
    demand_fte: Decimal = Decimal("0")


class DemandForecastCreate(DemandForecastBase):
    pass


class DemandForecastUpdate(BaseModel):
    week_start: Optional[date] = None
    project_id: Optional[str] = None
    role: Optional[str] = None
    demand_fte: Optional[Decimal] = None


class DemandForecastOut(DemandForecastBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime
