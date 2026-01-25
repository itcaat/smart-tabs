.PHONY: build dev release release-minor release-major

# Build the extension
build:
	npm run build

# Run development server
dev:
	npm run dev

# Release with patch version bump (v1.0.0 -> v1.0.1)
release:
	@echo "Fetching tags from remote..."
	@git fetch --tags
	@LATEST_TAG=$$(git tag -l "v*" | sort -V | tail -n1); \
	if [ -z "$$LATEST_TAG" ]; then \
		NEW_TAG="v1.0.0"; \
	else \
		MAJOR=$$(echo $$LATEST_TAG | sed 's/v//' | cut -d. -f1); \
		MINOR=$$(echo $$LATEST_TAG | sed 's/v//' | cut -d. -f2); \
		PATCH=$$(echo $$LATEST_TAG | sed 's/v//' | cut -d. -f3); \
		NEW_PATCH=$$((PATCH + 1)); \
		NEW_TAG="v$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	fi; \
	echo "Latest tag: $$LATEST_TAG"; \
	echo "New tag: $$NEW_TAG"; \
	read -p "Create and push $$NEW_TAG? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		git tag $$NEW_TAG && \
		git push origin $$NEW_TAG && \
		echo "✅ Tag $$NEW_TAG pushed! GitHub Actions will create the release."; \
	else \
		echo "Cancelled."; \
	fi

# Release with minor version bump (v1.0.0 -> v1.1.0)
release-minor:
	@echo "Fetching tags from remote..."
	@git fetch --tags
	@LATEST_TAG=$$(git tag -l "v*" | sort -V | tail -n1); \
	if [ -z "$$LATEST_TAG" ]; then \
		NEW_TAG="v1.0.0"; \
	else \
		MAJOR=$$(echo $$LATEST_TAG | sed 's/v//' | cut -d. -f1); \
		MINOR=$$(echo $$LATEST_TAG | sed 's/v//' | cut -d. -f2); \
		NEW_MINOR=$$((MINOR + 1)); \
		NEW_TAG="v$$MAJOR.$$NEW_MINOR.0"; \
	fi; \
	echo "Latest tag: $$LATEST_TAG"; \
	echo "New tag: $$NEW_TAG"; \
	read -p "Create and push $$NEW_TAG? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		git tag $$NEW_TAG && \
		git push origin $$NEW_TAG && \
		echo "✅ Tag $$NEW_TAG pushed! GitHub Actions will create the release."; \
	else \
		echo "Cancelled."; \
	fi

# Release with major version bump (v1.0.0 -> v2.0.0)
release-major:
	@echo "Fetching tags from remote..."
	@git fetch --tags
	@LATEST_TAG=$$(git tag -l "v*" | sort -V | tail -n1); \
	if [ -z "$$LATEST_TAG" ]; then \
		NEW_TAG="v1.0.0"; \
	else \
		MAJOR=$$(echo $$LATEST_TAG | sed 's/v//' | cut -d. -f1); \
		NEW_MAJOR=$$((MAJOR + 1)); \
		NEW_TAG="v$$NEW_MAJOR.0.0"; \
	fi; \
	echo "Latest tag: $$LATEST_TAG"; \
	echo "New tag: $$NEW_TAG"; \
	read -p "Create and push $$NEW_TAG? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		git tag $$NEW_TAG && \
		git push origin $$NEW_TAG && \
		echo "✅ Tag $$NEW_TAG pushed! GitHub Actions will create the release."; \
	else \
		echo "Cancelled."; \
	fi
