.PHONY: test tse-scrape data data-outlines data-nerds data-2018 data-2022 data-2026 data-check publish-edition rollback-edition nonvoters deploy \
        install typecheck web-test browser e2e e2e-port e2e-pages e2e-real build-deploy ci web-install

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

# ── Paridade CI/CD ──────────────────────────────────────────────────────────────────────────────
# Cada passo dos workflows do GitHub Actions tem aqui o seu comando local equivalente.
# `web-install` ≙ actions/setup-node + npm ci; os demais espelham .github/workflows/ci.yml e
# deploy.yml passo a passo, e o agregador `ci` roda a sequência completa do ci.yml.

# Passos de checkout/setup: deps atualizadas (≙ `npm ci` do CI).
web-install install:
	npm --prefix web ci

# ci.yml: npm run typecheck
typecheck:
	npm --prefix web run typecheck

# ci.yml: npm test (os 500 testes unitários)
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

# Não está no CI (caro): os 87 testes sobre o dataset REAL (≡ test:real). Rodar antes de qualquer deploy de dados.
e2e-real:
	DATA_DIR=../data npm --prefix web run test:real

# deploy.yml: o build de publicação — exatamente o `astro build` que roda no Actions com os envs de produção.
build-deploy:
	DATA_DIR=../data SITE_BASE=/ SITE_ORIGIN=https://voto-a-voto.com npm --prefix web run build

# ci.yml inteiro, passo a passo, na mesma ordem.
ci: typecheck web-test browser e2e e2e-pages

# Publica: empurra main para origin (voto-a-voto-oss); o GitHub Actions constrói e publica o site no Pages.
deploy:
	git push origin main