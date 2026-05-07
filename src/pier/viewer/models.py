"""API response models for the viewer."""

from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""

    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class EvalSummary(BaseModel):
    """Summary of metrics for an agent/model/dataset combination."""

    metrics: list[dict[str, Any]] = []


class JobSummary(BaseModel):
    """Summary of a job for list views."""

    name: str
    id: UUID | None = None
    started_at: datetime | None = None
    updated_at: datetime | None = None
    finished_at: datetime | None = None
    n_total_trials: int = 0
    n_completed_trials: int = 0
    n_errored_trials: int = 0
    datasets: list[str] = []
    agents: list[str] = []
    providers: list[str] = []
    models: list[str] = []
    environment_type: str | None = None
    evals: dict[str, EvalSummary] = {}
    total_input_tokens: int | None = None
    total_cached_input_tokens: int | None = None
    total_output_tokens: int | None = None
    total_cost_usd: float | None = None
    total_agent_steps: int | None = None


class TaskSummary(BaseModel):
    """Summary of a task group (agent + model + dataset + task) for list views."""

    task_name: str
    source: str | None = None
    agent_name: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    n_trials: int = 0
    n_completed: int = 0
    n_errors: int = 0
    exception_types: list[str] = []
    avg_reward: float | None = None
    avg_duration_ms: float | None = None
    avg_input_tokens: float | None = None
    avg_cached_input_tokens: float | None = None
    avg_output_tokens: float | None = None
    avg_cost_usd: float | None = None
    avg_peak_context_tokens: float | None = None
    avg_agent_steps: float | None = None


class TrialSummary(BaseModel):
    """Summary of a trial for list views."""

    name: str
    task_name: str
    id: UUID | None = None
    source: str | None = None
    agent_name: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    reward: float | None = None
    error_type: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    input_tokens: int | None = None
    cached_input_tokens: int | None = None
    output_tokens: int | None = None
    cost_usd: float | None = None
    peak_context_tokens: int | None = None
    agent_steps: int | None = None


class ModelPricing(BaseModel):
    """Per-token pricing rates for a model, sourced from LiteLLM."""

    model_name: str
    input_cost_per_token: float | None = None
    cache_read_input_token_cost: float | None = None
    output_cost_per_token: float | None = None


class FileInfo(BaseModel):
    """Information about a file in a trial directory."""

    path: str  # Relative path from trial dir
    name: str  # File name
    is_dir: bool
    size: int | None = None  # File size in bytes (None for dirs)


class FilterOption(BaseModel):
    """A filter option with a value and count."""

    value: str
    count: int


class JobFilters(BaseModel):
    """Available filter options for jobs list."""

    agents: list[FilterOption]
    providers: list[FilterOption]
    models: list[FilterOption]


class TaskFilters(BaseModel):
    """Available filter options for tasks list within a job."""

    agents: list[FilterOption]
    providers: list[FilterOption]
    models: list[FilterOption]
    sources: list[FilterOption]
    tasks: list[FilterOption]


class TaskDefinitionSummary(BaseModel):
    """Summary of a task definition for list views."""

    name: str
    version: str = "1.0"
    source: str | None = None
    metadata: dict[str, Any] = {}
    has_instruction: bool = False
    has_environment: bool = False
    has_tests: bool = False
    has_solution: bool = False
    agent_timeout_sec: float | None = None
    verifier_timeout_sec: float | None = None
    os: str | None = None
    cpus: int | None = None
    memory_mb: int | None = None
    storage_mb: int | None = None
    gpus: int | None = None


class TaskDefinitionDetail(BaseModel):
    """Full detail of a task definition."""

    name: str
    task_dir: str = ""
    config: dict[str, Any] = {}
    instruction: str | None = None
    has_instruction: bool = False
    has_environment: bool = False
    has_tests: bool = False
    has_solution: bool = False


class TaskDefinitionFilters(BaseModel):
    """Available filter options for task definitions list."""

    difficulties: list[FilterOption] = []
    categories: list[FilterOption] = []
    tags: list[FilterOption] = []


class JobHeatmapRouteParams(BaseModel):
    """Exact route params for drilling into a heatmap cell."""

    job_name: str | None = None
    source: str | None = None
    agent_name: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    task_name: str


class JobHeatmapRow(BaseModel):
    """A grouped row in the job heatmap."""

    key: str
    label: str
    job_name: str | None = None
    agent_name: str | None = None
    model_provider: str | None = None
    model_name: str | None = None


class JobHeatmapColumn(BaseModel):
    """A grouped column in the job heatmap."""

    key: str
    label: str
    source: str | None = None
    task_name: str | None = None


class JobHeatmapCell(BaseModel):
    """Aggregated trial stats for one heatmap crossing."""

    row_key: str
    column_key: str
    n_trials: int = 0
    n_completed: int = 0
    n_errors: int = 0
    avg_reward: float | None = None
    avg_duration_ms: float | None = None
    avg_input_tokens: float | None = None
    avg_cached_input_tokens: float | None = None
    avg_output_tokens: float | None = None
    avg_cost_usd: float | None = None
    total_cost_usd: float | None = None
    avg_peak_context_tokens: float | None = None
    avg_agent_steps: float | None = None
    exception_counts: dict[str, int] = {}
    dominant_exception: str | None = None
    route_params: JobHeatmapRouteParams | None = None


class JobHeatmapData(BaseModel):
    """Data for the single-job heatmap view."""

    rows: list[JobHeatmapRow]
    columns: list[JobHeatmapColumn]
    cells: dict[str, dict[str, JobHeatmapCell]]  # row.key -> column.key -> cell
