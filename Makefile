.PHONY: test tse-scrape data data-outlines data-nerds data-2018 data-2022 data-2026 data-check publish-edition rollback-edition nonvoters deploy \
        install typecheck web-test browser e2e e2e-port e2e-pages e2e-real build-deploy ci web-install pytest perf \
        worktree-setup worktree-teardown releases releases-check decisions-check status ci-failures test-summary

test:
	uv run pytest

# Baixa o resultado de Presidente por município (cache em .cache/tse; só baixa o que mudou).
tse-scrape:
	uv run tse-scrape $(if $(UFS),--ufs $(UFS)) $(if $(OUT),--out $(OUT)) $(EXTRA)

# Baixa (só o que falta ou mudou), reconcilia e escreve data/ (CSVs + manifest.json). CYCLES=2018,2022 e EXTRA=--offline|--allow-partial.
data:
	uv run voto-data build $(if $(CYCLES),--cycles $(CYCLES)) $(EXTRA)
	uv run voto-data outlines $(if $(findstring --offline,$(EXTRA)),--offline)

# Só os contornos das 27 UFs (IBGE, cache em .cache/ibge) -> data/geo/ (ticket #53). OUTLINES=--refresh baixa de novo.
data-outlines:
	uv run voto-data outlines $(OUTLINES)

# Atualiza um só ciclo; os outros vêm do cache.
data-2026 data-2022 data-2018:
	uv run voto-data build --cycles $(subst data-,,$@)

# Gera os shards por nível (Brasil, região, estado × ciclo × turno) do painel Dados para nerds em data/nerds/ (#72), presos à edição publicada que é data/.
# `make publish-edition` e `make rollback-edition` já os regeneram; use este alvo para refazê-los sozinhos (idempotente: uma segunda execução não muda nenhum byte).
data-nerds:
	uv run voto-data nerds

# Valida data/ sem rede: hashes do manifest, contagens, identidades e totais nacionais do TSE; e as edições
# publicadas em editions/ (intactas, e data/ é uma delas).
data-check:
	uv run voto-data check --editions-dir editions

# Congela data/ como uma nova edição datada e imutável em editions/ (#59). Rodar depois de `make data`; não faz nada se data/ já é uma edição.
publish-edition:
	uv run voto-data publish-edition $(if $(DATE),--date $(DATE))

# Restaura data/ para a edição anterior à que ele mostra (#60). Nenhuma edição publicada muda; veja o README.
rollback-edition:
	uv run voto-data rollback-edition

# Reproduz as tabelas de docs/nonvoters-vs-margin.md (não-votantes maiores que a margem, por ciclo, turno e estado) a partir de data/.
nonvoters:
	uv run voto-data nonvoters

# Prepara uma worktree nova de uma vez (#126): confere o Node, instala as deps do web NA worktree
# (nunca node_modules compartilhado), baixa o chromium do Playwright (cache compartilhado por
# usuário), imprime a porta e2e derivada desta cópia e roda um smoke (um unit + uma spec).
# Rodar DE DENTRO da worktree nova, que deve ficar FORA da árvore do checkout principal.
worktree-setup:
	bash scripts/worktree-setup.sh

# Onde o repositório está, em um bloco (branch, remotos à frente/atrás, últimos runs de CI, worktrees de agentes).
status:
	@bash scripts/status.sh

# O que falhou no último run do ci da main de um remoto (padrão origin): jobs, steps e as primeiras linhas de erro.
ci-failures:
	@bash scripts/ci-failures.sh $(or $(REMOTE),origin)

# Resultado dos testes unitários e de componentes em uma linha cada, mais só os nomes do que falhou.
test-summary:
	@npm --prefix web run --silent test:summary

# Desfazer: `git worktree remove <caminho>` a partir do checkout principal. Nada mais a limpar —
# o setup não escreve nada fora da worktree (os browsers ficam no cache compartilhado por usuário).
worktree-teardown:
	@echo "git worktree remove <caminho>   # a partir do checkout principal; nada mais a limpar"

# Mapa de versões (#129): escreve docs/releases.md a partir das tags git e de docs/releases-notes.json (idempotente: uma segunda
# execução não muda nenhum byte). Último passo de uma release: depois de tagear, rode e commite o mapa.
releases:
	npm --prefix web run releases --silent

# Confere que toda tag tem uma linha no mapa, no commit para o qual a tag aponta, e que nenhuma linha é de uma tag que não existe mais.
# Sem tags no checkout (clone raso do CI) a checagem é pulada com uma mensagem. Também roda no `npm test`.
releases-check:
	npm --prefix web run releases:check --silent

