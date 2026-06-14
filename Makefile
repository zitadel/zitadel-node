# Self-contained SDK (re)generation plus the house build/test/lint targets.
#
#   make generate   # regenerate from the OpenAPI spec, then prune orphans
#
# Regeneration overwrites every generator-owned file and then deletes any
# tracked file the generator no longer produces — EXCEPT the keep-list in
# .openapi-generator-ignore (bespoke facade, auth, shims, this Makefile, house
# tooling), which the generator skips and `prune` spares.
#
# This Makefile is itself keep-listed: the generator emits a minimal Makefile,
# but ours carries the generate/prune targets that drive regeneration, so it
# must survive a regen.

.PHONY: install build test lint format typecheck docs clean generate prune

GENERATOR  ?= node-plus
IMAGE      ?= openapi-generator-plus:enhanced
SPEC_DIR   ?= ../sdk/spec
VERSION    ?= v4.11.0
NORMALIZER ?= NORMALIZER_CLASS=io.github.mridang.codegen.AdvancedOpenAPINormalizer,GARBAGE_COLLECT_COMPONENTS=1,STRIP_PARAMS=Connect-Protocol-Version|Connect-Timeout-Ms,CLEAN_EMPTY_REQUEST_BODIES=Tag,ONLY_ALLOW_JSON=1

REPO := $(notdir $(CURDIR))

generate:
	docker run --rm \
	  -v "$(CURDIR):/sdk/out" \
	  -v "$(abspath $(SPEC_DIR)):/sdk/spec:ro" \
	  -v "$(CURDIR)/proc.yml:/sdk/proc.yml:ro" \
	  --user "$$(id -u):$$(id -g)" \
	  $(IMAGE) generate \
	    --input-spec=/sdk/spec/client/$(VERSION)/index.json \
	    --generator-name=$(GENERATOR) \
	    --output=/sdk/out \
	    --git-user-id=zitadel --git-repo-id=$(REPO) --git-host=github.com \
	    --config=/sdk/proc.yml \
	    --openapi-normalizer "$(NORMALIZER)"
	@$(MAKE) --no-print-directory prune
	@$(MAKE) --no-print-directory format

prune:
	@test -f .openapi-generator/FILES || { echo "prune: no FILES manifest, skipping"; exit 0; }
	@tmp=$$(mktemp -d); \
	git ls-files | sort > "$$tmp/tracked"; \
	sed 's#^\./##' .openapi-generator/FILES | sort -u > "$$tmp/generated"; \
	awk 'NR==FNR { gen[tolower($$0)]=1; next } !(tolower($$0) in gen)' \
	    "$$tmp/generated" "$$tmp/tracked" > "$$tmp/orphans"; \
	git -c core.excludesFile="$(CURDIR)/.openapi-generator-ignore" \
	    check-ignore --no-index --stdin < "$$tmp/orphans" 2>/dev/null | sort -u > "$$tmp/keep" || true; \
	comm -23 "$$tmp/orphans" "$$tmp/keep" > "$$tmp/delete"; \
	echo "prune: deleting $$(wc -l < "$$tmp/delete" | tr -d ' ') orphaned files the generator no longer produces"; \
	xargs -r rm -f < "$$tmp/delete"; \
	rm -rf "$$tmp"

install:
	npm install

build: install
	npx tsc

test: install
	npx jest --verbose

lint: install
	npx eslint .

format: install
	npx prettier --write .

typecheck: install
	npx tsc --noEmit

docs: install
	npx typedoc --out .out/docs --treatWarningsAsErrors

clean:
	rm -rf node_modules dist coverage .out/docs
