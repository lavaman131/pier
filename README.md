# pier

Pier is a [Harbor](https://www.harborframework.com/docs/tasks)-compatible framework for evaluating coding agents in sandboxed environments. It reads Harbor's task format and runs trials against it.

```bash
pier run -p path/to/task --agent claude-code --env modal
```

## Why pier

Pier is a fork. We wanted a smaller, more opinionated base to build on. On top of Harbor, Pier adds:

- **Installed agents in air-gapped tasks (`allow_internet = false`).** When the agent runs *inside* the sandbox (Claude Code, Codex, etc.), both the install step and the inference call need the network. Pier lets agents declare their install scripts and a network allowlist, which `docker` and `modal` environments honor when setting up the sandbox.
- **Augmented ATIF v1.7.** Strict one step per API turn, strict reasoning vs agent message separation, no fabricated assistant text, `peak_context_tokens`, `summarization_count`, `llm_call_count`, real upstream timestamps.
- **A chat-style trajectory viewer** (`pier view`).
- **`pier critique run`** for inspecting completed trials with a fresh agent in a fresh sandbox.

## What works today

- **Task format:** Harbor-compatible.
- **Environments:** `docker`, `modal`. Per-agent install specs and network allowlists are honored on both, so installed agents work under `allow_internet = false`.
- **Agents:** `nop`, `oracle`, `claude-code`, `codex`, `gemini-cli`, `opencode`, `mini-swe-agent`. All emit augmented ATIF v1.7.
- **Datasets:** local Harbor-format task directories via `-p` / `--path`.
- **CLI:** `pier run`, `pier job`, `pier view`, `pier critique run`, `pier check` / `pier analyze` (vendored from Harbor)

Pier does not currently resolve or download Harbor registry datasets directly.

## Install

```bash
uv tool install <tbd>
# or
pip install <tbd>
```

For local development, use the pinned Python version and dev dependency group:

```bash
uv sync --dev
uv run pytest tests
```

## Run

```bash
export ANTHROPIC_API_KEY=...
pier run -p path/to/task --agent claude-code --env modal --env-file .env
```

Run a local dataset, optionally a deterministic random subset:

```bash
pier run -p path/to/dataset --agent claude-code --env modal
pier run -p path/to/dataset --n-tasks 10 --sample-seed 0
```

To use a Harbor registry dataset, download it with Harbor first, then point Pier at it:

```bash
uv run --directory ~/code/harbor harbor download swebenchpro -o ~/code/pier/datasets
uv run pier run -p datasets/swebenchpro --n-tasks 10 --sample-seed 0
```

Trials land under `jobs/<timestamp_or_name>/<trial_id>/`. See `pier run --help`, `pier job --help`, `pier critique --help`, and `pier view --help` for everything else.

## Job configs

Use CLI flags for quick one-off runs and small overrides:

```bash
pier run -p examples/tasks/hello-world --agent claude-code --env docker
```

Use a job config when the run needs to be reproducible, uses multiple agents, has agent-specific runtime settings, samples a local dataset, or would otherwise turn into a long command:

```bash
export RESPAN_API_KEY=...
uv run pier run --config configs/respan-dual-agent-local-task.yaml --yes
```

Config files can live anywhere you can pass to `--config`; `configs/` is just a conventional place for shared examples. `pier run --config` and `pier critique run --config` currently accept `.yaml` and `.json` files. `.yml` is not supported today.

A job config implements `pier.models.job.config.JobConfig`. The common top-level shape is:

```yaml
job_name: my-job
jobs_dir: jobs
n_attempts: 1
n_concurrent_trials: 1
environment:
  type: docker        # or modal
agents:
  - name: claude-code
    model_name: claude-opus-4-7
    env:
      ANTHROPIC_AUTH_TOKEN: ${RESPAN_API_KEY}
    kwargs:
      reasoning_effort: max
tasks:
  - path: path/to/one-task
# Or, for a directory containing many task directories:
# datasets:
#   - path: path/to/local-dataset
#     n_tasks: 10
#     sample_seed: 0
```

For local Harbor directories, use `tasks:` when each entry is one task directory containing `task.toml`, `instruction.md`, `environment/`, and `tests/`. Use `datasets:` when each entry is a directory of task directories; dataset configs can filter with `task_names` / `exclude_task_names` and sample with `n_tasks` / `sample_seed`.

Runtime secrets should not be committed. Put `${VAR_NAME}` placeholders in config files, then provide the real values in your shell or with `--env-file`. Pier resolves those placeholders when constructing the agent or environment, and serializes known sensitive env values back as templates so job artifacts do not leak real keys.

See `configs/README.md` and `configs/respan-dual-agent-local-task.yaml` for a runnable Respan-backed Claude Code + Codex example.

## Agent runtime configuration

Use `agent.model_name` for trial metadata, `agent.env` for runtime env vars, and agent-specific `kwargs` for tool config. Pier's network allowlist also reads URLs out of those configs (Codex `config_toml`, OpenCode `opencode_config`, mini-swe `config_yaml`), so any base URL you set is allowlisted without code changes.

A few things we've learned plumbing this through Respan and OpenRouter:

**Claude Code** routes through the Anthropic face from Respan. Plan mode is disabled by default (`--disallowedTools EnterPlanMode`).

```yaml
- name: claude-code
  model_name: claude-opus-4-7
  env:
    ANTHROPIC_AUTH_TOKEN: ${RESPAN_API_KEY}
    ANTHROPIC_BASE_URL: https://endpoint.respan.ai/api/anthropic
    ANTHROPIC_CUSTOM_HEADERS: "X-Respan-Route-Provider: vertex_ai"
  kwargs:
    reasoning_effort: max
```

**Codex** needs a `[model_providers.<name>]` block with `wire_api = "responses"` (not WebSockets, which Codex defaults to and Respan doesn't speak).

```yaml
- name: codex
  model_name: openai/gpt-5.5
  env: { RESPAN_API_KEY: ${RESPAN_API_KEY} }
  kwargs:
    config_toml: |
      model_provider = "respan"
      [model_providers.respan]
      name = "Respan Gateway"
      base_url = "https://endpoint.respan.ai/api/"
      wire_api = "responses"
      env_key = "RESPAN_API_KEY"
    reasoning_effort: xhigh
```

**Gemini CLI**:

```yaml
- name: gemini-cli
  model_name: gemini/gemini-3.1-pro-preview
  env:
    GEMINI_API_KEY: ${RESPAN_API_KEY}
    GOOGLE_GENERATIVE_AI_API_KEY: ${RESPAN_API_KEY}
    GEMINI_API_BASE: https://endpoint.respan.ai/api/google/vertexai/v1beta
    GOOGLE_GEMINI_BASE_URL: https://endpoint.respan.ai/api/google/vertexai/
```

**OpenCode** uses `opencode_config` to add unknown providers or override known ones. To redirect Google to Respan, override just `options.baseURL`; to add a fully custom provider, use `opencode_config.provider.<name>` with the npm package, options, and models.

**mini-swe-agent** picks a native adapter from the model-name prefix: `openai/...` → `litellm_response` (OpenAI Responses end-to-end), `openrouter/...` → `openrouter` (BYOK costs from `cost_details.upstream_inference_cost`), everything else → LiteLLM auto.

For Gemini 3 via mini-swe-agent/LiteLLM, omitting `reasoning_effort` uses the Gemini API default high/dynamic thinking level, but it does not request readable thought summaries. Set `kwargs.reasoning_effort: high` explicitly when you want LiteLLM to send `includeThoughts` and preserve returned summaries as reasoning content.

```yaml
- name: mini-swe-agent
  model_name: openrouter/qwen/qwen3.6-plus
  env: { OPENROUTER_API_KEY: ${OPENROUTER_API_KEY} }
  kwargs:
    set_cache_control: default_end
```
