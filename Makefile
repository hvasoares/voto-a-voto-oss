.PHONY: test tse-scrape data data-2018 data-2022 data-2026 data-check nonvoters deploy

test:
	uv run pytest

# Baixa o resultado de Presidente por município (cache em .cache/tse; só baixa o que mudou).
tse-scrape:
	uv run tse-scrape $(if $(UFS),--ufs $(UFS)) $(if $(OUT),--out $(OUT)) $(EXTRA)

# Baixa (só o que falta ou mudou), reconcilia e escreve data/ (CSVs + manifest.json). CYCLES=2018,2022 e EXTRA=--offline|--allow-partial.
data:
	uv run voto-data build $(if $(CYCLES),--cycles $(CYCLES)) $(EXTRA)

# Atualiza um só ciclo; os outros vêm do cache.
data-2026 data-2022 data-2018:
	uv run voto-data build --cycles $(subst data-,,$@)

# Valida data/ sem rede: hashes do manifest, contagens, identidades e totais nacionais do TSE.
data-check:
	uv run voto-data check

# Reproduz as tabelas de docs/nonvoters-vs-margin.md (não-votantes maiores que a margem, por ciclo, turno e estado) a partir de data/.
nonvoters:
	uv run voto-data nonvoters

# Publica: empurra main para origin (voto-a-voto-oss); o GitHub Actions constrói e publica o site no Pages.
deploy:
	git push origin main
