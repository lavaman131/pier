import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { FileText } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CodeBlock } from "~/components/ui/code-block";
import { DataTable, SortableHeader } from "~/components/ui/data-table";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { LoadingDots } from "~/components/ui/loading-dots";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { fetchCritiqueRun } from "~/lib/api";
import type { CritiqueItemSummary } from "~/lib/types";

function formatDateTime(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}

function formatCostUSD(cost: number | null): string {
  if (cost === null) return "-";
  if (cost > 0 && cost < 0.01) return "<$0.01";
  return `$${cost.toFixed(2)}`;
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

function RewardText({ reward }: { reward: number }) {
  return (
    <span className="font-mono tabular-nums text-foreground">
      {reward.toFixed(2)}
    </span>
  );
}

function SourceOutcomeCell({ item }: { item: CritiqueItemSummary }) {
  if (item.source_error_type) {
    return (
      <div className="text-right text-destructive">
        {item.source_error_type}
      </div>
    );
  }
  if (item.source_reward === null) {
    return <div className="text-right text-muted-foreground">-</div>;
  }
  return (
    <div className="text-right">
      <RewardText reward={item.source_reward} />
    </div>
  );
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-muted-foreground">-</span>;

  const className =
    rating === "good"
      ? "text-green-700 dark:text-green-400"
      : rating === "bad"
        ? "text-destructive"
        : "";

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {rating}
    </span>
  );
}

function trialUrl(
  jobName: string,
  critiqueRunName: string,
  item: CritiqueItemSummary
): string | null {
  if (!item.task_name || !item.agent_name) return null;

  const params = new URLSearchParams({
    tab: "critiques",
    critique: critiqueRunName,
  });

  return `/jobs/${encodeURIComponent(jobName)}/tasks/${encodeURIComponent(item.source ?? "_")}/${encodeURIComponent(item.agent_name)}/${encodeURIComponent(item.model_provider ?? "_")}/${encodeURIComponent(item.model_name ?? "_")}/${encodeURIComponent(item.task_name)}/trials/${encodeURIComponent(item.source_trial_name)}?${params.toString()}`;
}

const columns: ColumnDef<CritiqueItemSummary>[] = [
  {
    accessorKey: "rating",
    header: ({ column }) => <SortableHeader column={column}>Rating</SortableHeader>,
    cell: ({ row }) => <RatingBadge rating={row.original.rating} />,
  },
  {
    accessorKey: "tags",
    header: ({ column }) => <SortableHeader column={column}>Tags</SortableHeader>,
    cell: ({ row }) =>
      row.original.tags.length > 0 ? (
        <div className="flex max-w-[24rem] flex-wrap gap-x-2 gap-y-1">
          {row.original.tags.map((tag, index) => (
            <span key={tag} className="font-mono">
              {tag}
              {index < row.original.tags.length - 1 ? "," : ""}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
  },
  {
    id: "source_outcome",
    accessorFn: (row) => row.source_error_type ?? row.source_reward,
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>Source Reward</SortableHeader>
      </div>
    ),
    cell: ({ row }) => <SourceOutcomeCell item={row.original} />,
  },
  {
    accessorKey: "source_trial_name",
    header: ({ column }) => <SortableHeader column={column}>Source Trial</SortableHeader>,
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.source_trial_name}</span>
    ),
  },
  {
    accessorKey: "task_name",
    header: ({ column }) => <SortableHeader column={column}>Task</SortableHeader>,
    cell: ({ row }) => row.original.task_name ?? "-",
  },
  {
    accessorKey: "cost_usd",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>Critique Cost</SortableHeader>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono tabular-nums">
        {formatCostUSD(row.original.cost_usd)}
      </div>
    ),
  },
  {
    accessorKey: "feedback",
    header: ({ column }) => <SortableHeader column={column}>Feedback</SortableHeader>,
    cell: ({ row }) => (
      <span className="block max-w-[34rem] truncate" title={row.original.feedback ?? ""}>
        {row.original.feedback ?? "-"}
      </span>
    ),
  },
  {
    accessorKey: "error_type",
    header: ({ column }) => <SortableHeader column={column}>Error</SortableHeader>,
    cell: ({ row }) => row.original.error_type ?? "-",
  },
  {
    accessorKey: "has_result_json",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>JSON</SortableHeader>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.has_result_json ? "yes" : "-"}</div>
    ),
  },
  {
    accessorKey: "has_result_md",
    header: ({ column }) => (
      <div className="text-right">
        <SortableHeader column={column}>Markdown</SortableHeader>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right">{row.original.has_result_md ? "yes" : "-"}</div>
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

export default function CritiqueRun() {
  const { jobName, critiqueRunName } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["critique-run", jobName, critiqueRunName],
    queryFn: () => fetchCritiqueRun(jobName!, critiqueRunName!),
    enabled: !!jobName && !!critiqueRunName,
  });

  if (isLoading) {
    return (
      <div className="px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Critique Job</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground"><LoadingDots /></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-10">
        <Empty className="bg-card border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>Critique job not found</EmptyTitle>
            <EmptyDescription>
              The requested critique job could not be loaded.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const run = data.run;

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
              <BreadcrumbLink asChild>
                <Link to={`/jobs/${encodeURIComponent(jobName!)}/critiques`}>
                  Critiques
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{critiqueRunName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-4 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-normal tracking-tighter font-mono truncate">
              {critiqueRunName}
            </h1>
            <CritiqueStatusBadge status={run.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>
              {run.n_completed_items}/{run.n_items} items completed
            </span>
            <span>{run.n_failed_items} failures</span>
            <span>{run.agent_name ?? "-"} / {run.model_name ?? "-"}</span>
            <span>{run.environment_type ?? "-"}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList className="bg-card border border-b-0 w-full">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="result">Result</TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="mt-0">
          <DataTable
            columns={columns}
            data={data.items}
            onRowClick={(item) => {
              const url = trialUrl(jobName!, critiqueRunName!, item);
              if (url) navigate(url);
            }}
            emptyState={
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>No critique items</EmptyTitle>
                  <EmptyDescription>
                    This critique job has not created any item directories yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            }
          />
        </TabsContent>
        <TabsContent value="config" className="mt-0 -mx-px">
          <CodeBlock code={JSON.stringify(data.config ?? {}, null, 2)} lang="json" />
        </TabsContent>
        <TabsContent value="result" className="mt-0 -mx-px">
          <CodeBlock code={JSON.stringify(data.result ?? {}, null, 2)} lang="json" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
