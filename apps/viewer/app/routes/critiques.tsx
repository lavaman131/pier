import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText, Search, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Badge } from "~/components/ui/badge";
import {
  DataTable,
  SortableHeader,
} from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { fetchCritiqueRuns } from "~/lib/api";
import { useDebouncedValue, useKeyboardTableNavigation } from "~/lib/hooks";
import type { CritiqueRunSummary } from "~/lib/types";

const PAGE_SIZE = 100;

function formatDateTime(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function formatCritiqueStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function CritiqueStatusBadge({ status }: { status: string }) {
  const variant =
    status === "failed"
      ? "destructive"
      : status === "completed" || status === "completed_with_failures"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{formatCritiqueStatus(status)}</Badge>;
}

function agentModel(run: CritiqueRunSummary): string {
  const model = run.model_provider
    ? `${run.model_provider}/${run.model_name ?? ""}`
    : run.model_name;
  if (run.agent_name && model) return `${run.agent_name} / ${model}`;
  return run.agent_name ?? model ?? "-";
}

const columns: ColumnDef<CritiqueRunSummary>[] = [
  {
    accessorKey: "status",
    header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
    cell: ({ row }) => <CritiqueStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortableHeader column={column}>Critique Job</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.name}</span>
    ),
  },
  {
    id: "agent_model",
    accessorFn: agentModel,
    header: ({ column }) => <SortableHeader column={column}>Agent / Model</SortableHeader>,
    cell: ({ row }) => agentModel(row.original),
  },
  {
    accessorKey: "environment_type",
    header: ({ column }) => <SortableHeader column={column}>Environment</SortableHeader>,
    cell: ({ row }) => row.original.environment_type ?? "-",
  },
  {
    accessorKey: "n_items",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>Items</SortableHeader>
      </div>
    ),
    cell: ({ row }) => {
      const run = row.original;
      return (
        <div className="text-right">
          {run.n_completed_items}/{run.n_items}
        </div>
      );
    },
  },
  {
    accessorKey: "n_failed_items",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>Failures</SortableHeader>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.n_failed_items}</div>
    ),
  },
  {
    accessorKey: "started_at",
    header: ({ column }) => <SortableHeader column={column}>Started</SortableHeader>,
    cell: ({ row }) => formatDateTime(row.original.started_at),
  },
  {
    accessorKey: "finished_at",
    header: ({ column }) => <SortableHeader column={column}>Finished</SortableHeader>,
    cell: ({ row }) => formatDateTime(row.original.finished_at),
  },
];

export default function Critiques() {
  const { jobName } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["critique-runs", jobName, debouncedSearch],
    queryFn: () => fetchCritiqueRuns(jobName!, 1, PAGE_SIZE, debouncedSearch),
    enabled: !!jobName,
    placeholderData: keepPreviousData,
  });

  const runs = data?.items ?? [];
  const { highlightedIndex } = useKeyboardTableNavigation({
    rows: runs,
    onNavigate: (run) =>
      navigate(
        `/jobs/${encodeURIComponent(jobName!)}/critiques/${encodeURIComponent(run.name)}`
      ),
    onEscapeUnhighlighted: () => navigate(`/jobs/${encodeURIComponent(jobName!)}`),
  });

  return (
    <div className="px-4 py-10">
      <div className="mb-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Jobs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/jobs/${encodeURIComponent(jobName!)}`}>{jobName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Critiques</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col xl:flex-row xl:justify-between gap-4">
          <div className="flex flex-col gap-4 justify-between min-w-0">
            <h1 className="text-4xl font-normal tracking-tighter font-mono">
              Critiques
            </h1>
            <div className="text-sm text-muted-foreground">
              {data?.total ?? 0} critique jobs
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap mt-auto">
            <span className="flex items-center gap-1">
              <Kbd>j</Kbd>
              <Kbd>k</Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>Enter</Kbd>
              <span>open</span>
            </span>
            <span className="flex items-center gap-1">
              <Kbd>Esc</Kbd>
              <span>{highlightedIndex >= 0 ? "deselect" : "go back"}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="relative -mb-px max-w-xl">
        <Input
          placeholder="Search critiques..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="lg"
          variant="card"
          className="peer pl-9 pr-10 shadow-none"
        />
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-border transition-colors peer-focus-visible:text-ring" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={runs}
        onRowClick={(run) =>
          navigate(
            `/jobs/${encodeURIComponent(jobName!)}/critiques/${encodeURIComponent(run.name)}`
          )
        }
        isLoading={isLoading}
        highlightedIndex={highlightedIndex}
        emptyState={
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>No critique jobs</EmptyTitle>
              <EmptyDescription>
                This job does not have a .critiques directory with runs yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    </div>
  );
}
