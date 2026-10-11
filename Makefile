.PHONY: check test build
PROJECTS := nodejs-cli-file-search json-yaml-xml-parser random-red-black-tree-sort web-front-end-snake-game trumpet-twitter
check:
	./scripts/check.sh
test:
	@for project in $(PROJECTS); do $(MAKE) -C $$project test || exit $$?; (cd $$project/web && npm test) || exit $$?; done
build:
	@for project in $(PROJECTS); do $(MAKE) -C $$project build || exit $$?; done
