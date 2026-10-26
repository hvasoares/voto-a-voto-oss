.PHONY: help install build serve dev test typecheck e2e check slots clean slot approve
help:
	@echo "make install | build | serve | dev | typecheck | test | e2e | check | slots | clean"
	@echo "make slot SLOT=city      run the gates for one slot"
	@echo "make approve SLOT=city   store approved baseline (only after review PASS)"
install:
	npm ci && npx playwright install chromium
build:
	npm run build
serve:
	npm run serve
dev:
	npm run dev
typecheck:
	npm run typecheck
test:
	npm test
e2e:
	npm run test:e2e
check: typecheck test e2e
slots:
	npm run slots
slot:
	npm run check-slot -- $(SLOT)
approve:
	npm run approve-baseline -- $(SLOT) --yes
clean:
	rm -rf dist test-results playwright-report .captures .vitest
