.PHONY: build dev release release-minor release-major

# Build the extension
build:
	npm run build

# Run development server
dev:
	npm run dev

# Release with patch version bump from package.json (1.0.15 -> 1.0.16)
release:
	@CURRENT_VERSION=$$(node -p "require('./package.json').version"); \
	MAJOR=$$(echo $$CURRENT_VERSION | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT_VERSION | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT_VERSION | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	NEW_TAG="v$$NEW_VERSION"; \
	echo "Current version: $$CURRENT_VERSION"; \
	echo "New version: $$NEW_VERSION"; \
	read -p "Release $$NEW_VERSION? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		sed -i '' "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" package.json && \
		sed -i '' "s/\"version\": \"$$CURRENT_VERSION\"/\"version\": \"$$NEW_VERSION\"/" public/manifest.json && \
		git add package.json public/manifest.json && \
		git commit -m "feat(release): new version $$NEW_VERSION" && \
		git tag $$NEW_TAG && \
		git push && \
		git push --tags && \
		echo "✅ Version $$NEW_VERSION released and pushed!"; \
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
