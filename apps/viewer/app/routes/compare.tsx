import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { useHotkeys } from "react-hotkeys-hook";
import { Link, useNavigate, useSearchParams } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { fetchComparisonHeatmap, type JobHeatmapTrialsFilter } from "~/lib/api";
import type { JobHeatmapColumnBy, JobHeatmapRowBy } from "~/lib/types";
import { HEATMAP_STATS, JobHeatmap, type HeatmapStatKey } from "./job";

export default function ComparePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobNames = searchParams.getAll("job");

  const [heatmapRowBy, setHeatmapRowBy] = useQueryState(
    "heatmap_row",
    parseAsString.withDefault("config")
  );
  const [heatmapColumnBy, setHeatmapColumnBy] = useQueryState(
    "heatmap_col",
    parseAsString.withDefault("task")
  );
  const [heatmapStat, setHeatmapStat] = useQueryState(
    "heatmap_stat",
    parseAsString.withDefault("avg_reward")
  );
  const [heatmapTrialsRaw, setHeatmapTrialsRaw] = useQueryState(
    "heatmap_trials",
    parseAsString.withDefault("all")
  );

  useHotkeys("escape", () => navigate("/"));

  const heatmapRowValue: JobHeatmapRowBy =
    heatmapRowBy === "agent" || heatmapRowBy === "model" ? heatmapRowBy : "config";
  const heatmapColumnValue: JobHeatmapColumnBy =
    heatmapColumnBy === "dataset" ? "dataset" : "task";
  const heatmapStatValue: HeatmapStatKey = HEATMAP_STATS.some(
    (option) => option.value === heatmapStat
  )
    ? (heatmapStat as HeatmapStatKey)
    : "avg_reward";
  const heatmapTrialsFilter: JobHeatmapTrialsFilter =
    heatmapTrialsRaw === "non_errored" || heatmapTrialsRaw === "successful"
      ? heatmapTrialsRaw
      : "all";
  const setHeatmapTrialsFilter = (value: JobHeatmapTrialsFilter) =>
    setHeatmapTrialsRaw(value === "all" ? null : value);

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: [
      "comparison-heatmap",
      jobNames,
      heatmapRowValue,
      heatmapColumnValue,
      heatmapTrialsFilter,
    ],
    queryFn: () =>
      fetchComparisonHeatmap(jobNames, {
        rowBy: heatmapRowValue,
        columnBy: heatmapColumnValue,
        trialsFilter:
          heatmapTrialsFilter === "all" ? undefined : heatmapTrialsFilter,
      }),
    enabled: jobNames.length >= 1,
    placeholderData: keepPreviousData,
  });

  if (jobNames.length < 1) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">
          Select at least 1 job to compare.
        </p>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 px-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Jobs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Compare ({jobNames.length} jobs)</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Kbd>Esc</Kbd>
          <span>go back</span>
        </div>
      </div>

      <div className="flex-1 border-t p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-destructive">
              Error loading comparison heat map: {error.message}
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Link>
            </Button>
          </div>
        ) : (
          <JobHeatmap
            jobName={jobNames[0]}
            data={data}
            isLoading={isLoading}
            isFetching={isPlaceholderData}
            rowBy={heatmapRowValue}
            setRowBy={setHeatmapRowBy}
            columnBy={heatmapColumnValue}
            setColumnBy={setHeatmapColumnBy}
            stat={heatmapStatValue}
            setStat={setHeatmapStat}
            trialsFilter={heatmapTrialsFilter}
            setTrialsFilter={setHeatmapTrialsFilter}
          />
        )}
      </div>
    </div>
  );
}