# Confere o registro de decisões docs/decisions.md (#129): ids únicos, data, status e motivo em toda entrada, referências que existem.
decisions-check:
	npm --prefix web run check:decisions --silent

# ── Paridade CI/CD ──────────────────────────────────────────────────────────────────────────────
# Cada passo dos workflows do GitHub Actions tem aqui o seu comando local equivalente.
# `web-install` ≙ actions/setup-node + npm ci; os demais espelham .github/workflows/ci.yml e
# deploy.yml passo a passo, e o agregador `ci` roda a sequência completa do ci.yml.

# Passos de checkout/setup: deps atualizadas (≙ `npm ci` do CI).
web-install install:
	npm --prefix web ci

# ci.yml (job python): uv python install + uv sync --frozen + uv run pytest -ra. A versão do Python é
# nomeada uma vez: vem do requires-python do pyproject.toml; --frozen lê o uv.lock. O -ra imprime os
# testes pulados (network_cache sem .cache/), então um mass-skip silencioso aparece no log.
pytest:
	uv python install
	uv sync --frozen
	uv run pytest -ra

# ci.yml (job e2e-root): npm run check:perf. Mede o build de FIXTURE (base "/", dados de web/fixtures/data)
# lendo web/dist — precisa que ele exista (o próprio Playwright o constrói na passada `e2e`, ou rode
# `npm --prefix web run build` antes). Builds de dados reais não passam pelo orçamento.
perf:
	npm --prefix web run check:perf

# ci.yml: npm run typecheck
typecheck:
	npm --prefix web run typecheck

# ci.yml: npm test (os testes unitários)
web-test:
	npm --prefix web test

# ci.yml: npx playwright install --with-deps chromium (local: sem --with-deps, o apt não existe no Mac)
browser:
	npx --prefix web playwright install chromium

# ci.yml: npm run test:e2e — phone e desktop, base "/" (fixture). A porta deriva do checkout (#124): dois
# checkouts rodam em paralelo sem colidir; `make e2e-port` mostra qual é; `E2E_PORT=<porta> make e2e` força
# outra. Para re-rodar um spec sem rebuildar o site (usa o dist/ já construído, se o carimbo de
# .build-stamps/ ainda bate com a árvore — senão a run se recusa e diz o campo):
# `E2E_PREBUILT=1 npm --prefix web run test:e2e -- <spec>`.
e2e:
	npm --prefix web run test:e2e

# Porta e2e derivada deste checkout (ticket #124).
e2e-port:
	@npm --prefix web run e2e:port --silent

# ci.yml: npm run test:e2e com SITE_BASE=/voto-a-voto-oss/ — a segunda passada de base; E2E_PORT_OFFSET=1 desloca
# a porta derivada, então as duas passadas podem rodar lado a lado no mesmo checkout.
e2e-pages:
	SITE_BASE=/voto-a-voto-oss/ E2E_PORT_OFFSET=1 PUBLIC_DONATION_URL=https://doacao.example.test/apoie npm --prefix web run test:e2e

# Não está no CI (caro): os testes sobre o dataset REAL (≡ test:real). Rodar antes de qualquer deploy de dados.
e2e-real:
	DATA_DIR=../data npm --prefix web run test:real

# Amostra de dados reais (ticket #109): gera web/.sample-data (9 estados, a partir do ../data commitado), builda em
# dist-sample (<3 min é o gate) e roda o projeto Playwright `sample` com E2E_PREBUILT=1. Passo pré-push; o run
# completo continua `make e2e-real`. A documentação gerada é web/docs/real-data-sample.md.
e2e-sample:
	cd web && npx tsx scripts/sample-data.ts && \
	  DATA_DIR=.sample-data EDITIONS_DIR=.sample-editions OUT_DIR=dist-sample npx astro build && \
	  npx tsx scripts/sample-data.ts pages && \
	  DATA_DIR=.sample-data EDITIONS_DIR=.sample-editions E2E_PREBUILT=1 OUT_DIR=dist-sample npx playwright test --project=sample

# deploy.yml: o build de publicação — exatamente o `astro build` que roda no Actions com os envs de produção.
build-deploy:
	DATA_DIR=../data SITE_BASE=/ SITE_ORIGIN=https://voto-a-voto.com npm --prefix web run build

# ci.yml inteiro, passo a passo, na mesma ordem (python → web-unit → e2e-root → e2e-pages).
ci: pytest typecheck web-test browser e2e perf e2e-pages

# Publica: empurra main para origin (voto-a-voto-oss); o GitHub Actions constrói e publica o site no Pages.
deploy:
	git push origin main