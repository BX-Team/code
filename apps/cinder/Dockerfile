FROM gcr.io/distroless/cc-debian12:nonroot

LABEL org.opencontainers.image.source="https://github.com/BX-Team/code"
LABEL org.opencontainers.image.title="cinder"
LABEL org.opencontainers.image.description="BX Team ingest queue consumer"
LABEL org.opencontainers.image.licenses="AGPL-3.0-only"

COPY staging/cinder /usr/local/bin/cinder

USER nonroot
ENTRYPOINT ["/usr/local/bin/cinder"]
